# Page Innovation LMS — Full End-to-End QA Prompt

Copy everything below the `---` line into a fresh Claude / agent session,
or use it as a manual QA script. Each section has a goal, exact steps,
expected outcome, and a pass/fail box. Don't skip — order matters
(later flows depend on data created in earlier ones).

---

# Role

You are a QA engineer running a deep end-to-end production smoke test on
the Page Innovation LMS. Your job: exercise every critical user path on the live
Railway deployment, capture failures with exact reproduction steps, and
report a final pass/fail per area.

# Environment under test

- **Backend API:** https://pageinnovationlms-production.up.railway.app
- **Student frontend:** https://pageinnovation-student-production.up.railway.app
- **Admin frontend:** https://pageinnovation-admin-production.up.railway.app
- **PayPal mode:** sandbox (use sandbox buyer account, NOT a real card)
- **Email:** noreply@pageinnovation.com via cPanel SMTP — check the inbox you
  sign up with for real deliveries
- **Discord:** bot is configured but `GUILD_ID` is missing — Discord
  features should gracefully no-op, NOT crash

# Rules of engagement

1. Test in the order written. Each phase builds on data from the previous.
2. For each step, record: **PASS** / **FAIL** / **BLOCKED** + one-line note.
3. On FAIL: capture the request URL, status code, response body, and
   browser console errors. Don't move on until you've logged enough to
   reproduce.
4. Use a real disposable email (Gmail `+` aliases work) so you can
   actually receive verification mails.
5. Use **incognito windows** to keep student and admin sessions separate.
6. Don't test with a single browser session for two roles — log out fully.

---

# PHASE 0 — Infrastructure health (5 min)

**Goal:** confirm backend is up and DB is reachable before exercising UI.

| # | Action | Expected | Result |
|---|--------|----------|--------|
| 0.1 | `curl https://pageinnovationlms-production.up.railway.app/live` | 200, JSON with `alive:true` | |
| 0.2 | `curl https://pageinnovationlms-production.up.railway.app/ready` | 200, JSON with `ready:true` | |
| 0.3 | `curl https://pageinnovationlms-production.up.railway.app/health` | 200 (or 503 if Redis is intentionally off) | |
| 0.4 | Open student URL in browser | App shell loads, no white screen, no 502 | |
| 0.5 | Open admin URL in browser | App shell loads, no white screen, no 502 | |
| 0.6 | Open DevTools → Network on both | No CORS errors on initial API calls | |
| 0.7 | Open DevTools → Console on both | No uncaught errors on first paint | |

**Stop here if any of 0.1–0.6 fail.** No point testing UI on a broken backend.

---

# PHASE 1 — Student signup & auth (15 min)

**Goal:** prove a new user can register, verify, log in, and recover.

## 1.A Email signup
- Go to student URL → **Sign Up**.
- Email: `yourname+tekyqa1@gmail.com`, full name, strong password.
- Submit.
- **Expected:** success message + verification email in inbox within 60s.

## 1.B Email verification
- Open the verification email → click link.
- **Expected:** redirected to student app, account marked verified.
- **Check:** can you log in now? Did unverified state block login earlier?

## 1.C Login + logout
- Log out. Log back in with the new credentials.
- **Expected:** lands on dashboard. Refresh — still logged in.
- Log out — protected routes redirect to /login.

## 1.D Forgot password
- Click **Forgot password** → enter the test email → submit.
- **Expected:** reset email arrives. Click link, set new password, log in.

## 1.E Google OAuth (only if `GOOGLE_CLIENT_SECRET` is set in Railway)
- Try **Continue with Google**.
- If secret is missing, button should not crash app — should either be
  hidden or show a clean "not configured" error.

## 1.F Session persistence + refresh tokens
- Log in → leave tab open 5 min → make an API-backed action.
- **Expected:** no silent logout, no 401 storm.

