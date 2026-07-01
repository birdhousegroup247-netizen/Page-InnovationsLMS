# Email Audit — TekyPro (2026-07-01)

End-to-end audit of every automated email the platform sends (or should
be sending) across the 3 apps. Covers transports, trigger paths,
templates, drip sequences, and gaps.

---

## TL;DR — what's working, what's broken

| Area | Status | Notes |
|---|---|---|
| Transport (Resend HTTP) | ✅ Available | Preferred when `RESEND_API_KEY` set — bypasses Namecheap SMTP block |
| Transport (Nodemailer SMTP fallback) | ❌ Broken in prod | Railway logs show `Connection timeout` on every attempt to Namecheap SMTP |
| Registration verification (link + 6-digit code) | ✅ Working | Blocks account activation until verified |
| Welcome email (paid user) | ✅ Working | After email verification |
| Password reset | ✅ Working | 1-hour expiring link |
| Instructor apply (applicant + admin) | ✅ Working | Applicant confirm + admin fanout |
| Instructor approve / reject / revoke | ✅ Working | Old inline templates (branding drift) |
| Payment receipt | ✅ Working | Fires from `runPostCommitSideEffects` + onboarding drip |
| Payment congrats ("you're in!") | ✅ Working | +1h delay via onboarding drip |
| Refund confirmation | ✅ Working | Fires on admin refund action |
| Installment 7-stage reminder ladder | ✅ Working | D21 → D42 escalation, idempotent |
| Course completion (with certificate link) | ✅ Working | Fires from `progressController` on 100% |
| Course enrollment confirmation | ✅ Working | Both paid + admin comp paths |
| Lead drip (5 stages, register-but-not-buy) | ⚠️ Working but crashing | Emails fine when transport OK; **SMTP timeout is what your Railway logs show** |
| Onboarding drip (6 stages after purchase) | ✅ Working | Receipt / congrats / d1 / d3 / d7 / d14 |
| Chat DM + @mention email | ✅ Working | Only when recipient offline |
| Discord invite email | ✅ Working | Sent when linked-course role is granted |
| **Birthday email** | ❌ Missing | In-app notification only — no email counterpart |
| **Test assignment email** | ❌ Never triggered | Template `sendTestAssignmentEmail` exists but no call site |
| **Course announcement email** | ❌ Never triggered | Template `sendCourseAnnouncement` exists but no call site |
| **Assignment publish / due-date reminders** | ❌ In-app only | Notification fires, no email |
| **Live session starting soon** | ❌ In-app only | No email nudge before session start |
| **Promotional / seasonal emails** | ❌ Missing | No marketing broadcast pipeline |
| **Certificate download link (post-completion)** | ✅ Included | Rolled into completion email |
| **Currency in payment emails** | ⚠️ Wrong | Hardcoded `$` — same bug just fixed on the UI side |
| **Chat notification email template** | ⚠️ Off-brand | Uses old inline HTML (not `_baseTemplate`) |
| **Course completion / test / instructor emails** | ⚠️ Off-brand | Old inline HTML (not `_baseTemplate`) |
| **Unsubscribe link** | ⚠️ Broken | `_baseTemplate` renders `/unsubscribe` link but there is no unsubscribe route or model |

Legend: ✅ works, ⚠️ caveat, ❌ broken / missing

---

## 1. Transport layer

`backend/services/email/emailService.js` supports two transports, decided
by env at boot:

| Transport | When it's used | Notes |
|---|---|---|
| **Resend HTTP API** | `RESEND_API_KEY` is set | Preferred. Bypasses outbound SMTP block on Railway. Timeout 15s. |
| **Nodemailer SMTP** | `RESEND_API_KEY` unset AND `EMAIL_HOST` set | Fallback. Reads `EMAIL_HOST/PORT/USER/PASSWORD`. Timeouts: 10s connect / 15s socket / 10s greeting. |
| _(none)_ | Neither configured | Emails throw. Logged as `[Email] No transport configured`. |

**Prod today (from your Railway logs at 10:05 / 11:05):**
```
[error]: Email send failed (SMTP) to alexneutron4k@gmail.com: Connection timeout
[error]: [LeadDrip] Failed sendLeadWelcome for lead 1 (alexneutron4k@gmail.com): Failed to send email: Connection timeout
```

That's the SMTP fallback — meaning `RESEND_API_KEY` is not set on the
Railway backend service, so the code fell through to Nodemailer /
Namecheap SMTP, which Railway's egress blocks. This has been the
open issue tracked in [[project-smtp-email-blocker]] since before the
finance audit.

