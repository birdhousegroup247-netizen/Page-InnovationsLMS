# Notifications Audit — Page Innovation (2026-07-01)

Audit of the in-app notification system parallel to the email audit.
Covers the model, trigger sites, unread-count correctness, per-user
preference plumbing, and gaps.

---

## TL;DR

| Area | Status | Notes |
|---|---|---|
| Trigger fan-out (~22 sites) | ✅ Wired | Nearly every event that emails also creates a notification |
| Per-user preferences (`notification_preferences.<type>.in_app`) | ✅ Solid | `_isAllowed()` gate on both single + bulk create paths |
| Never-mute types | ✅ Correct | `security_alert`, `account_suspension`, `payment_receipt`, `refund_issued` bypass filter |
| Unread count with Redis cache | ✅ Solid | 1-min TTL, invalidated on read / mark / create |
| Ownership check on mark/delete | ✅ Correct | Returns 404 (not 403) so IDs can't be probed |
| Pagination on `/api/notifications` | ✅ Correct | page + limit query params, count returned |
| **Notification.type ENUM is stale** | ❌ **Critical** | Model defines 8 types; 30+ types actually inserted → silent failure |
| **Errors on create are swallowed** | ⚠️ Silent | Callers `.catch(() => {})` — bugs hide |
| **Cache invalidation on bulk create missing** | ⚠️ Race | Batch inserts don't invalidate cache — unread count stale up to 1 min |
| **No mark-as-read on click-through** | ⚠️ UX | Only manual button flips flag |
| **No push / websocket delivery** | ⚠️ By design | Poll-based; badge count polling cadence not verified |
| **No retention policy** | ⚠️ Growth | Notifications never age out — long-term users accumulate thousands |

Legend: ✅ solid, ⚠️ caveat, ❌ broken

---

## 1. Model

`backend/models/Notification.js`:
```js
type: DataTypes.ENUM(
  'course_enrollment', 'test_assignment', 'certificate_issued',
  'announcement', 'question_reply', 'course_update',
  'chat_mention', 'system'
)
```

Indexes: `user_id`, `is_read`, `created_at`. ✅ good for the two hot
queries (unread-count for user, notification list ordered by date).

Foreign key `user_id → users(id)` with `onDelete: 'CASCADE'`. ✅

---

## 2. Trigger sites (~22 call points across 20 files)

Every controller listed in the email audit also fires an in-app
notification for the same event. Additionally:

- `assignedTestController.assignTestToStudents` — test assignment
- `assignmentsController` — assignment published, submitted, graded, resubmitted
- `announcementsController` (both course + admin) — announcement fanout
- `attendanceController` — attendance code goes live
- `birthdayService` — daily 06:05 UTC
- `certificateController` — certificate issued
- `chatController` — mention, DM (with offline recipient)
- `courseController.updateCourse` — content update, publish
- `progressController` — certificate earned on 100%
- `discordController` — invite granted
- `enrollmentService.runPostCommitSideEffects` — course_enrollment
- `forumController` — reply notifications
- `liveSessionController` + server.js cron — session reminders (24h/1h/15min)
- `paymentsController` (all 3 gateways) — payment_confirmed
- `questionBankController` — question_approved / question_rejected
- `questionsController` — instructor notified of new question
- `server.js` — assignment-reminder cron

Coverage looks complete — every user-facing event has a notification
path.

---

## 3. Findings (by severity)

### 🔴 Critical

**3.1 The Notification.type ENUM is missing at least 22 values that controllers try to insert.**

Grep of `type: '...'` across the notification call sites yields:
```
announcement                (in ENUM)
assignment_graded           MISSING
assignment_new              MISSING
assignment_reminder         MISSING
assignment_resubmitted      MISSING
assignment_submitted        MISSING
attendance_code             MISSING
birthday                    MISSING
certificate_issued          (in ENUM)
chat_mention                (in ENUM)
chat_report                 MISSING
chat_suspended              MISSING
course_enrollment           (in ENUM)
course_update               (in ENUM)
discord_invite              MISSING
enrollment                  MISSING (also duplicate of course_enrollment)
forum_reply                 MISSING
installment_second          MISSING
live_session                MISSING
new_enrollment              MISSING
payment_confirmed           MISSING
payment_failed              MISSING
question_approved           MISSING
question_rejected           MISSING
question_reply              (in ENUM)
system                      (in ENUM)
test_assignment             (in ENUM)
```

That's **22 missing types**. Any `Notification.create({ type: 'birthday', … })`
call throws a Postgres enum error at insert time:
```
invalid input value for enum enum_notifications_type: "birthday"
```

**Why nobody noticed:** every caller wraps the create in `try/catch`
and either logs and continues, or uses `.catch(() => {})`. The failed
inserts are silent. Users just don't see the notifications for those
types — which looks like "the notification never fired" not "the DB
rejected it."

**Fix:** either
- (a) Migrate: switch the column to `DataTypes.STRING(64)` and drop the
  enum entirely — simplest, allows adding new types without a
  migration. Cost: no DB-level validation of type names. Given every
  insert goes through a controller anyway, that's OK.
- (b) Or add every missing value to the enum via
  `ALTER TYPE "enum_notifications_type" ADD VALUE IF NOT EXISTS 'x'`
  in the auto-migration block for every one of the 22 types. Mirrors
  the payment_gateway pattern already in server.js.

