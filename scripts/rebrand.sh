#!/usr/bin/env bash
#
# rebrand.sh — rename the platform for a new client, in a DUPLICATED repo.
#
#   ./scripts/rebrand.sh "Page Innovation"
#
# NEVER run this in the TekyPro master repo. It replaces the brand name
# across all source + docs, then prints the manual steps (logo, colors,
# titles) that can't be scripted. See WHITE-LABEL-SETUP.md for the full
# runbook.

set -e

NEW_NAME="$1"
if [ -z "$NEW_NAME" ]; then
  echo "Usage: $0 \"New Company Name\""
  exit 1
fi

# Safety: refuse to run when the git remote still points at the master.
REMOTE=$(git remote get-url origin 2>/dev/null || echo "none")
if echo "$REMOTE" | grep -qi "TekyproLMS"; then
  echo "✗ This repo's origin is still the TekyPro master ($REMOTE)."
  echo "  Duplicate the repo and point origin at the new client repo first."
  echo "  (See WHITE-LABEL-SETUP.md Part 2.)"
  exit 1
fi

# Compact form for identifiers/domains: "Page Innovation" -> "pageinnovation"
NEW_SLUG=$(echo "$NEW_NAME" | tr '[:upper:]' '[:lower:]' | tr -cd 'a-z0-9')

echo "Rebranding: TekyPro → $NEW_NAME   (tekypro → $NEW_SLUG)"
echo ""

# Replace in source + docs. Case-sensitive passes so casing stays natural.
FILES=$(grep -rl "TekyPro\|tekypro\|TEKYPRO" \
  backend frontend/src frontend-admin/src frontend/index.html \
  frontend-admin/index.html *.md 2>/dev/null \
  | grep -v node_modules | grep -v package-lock || true)

COUNT=0
for f in $FILES; do
  sed -i \
    -e "s/TekyPro/${NEW_NAME}/g" \
    -e "s/TEKYPRO/$(echo "$NEW_NAME" | tr '[:lower:]' '[:upper:]')/g" \
    -e "s/tekypro/${NEW_SLUG}/g" \
    "$f"
  COUNT=$((COUNT+1))
done
echo "✓ Replaced brand name in $COUNT files"

echo ""
echo "──────────────────────────────────────────────────────"
echo "MANUAL STEPS REMAINING (can't be scripted):"
echo ""
echo "  1. Replace the logos with the client's PNG:"
echo "       frontend/src/assets/logo.png"
echo "       frontend-admin/src/assets/logo.png"
echo ""
echo "  2. Brand colors — edit the HEX VALUES (keep the token names!)"
echo "     in BOTH of these, under 'brand-blue' / 'brand-purple' /"
echo "     'brand-red':"
echo "       frontend/tailwind.config.js"
echo "       frontend-admin/tailwind.config.js"
echo ""
echo "  3. Favicons + <title> — check:"
echo "       frontend/index.html    frontend/public/"
echo "       frontend-admin/index.html    frontend-admin/public/"
echo ""
echo "  4. Landing page copy (hero, tagline, features, footer):"
echo "       frontend/src/pages/LandingPage.jsx"
echo ""
echo "  5. CORS allowlist — replace the old Railway/Render URLs:"
echo "       backend/config/allowedOrigins.js"
echo ""
echo "  6. Review the email-sender domains you'll use:"
echo "       EMAIL_FROM / EMAIL_FROM_REGISTRATION / EMAIL_FROM_PORTAL"
echo ""
echo "  7. git diff — sanity-read the changes, then commit."
echo "──────────────────────────────────────────────────────"
echo ""
echo "Then follow WHITE-LABEL-SETUP.md Part 3 for Railway + env vars."