**The single fix that unblocks all of this:** create a Resend account,
generate an API key, set it as `RESEND_API_KEY` on the Railway backend
service, and redeploy. All 30+ email trigger paths inherit the new
transport automatically.

---

## 2. Email inventory (all 25 templates)

Grouped by trigger source.

### Registration + Auth
| Template | Trigger | Called from |
|---|---|---|
| `sendVerificationEmail` | Signup / resend-verification / admin-created user | `authController.register`, `authController.resendVerification`, `adminUsersController.createUser` |
| `sendWelcomeEmail` | After email verification succeeds | `authController.verifyEmail` |
| `sendPasswordResetEmail` | Forgot-password request | `authController.forgotPassword`, `adminUsersController.sendPasswordReset` |
fix a
### Instructor onboarding
| Template | Trigger |
|---|---|
| `sendInstructorApplicationReceived` | User submits application |
| `sendNewInstructorApplicationToAdmin` | Fanout to all admins on submission |
| `sendInstructorApprovalEmail` | Admin approves |
| `sendInstructorRejectionEmail` | Admin rejects |
| `sendInstructorRevocationEmail` | Admin revokes an existing instructor |

### Enrollment + payment
| Template | Trigger | Notes |
|---|---|---|
| `sendEnrollmentConfirmation` | Free enrol, admin comp, paid enrol | Both `courseController.enroll` and admin manual enroll |
| `sendPaymentReceipt` | Onboarding drip step 1 (immediate) + shared enrollment helper | Currency hardcoded `$` |
| `sendPaymentCongrats` | Onboarding drip step 2 (+1h) + shared enrollment helper | |
| `sendRefundConfirmation` | Admin refund action | |

### Onboarding drip (post-purchase Sequence B, hourly cron)
| Template | Trigger delay |
|---|---|
| `sendPaymentReceipt` | immediate |
| `sendPaymentCongrats` | +1h |
| `sendOnboardingD1` | +1 day |
| `sendOnboardingD3` | +3 days |
| `sendOnboardingD7` | +7 days |
| `sendLeadFollowupD14` | +14 days (reused from lead drip) |

### Lead drip (register-but-didn't-buy Sequence A, hourly cron)
| Template | Trigger delay | Notes |
|---|---|---|
| `sendLeadWelcome` | immediate on registration | This is what's failing in your Railway log |
| `sendLeadFollowupD1` | +1 day | |
| `sendLeadFollowupD3` | +3 days | |
| `sendLeadFollowupD7` | +7 days | |
| `sendLeadFollowupD14` | +14 days | Includes optional coupon block |

### Installment overdue (Sequence C, hourly cron)
| Template | When | Effect |
|---|---|---|
| `sendInstallmentReminderD21` | Day due | Friendly nudge |
| `sendInstallmentReminderD24` | +3d overdue | Orange banner |
| `sendInstallmentReminderD28` | +7d overdue | "4 days until restriction" |
| `sendInstallmentReminderD32` | +11d overdue | Partial lock notice |
| `sendInstallmentReminderD35` | +14d overdue | Soft lock notice |
| `sendInstallmentSuspendedD42` | +21d overdue | Hard lock — user suspended |

### Miscellaneous wired
| Template | Trigger |
|---|---|
| `sendChatNotificationEmail` | New DM or @mention while recipient offline |
| `sendDiscordInviteEmail` | Discord link granted for a course |
| `sendCourseCompletionEmail` | 100% content complete in `progressController` |

### Defined but never called
| Template | Should trigger on |
|---|---|
| `sendTestAssignmentEmail` | Test published + assigned to student |
| `sendCourseAnnouncement` | Instructor posts announcement |

---

## 3. Specific findings (by severity)

### 🔴 Critical — actively broken in prod

**3.1 Namecheap SMTP is timing out.**
Log entries at 10:05 and 11:05 today. Every hour, the LeadDrip cron
tries `sendLeadWelcome` for one lead and it fails with `Connection
timeout`. The lead's `drip_status` stays at `registered` and gets
retried every hour, forever, until the transport is fixed.

Fix (5 min of configuration, no code):
1. Sign up at https://resend.com (free tier: 3k emails / mo, 100 / day)
2. Verify a sending domain (tekypro.com — DKIM records via Namecheap DNS)
3. Generate an API key
4. On Railway, set env var `RESEND_API_KEY=re_...` on the backend service
5. Redeploy — boot log will show `[Email] Using Resend HTTP API transport`

If Resend is out of scope: any HTTP-based transactional provider works
(Postmark, SendGrid, Mailgun, SES). The `_sendViaResend` method is a
thin axios wrapper — swappable in ~30 lines.