| # | Path | Result |
|---|------|--------|
| 1.A | Email signup | |
| 1.B | Verification | |
| 1.C | Login/logout | |
| 1.D | Forgot password | |
| 1.E | Google OAuth | |
| 1.F | Session refresh | |

---

# PHASE 2 — Admin signup / first admin login (10 min)

**Goal:** confirm admin app accepts the seeded admin credentials, and
that the admin UI loads its dashboard data.

## 2.A Admin login
- Open admin URL in **a separate incognito window**.
- Log in with the seeded admin account (see `logs/file`).
- **Expected:** lands on admin dashboard. Sidebar renders all sections.

## 2.B Dashboard widgets
- Verify each widget loads without error:
  - Total users, total courses, active enrollments, revenue tile
- No `NaN`, no "loading…" stuck forever.

## 2.C Role gates
- Try to hit an instructor-only or super-admin-only route as the seeded
  admin — should either work (if super-admin) or show clean 403.

| # | Path | Result |
|---|------|--------|
| 2.A | Admin login | |
| 2.B | Dashboard widgets | |
| 2.C | Role gates | |

---

# PHASE 3 — Admin: create catalog data (20 min)

**Goal:** create the test fixtures the rest of the flow needs. Do this as
admin before going back to the student.

## 3.A Create an instructor user
- Admin → Users → Create user → role=instructor, real email you control.
- Verify the welcome / set-password email arrives.

## 3.B Assign instructor to a course
- Admin → Courses → pick an existing course (or create one) → Assign instructor.
- **Expected:** instructor name shows in course detail, instructor sees
  the course in their instructor dashboard.

## 3.C Create a free course
- Title: "QA Free Course", price=0, status=published.
- Add 2 lessons (text + video URL), 1 quiz, 1 assignment.

## 3.D Create a paid course
- Title: "QA Paid Course", price=10 (sandbox-friendly small amount),
  status=published.
- Add 1 lesson, 1 quiz.

## 3.E Drip schedule on the paid course
- Set lesson 2 to drip-release 7 days after enrollment.
- **Expected:** student sees lesson 2 as locked with unlock date.

## 3.F Course bundle
- Create a bundle containing the free + paid course at a discounted price.

## 3.G Global announcement
- Admin → Announcements → create active announcement.
- **Expected:** student app shows banner on next page load.

| # | Path | Result |
|---|------|--------|
| 3.A | Create instructor | |
| 3.B | Assign instructor | |
| 3.C | Free course | |
| 3.D | Paid course | |
| 3.E | Drip schedule | |
| 3.F | Bundle | |
| 3.G | Announcement | |

---

# PHASE 4 — Student: catalog, search, enrollment (20 min)

## 4.A Catalog browse
- Student → Courses. See free + paid + bundle.
- Filter by category / price / level. Each filter should change results.

## 4.B Global search
- Search "QA" in header search.
- **Expected:** both QA courses appear in results.

## 4.C Wishlist
- Add paid course to wishlist → go to wishlist page → confirm it's there.
- Remove → confirm gone.

## 4.D Free enrollment
- Open "QA Free Course" → Enroll.
- **Expected:** instant enrollment, enrollment confirmation email,
  course appears in "My Courses".

## 4.E Drip content gating (check on the paid course AFTER 4.G)
- Open paid course → lesson 1 accessible, lesson 2 shows lock with
  unlock date.

## 4.F Prerequisites
- If any course has a prerequisite, attempt enrollment without completing
  it. Should be blocked with a clear message.

## 4.G PayPal sandbox checkout (the big one)
- Open "QA Paid Course" → Enroll → Pay with PayPal.
- PayPal popup opens → log in with a **sandbox buyer** account
  (developer.paypal.com → Sandbox accounts).
- Approve payment.
- **Expected:**
  - Redirect back to course → enrolled
  - Receipt email arrives
  - Payment row in admin Revenue dashboard within 30s
  - Webhook handled (check backend logs for `PAYMENT.CAPTURE.COMPLETED`)
- **Failure to watch for:** double-charge, stuck "pending" state, missing
  capture record.

