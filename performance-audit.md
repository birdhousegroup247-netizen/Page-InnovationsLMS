# Performance / DB Audit — Page Innovation (2026-07-01)

Audit of query patterns, indexes, N+1 hotspots, admin list-page
cost, cron memory footprint, connection pooling, and compression.

---

## TL;DR

| Area | Status | Notes |
|---|---|---|
| Connection pool | ✅ Solid | max=10, min=2, acquire 60s, idle 30s, evict 60s |
| SSL + timeout to Railway Postgres | ✅ Solid | `connectTimeout: 60000` guards flaky boot |
| `trust proxy` set | ✅ Correct | `app.set('trust proxy', 1)` at line 35 |
| gzip compression | ✅ Enabled | Level configurable via `COMPRESSION_LEVEL` |
| Explicit `attributes:` on hot queries | ✅ Common | Used on Payment, User, Course reads |
| Pagination on list endpoints | ✅ Standard | page + limit + findAndCountAll pattern |
| Rate limits per-purpose | ✅ Solid | See security-audit §3 |
| Model-level indexes | ✅ Broad | Every FK column indexed; hot filters (status, gateway) indexed |
| **N+1 in campaign worker** | ⚠️ Bug | Per-recipient `findByPk` inside the batch loop |
| **N+1 in cert share nudge** | ⚠️ Bug | Per-certificate `findByPk` on student |
| **`updateCourseProgress` fires per-lesson click** | ⚠️ Cost | ~5 queries per lesson complete per student |
| **Onboarding drip loads all completed payments each tick** | ⚠️ Growth | No filter for "still in-window" — scans everything |
| **Bulk `_isAllowed` uses `for + await`** | ⚠️ Serial | N recipients = N sequential prefs lookups |
| **Notifications retention** | ⚠️ Growth | Never age out (see notifications-audit §3.5) |
| **Admin `getAllPayments` uses `underscored: false`** | ⚠️ Style | Not a perf bug, but mixed conventions bite in raw queries |
| **`Payment.sum('amount')` twice** | ⚠️ Minor | `getStats` runs two full-table sums; both `where` indexed but no partial index |
| **Cloudinary base64 in memory** | ⚠️ RAM | Doubles memory footprint per upload (see uploads-audit §4.2) |
| **No slow-query log threshold** | ⚠️ Blind | `logging: false` in prod; a hot slow query would go unnoticed |

Legend: ✅ solid, ⚠️ caveat

---

## 1. Connection pool + Postgres client

`backend/config/database.js`:

```js
pool: {
  max: 10,          // ← up from 5, reasonable for Railway shared instance
  min: 2,           // ← warm connections avoid cold-start latency
  acquire: 60000,   // ← generous, protects against SSL handshake blips
  idle: 30000,      // ← plenty of time before eviction
  evict: 60000,
}
```

For a container with ~512 MB RAM and moderate load, 10 concurrent
Postgres connections is right. If you scale to two Railway replicas,
that's 20 total connections — still within Postgres defaults.

**SSL** is `require: true, rejectUnauthorized: false` — correct for
Railway's self-signed CA.

**Retry:** 5 attempts with 60s timeout — good boot-time safety net.

---

## 2. Model-level index coverage

Sampled quickly across models:

| Model | Indexes | Missing |
|---|---|---|
| Payment | student_id, course_id, enrollment_id, payment_status, gateway, refs, paystack_reference, paypal_order_id, bundle_id | none obvious |
| Notification | user_id, is_read, created_at | (composite `user_id + is_read` could speed unread-count) |
| Enrollment | student_id + course_id unique, enrollment_date | none obvious |
| ContentProgress | student_id, content_id | (composite `student_id + completed`?) |
| Lead | email, drip_status, registered_at, converted_at, course_interest_id | none obvious |
| Certificate | certificate_id (unique), student_id, course_id, issue_date, composite (student_id + issue_date), (student_id + course_id) | very good coverage |
| EmailDelivery (new) | campaign_id, user_id, lead_id, status | good |
| EmailCampaign (new) | status, scheduled_at, sender_id | good |

**Finding 2.1 — Notification unread count could benefit from composite index.**