**3.2 Failed leads never dead-letter.**
`leadDripService.processLeads` catches per-lead errors and just logs.
There's no retry cap and no way for a lead to age out. If a lead is
stuck at `welcome_sent` failed 100 times, we still retry the next
step (D1) once the first succeeds.

Cheap fix: after N (say 5) consecutive failures for the same
`drip_status`, flip a `bounced` flag on the Lead and skip it from
future runs. Log once at flip-time.

---

### 🟡 Important — missing email triggers

**3.3 Birthday: notification-only.**
`birthdayService.runDailyBirthdayJob` fires an in-app notification but
does NOT send an email. Users who don't open the app on their birthday
never see the wish.

Fix: add `sendBirthdayEmail(email, name)` to `emailService.js` and call
it from `runDailyBirthdayJob` alongside the existing notification.
Reuse the same warm-toned copy that's already written for the
notification message.

**3.4 Test assignment email defined but never sent.**
`sendTestAssignmentEmail` exists in `emailService.js` but no controller
calls it. When an instructor publishes a test to a student, only an
in-app notification fires (via `NotificationsController`).

Fix: in `assignedTestsController` / `TestAssignment.create` path, fire
`emailService.sendTestAssignmentEmail(...)` after the assignment row
is created, alongside the notification.

**3.5 Course announcement email defined but never sent.**
Same story — `sendCourseAnnouncement` template is written but no call
site. Instructors post; students get an in-app notification but no
email.

Fix: in `courseAnnouncementController.create`, loop enrolled students
and fire `emailService.sendCourseAnnouncement(...)` (fire-and-forget
per student). Rate-limit / batch if a course has thousands of
students.

**3.6 Live session about to start — no email.**
Attendance code goes live, in-app notification fires. But someone who's
not in the app that day just misses class. There's no "your live
session with <instructor> starts in 15 minutes" email.

Fix: add `sendLiveSessionStartingEmail` template + a small worker in
`live-sessions/liveSessionsController` (or the existing zombie-sweep
cron) that fires ~15 min before the scheduled start.

**3.7 Assignment due-date reminder — no email.**
The 24h / 1h ladder for assignments already sends notifications. Add
matching emails for the 24h step (1h is too close to be useful via
email).

---

### 🟢 Polish / consistency

**3.8 Currency: payment receipt + installment reminders hardcode `$`.**
Same bug just fixed on the UIs. `sendPaymentReceipt`,
`sendInstallmentReminderD21..D42`, `sendRefundConfirmation` all format
`$${amount.toFixed(2)} USD`. If a payment lands in NGN, the email
lies.

Fix: extract a small `formatEmailCurrency(amount, currency)` helper (or
`Intl.NumberFormat` inline) and pass `payment.currency` down. Same
symbol-map fallback as the frontend `currency.js` util we shipped in
`cd8a3bf`.

**3.9 Template inconsistency.**
Half the templates use the new `_baseTemplate()` shell (clean red-blue
brand, header-block, CTA button). The other half — course completion,
test assignment, instructor approve/reject/revoke, course
announcement, chat notification — use the old inline `<style>` blocks
with a lavender gradient header.

Fix: rewrite the ~7 legacy templates to call `_baseTemplate({title,
body, ctaText, ctaUrl, headerColor})`. Cuts ~500 lines and the whole
service looks like one product again.

**3.10 Unsubscribe link is a dead route.**
`_baseTemplate` puts `<a href="${FE}/unsubscribe">Unsubscribe</a>` in
every email footer. There is no `/unsubscribe` route in the frontend
and no `email_preferences` table. Compliance risk if a recipient tries
to unsubscribe and hits a 404.

Fix (small): add an `email_opt_out` boolean to `users` (default
false) + `unsubscribed_leads` table for leads (they aren't users
until they buy). Add `/api/email/unsubscribe?token=...` route that
flips the flag. Every send path reads the flag before firing.

**3.11 Chat notification email is off-brand.**
Uses inline gradient purple. Simplify to `_baseTemplate` and reuse the
brand red-blue.

**3.12 Onboarding drip doesn't respect refunds.**
`onboardingDripService.processOnboarding` pulls every `completed`
payment and walks the 6-step ladder. Once a payment is `refunded`,
the drip stops (since the query filters on `completed`). But if the
refund happens between steps 3 and 4, the student has already
received the D3 email. Minor — not a bug so much as an inconsistency
worth documenting.

---

### 🟢 Missing features from your list