Recommend (a) — the type list is going to keep growing and each new
lifecycle email will want its own type.

**Also normalize the duplicates:**
- `course_enrollment` vs `enrollment` vs `new_enrollment` — pick one.
- `assignment_new` vs `assignment_submitted` — clear enough already.

---

### 🟡 Important

**3.2 Cache invalidation on bulk create is missing.**

`createNotification` calls `CacheService.invalidateNotifications(user_id)`
after each single insert (line 263). `createBulkNotifications` does
NOT — it bulk-inserts and returns. Result: for up to 1 minute after
a bulk fanout (announcement to 500 students, e.g.), each student's
`/api/notifications/unread/count` returns a stale count from cache.

**Fix:** in `createBulkNotifications`, after the `bulkCreate`,
iterate the unique `user_id`s and invalidate each. Or, if the cache
service supports it, add a `invalidateMany(userIds[])` variant.

**3.3 Errors on create are silently swallowed.**

Pattern across most callers:
```js
NotificationsController.createNotification({ ... }).catch(() => {});
```
Combined with the stale ENUM bug (§3.1), this means real errors go
unlogged. If the DB is briefly down, callers don't know. If the type
is invalid, callers don't know.

**Fix:** at minimum, replace `.catch(() => {})` with
`.catch((e) => logger.warn('notification failed:', e.message))`.
The bulk case in `createBulkNotifications` already logs on error, so
just port the same treatment to the fire-and-forget sites.

**3.4 No auto-mark-as-read on click-through.**

Notifications carry a `link` that the UI navigates to when clicked.
But clicking doesn't mark the notification as read — the user has to
either (a) open the notifications page and click each one, or (b) hit
"mark all read." That's non-standard UX.

**Fix (frontend):** on notification click, call
`markAsRead(notification.id)` before navigation. Cheap. Improves
badge accuracy dramatically.

**3.5 No retention / cleanup policy.**

Notifications persist forever. A power user could accumulate 10,000+
rows over a year. `/api/notifications` paginates, so the list stays
fast, but:
- The unread count query filters by `is_read = false`, indexed —
  fine even at 10k.
- `mark-all-read` UPDATEs every unread row — a growing list means
  the click gets slower over time.

**Fix:** cron that hard-deletes `is_read = true AND created_at < 90 days ago`.
Or archives them to a cheaper table. Add to the existing hourly drip
scheduler.

---

### 🟢 Minor

**3.6 No websocket / push delivery.**

Users see new notifications only when the frontend polls
`/api/notifications/unread/count`. Cadence unclear — need to check
frontend polling interval. Bell counter can lag by up to a minute
even ignoring the cache issue in §3.2.

**Fix:** for real-time UX, add socket.io emit to the recipient's
socket after every create. Otherwise document the polling cadence
so it's clear the badge isn't instant.

**3.7 `link` field is a raw string with no validation.**

`link: '/courses/${courseId}'` is inserted without checking the URL
is well-formed. If a controller ever passes something like
`link: null`, the notification still renders but click does nothing.
And a bad frontend nav path silently sends the user to a 404.

**Fix:** frontend should defensively `href="#"` when `link` is
empty. Server-side, add a light validation that link is either null
or starts with `/`.

**3.8 `NEVER_MUTE` list includes types that don't exist in the ENUM.**

`_isAllowed()` guards `security_alert`, `account_suspension`,
`payment_receipt`, `refund_issued` as never-mutable. But NONE of
those four are in the ENUM. So the "never mute" logic silently does
nothing because the underlying insert throws (§3.1) — the user
"opts out" of a notification type that would have failed anyway.

**Fix:** ties to §3.1. Once the ENUM is a STRING or has these values,
the NEVER_MUTE list matters.

---

## 4. What's NOT broken

- The `_isAllowed(userId, type)` gate is called on both single and
  bulk create paths — user preferences genuinely stop the row from
  landing. Not just a display-time filter.
- The mark/delete endpoints check ownership by returning 404 (not
  403), so an attacker can't tell whether the notification ID exists.
- The unread-count cache is TTL'd at 60s and invalidated on writes
  (except bulk — see §3.2).
- Pagination is correct — no `SELECT COUNT(*)` twice, no missing
  offset math.
- Notifications correctly cascade-delete when the user is deleted.

---

## 5. Prioritized punch list

### P0 — silent breakage today
1. **Notification.type ENUM → STRING** (or add all missing values). §3.1
2. **Invalidate cache on bulk create.** §3.2
3. **Stop swallowing errors on `.catch(() => {})` sites.** §3.3

### P1 — UX
4. **Auto-mark-as-read on notification click.** §3.4
5. **Retention cron: delete read + 90d-old rows.** §3.5

### P2 — polish
6. **WebSocket emit for real-time badge.** §3.6
7. **Normalize duplicated type names** (`enrollment`, `new_enrollment`, `course_enrollment`). §3.1

---

## 6. Files of interest

- `backend/models/Notification.js` — enum + indexes
- `backend/controllers/notifications/notificationsController.js` — the whole controller
- `backend/services/cache/cacheService.js` — Redis-backed count cache
- `backend/controllers/profile/profileController.js` — where `notification_preferences` is written
- `frontend/src/pages/Notifications.jsx` — list UI
- ~20 controller files under `backend/controllers/*/` that call `createNotification`