The hottest query is `SELECT count(*) FROM notifications WHERE
user_id = X AND is_read = false`. Cached at 60s TTL, but on a
cache miss (or first hit) Postgres has to intersect the two
single-column indexes. A composite `(user_id, is_read)` would let
Postgres nail it with a single index scan.

**Fix:** add `{ fields: ['user_id', 'is_read'] }` to the Notification
model's `indexes:` array. Auto-migration will create it on next
boot. Tiny gain unless you have >100k notifications; still cheap.

---

## 3. Findings — hot paths

### 🟡 Important

**3.1 Campaign worker is N+1 on recipient name lookup.**

`backend/services/email/campaignWorker.js:143-150`:

```js
for (const d of pending) {          // BATCH_SIZE = 100
  if (d.user_id) {
    const u = await User.findByPk(d.user_id, { attributes: ['full_name'] });
    name = u?.full_name || name;
  } else if (d.lead_id) {
    const l = await Lead.findByPk(d.lead_id, { attributes: ['full_name'] });
    name = l?.full_name || name;
  }
  ...
}
```

One SQL round-trip per recipient. For a 100-recipient batch that's
100 sequential queries just to fetch names.

**Fix:** batch-fetch before the loop:
```js
const userIds = pending.filter(d => d.user_id).map(d => d.user_id);
const leadIds = pending.filter(d => d.lead_id).map(d => d.lead_id);
const [users, leads] = await Promise.all([
  User.findAll({ where: { id: userIds }, attributes: ['id', 'full_name'] }),
  Lead.findAll({ where: { id: leadIds }, attributes: ['id', 'full_name'] }),
]);
const nameFor = new Map();
users.forEach(u => nameFor.set(`u${u.id}`, u.full_name));
leads.forEach(l => nameFor.set(`l${l.id}`, l.full_name));
// then in the loop: nameFor.get(`u${d.user_id}`) || nameFor.get(`l${d.lead_id}`)
```
Cuts 100 queries to 2 per tick.

**3.2 Certificate share nudge — same N+1 pattern.**

`backend/services/lifecycle/lifecycleService.js:106-108`:
```js
for (const cert of due) {
  const student = await User.findByPk(cert.student_id, { attributes: ['id', 'email', ...] });
  ...
}
```
Same fix — batch-fetch students before the loop.

**3.3 `updateCourseProgress` fires on every lesson complete.**

Already flagged in course-lifecycle-audit §3.1. Restating here for
the perf lens: 5 queries × N lessons a student completes per session.
A student doing 20 lessons in an evening triggers ~100 queries just
for progress recomputation.

**Fix:** debounce — only run the full recompute if the "completed
count" delta actually changed since the last cache read. Cheaper:
skip the `Certificate.findOne` check unless `progressPercentage >= 99`.

**3.4 Onboarding drip loads *every* completed payment each tick.**

`backend/services/drip/onboardingDripService.js:83-93`:
```js
const payments = await Payment.findAll({
  where: {
    payment_status: 'completed',
    payment_date: { [Op.ne]: null },
  },
  include: [...],
  limit: 200,
});
```
Every hour, this pulls up to 200 completed payments — even ones
where every onboarding step already fired months ago. The stamp
check happens inside the loop.

**Fix:** narrow the query to payments where the ladder isn't
finished:
```js
payment_date: { [Op.gte]: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000) },
```
The last drip step fires at +14d — anything older can't possibly
have a remaining step. Cuts the working set to just recent
payments.

**3.5 `_isAllowed` inside `createBulkNotifications` is serialized.**

`backend/controllers/notifications/notificationsController.js:278-291`:
```js
for (const n of notifications) {
  // eslint-disable-next-line no-await-in-loop
  if (await NotificationsController._isAllowed(n.user_id, n.type)) {
    filtered.push(n);
  }
}
```
N recipients = N sequential DB round-trips before any insert.

**Fix:** batch-fetch:
```js
const userIds = [...new Set(notifications.map(n => n.user_id))];
const users = await User.findAll({
  where: { id: userIds },
  attributes: ['id', 'notification_preferences'],
});
const prefsFor = new Map(users.map(u => [u.id, u.notification_preferences || {}]));
const filtered = notifications.filter(n => {
  const pref = prefsFor.get(n.user_id)?.[n.type];
  return !pref || pref.in_app !== false;
});
```
Cuts N queries to 1. Big win on announcement fanouts (hundreds of
recipients).