**3.13 Promotional / seasonal emails.**
There's no admin broadcast tool. The audit's Growth section mentions
Coupons + Referrals but neither of those emails a discount code out
proactively.

What we'd want:
- Admin composer: title, body, target segment (`all students | students
  who haven't enrolled in 30 days | instructors only | bundle X
  owners`), send/schedule button
- Rate-limited worker (say 500 / hour) so we don't blow the Resend
  quota
- Delivery tracking per campaign (`email_campaigns` + `email_deliveries`
  tables)

Non-trivial — a whole feature. Flagging so it's not lost.

**3.14 Follow-up emails after course completion.**
"You finished course X — here's course Y" cross-sell. Zero code today.
Could be an offshoot of promotional emails (segment = "students who
completed course X but haven't enrolled in course Y").

**3.15 Certificate share nudges.**
Congrats email includes a certificate download link but no LinkedIn
share prompt or "email your certificate to your manager" flow.

**3.16 Re-engagement for cold students.**
Student pays, does the D1/D3/D7/D14 drip, then falls off. There's no
"we haven't seen you in 30 days — come back and finish course X"
nudge.

**3.17 Instructor lifecycle emails.**
Once an instructor is approved, they don't get:
- "Your first course has been published!"
- Monthly earnings summary
- "You have 5 new reviews this week"
- New student milestone ("Congrats, 100 students have enrolled!")

---

## 4. What's NOT broken

- Idempotency: onboarding drip tracks `metadata.onboarding_sent[]`,
  installment drip tracks `metadata.reminders_sent[]`, lead drip
  advances via `drip_status` enum. No template ever re-fires.
- Batching: all cron workers have `limit: 50-200` on their queries so
  a queue backlog doesn't fan out into thousands of parallel sends.
- Error isolation: every drip step has its own try/catch. One failed
  send doesn't halt the batch.
- Fire-and-forget from controllers: no controller awaits an email
  send in the request path — the API stays snappy even when the
  transport is slow.
- Verification code + link both work — code fallback saves users
  whose email client strips buttons.
- Password reset link expires (1h) — CSRF-safe.

---

## 5. What needs doing (prioritized)

### P0 — production is silently failing right now
1. **Get emails actually delivering.** Set `RESEND_API_KEY` (or another
   HTTP transactional provider) on Railway. See §3.1.

### P1 — silent gaps that hurt UX every day
2. **Bounce cap on lead drip** — 5 consecutive failures → mark lead
   `bounced`, skip forever. §3.2
3. **Birthday email** — pair the existing notification with an email.
   §3.3
4. **Test assignment email** — wire up the template that already
   exists. §3.4
5. **Course announcement email** — wire up the template that already
   exists. §3.5
6. **Currency in payment emails** — read `payment.currency`, stop
   hardcoding `$`. §3.8

### P2 — polish / branding
7. **Live session starting-in-15-min email.** §3.6
8. **Assignment due-date email (24h)** — mirror the notification. §3.7
9. **Template consistency** — port ~7 legacy inline-HTML templates to
   `_baseTemplate`. §3.9
10. **Unsubscribe** — actually implement the link that's already in
    every footer. §3.10

### P3 — new features from your list
11. **Promotional broadcast admin tool + delivery tracking.** §3.13
12. **Course completion cross-sell + share nudges.** §3.14, §3.15
13. **Cold-student re-engagement.** §3.16
14. **Instructor lifecycle emails.** §3.17

---

## 6. Files of interest

- `backend/services/email/emailService.js` — the singleton, all templates
- `backend/services/drip/dripScheduler.js` — hourly cron
- `backend/services/drip/leadDripService.js` — Sequence A
- `backend/services/drip/onboardingDripService.js` — Sequence B
- `backend/services/drip/installmentReminderService.js` — Sequence C
- `backend/services/birthday/birthdayService.js` — daily 06:05 UTC
- `backend/services/enrollment/enrollmentService.js` — receipt +
  congrats fire from here on payment completion
- `backend/controllers/auth/authController.js` — verify / welcome /
  password reset
- `backend/controllers/admin/instructorApplicationController.js` —
  approve / reject / revoke
- `backend/controllers/discord/discordController.js` — invite email
- `backend/controllers/chat/chatController.js` — DM / mention email
- `backend/controllers/courses/progressController.js` — course
  completion email

---

## 7. Next-session pickup

**Do first (5 minutes, no code):** Set `RESEND_API_KEY` on Railway.
That single change unblocks 30+ email paths and stops the hourly
LeadDrip error spam in the logs.

Then work through the P1 punch list — most items are 15–30 min each
because the templates already exist; they just need call-site wiring
and a currency helper.