## 4.H Bundle purchase
- Buy the bundle via PayPal sandbox.
- **Expected:** BOTH courses become enrolled in one transaction.

## 4.I Referral
- Get referral link from profile → open in another incognito → sign up
  via that link.
- **Expected:** referrer credit recorded, visible on referral dashboard.

| # | Path | Result |
|---|------|--------|
| 4.A | Catalog | |
| 4.B | Search | |
| 4.C | Wishlist | |
| 4.D | Free enroll | |
| 4.E | Drip gating | |
| 4.F | Prereqs | |
| 4.G | PayPal checkout | |
| 4.H | Bundle purchase | |
| 4.I | Referral | |

---

# PHASE 5 — Student: learning experience (25 min)

## 5.A Video / lesson playback
- Open lesson 1 of free course. Video plays (or content renders).
- Progress bar updates as you scroll/watch.

## 5.B Mark complete
- Mark lesson complete → return to course page → progress % updates.

## 5.C Quiz
- Take the quiz. Submit. See score immediately.
- Retake (if allowed) — should reset attempt counter correctly.

## 5.D Assignment submission
- Upload an assignment file (small PDF).
- **Expected:** file uploads to Cloudinary, appears in instructor grading view.

## 5.E Discussion forums
- Post a question in the course forum. Reply to it from same account
  (or another).
- **Expected:** post visible, reply threads correctly, no XSS in rendered
  markdown (try `<script>alert(1)</script>` — must render escaped).

## 5.F Live sessions
- If a live session is scheduled, attempt to join.
- **Expected:** redirect to Zoom join URL, or clean "not yet started" message.

## 5.G Certificate
- Complete all lessons + pass quiz in the free course.
- **Expected:** certificate generated, downloadable PDF with correct
  name, course title, issuer (Page Innovation), URL.

## 5.H Discord linking (will no-op until GUILD_ID arrives)
- Click "Link Discord". Should either go through OAuth or show a clean
  "Discord not configured yet" message — **must not crash**.

| # | Path | Result |
|---|------|--------|
| 5.A | Playback | |
| 5.B | Mark complete | |
| 5.C | Quiz | |
| 5.D | Assignment | |
| 5.E | Discussions (+XSS) | |
| 5.F | Live session | |
| 5.G | Certificate | |
| 5.H | Discord no-op | |

---

# PHASE 6 — Instructor flow (15 min)

Switch to the instructor account created in 3.A.

## 6.A Instructor dashboard
- Login → instructor sees only assigned courses.

## 6.B Grade assignment
- Open the assignment submitted in 5.D → grade it → student sees grade.

## 6.C Review submissions
- Verify list of submissions, ability to download student files.

## 6.D Instructor announcement
- Post a course-level announcement → enrolled student sees it.

| # | Path | Result |
|---|------|--------|
| 6.A | Dashboard | |
| 6.B | Grade | |
| 6.C | Review | |
| 6.D | Announcement | |

---

# PHASE 7 — Admin: operational tools (20 min)

## 7.A Enrollment management
- Admin → Enrollments → manually enroll the test student in a new course.
- Verify they see it. Manually unenroll. Verify it's gone.

## 7.B Revenue dashboard
- Open Revenue → confirm the sandbox payment from 4.G appears, with
  correct amount, gateway=paypal, status=completed.

## 7.C Refund flow (if implemented)
- Issue a refund on the sandbox payment. Verify status changes and
  enrollment is revoked.

## 7.D Bulk user CSV import
- Prepare a CSV with 3 rows (email, name, role).
- Upload → verify all 3 users created, welcome emails sent.
- Try a CSV with one bad row → expect partial success + clear error report.

## 7.E Course clone
- Pick a course → Clone → verify new copy with all lessons/quizzes,
  enrollments NOT carried over.

## 7.F Global announcement teardown
- Deactivate the announcement from 3.G → student no longer sees banner.

