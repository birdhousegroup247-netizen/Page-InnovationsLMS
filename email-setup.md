# Email Setup — TekyPro (2026-07-01)

Operator handoff for turning the new email system on in production.
Everything in code is shipped (commits `7cb1c6d` → `20350e3` → `cab5193`).
What's left is configuration — env vars + DNS.

Companion doc: `email-audit.md` (the "why" behind everything below).

---

## Step 1 — Set env vars on Railway (backend service)

Open Railway → backend service → **Variables** tab → add these:

| Env var | Required? | Value | Where to get it |
|---|---|---|---|
| `RESEND_API_KEY` | **YES — P0** | `re_...` | resend.com → API Keys → Create |
| `EMAIL_FROM` | Recommended | `TekyPro <hello@tekypro.com>` (must live on a verified Resend sender domain) | Whatever verified sender you pick |
| `EMAIL_UNSUB_SECRET` | Recommended | Any long random string, e.g. `openssl rand -hex 32` | Anything; kept secret. Falls back to `JWT_SECRET` if unset — works, but rotating `JWT_SECRET` later would invalidate all pending unsubscribe links |
| `FRONTEND_URL` | Should already exist | Student frontend origin | Used for CTA + unsubscribe link URLs |

**Do not remove** the existing SMTP vars (`EMAIL_HOST`, `EMAIL_PORT`, `EMAIL_USER`, `EMAIL_PASSWORD`) — they're the fallback if Resend ever goes down. `RESEND_API_KEY` takes precedence when set.

After adding vars, click **Deploy** (or push any commit to trigger a redeploy).

---

## Step 2 — DNS setup (Namecheap, one-time)

