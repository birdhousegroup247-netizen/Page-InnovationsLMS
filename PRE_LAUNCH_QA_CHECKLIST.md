# Pre-Launch QA Checklist

Run this end-to-end the moment Railway is back online and the deploy is green. Each box is one observable behaviour. Don't tick a box just because it didn't error — tick it only if the *expected result* happened.

Have two browsers open: one for the **student** journey (incognito), one for the **admin** journey. Use a real PayPal sandbox buyer account (created at developer.paypal.com → Sandbox → Accounts) for paid flows.

---

## 0. Pre-flight (do these first; everything else assumes they pass)

- [ ] `https://<railway-service>.up.railway.app/health` returns 200 with the dependency-status JSON (database + redis healthy)
- [ ] Frontend (`VITE_API_URL` baked at build time) successfully calls the Railway backend (open browser devtools → Network → see green requests)
- [ ] Database migrations have been run on the Railway DB. Specifically `20260519_add_paypal_to_payments.sql` (PayPal columns + enum)
- [ ] Railway env vars confirmed populated: `JWT_SECRET`, `JWT_REFRESH_SECRET`, `DB_*`, `PAYPAL_MODE`, `PAYPAL_CLIENT_ID`, `PAYPAL_CLIENT_SECRET`, `PAYPAL_WEBHOOK_ID`, `EMAIL_USER`, `EMAIL_PASSWORD`, `CLOUDINARY_*`, `ZOOM_*`, `FRONTEND_URL`, `ADMIN_FRONTEND_URL`
- [ ] PayPal webhook in Developer Dashboard points to `https://<railway-service>.up.railway.app/api/webhooks/paypal` and is subscribed to `PAYMENT.CAPTURE.COMPLETED`, `PAYMENT.CAPTURE.REFUNDED`, `PAYMENT.CAPTURE.DENIED`

---

## 1. Auth

- [ ] Register a brand-new student. Receive welcome email within 60s
- [ ] Confirm-email link in the email lands on the verified-success page
- [ ] Log out, log back in with the same credentials
- [ ] Forgot password → email arrives → reset link works → can log in with new password
- [ ] Try wrong password 5x in a row — last attempt should be rate-limited (`429`)

## 2. Course discovery

- [ ] `/courses` lists published courses with thumbnails, prices, instructor names
- [ ] Global search (header) returns matches for course title, instructor, and content
- [ ] Filter by category and difficulty works without page reload
- [ ] Course detail page shows: description, modules, instructor card, reviews, price, "Enroll" CTA

## 3. Enrollment — free course

- [ ] Click "Enroll" on a free course → immediate enrollment, redirected to course player
- [ ] Lesson video plays. Mark complete advances progress bar
- [ ] Discussion forum tab loads. Posting a reply works
- [ ] "My Courses" page shows the new course at the top

## 4. Enrollment — paid course, **pay in full** (PayPal sandbox)

