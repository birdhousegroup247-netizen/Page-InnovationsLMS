#!/usr/bin/env bash
#
# Page Innovation DB backup
# -----------------
# Dumps the production database, gzips it, and uploads to S3-compatible
# object storage (AWS S3 or Backblaze B2 via the S3-compat endpoint).
#
# Usage
#   ./backend/scripts/db-backup.sh
#
# Environment variables (mirror backend/.env so this script can run on
# the same host without duplicating config):
#   Required
#     DB_DIALECT    "mysql" (default) or "postgres"
#     DB_HOST       database host
#     DB_PORT       database port (3306 for mysql, 5432 for postgres)
#     DB_NAME       database name
#     DB_USER       database user
#     DB_PASSWORD   database password
#     BACKUP_S3_BUCKET   target bucket name (e.g. "pageinnovation-backups")
#   Optional
#     BACKUP_S3_PREFIX     key prefix inside the bucket (default "db/")
#     BACKUP_S3_ENDPOINT   custom S3-compatible endpoint URL (set this
#                          for Backblaze B2: https://s3.us-west-002.backblazeb2.com)
#     AWS_REGION           AWS region (default "us-east-1")
#     BACKUP_LOCAL_DIR     where to write the local copy before upload
#                          (default /tmp)
#     BACKUP_RETAIN_LOCAL  number of recent local backups to keep
#                          (default 3; older ones in BACKUP_LOCAL_DIR are deleted)
#
# Auth for the upload
#   Uses the standard AWS CLI credential chain: env vars
#   (AWS_ACCESS_KEY_ID + AWS_SECRET_ACCESS_KEY), ~/.aws/credentials,
#   or an attached IAM role. Configure once per host.
#
# Cron example (run daily at 03:15 UTC, log to a dated file)
#   15 3 * * * /opt/pageinnovation/backend/scripts/db-backup.sh \
#       >> /var/log/pageinnovation/db-backup.log 2>&1
#
# Retention
#   Recommend setting a lifecycle rule on the bucket itself rather than
#   in this script — e.g. "transition to GLACIER after 30d, delete after
#   365d". S3 lifecycle is more reliable than shell rotation and survives
#   if this script ever fails to run.

set -euo pipefail

# ─── Config ────────────────────────────────────────────────────────────────

: "${DB_HOST:?DB_HOST is required}"
: "${DB_PORT:?DB_PORT is required}"
: "${DB_NAME:?DB_NAME is required}"
: "${DB_USER:?DB_USER is required}"
: "${DB_PASSWORD:?DB_PASSWORD is required}"
: "${BACKUP_S3_BUCKET:?BACKUP_S3_BUCKET is required}"

DB_DIALECT="${DB_DIALECT:-mysql}"
BACKUP_S3_PREFIX="${BACKUP_S3_PREFIX:-db/}"
BACKUP_LOCAL_DIR="${BACKUP_LOCAL_DIR:-/tmp}"
BACKUP_RETAIN_LOCAL="${BACKUP_RETAIN_LOCAL:-3}"
AWS_REGION="${AWS_REGION:-us-east-1}"
export AWS_REGION

# Normalize prefix to end with /
case "$BACKUP_S3_PREFIX" in
  */) ;;
  *) BACKUP_S3_PREFIX="${BACKUP_S3_PREFIX}/" ;;
esac

TS="$(date -u +"%Y%m%dT%H%M%SZ")"
HOSTNAME_SHORT="$(hostname -s 2>/dev/null || echo unknown)"
BASENAME="pageinnovation-${DB_NAME}-${HOSTNAME_SHORT}-${TS}.sql.gz"
LOCAL_PATH="${BACKUP_LOCAL_DIR%/}/${BASENAME}"
S3_URI="s3://${BACKUP_S3_BUCKET}/${BACKUP_S3_PREFIX}${BASENAME}"

log() { printf '[%s] %s\n' "$(date -u +%FT%TZ)" "$*"; }

# ─── Pre-flight ────────────────────────────────────────────────────────────

command -v gzip >/dev/null || { log "ERROR: gzip not installed"; exit 1; }
command -v aws  >/dev/null || { log "ERROR: aws CLI not installed (apt install awscli or https://aws.amazon.com/cli)"; exit 1; }

case "$DB_DIALECT" in
  mysql)
    command -v mysqldump >/dev/null || { log "ERROR: mysqldump not installed (apt install mysql-client)"; exit 1; }
    ;;
  postgres)
    command -v pg_dump >/dev/null || { log "ERROR: pg_dump not installed (apt install postgresql-client)"; exit 1; }
    ;;
  *)
    log "ERROR: unknown DB_DIALECT '${DB_DIALECT}' (expected mysql or postgres)"
    exit 1
    ;;
esac

mkdir -p "$BACKUP_LOCAL_DIR"

# ─── Dump ──────────────────────────────────────────────────────────────────

log "Starting backup → ${LOCAL_PATH}"

if [ "$DB_DIALECT" = "mysql" ]; then
  # --single-transaction = consistent dump w/o locking InnoDB tables
  # --routines + --triggers = include stored programs
  # --set-gtid-purged=OFF avoids GTID lines a restore-target may reject
  MYSQL_PWD="$DB_PASSWORD" mysqldump \
    --host="$DB_HOST" --port="$DB_PORT" --user="$DB_USER" \
    --single-transaction --quick --routines --triggers \
    --set-gtid-purged=OFF \
    --databases "$DB_NAME" \
    | gzip -9 > "$LOCAL_PATH"
else
  PGPASSWORD="$DB_PASSWORD" pg_dump \
    --host="$DB_HOST" --port="$DB_PORT" --username="$DB_USER" \
    --no-owner --no-acl --clean --if-exists \
    "$DB_NAME" \
    | gzip -9 > "$LOCAL_PATH"
fi

SIZE_BYTES="$(stat -c%s "$LOCAL_PATH" 2>/dev/null || stat -f%z "$LOCAL_PATH")"
if [ "${SIZE_BYTES:-0}" -lt 1024 ]; then
  log "ERROR: dump is suspiciously small (${SIZE_BYTES} bytes) — aborting before upload"
  rm -f "$LOCAL_PATH"
  exit 2
fi
log "Dump complete (${SIZE_BYTES} bytes compressed)"

# ─── Upload ────────────────────────────────────────────────────────────────

UPLOAD_ARGS=( "$LOCAL_PATH" "$S3_URI" --only-show-errors )
if [ -n "${BACKUP_S3_ENDPOINT:-}" ]; then
  UPLOAD_ARGS+=( --endpoint-url "$BACKUP_S3_ENDPOINT" )
fi

log "Uploading to ${S3_URI}"
aws s3 cp "${UPLOAD_ARGS[@]}"
log "Upload OK"

# ─── Local retention ───────────────────────────────────────────────────────
# Keep BACKUP_RETAIN_LOCAL most-recent local copies; delete the rest.
# Lifecycle rules on the bucket handle long-term retention.

if [ "$BACKUP_RETAIN_LOCAL" -gt 0 ]; then
  # shellcheck disable=SC2012
  ls -1t "${BACKUP_LOCAL_DIR%/}"/pageinnovation-${DB_NAME}-*.sql.gz 2>/dev/null \
    | tail -n +$((BACKUP_RETAIN_LOCAL + 1)) \
    | while read -r old; do
        log "Removing old local backup: $old"
        rm -f -- "$old"
      done
fi

log "Backup finished successfully"