1. Sign up at [resend.com](https://resend.com) (free tier: 3k emails/month, 100/day)
2. Add domain: **Domains → Add Domain → `tekypro.com`**
3. Resend gives you 3 DNS records:
   - 1 `TXT` (DKIM) — required
   - 1 `MX` (return path) — optional but improves deliverability
   - 1 `TXT` (SPF alignment) — required for high-volume
4. Log into Namecheap → Domain List → tekypro.com → **Advanced DNS**
5. Paste each record. Domain verifies in ~1–5 minutes; the Resend dashboard shows "Verified" when done.

---

## Step 3 — Verify it worked

After Railway redeploys with `RESEND_API_KEY` set, look for these lines in the boot log:

```
[Email] Using Resend HTTP API transport
✓ Added email_opt_out column to users
✓ Added bounce_count column to leads
✓ Added share_nudge_sent_at column to certificates
✓ Ensured table exists: email_campaigns
✓ Ensured table exists: email_deliveries
```

If you see `[Email] Using SMTP transport (...)` instead, `RESEND_API_KEY` didn't land — check the env var spelling and redeploy.

---

## Step 4 — Smoke tests

Once boot log looks right:

1. **Verification email** — sign up a fresh test account. Verification email should arrive within seconds (Gmail, Yahoo, Outlook).
2. **Promotional broadcast** — open the admin app → **Growth → Email Campaigns → New Campaign**. Compose a 1-line test, target "All students", click **Send**. On the next drip tick (up to 60 min later) the row flips to `sending` → `sent`. Faster to test: change `dripScheduler.js` cron temporarily to `'*/1 * * * *'`, or restart the backend.
3. **Unsubscribe** — open a test email → click the **Unsubscribe** link in the footer → confirmation page appears → click Confirm → refresh → account should show as opted-out (the next drip email to that user gets skipped).
4. **Lead drip** — the LeadDrip cron will stop the SMTP-timeout log spam. Existing bounced leads (>5 failures) will be marked `bounced_at` and skipped from future runs.

---

## What now exists (full inventory)

### Trigger paths — all wired, all opt-out-aware

| Category | Email | Trigger | Respects opt-out? |
|---|---|---|---|
| **Auth** | `sendVerificationEmail` | Signup / resend / admin-create user | No (transactional) |
| Auth | `sendWelcomeEmail` | After email verified | No (transactional) |
| Auth | `sendPasswordResetEmail` | Forgot-password | No (transactional) |
| **Instructor onboarding** | `sendInstructorApplicationReceived` | Applicant submits | No (transactional) |
| Instructor | `sendNewInstructorApplicationToAdmin` | Fanout to all admins | No (transactional) |
| Instructor | `sendInstructorApprovalEmail` | Admin approves | No (transactional) |
| Instructor | `sendInstructorRejectionEmail` | Admin rejects | No (transactional) |
| Instructor | `sendInstructorRevocationEmail` | Admin revokes | No (transactional) |
| **Enrollment + Payment** | `sendEnrollmentConfirmation` | Any enrol path | No (transactional) |
| Payment | `sendPaymentReceipt` | Immediate on paid enrol | No (transactional). **Currency-aware.** |
| Payment | `sendPaymentCongrats` | +1h post-payment | No (transactional) |
| Payment | `sendRefundConfirmation` | Admin refund | No (transactional). **Currency-aware.** |
| Payment | `sendDiscordInviteEmail` | Discord role granted | No (transactional) |
| **Lead drip (register-not-buy)** | 5 stages (D0/D1/D3/D7/D14) | Registered lead, no purchase | Yes. **New:** bounce cap of 5 → mark `bounced_at`. |
| **Onboarding drip (post-purchase)** | 6 stages (receipt/congrats/D1/D3/D7/D14) | Completed payment | Mixed (receipt + congrats are transactional) |
| **Installment reminders** | 6 stages (D21/D24/D28/D32/D35/D42) | Installment overdue ladder | No (transactional). **Currency-aware.** |
| **Course + Chat** | `sendCourseCompletionEmail` | 100% content complete | Yes |
| Course + Chat | `sendCourseAnnouncement` | **NEW:** Instructor posts (immediate + scheduled cron) | Yes |
| Course + Chat | `sendTestAssignmentEmail` | **NEW:** Test assigned to students | Yes |
| Course + Chat | `sendChatNotificationEmail` | DM / @mention while offline | Yes |
| **Reminders** | `sendLiveSessionStartingEmail` | **NEW:** 15 min before session | Yes |
| Reminders | `sendAssignmentDueSoonEmail` | **NEW:** 24h before due | Yes |
| **Birthday** | `sendBirthdayEmail` | **NEW:** Daily 06:05 UTC cron | Yes |
| **Lifecycle** | `sendReEngagementEmail` | **NEW:** 30-day inactive paid student | Yes |
| Lifecycle | `sendInstructorFirstCoursePublishedEmail` | **NEW:** First draft → published | Yes |
| Lifecycle | `sendInstructorMonthlyEarnings` | **NEW:** 06:15 UTC on the 1st of each month | Yes. **Currency-aware.** |
| Lifecycle | `sendInstructorReviewMilestone` | **NEW:** 10 / 50 / 100 / 250 / 500 / 1000 reviews | Yes |
| Lifecycle | `sendCertificateShareNudge` | **NEW:** 3 days after certificate issued | Yes |
| **Broadcast** | `sendPromotionalEmail` | **NEW:** Admin campaign composer | Yes |

### Admin surface

- **Growth → Email Campaigns** — compose, schedule, send-now, delivery breakdown per campaign (delivered / pending / opted-out / failed with sample errors).
- **Feature flag** — `emailCampaigns` (default `true`) in `frontend-admin/src/config/featureFlags.js`. Flip to `false` if you want to hide the tab without deleting anything.

### Public surface

- `/unsubscribe?type=user|lead&id=X&token=Y` — HMAC-signed token. Handles both users and leads. Idempotent (already-unsubscribed users see a "you're already unsubscribed" state).

### Opt-out semantics

- **Non-transactional** emails (drip, birthday, announcements, reminders, promo, lifecycle) skip opted-out recipients silently. Delivery row logged as `skipped` with reason `opted_out`.
- **Transactional** emails (verification, password reset, receipts, refunds, installment reminders, instructor status changes) always send — legal / operational requirement. These carry `bypassOptOut: true`.

---

## Crons in play (all fire from `dripScheduler`)

| Cron | Cadence | What it does |
|---|---|---|
| Hourly `:05` | Every hour | Lead drip, onboarding drip, installment reminders, campaign worker, cold-student re-engagement, certificate share nudges |
| Announcements | Every 5 min | Delivers scheduled course + admin announcements |
| Session reminders | Every 5 min | 24h / 1h / 15-min live-session ladder (email on 15-min tier) |
| Assignment reminders | Every 5 min | 24h / 1h assignment due-date ladder (email on 24h tier) |
| Session zombie sweep | Hourly | Auto-ends stuck/stale sessions |
| Birthday | `06:05` UTC daily | Sends birthday notif + email |
| Instructor monthly earnings | `06:15` UTC on the 1st | Prior-month revenue summary per instructor |

Campaign worker rate limit: **100 recipients per tick, per campaign**. So a 10k blast on the free Resend plan (3k/month) is deliberately throttled — a single campaign can't drain the daily quota and starve verification / receipt mail.

---

## If something goes wrong

**Emails still failing after Resend setup:**
- Check Railway boot log for `[Email] Using Resend HTTP API transport`. If it says SMTP, `RESEND_API_KEY` isn't set / typo'd.
- Check Resend dashboard → **Emails** → look for the specific `to:` address. Domain unverified? Rate limit hit? Bounced?

**Auto-migrations didn't fire:**
- Grep boot log for `Added <colname> column`. If missing, look for `⚠ Could not add ... : <error>` on the same line for the reason.
- Manual fallback (Postgres): `ALTER TABLE users ADD COLUMN IF NOT EXISTS email_opt_out BOOLEAN NOT NULL DEFAULT false;` (same for `bounce_count`, `bounced_at`, `share_nudge_sent_at`, etc.)

**Unsubscribe token "invalid":**
- Means `EMAIL_UNSUB_SECRET` changed since the email was sent (which invalidates the HMAC). If unset, it falls back to `JWT_SECRET` — so rotating JWT will invalidate every pending unsubscribe link. Set `EMAIL_UNSUB_SECRET` to something stable.

**Campaign stuck in `sending`:**
- Wait one tick (up to 60 min) — the worker batches 100 recipients at a time, then finalizes to `sent` on the next tick when no more `pending` deliveries remain. If it's stuck longer than that, check backend logs for `[campaign-worker]`.

---

## Files changed (last 3 commits)

- `7cb1c6d` — audit report (`email-audit.md`)
- `20350e3` — transport-aware currency + missing wires + broadcast tool
- `cab5193` — lifecycle emails (re-engagement, milestones, share nudge)

Full audit and prioritized punch list in `email-audit.md`. Everything in that file is now done except the P0 (this file's Step 1).