- [ ] Click "Enroll" on a paid course → routed to `/checkout?course_id=...`
- [ ] Apply a valid coupon code → discount appears in summary
- [ ] PayPal-branded button is rendered (not just our generic button — PayPal's yellow widget)
- [ ] Click PayPal button → PayPal popup opens, log in as sandbox buyer, approve
- [ ] Popup closes → redirected to `/payment-success?order_id=...&gateway=paypal`
- [ ] Success page shows correct course title and "Start Learning" CTA
- [ ] **Receipt email** arrives within 60s with the right amount and course
- [ ] **Congrats email** arrives separately
- [ ] Course shows up under "My Courses"
- [ ] Auto-joined the course chat room (Messages page → room visible)
- [ ] Discord invite link    on course detail page (if Discord configured)
- [ ] Any auto-assigned tests appear under "My Assigned Tests"

## 5. Enrollment — paid course, **60/40 installment** (PayPal sandbox)

- [ ] On checkout, switch to "60/40 Installment"
- [ ] Summary updates to show 60% now / 40% in 21 days
- [ ] PayPal flow as above. Charged amount in PayPal popup = 60% of (price − coupon)
- [ ] Back on success page, status shows "Installment Plan Active" with remaining balance
- [ ] `/billing` page shows the outstanding installment with due date
- [ ] Manually bump the due date in DB (or wait) → reminder email fires 7 days before due
- [ ] Pay the remaining 40%: `/billing` → "Pay Remaining" → routes to `/checkout?installment_payment=1`
- [ ] PayPal button renders (because first payment was via PayPal — Paystack or Stripe would render their respective button instead)
- [ ] Complete sandbox payment → `installment_status` flips to `paid_in_full` in DB
- [ ] Receipt email for the second payment arrives

## 6. Refunds (webhook path)

- [ ] In PayPal sandbox Dashboard, refund the captured payment
- [ ] Within 60s, the `Payment` row in DB shows `payment_status=refunded` (webhook event `PAYMENT.CAPTURE.REFUNDED` was received)
- [ ] If the refund policy revokes access, enrollment is removed (check `/my-courses`)

## 7. Course progress + content

- [ ] Lesson video, PDF, and code snippet content all render correctly
- [ ] Marking lessons complete advances the course completion percentage
- [ ] Drip-content lesson released only after the configured day count from enrollment
- [ ] Prerequisite course gate: try to enroll in a course with a prereq the student hasn't finished — should be blocked with a helpful message

## 8. Assignments

- [ ] Open an assignment, upload a PDF / image / zip → file uploads to Cloudinary, URL stored
- [ ] Instructor can see the submission, grade it, leave a comment
- [ ] Student sees the grade + comment

## 9. Tests / exams

- [ ] Start an assigned test → timer counts down
- [ ] Submit → result page shows score, correct answers, explanations
- [ ] Score recorded in `/my-assigned-tests`

## 10. Live sessions (Zoom)

- [ ] Instructor creates a live session for an upcoming time
- [ ] Enrolled students see it on the course detail page
- [ ] "Join" button opens Zoom in a new tab with valid meeting ID
- [ ] After session ends, recording (if uploaded) appears in the course player

## 11. Chat / messaging

- [ ] Student sends a message in a course chat room → another logged-in student sees it in real time (Socket.IO)
- [ ] Online/offline presence indicator updates within ~5 seconds
- [ ] Admin can view all rooms + messages from the admin chat-moderation page
- [ ] Non-admin users CANNOT load `/api/chat/admin/rooms` (returns 403)

## 12. Discord integration

- [ ] Linked Discord account → enrolled student auto-invited to the course's Discord channel
- [ ] Unenroll a student → student removed from Discord channel within 60s
- [ ] Interview-prep role assigned when student completes the gated prerequisites

## 13. Admin panel

- [ ] Admin can log in at `https://<admin-railway-url>/`
- [ ] Dashboard shows live counts: users, courses, enrollments, revenue
- [ ] Users page: search, filter by role, ban/unban, edit role
- [ ] Mass-assignment-protected fields (id, password_hash, google_id, referral_code, referral_credits, created_at) cannot be updated via the API even with admin token
- [ ] Courses page: create, edit, publish, unpublish
- [ ] Enrollment management: manually enroll a student in a course, manually unenroll
- [ ] Revenue & Payments dashboard: see totals, drill into individual payments
- [ ] Announcements: post a global announcement → all users see it in the notifications bell
- [ ] Audit log (if exposed in UI): shows admin actions

## 14. Instructor panel

- [ ] Instructor creates a new course → can add modules, lessons, upload thumbnail
- [ ] Instructor can see their enrolled students + their progress
- [ ] Instructor can grade assignments
- [ ] Instructor can run a live session

## 15. Security smoke

- [ ] `/api/seed/status` returns 404 (removed in 68499d9)
- [ ] `/metrics` requires admin JWT or PROMETHEUS_TOKEN bearer (returns 401 without)
- [ ] CSRF: a non-GET request without a CSRF token from a browser session is rejected (Bearer-token API requests are exempt and should still work)
- [ ] Login error doesn't leak whether the email exists ("Invalid email or password" either way)
- [ ] 500 errors in production never include stack traces in the response body
- [ ] `https://<railway-service>.up.railway.app/health` does NOT list internal info (no DB version, no env, no commit SHA)
- [ ] Direct DB connection from outside the Railway network is refused (port not host-bound)

## 16. Mobile spot-check (375px viewport)

- [ ] Landing page is readable, CTA visible without scrolling
- [ ] Course detail is usable on mobile (price + Enroll button visible)
- [ ] Checkout page: PayPal button renders correctly, coupon input usable
- [ ] Course player: video is responsive, lesson list collapses

## 17. Performance / sanity

- [ ] First load of `/courses` < 3s on a cold cache, broadband
- [ ] Largest JS bundle < 600 KB gzipped (vite's `index-*.js` chunk)
- [ ] No console errors in the browser on the landing page or any logged-in page
- [ ] Backend logs (Railway) show no unhandled rejections or 500s during the run

---

## Post-launch (when client domain is live)

- [ ] Swap PayPal webhook URL in Developer Dashboard from Railway URL to `https://api.pageinnovation.com/api/webhooks/paypal`
- [ ] Update `FRONTEND_URL`, `ADMIN_FRONTEND_URL`, and Google OAuth callback URLs in Railway env vars
- [ ] Update CORS allowlist in `backend/server.js` if not already env-driven
- [ ] Replace temp Cloudinary credentials with client's account
- [ ] Verify HTTPS cert + redirect (`http://` → `https://`)
- [ ] Replace DB SSL `rejectUnauthorized: false` with proper CA cert path

---

## If something fails

- Capture the **exact** browser URL, the API endpoint that errored (Network tab), the response body, and the Railway backend logs around that timestamp
- Don't tick the box. File it in a "QA Findings" document with screenshots
- Mark the failure as `blocker` (launch can't go without it) or `nit` (can ship and fix later)