---

### 🟢 Minor

**3.6 Admin `getStats` runs full-table sums.**

`backend/controllers/admin/paymentsController.js` `getStats`:
```js
Payment.sum('amount', { where: { payment_status: 'completed' } })
Payment.sum('amount', { where: { payment_status: 'completed', payment_date: {...} } })
Payment.sum('refund_amount', { where: { payment_status: 'refunded' } })
```
As `payments` grows to millions, each `sum` is a full index scan on
`payment_status`. Cache the "total revenue" number for 5 minutes;
recalculate only on write. Or use a materialized view.

Not needed today. Worth flagging for the "10k paying customers"
future.

**3.7 No slow-query log threshold.**

`logging: process.env.NODE_ENV === 'development' ? console.log : false`
— in prod, Sequelize doesn't log anything. A single 5-second query
in a heavy endpoint would be invisible.

**Fix:** in prod, log queries slower than a threshold:
```js
logging: process.env.NODE_ENV === 'production'
  ? (sql, timing) => { if (timing > 500) logger.warn(`SLOW ${timing}ms: ${sql.slice(0, 200)}`); }
  : console.log,
benchmark: true,  // required for the timing arg
```
Then you get slow-query alerts without drowning in logs.

**3.8 Cron limits are per-batch, not per-tick.**

Most crons have `limit: 200` on the outer query — that's per-tick,
so a queue backlog of 1000 items takes 5 ticks to clear. Fine as a
throttle, but for the reengagement / share-nudge crons where "one
email per user per week" is the intent, the batching is largely
theoretical.

Non-issue at current scale.

**3.9 `underscored: false` mixed with underscored tables.**

Some models declare `underscored: true` (Notification, Bundle, etc.),
most inherit the default `underscored: false` from
`define: { underscored: false }` in the sequelize config. In
practice column names are snake_case everywhere anyway, but the
mixed convention could bite anyone writing raw queries later.

Not perf, just consistency. Non-blocking.

---

## 4. What's NOT broken

- Connection pool sizing is thoughtful, not just defaults.
- Every FK column is indexed. No naive `WHERE course_id = X` full
  scans anywhere I saw.
- `attributes:` is used to limit column reads on most hot queries.
- `findAndCountAll` with page + limit is the standard admin-list
  pattern — no accidental unbounded scans.
- Rate limiters both protect Postgres and are reasonable UX.
- `Model.sync({ force: false })` — no destructive re-syncs at boot.
- Compression is enabled with configurable level.
- Redis-backed unread-count cache reduces the hottest query.
- Cron jobs use `limit: N` — no unbounded fanout.
- The bundle-purchase side-effects and campaign fanout batch inserts
  via `bulkCreate`, not per-row `create`.
- Sequelize is used for every hot-path query — parameterized, so no
  plan-cache poisoning.

---

## 5. Prioritized punch list

### P1 — real query cost savings today
1. **Batch user/lead lookups in `campaignWorker`.** §3.1
2. **Batch student lookups in `processCertificateShareNudges`.** §3.2
3. **Narrow `onboardingDripService.processOnboarding` to payments < 15 days old.** §3.4
4. **Batch `_isAllowed` prefs lookup in `createBulkNotifications`.** §3.5

### P2 — future-scale
5. **Debounce `updateCourseProgress`** — skip recompute when completed count didn't change. §3.3
6. **Composite `(user_id, is_read)` index on notifications.** §2.1
7. **Slow-query log threshold in prod.** §3.7

### P3 — polish
8. **Cache `getStats` for 5 min once payments > 100k.** §3.6

---

## 6. Files of interest

- `backend/config/database.js` — pool config
- `backend/server.js` — trust proxy, compression
- `backend/services/email/campaignWorker.js` — N+1 in batch loop
- `backend/services/lifecycle/lifecycleService.js` — N+1 in share-nudge loop
- `backend/services/drip/onboardingDripService.js` — full scan every hour
- `backend/controllers/notifications/notificationsController.js` — bulk _isAllowed serial
- `backend/controllers/courses/progressController.js` — per-lesson recompute
- `backend/controllers/admin/paymentsController.js` — full-table sums in stats