| # | Path | Result |
|---|------|--------|
| 7.A | Enrollments | |
| 7.B | Revenue | |
| 7.C | Refund | |
| 7.D | CSV import | |
| 7.E | Clone | |
| 7.F | Announcement off | |

---

# PHASE 8 — Cross-cutting concerns (15 min)

## 8.A CSRF
- Open DevTools → try to POST to `/api/courses` from a different origin
  via fetch with credentials. Expect 403 (CSRF token missing).

## 8.B Rate limiting
- Spam the login endpoint with 20+ bad attempts in 30s.
- Expect 429 with a sensible retry-after.

## 8.C Headers
- `curl -I` the backend root. Check for: `Strict-Transport-Security`,
  `X-Content-Type-Options: nosniff`, `X-Frame-Options`,
  `Content-Security-Policy`, `Referrer-Policy`.

## 8.D HTTPS redirect
- `curl -I http://pageinnovationlms-production.up.railway.app/api/courses`
- Expect 301 to https. (But `/live`, `/ready`, `/health` should NOT
  redirect — they're exempt.)

## 8.E File upload limits
- Try uploading a 20MB file as an assignment. Should reject with a
  clean "too large" message (limit is 10MB).

## 8.F XSS in profile name
- Change profile name to `<script>alert(1)</script>` → save → reload.
- Should render as text, NOT execute.

## 8.G SQL injection smoke
- Try `' OR 1=1 --` as a login email. Should fail validation cleanly,
  no 500.

## 8.H Mobile viewport
- Open Chrome DevTools → device emulator → iPhone SE. Browse student
  app. Header, course cards, video player should not break layout.

| # | Path | Result |
|---|------|--------|
| 8.A | CSRF | |
| 8.B | Rate limit | |
| 8.C | Headers | |
| 8.D | HTTPS redirect | |
| 8.E | Upload size | |
| 8.F | XSS profile | |
| 8.G | SQLi login | |
| 8.H | Mobile | |

---

# PHASE 9 — Email deliverability sanity (5 min)

Confirm all of these emails actually arrived during the run:

- [ ] Signup verification (1.A)
- [ ] Password reset (1.D)
- [ ] Free enrollment confirmation (4.D)
- [ ] PayPal payment receipt (4.G)
- [ ] Bundle purchase receipt (4.H)
- [ ] Instructor welcome / set-password (3.A)
- [ ] CSV-imported user welcome (7.D)
- [ ] Course announcement notification (6.D, 3.G) — if email notifications are wired

Check spam folder if any are missing. Note send-from address is
`noreply@pageinnovation.com` — flag if anything came from a different sender.

---

# PHASE 10 — Final report

Write a summary in this exact shape:

```
Page Innovation LMS — E2E QA Report
Date: YYYY-MM-DD
Tester: <name>

Build: <git SHA of TekyproLMS service in Railway>

PASS  : <count>
FAIL  : <count>
BLOCKED: <count>

Critical issues (block launch):
  - <one-liner with phase #>

Non-critical issues (fix before public push):
  - <one-liner with phase #>

Known/expected gaps (waiting on client creds):
  - Google OAuth login (no GOOGLE_CLIENT_SECRET)
  - Discord guild join (no DISCORD_GUILD_ID / CLIENT_SECRET)
  - PayPal LIVE mode (currently sandbox)

Recommendation: GO / NO-GO for public launch
```

# Notes for the tester

- The PayPal migration must be run on `pageinnovation-db` before Phase 4.G.
  If you get `invalid input value for enum "enum_payments_payment_gateway": "paypal"`,
  the migration didn't run.
- Cloudinary preset `pageinnovation_uploads` must exist on cloud `dau8rckpp`
  for image/file uploads in Phase 5.D to work.
- If any 500 errors appear, check Railway → TekyproLMS → Logs and copy
  the stack trace into the failure note.
- The CSP may block inline scripts — if a feature relies on inline JS,
  that's a real bug, not a CSP misconfiguration. Don't relax CSP to
  paper over it.
