# TekyPro — Registration & Payment Funnel
## Master Plan + Progress Tracker

**Goal:** Build a complete acquisition → payment → onboarding funnel.
**Started:** 2026-03-24
**Status:** ALL PHASES COMPLETE (Phase 6 WhatsApp deferred to post-launch) — Ready for deployment

---

## ARCHITECTURAL AUDIT — VERIFIED FINDINGS
*(Cross-checked against actual code files — 2026-03-24)*

### REAL BLOCKERS (verified by reading the actual code)

| # | Issue | File | Line | Impact | Fix |
|---|-------|------|------|--------|-----|
| 1 | **`payment=()` in Permissions-Policy** | `backend/middleware/security.js` | 133 | Disables browser Payment API — blocks Stripe's Apple Pay/Google Pay | Remove `payment=()` from the policy |
| 2 | **CSP blocks Stripe domains** | `backend/middleware/security.js` | 68–76 | `script-src` missing `https://js.stripe.com`. `connect-src` missing Stripe API domains. Stripe.js will be BLOCKED | Add Stripe domains to CSP |
| 3 | **No `stripe` package** | `backend/package.json` | — | Cannot process any payment | `npm install stripe` in backend |
| 4 | **No `node-cron` package** | `backend/package.json` | — | Cannot run drip emails or countdown cron | `npm install node-cron` in backend |
| 5 | **No `@stripe/stripe-js` or `@stripe/react-stripe-js`** | `frontend/package.json` | — | Cannot show Stripe card form on checkout page | `npm install @stripe/stripe-js @stripe/react-stripe-js` in frontend |
| 6 | **User model: no `registration_status` field** | `backend/models/User.js` | 44–48 | Cannot track preview vs paid users | Add ENUM column to User model |
| 7 | **Payment model: missing installment + coupon fields** | `backend/models/Payment.js` | 27–76 | Cannot track 60/40 split, remaining balance, due date, discount | Add 7 fields to Payment model |
| 8 | **Rate limiter covers all `/api/` routes** | `backend/server.js` | 127 | Stripe webhook POST to `/api/webhooks/stripe` will be rate-limited by IP | Exempt `/api/webhooks/` before limiter |
| 9 | **No payment routes registered** | `backend/server.js` | 221–261 | No endpoint exists to create checkout, receive webhooks, or query payments | Create routes + register in server.js |
| 10 | **Enrollment has no payment gate** | `backend/controllers/courses/courseController.js` | enrollCourse fn | Any student can enroll in any paid course for free right now | Refactor enrollCourse to check payment |

### AUDIT FINDINGS THAT WERE WRONG (verified as non-issues)

| Claim | Reality |
|-------|---------|
| "CSRF middleware blocks webhooks" | `csrfProtection` exists in security.js but is **never applied** in server.js. Not an issue. |
| "JWT/localStorage is broken" | Working correctly. Frontend uses Bearer token (localStorage) for API calls. Refresh logic in api.js lines 66–85 is complete and correct. Not a problem. |
| "Missing payments table in schema.sql" | Sequelize runs `sync({ alter: true })` in development (server.js line 494). Tables are auto-created from models. Not a blocker. |
| "Enrollment timestamps issue" | `enrollment_date` field serves the same purpose as `created_at`. `timestamps: false` is intentional. Fine as-is. |
| "Payment associations missing" | Associations ARE correctly defined in models/index.js lines 204–210. |
| "Token refresh logic broken" | api.js refresh interceptor (lines 61–96) is complete. Works. |

### THINGS THE ORIGINAL AUDIT COMPLETELY MISSED

1. **`payment=()` in Permissions-Policy** — The existing security.js explicitly disables the browser Payment API. This will block Stripe's Apple Pay / Google Pay integrations. This was not in our plan at all.

2. **CSP blocks Stripe** — The Content Security Policy in security.js whitelists only `'self'`, `cdn.jsdelivr.net`, and Google Fonts. Stripe's JavaScript (`js.stripe.com`), Stripe's API (`api.stripe.com`), and Stripe's iframe domain (`hooks.stripe.com`) are all blocked. This was not in our plan at all. This is arguably the **most critical** fix before any payment code works.

3. **`is_preview` already exists on ModuleContent** — `backend/models/ModuleContent.js` line 61 already has `is_preview: BOOLEAN`. We can use this immediately for the "Lesson 1 free" feature. No model change needed.

4. **Auto-migration system in server.js** — Lines 342–453 already run column-level migrations on startup. Adding new columns to models will auto-apply in dev. For prod, `DB_SYNC_ENABLED=true` + `sequelize.sync({ alter: true })` handles it. We do not need separate migration files.

---

## DECISIONS LOG (All Locked In)

| # | Decision | Answer | Locked |
|---|----------|--------|--------|
| Q1 | Installment lockout style | Progressive — messages → soft banner → hard lock (see "Countdown System" below) | ✅ |
| Q2 | Registration type | General — register → explore → enroll → pay | ✅ |
| Q3 | Existing users | Dummy data only — full reset. Payment gate applies to all new users | ✅ |
| Q4 | WhatsApp | YES — include via Twilio | ✅ |
| Q5 | Preview content | Course outline + Lesson 1 free (one lesson per course) | ✅ |
| Q6 | Payment processor | Stripe (US business, worldwide) | ✅ |
| Q7 | Business location | USA registered — Stripe works directly, no Atlas needed | ✅ |
| Q8 | Email service | Nodemailer now → Mailchimp when account is ready | ✅ |
| Q9 | Drip email approach | node-cron scheduler (built-in), migrate to Mailchimp API later | ✅ |

---

## THINGS YOU MUST STILL PROVIDE (Blockers)

| # | What You Need | Needed For | Status |
|---|---------------|------------|--------|
| 1 | **Stripe account** — go to stripe.com, create US business account. Get: `STRIPE_SECRET_KEY`, `STRIPE_PUBLISHABLE_KEY`, `STRIPE_WEBHOOK_SECRET` | Phase 1 — Payments | ❌ Not created |
| 2 | **Mailchimp account** — go to mailchimp.com. Get: `MAILCHIMP_API_KEY`, `MAILCHIMP_SERVER_PREFIX`, `MAILCHIMP_LIST_ID` | Phase 3 — Drip emails | ❌ Not created |
| 3 | **Twilio account** — go to twilio.com, request WhatsApp Business number. Get: `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_WHATSAPP_NUMBER` | Phase 6 — WhatsApp | ❌ Not created |
| 4 | **Business email** — confirm sending address e.g. `hello@tekypro.com` or `noreply@tekypro.com` | All email templates | ❌ Confirm |
| 5 | **Course list + USD prices** — set all course prices from admin portal before launch | Payment/checkout page | ❌ Not set |
| 6 | **Logo file** — confirm `/asset/logo.png` is the correct high-res logo | Email templates | ❌ Confirm |

---

## THE COMPLETE FUNNEL FLOW

```
COLD TRAFFIC
(Google Ads, Social Media, Word of Mouth, Referrals)
         ↓
[Landing Page — already exists, keep it]
         ↓
[REGISTER PAGE — enhanced form]
  Fields: Name, Email, Phone, Country, Password,
          Experience Level, How did you hear about us?
  No payment yet — just lead capture
         ↓
[PLATFORM PREVIEW MODE]
  - Can browse all courses
  - Sees course outlines + Lesson 1 free per course
  - All other content locked
  - Persistent "Enroll Now" CTAs throughout
  - Drip emails start immediately (lead sequence)
         ↓
[COURSE DETAIL PAGE — clicks "Enroll Now"]
         ↓
[CHECKOUT PAGE]
  - Course name + price shown
  - Coupon code input (validates live, price updates)
  - Choose: Pay Full OR Pay 60% Now (installment)
  - Stripe card input
         ↙                      ↘
  [PAID FULL ✓]          [PAID 60% ✓]           [ABANDONED]
       ↓                      ↓                       ↓
 Full Access           Full Access              Lead stays in DB
 Receipt email         Receipt email             Drip sequence continues
 Congrats email        Congrats email            Day 1 → 3 → 7 → 14 emails
 Onboarding #1-5       Onboarding #1-5           + WhatsApp nudges
                            ↓
                   [Day 21 — Countdown Begins]
                   (see Progressive Lock System below)
```

---

## THE PROGRESSIVE LOCK SYSTEM ("The Countdown")

This is the creative solution for installment (60/40) users who don't pay the remaining 40%.
Think of it like a traffic light — gradual, human, never abrupt.

```
DAY 0 ──── PAYMENT DATE ────────────────────────────────────────────────────
  Status: 🟢 FULL ACCESS
  Platform: Normal. No banners.

DAY 21 ──── FIRST NOTICE ────────────────────────────────────────────────────
  Status: 🟡 YELLOW
  Platform: Nothing changes on platform yet.
  Email:  "Hey [Name]! Just a friendly reminder — your remaining $X balance
           is due. No rush, just keeping you in the loop. Pay anytime here."
  WhatsApp: "Hi [Name] 👋 Your TekyPro balance of $X is due.
             Easy to complete here: [link]"

DAY 24 ──── SECOND NOTICE ───────────────────────────────────────────────────
  Status: 🟡 YELLOW → 🟠 ORANGE
  Platform: A soft info bar appears at top (dismissible once per day).
            "Your remaining balance of $X is due. Complete payment to
             keep uninterrupted access. [Pay Now]"
  Email:  "Your balance is 3 days overdue. Platform access continues
           for now — complete payment to avoid any interruptions."
  WhatsApp: Second nudge with urgency.

DAY 28 ──── HARD REMINDER ───────────────────────────────────────────────────
  Status: 🟠 ORANGE → 🔴 RED
  Platform: Banner turns RED. Cannot be dismissed.
            "⚠️ Action Required: Your balance of $X is overdue.
             Your account will be restricted on [Day 32 date]."
            Forum POSTING disabled (can still view).
  Email:  "URGENT: 4 days until your account is restricted.
           Complete your $X balance now."
  WhatsApp: Urgent message with exact restriction date.

DAY 32 ──── PARTIAL LOCK ────────────────────────────────────────────────────
  Status: 🔴 → 🔒 AMBER LOCK
  Platform: Can only continue lessons they already STARTED.
            Cannot start NEW lessons or new modules.
            Tests locked. Certificates locked. Forum fully locked.
            Red modal on dashboard: "Your access has been partially
            restricted. Complete payment to restore full access."
  Email:  "Your account has been partially restricted. Here's what
           you've lost access to and how to restore it in 1 click."
  WhatsApp: Direct message — "Your TekyPro account is now partially
             restricted. Tap here to pay and restore access instantly."

DAY 35 ──── SOFT LOCK ───────────────────────────────────────────────────────
  Status: 🔒 AMBER LOCK → ⛔ SOFT LOCK
  Platform: Fullscreen overlay on every page they visit.
            Can still see dashboard BEHIND the overlay (blurred).
            Cannot interact with ANYTHING until payment.
            Overlay shows: balance, course name, [Complete Payment] button.
            Cannot dismiss.
  Email:  "Your TekyPro account is now on hold. All your progress is
           saved. One payment restores everything instantly."
  WhatsApp: Final message before hard lock.

DAY 42 ──── HARD LOCK ───────────────────────────────────────────────────────
  Status: ⛔ → 🚫 HARD LOCK
  Platform: Login redirects to payment page only.
            Nothing else accessible until payment is completed.
  Email:  Account suspension notice with payment link.
  WhatsApp: "Your TekyPro account has been suspended. Pay here to
             reactivate instantly: [link]"
```

**Key principles of this system:**
- User's progress is NEVER deleted — always saved
- Reactivation is instant — one payment click, everything restored
- Messaging gets more urgent gradually, not suddenly shocking
- We always remind them WHAT they're losing and HOW to fix it

---

## PHASE BREAKDOWN

---

### PHASE 0 — Pre-Build Fixes (MUST DO FIRST — ~1 day)
**These fixes must be done before writing any payment code. Without them, Stripe will not work.**

#### Fix 1: Remove `payment=()` from Permissions-Policy
**File:** `backend/middleware/security.js` line 133
**Problem:** Explicitly disables browser Payment API — blocks Stripe Apple Pay / Google Pay.
**Fix:** Delete the `'payment=()'` line from the policies array.
- [ ] `backend/middleware/security.js` — remove `'payment=()'`

#### Fix 2: Update CSP to Allow Stripe Domains
**File:** `backend/middleware/security.js` lines 67–77
**Problem:** CSP blocks `js.stripe.com`, `api.stripe.com`, `hooks.stripe.com`.
**Fix:** Add Stripe domains to `script-src`, `connect-src`, and add `frame-src`.

Add to `script-src`: `https://js.stripe.com`
Add to `connect-src`: `https://api.stripe.com https://js.stripe.com`
Add new directive: `frame-src https://js.stripe.com https://hooks.stripe.com`
- [ ] `backend/middleware/security.js` — update `contentSecurityPolicy`

#### Fix 3: Install Backend Packages
```bash
cd backend && npm install stripe node-cron
```
- [ ] `stripe` installed in backend/package.json
- [ ] `node-cron` installed in backend/package.json

#### Fix 4: Install Frontend Packages
```bash
cd frontend && npm install @stripe/stripe-js @stripe/react-stripe-js
```
- [ ] `@stripe/stripe-js` installed in frontend/package.json
- [ ] `@stripe/react-stripe-js` installed in frontend/package.json

#### Fix 5: Exempt Webhook from Rate Limiter
**File:** `backend/server.js` line 127
**Problem:** `app.use('/api/', globalApiLimiter)` rate-limits ALL routes including Stripe webhook.
**Fix:** Register webhook route BEFORE line 127 (before the rate limiter middleware).
- [ ] `backend/server.js` — add webhook route before rate limiter line

---

### PHASE 1 — Database + Stripe Integration
**Build time:** 3-4 days
**Blocker:** Stripe account (Item #1 in "Things You Must Provide")
**Can we start without Stripe?** YES — we can build everything and test with Stripe test keys

#### Database Changes

**New Table: `leads`**
```
id, full_name, email, phone, country,
experience_level (beginner/intermediate/advanced),
referral_source (google/social/friend/other),
course_interest_id (FK → courses),
registration_status (new/email_sent/d1_sent/d3_sent/d7_sent/d14_sent/converted/unsubscribed),
registered_at, last_email_sent_at, converted_at,
ip_address, utm_source, utm_medium, utm_campaign
```

**New Table: `coupon_codes`**
```
id, code (unique, uppercase), description,
discount_type (percentage/flat),
discount_value (DECIMAL 10,2),
min_purchase_amount (DECIMAL 10,2),
max_uses (nullable — null = unlimited),
uses_count (default 0),
per_user_limit (default 1),
applies_to (all/specific_courses),
expires_at,
is_active (boolean),
created_by (FK → users — admin who created it),
created_at, updated_at
```

**New Table: `coupon_code_courses`** (which courses a coupon applies to)
```
id, coupon_code_id (FK), course_id (FK)
```

**New Table: `coupon_redemptions`**
```
id, coupon_code_id (FK), user_id (FK), payment_id (FK),
discount_amount (DECIMAL 10,2),
original_price, final_price,
redeemed_at
```

**Modify Table: `users`**
```
Add: registration_status ENUM('preview', 'active', 'suspended') DEFAULT 'preview'
Add: lead_id (nullable FK → leads — links user to original lead record)
```

**Modify Table: `payments`**
```
Add: payment_plan ENUM('full', 'installment') DEFAULT 'full'
Add: installment_percentage (DECIMAL 5,2) — e.g. 60.00 for 60%
Add: installment_remaining_amount (DECIMAL 10,2)
Add: installment_due_date (DATETIME — payment_date + 21 days)
Add: installment_status ENUM('not_applicable','pending','completed','overdue') DEFAULT 'not_applicable'
Add: installment_paid_at (DATETIME)
Add: coupon_code_id (nullable FK → coupon_codes)
Add: discount_amount (DECIMAL 10,2) DEFAULT 0.00
Add: original_amount (DECIMAL 10,2)
```

#### New Backend Files
- [ ] `backend/models/Lead.js`
- [ ] `backend/models/CouponCode.js`
- [ ] `backend/models/CouponCodeCourse.js`
- [ ] `backend/models/CouponRedemption.js`
- [ ] `backend/services/payment/stripeService.js`
- [ ] `backend/controllers/payments/stripeController.js`
- [ ] `backend/controllers/payments/couponController.js`
- [ ] `backend/routes/api/payments.js`
- [ ] `backend/routes/api/coupons.js`
- [ ] `backend/migrations/YYYYMMDD-add-payment-funnel-tables.js`

#### Modified Backend Files
- [ ] `backend/models/Payment.js` — add installment + coupon fields
- [ ] `backend/models/User.js` — add registration_status + lead_id
- [ ] `backend/models/index.js` — register new models + associations
- [ ] `backend/controllers/courses/enrollmentController.js` — add payment gate
- [ ] `backend/server.js` — register new routes
- [ ] `.env.example` — add all new env variable keys

---

### PHASE 2 — Enhanced Registration + Checkout Flow
**Build time:** 2-3 days
**Blocker:** None (can start immediately)

#### What the New Register Page Looks Like
```
Step 1 (personal info):
  - Full Name
  - Email Address
  - Phone Number (with country dial code selector)
  - Country
  - Password + Confirm Password
  - Experience Level (Beginner / Intermediate / Advanced)
  - How did you hear about us? (Google / Social Media / Friend / YouTube / Other)
  - Accept Terms checkbox

On submit → create user with registration_status='preview'
          → also create lead record
          → trigger lead-welcome email
          → redirect to dashboard (preview mode)
```

#### What the Checkout Page Looks Like
```
Triggered when user clicks "Enroll Now" on any course

Layout:
  Left side:
    - Course thumbnail + name
    - Instructor name
    - Course duration + difficul
    ty
    - What's included (bullet points)

  Right side:
    - Original price: $XXX
    - Coupon code input → [Apply] button
      → Live validation: "LAUNCH50 applied! You save $49"
    - Price breakdown:
        Original:     $299.00
        Discount:    -$49.00
        Total:        $250.00
    - Payment options:
        [○] Pay in Full — $250.00
        [○] Pay Now (60%) — $150.00, balance $100.00 due in 21 days
    - Stripe Card Element (secure)
    - [Complete Enrollment] button
    - Lock icon + "Secured by Stripe" text
```

#### New Frontend Files
- [ ] `frontend/src/pages/Checkout.jsx`
- [ ] `frontend/src/pages/PaymentSuccess.jsx`
- [ ] `frontend/src/pages/PaymentCancelled.jsx`
- [ ] `frontend/src/components/payment/CouponInput.jsx`
- [ ] `frontend/src/components/payment/PriceSummary.jsx`
- [ ] `frontend/src/components/payment/PaymentOptions.jsx` (full vs installment)
- [ ] `frontend/src/components/payment/StripeCardElement.jsx`

#### Modified Frontend Files
- [ ] `frontend/src/pages/Register.jsx` — enhanced multi-field form
- [ ] `frontend/src/lib/api.js` — add coupon validation + payment API calls
- [ ] `frontend/src/App.jsx` — add /checkout, /payment-success, /payment-cancelled routes

---

### PHASE 3 — Email Sequences (Drip System)
**Build time:** 3-4 days
**Blocker:** None for Nodemailer build. Mailchimp account needed for upgrade.

#### How the Drip Scheduler Works
- `node-cron` runs every hour, checks for leads/users needing emails
- Compares `registered_at` or `payment_date` to current date
- Fires correct email template if not already sent
- Updates `last_email_sent_at` and `registration_status`

#### Email Sequence A: LEAD (Registered, Not Paid)

| # | Day | Subject | Goal |
|---|-----|---------|------|
| 1 | Instant | "Welcome to TekyPro, [Name] — your free preview is ready" | Warm welcome, show what's available |
| 2 | Day 1 | "Your [Course Name] course is waiting for you" | Course-specific urgency |
| 3 | Day 3 | "Here's what TekyPro students are saying..." | Social proof — testimonials |
| 4 | Day 7 | "Your free preview expires soon — here's what you'll lose access to" | Urgency + loss aversion |
| 5 | Day 14 | "[Name], this is our last message" + optional discount code | Final attempt |

#### Email Sequence B: PAID USER (Onboarding Journey)

| # | Timing | Subject | Goal |
|---|--------|---------|------|
| 1 | Instant | "Payment confirmed — here's your receipt" | Official receipt with invoice |
| 2 | +1 hour | "You're officially in, [Name]! 🎉" | Congratulations, login link, what to expect |
| 3 | Day 1 | "Start here: Your first 3 steps on TekyPro" | How to navigate, first lesson CTA |
| 4 | Day 3 | "Did you know TekyPro has [feature]?" | Feature discovery — tests, live sessions |
| 5 | Day 7 | "How's it going, [Name]? Here to help." | Check-in, support links, community |

#### Email Sequence C: INSTALLMENT REMINDERS

| # | Day | Subject | Tone |
|---|-----|---------|------|
| 1 | Day 21 | "Friendly reminder: your balance of $X is due" | Gentle, friendly |
| 2 | Day 24 | "Your remaining balance — still time to sort it out" | Slightly more direct |
| 3 | Day 28 | "Your account will be restricted in 4 days" | Urgent, clear |
| 4 | Day 32 | "Your account has been partially restricted" | Factual, fix-it CTA |
| 5 | Day 35 | "Your TekyPro account is on hold — here's how to restore it" | Empathetic, clear steps |
| 6 | Day 42 | "Your account has been suspended" | Final notice |

#### New Backend Files
- [ ] `backend/services/drip/dripScheduler.js` — main cron job (runs hourly)
- [ ] `backend/services/drip/leadDripService.js` — handles lead email sequence
- [ ] `backend/services/drip/onboardingDripService.js` — handles paid user sequence
- [ ] `backend/services/drip/installmentReminderService.js` — handles countdown system
- [ ] `backend/services/email/templates/lead-welcome.js`
- [ ] `backend/services/email/templates/lead-followup-d1.js`
- [ ] `backend/services/email/templates/lead-followup-d3.js`
- [ ] `backend/services/email/templates/lead-followup-d7.js`
- [ ] `backend/services/email/templates/lead-followup-d14.js`
- [ ] `backend/services/email/templates/payment-receipt.js`
- [ ] `backend/services/email/templates/payment-congrats.js`
- [ ] `backend/services/email/templates/onboarding-d1.js`
- [ ] `backend/services/email/templates/onboarding-d3.js`
- [ ] `backend/services/email/templates/onboarding-d7.js`
- [ ] `backend/services/email/templates/installment-reminder-d21.js`
- [ ] `backend/services/email/templates/installment-reminder-d24.js`
- [ ] `backend/services/email/templates/installment-reminder-d28.js`
- [ ] `backend/services/email/templates/installment-reminder-d32.js`
- [ ] `backend/services/email/templates/installment-reminder-d35.js`
- [ ] `backend/services/email/templates/installment-suspended-d42.js`

#### Modified Backend Files
- [ ] `backend/services/email/emailService.js` — add new send methods for all templates

---

### PHASE 4 — Preview Mode (Unpaid Users on Platform)
**Build time:** 2 days
**Blocker:** None

#### Access Levels

| Feature | Preview (Unpaid) | Active (Paid) | Suspended (Hard Lock) |
|---------|-----------------|---------------|----------------------|
| Browse courses | ✅ | ✅ | ❌ |
| Course outline | ✅ | ✅ | ❌ |
| Lesson 1 (free) | ✅ | ✅ | ❌ |
| All other lessons | ❌ Lock overlay | ✅ | ❌ |
| Tests | ❌ | ✅ | ❌ |
| Certificates | ❌ | ✅ | ❌ |
| Forum (view) | ✅ | ✅ | ❌ |
| Forum (post) | ❌ | ✅ | ❌ |
| Leaderboard | ✅ (view only) | ✅ | ❌ |
| Profile settings | ✅ | ✅ | ❌ |
| Dashboard | ✅ (limited data) | ✅ | ❌ (payment page only) |

#### The Lock Overlay Component
- Semi-transparent blur over locked content
- Lock icon + message: "Enroll to unlock this lesson"
- [Enroll Now] button that takes them to checkout
- Used everywhere content is locked

#### New Frontend Files
- [ ] `frontend/src/components/ui/LockOverlay.jsx` — content lock overlay
- [ ] `frontend/src/components/ui/PaymentBanner.jsx` — top banner (yellow → orange → red)
- [ ] `frontend/src/components/ui/SuspensionModal.jsx` — fullscreen overlay for Day 35+
- [ ] `frontend/src/components/ui/InstallmentCountdown.jsx` — days remaining widget

#### Modified Frontend Files
- [ ] `frontend/src/contexts/AuthContext.jsx` — add `accessLevel`, `installmentStatus`, `daysUntilLock`
- [ ] `frontend/src/pages/Dashboard.jsx` — payment banner + limited data for preview users
- [ ] `frontend/src/pages/CoursePlayer.jsx` — lock overlay on non-free lessons
- [ ] `frontend/src/pages/CourseDetail.jsx` — "Enroll Now" CTA prominent for preview users
- [ ] `frontend/src/pages/Forums.jsx` — disable posting for preview users

---

### PHASE 5 — Admin Features
**Build time:** 2-3 days
**Blocker:** None

#### New Admin Page 1: Coupon Manager (`/admin/coupons`)
```
Table view:
  Code | Type | Value | Uses | Max Uses | Expires | Status | Actions

Create modal fields:
  - Code name (auto-uppercase, no spaces)
  - Description (internal notes)
  - Discount type: % OR flat $
  - Discount value
  - Minimum purchase amount (optional)
  - Max total uses (optional — leave blank for unlimited)
  - Per-user limit (default: 1)
  - Applies to: All courses OR specific courses (multi-select)
  - Expiry date (date + time picker)

Actions:
  - Deactivate instantly
  - View all redemptions
  - Copy code to clipboard
```

#### New Admin Page 2: Leads Dashboard (`/admin/leads`)
```
Summary cards:
  Total Leads | Converted This Week | Conversion Rate | Top Source

Table:
  Name | Email | Phone | Country | Course Interest | Registered | Status | Actions

Filters:
  - Date range
  - Country
  - Course interest
  - Drip status
  - Converted / Not converted

Actions:
  - Send manual follow-up email
  - Mark as converted (if they paid offline)
  - View full lead details
  - Delete lead
  - Export to CSV
```

#### New Backend Files
- [ ] `backend/controllers/admin/couponsController.js`
- [ ] `backend/controllers/admin/leadsController.js`
- [ ] `backend/routes/api/admin/coupons.js`
- [ ] `backend/routes/api/admin/leads.js`

#### New Frontend-Admin Files
- [ ] `frontend-admin/src/pages/admin/Coupons.jsx`
- [ ] `frontend-admin/src/pages/admin/Leads.jsx`

#### Modified Frontend-Admin Files
- [ ] `frontend-admin/src/App.jsx` — add `/admin/coupons` and `/admin/leads`
- [ ] `frontend-admin/src/components/Sidebar.jsx` — add "Coupons" and "Leads" menu items
- [ ] `frontend-admin/src/lib/api.js` — add coupon + leads API calls

---

### PHASE 6 — WhatsApp Notifications (Twilio)
**Build time:** 2-3 days
**Blocker:** Twilio account + WhatsApp Business number approval

#### Messages to Send

| Trigger | Message |
|---------|---------|
| Registration | "Hi [Name] 👋 Welcome to TekyPro! Your free preview is ready. Browse courses here: [link]" |
| Payment confirmed | "Payment received! You now have full access to [Course]. Start here: [link] 🎉" |
| Day 21 reminder | "Hi [Name], your TekyPro balance of $X is due. Easy payment here: [link]" |
| Day 24 reminder | "Reminder: Your TekyPro balance is 3 days overdue. Pay now: [link]" |
| Day 28 urgent | "⚠️ Your TekyPro account will be restricted in 4 days. Complete payment: [link]" |
| Day 32 partial lock | "Your account has been partially restricted. Restore access now: [link]" |
| Day 35 soft lock | "Your TekyPro account is on hold. One click to restore: [link]" |
| Day 42 hard lock | "Account suspended. Pay $X to reactivate instantly: [link]" |

#### New Backend Files
- [ ] `backend/services/whatsapp/twilioService.js`
- [ ] `backend/services/whatsapp/whatsappTemplates.js`

#### Modified Backend Files
- [ ] `backend/services/drip/installmentReminderService.js` — add WhatsApp calls alongside emails
- [ ] `backend/services/drip/leadDripService.js` — add WhatsApp to lead sequence
- [ ] `.env.example` — Twilio keys already listed

---

## COMPLETE FILE LIST

### New Files — Backend (22 files)
```
backend/models/Lead.js
backend/models/CouponCode.js
backend/models/CouponCodeCourse.js
backend/models/CouponRedemption.js
backend/services/payment/stripeService.js
backend/services/drip/dripScheduler.js
backend/services/drip/leadDripService.js
backend/services/drip/onboardingDripService.js
backend/services/drip/installmentReminderService.js
backend/services/whatsapp/twilioService.js
backend/services/whatsapp/whatsappTemplates.js
backend/services/email/templates/lead-welcome.js
backend/services/email/templates/lead-followup-d1.js
backend/services/email/templates/lead-followup-d3.js
backend/services/email/templates/lead-followup-d7.js
backend/services/email/templates/lead-followup-d14.js
backend/services/email/templates/payment-receipt.js
backend/services/email/templates/payment-congrats.js
backend/services/email/templates/onboarding-d1.js
backend/services/email/templates/onboarding-d3.js
backend/services/email/templates/onboarding-d7.js
backend/services/email/templates/installment-reminder-d21.js
backend/services/email/templates/installment-reminder-d24.js
backend/services/email/templates/installment-reminder-d28.js
backend/services/email/templates/installment-reminder-d32.js
backend/services/email/templates/installment-reminder-d35.js
backend/services/email/templates/installment-suspended-d42.js
backend/controllers/payments/stripeController.js
backend/controllers/payments/couponController.js
backend/controllers/admin/couponsController.js
backend/controllers/admin/leadsController.js
backend/routes/api/payments.js
backend/routes/api/coupons.js
backend/routes/api/admin/coupons.js
backend/routes/api/admin/leads.js
backend/migrations/YYYYMMDD-add-payment-funnel-tables.js
```

### Modified Files — Backend (6 files)
```
backend/models/Payment.js
backend/models/User.js
backend/models/index.js
backend/controllers/courses/enrollmentController.js
backend/server.js
.env.example
```

### New Files — Frontend (11 files)
```
frontend/src/pages/Checkout.jsx
frontend/src/pages/PaymentSuccess.jsx
frontend/src/pages/PaymentCancelled.jsx
frontend/src/components/payment/CouponInput.jsx
frontend/src/components/payment/PriceSummary.jsx
frontend/src/components/payment/PaymentOptions.jsx
frontend/src/components/payment/StripeCardElement.jsx
frontend/src/components/ui/LockOverlay.jsx
frontend/src/components/ui/PaymentBanner.jsx
frontend/src/components/ui/SuspensionModal.jsx
frontend/src/components/ui/InstallmentCountdown.jsx
```

### Modified Files — Frontend (6 files)
```
frontend/src/pages/Register.jsx
frontend/src/pages/Dashboard.jsx
frontend/src/pages/CoursePlayer.jsx
frontend/src/pages/CourseDetail.jsx
frontend/src/pages/Forums.jsx
frontend/src/contexts/AuthContext.jsx
frontend/src/lib/api.js
frontend/src/App.jsx
```

### New Files — Frontend-Admin (2 files)
```
frontend-admin/src/pages/admin/Coupons.jsx
frontend-admin/src/pages/admin/Leads.jsx
```

### Modified Files — Frontend-Admin (3 files)
```
frontend-admin/src/App.jsx
frontend-admin/src/components/Sidebar.jsx
frontend-admin/src/lib/api.js
```

---

## ENVIRONMENT VARIABLES TO ADD

```bash
# ── STRIPE (Payment Processing) ──────────────────────────────────────────────
STRIPE_SECRET_KEY=sk_test_...           # From Stripe dashboard (use test key in dev)
STRIPE_PUBLISHABLE_KEY=pk_test_...      # From Stripe dashboard
STRIPE_WEBHOOK_SECRET=whsec_...         # From Stripe webhook endpoint setup

# ── MAILCHIMP (Email Drip Campaigns) ─────────────────────────────────────────
MAILCHIMP_API_KEY=...                   # From Mailchimp account → API keys
MAILCHIMP_SERVER_PREFIX=us21            # Found in your Mailchimp API key (last part e.g. us21)
MAILCHIMP_LIST_ID=...                   # Your main audience list ID
MAILCHIMP_LEADS_LIST_ID=...             # Separate list for unregistered leads (optional)

# ── TWILIO (WhatsApp) ─────────────────────────────────────────────────────────
TWILIO_ACCOUNT_SID=...                  # From Twilio console
TWILIO_AUTH_TOKEN=...                   # From Twilio console
TWILIO_WHATSAPP_NUMBER=whatsapp:+1...   # Your approved Twilio WhatsApp number

# ── INSTALLMENT SETTINGS ──────────────────────────────────────────────────────
INSTALLMENT_DUE_DAYS=21                 # Days until installment is due (default 21)
INSTALLMENT_YELLOW_DAY=21              # Day warning emails start
INSTALLMENT_ORANGE_DAY=24             # Day soft banner appears
INSTALLMENT_RED_DAY=28                # Day hard banner + forum lock
INSTALLMENT_AMBER_DAY=32              # Day partial content lock
INSTALLMENT_SOFT_LOCK_DAY=35          # Day fullscreen overlay
INSTALLMENT_HARD_LOCK_DAY=42          # Day full account suspension
```

---

## PROGRESS TRACKER

### Phase 0 — Pre-Build Fixes ✅ COMPLETE
- [x] `security.js` — removed `payment=()` from Permissions-Policy
- [x] `security.js` — added Stripe domains to CSP (script-src, connect-src, frame-src)
- [x] Backend: `stripe@^20.4.1` + `node-cron@^4.2.1` installed
- [x] Frontend: `@stripe/stripe-js@^8.11.0` + `@stripe/react-stripe-js@^5.6.1` installed
- [x] `server.js` — webhook raw body + route exempted from rate limiter
- [x] `.env.example` — Stripe, Mailchimp, Twilio, installment keys added

### Phase 1 — DB + Stripe
- [ ] Stripe account created (owner action)
- [ ] Lead model created
- [ ] CouponCode model created
- [ ] CouponCodeCourse model created
- [ ] CouponRedemption model created
- [ ] Payment model updated (installment + coupon fields)
- [ ] User model updated (registration_status + lead_id)
- [ ] models/index.js updated (new model associations)
- [ ] Stripe service created
- [ ] Stripe controller created (checkout session + webhook handler)
- [ ] Coupon controller created (validate + apply)
- [ ] Payment routes created and registered
- [ ] Coupon routes created and registered
- [ ] Enrollment controller updated (payment gate)
- [ ] server.js updated (new routes registered)
- [ ] .env.example updated

### Phase 2 — Registration + Checkout ✅ COMPLETE
- [x] Register.jsx enhanced (phone, country, experience_level, referral_source)
- [x] Checkout.jsx created (2-col layout, coupon input, payment plan toggle, Stripe redirect)
- [x] CouponInput, PriceSummary, PaymentOptions — built inline in Checkout.jsx (no extra files)
- [x] PaymentSuccess.jsx created (verifies session, shows installment info)
- [x] PaymentCancelled.jsx created (retry + browse buttons)
- [x] api.js updated (paymentsAPI, couponsAPI added)
- [x] App.jsx updated (/checkout, /payment-success, /payment-cancelled routes)
- [x] authController.js updated (Lead created on register, phone saved to User)
- [x] stripeController.js updated (cancel URL → /payment-cancelled?course_id=xxx)

### Phase 3 — Email Sequences ✅ COMPLETE
- [x] dripScheduler.js created (node-cron, runs hourly at :05)
- [x] leadDripService.js created (5-step sequence: welcome → d1 → d3 → d7 → d14)
- [x] onboardingDripService.js created (5-step: receipt → congrats → d1 → d3 → d7)
- [x] installmentReminderService.js created (6-step: d21 → d24 → d28 → d32 → d35 → d42 hard lock)
- [x] All 16 email templates added directly to emailService.js (no separate template files needed)
- [x] emailService.js updated with _baseTemplate() helper + all new send methods
- [x] server.js updated — drip scheduler started on app boot
- [ ] Mailchimp integration (when account ready)

### Phase 4 — Preview Mode
- [ ] AuthContext.jsx updated (accessLevel, installmentStatus, daysUntilLock)
- [ ] LockOverlay.jsx created
- [ ] PaymentBanner.jsx created (yellow → orange → red states)
- [ ] SuspensionModal.jsx created (fullscreen, Day 35+)
- [ ] InstallmentCountdown.jsx created
- [ ] Dashboard.jsx updated
- [ ] CoursePlayer.jsx updated (lock overlay)
- [ ] CourseDetail.jsx updated (Enroll Now CTA)
- [ ] Forums.jsx updated (disable posting)

### Phase 5 — Admin Features
- [ ] couponsController.js created (CRUD)
- [ ] leadsController.js created
- [ ] admin coupon routes created
- [ ] admin leads routes created
- [ ] Coupons.jsx admin page created
- [ ] Leads.jsx admin page created
- [ ] Admin Sidebar.jsx updated (new menu items)
- [ ] Admin App.jsx updated (new routes)
- [ ] Admin api.js updated

### Phase 6 — WhatsApp
- [ ] Twilio account created (owner action)
- [ ] WhatsApp Business number approved (owner action)
- [ ] twilioService.js created
- [ ] whatsappTemplates.js created
- [ ] installmentReminderService.js updated (WhatsApp calls)
- [ ] leadDripService.js updated (WhatsApp calls)

---

## DESIGN SYSTEM (For All New Pages + Email Templates)

```
Brand Colors:
  Primary Blue:     #0e2b5c
  Secondary Purple: #2e3192
  Accent Red:       #eb1c22
  Success Green:    #10b981
  Warning Yellow:   #f59e0b
  Error Red:        #ef4444

Lock System Colors:
  Green (full access):  #10b981
  Yellow (Day 21):      #f59e0b
  Orange (Day 24):      #f97316
  Red (Day 28+):        #ef4444
  Amber lock (Day 32):  #dc2626
  Soft lock (Day 35):   #7f1d1d

Font: Rubik (all weights via Google Fonts — already loaded in app)
Logo: /asset/logo.png (confirm with owner)
```

---

## NOTES

- 2026-03-24: All 9 decisions locked. Plan complete. Ready to build.
- 2026-03-24: Progressive lock system designed (7 stages: green → yellow → orange → red → amber → soft → hard).
- 2026-03-24: Registration model = general (register → explore → enroll → pay). Matches Coursera/Udemy pattern.
- 2026-03-24: Existing DB is dummy data — full reset. Payment gate applies to all future users.
- 2026-03-24: WhatsApp confirmed (Phase 6). Twilio account needed from owner.
- 2026-03-24: Preview = course outline + Lesson 1 free per course. All other content locked.
- 2026-03-24: TekyPro registered in USA — Stripe works directly. No Stripe Atlas needed.
- 2026-03-24: Email strategy = Nodemailer (build now) + Mailchimp (migrate when account ready).
- 2026-03-24: node-cron drip scheduler runs hourly. Checks leads + payments tables for pending emails.

---

## OWNER DEPLOYMENT CHECKLIST

Everything the business owner must do before going live. The code is done — these are account setups and config values only.

---

### 1. Gmail App Password (for Nodemailer email sending)

- [ ] Go to **myaccount.google.com → Security → 2-Step Verification** → turn it ON
- [ ] Go to **myaccount.google.com → Security → App Passwords**
- [ ] Select app: "Mail", device: "Other" → type "TekyPro Server" → click Generate
- [ ] Copy the 16-character password shown
- [ ] Add to Railway env vars:
  - `EMAIL_USER` = your Gmail address (e.g. `hello@tekypro.com`)
  - `EMAIL_PASS` = the 16-character app password

---

### 2. Stripe Account

- [ ] Go to **stripe.com** → create an account (use your business email)
- [ ] Complete identity verification (takes 1–2 business days)
- [ ] Go to **Developers → API Keys**
- [ ] Copy **Publishable key** (`pk_live_...`) and **Secret key** (`sk_live_...`)
- [ ] Add to Railway env vars:
  - `STRIPE_SECRET_KEY` = `sk_live_...`
- [ ] Add to frontend student app (Vite build / Railway frontend env vars):
  - `VITE_STRIPE_PUBLISHABLE_KEY` = `pk_live_...`
- [ ] In Stripe Dashboard → **Settings → Branding**: add TekyPro logo and brand colors so the hosted checkout page looks professional

---

### 3. Stripe Webhook

- [ ] In Stripe Dashboard → **Developers → Webhooks** → click **Add endpoint**
- [ ] Endpoint URL: `https://YOUR-BACKEND-DOMAIN.railway.app/api/payments/webhook`
  - Replace `YOUR-BACKEND-DOMAIN` with your actual Railway backend URL
- [ ] Events to listen to — select these:
  - `checkout.session.completed`
  - `invoice.payment_succeeded`
  - `customer.subscription.deleted`
- [ ] After saving, click the webhook → copy the **Signing secret** (`whsec_...`)
- [ ] Add to Railway env vars:
  - `STRIPE_WEBHOOK_SECRET` = `whsec_...`

---

### 4. Railway Environment Variables (Backend)

Go to **Railway → your backend service → Variables** and make sure ALL of these are set:

| Variable | Value |
|---|---|
| `NODE_ENV` | `production` |
| `PORT` | `5000` (or Railway auto-sets this) |
| `DB_HOST` | Your Railway MySQL/PostgreSQL host |
| `DB_PORT` | `3306` (MySQL) or `5432` (PostgreSQL) |
| `DB_NAME` | Your database name |
| `DB_USER` | Your database user |
| `DB_PASSWORD` | Your database password |
| `JWT_SECRET` | Any long random string (32+ characters) — generate one |
| `JWT_REFRESH_SECRET` | A different long random string |
| `STRIPE_SECRET_KEY` | `sk_live_...` from step 2 |
| `STRIPE_WEBHOOK_SECRET` | `whsec_...` from step 3 |
| `EMAIL_USER` | Gmail address from step 1 |
| `EMAIL_PASS` | App password from step 1 |
| `FRONTEND_URL` | `https://YOUR-STUDENT-FRONTEND-DOMAIN` |
| `ADMIN_FRONTEND_URL` | `https://YOUR-ADMIN-FRONTEND-DOMAIN` |

> To generate a strong JWT_SECRET run: `node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"`

---

### 5. Frontend Deployments

**Student frontend** (`frontend/`):
- [ ] In Railway (or Vercel/Netlify) → set env var `VITE_API_URL` = `https://YOUR-BACKEND-DOMAIN.railway.app`
- [ ] Set env var `VITE_STRIPE_PUBLISHABLE_KEY` = `pk_live_...`
- [ ] Deploy / trigger a redeploy so the new env vars are baked in

**Admin frontend** (`frontend-admin/`):
- [ ] In Railway (or Vercel/Netlify) → set env var `VITE_API_URL` = `https://YOUR-BACKEND-DOMAIN.railway.app`
- [ ] Deploy / trigger a redeploy

---

### 6. Set Course Prices in the Admin Portal

- [ ] Log in to the Admin portal
- [ ] Go to **Courses** → click each course → **Edit**
- [ ] Set the `price` field (e.g. `150.00` for $150 USD)
- [ ] Set `installment_price` if offering the 60/40 plan (e.g. `90.00` for the first 60%)
- [ ] Save each course — the Checkout page reads these values live

---

### 7. Mark Preview Lessons

- [ ] In Admin portal → each course → open **Course Builder**
- [ ] For each course, find **Lesson 1** (or whichever lessons should be free to preview)
- [ ] Toggle `is_preview = true` on those lessons
- [ ] All other lessons will be locked behind enrollment automatically

---

### 8. Database Reset (One-Time — Before Launch)

> Only do this once before real users start signing up. The current DB has dummy/test data.

- [ ] Connect to your Railway database
- [ ] Run the seed/reset script if available, OR manually clear test users/enrollments/payments
- [ ] Confirm the DB is clean: 0 users, 0 enrollments, 0 payments
- [ ] After this, the first real signup will trigger the full funnel correctly

---

### 9. Test the Full Funnel End-to-End (Stripe Test Mode First)

Before switching to live keys, test with Stripe test keys:

- [ ] Set `STRIPE_SECRET_KEY` = `sk_test_...` and `VITE_STRIPE_PUBLISHABLE_KEY` = `pk_test_...`
- [ ] Register a new student account
- [ ] Browse courses → confirm preview lessons are accessible, others are locked
- [ ] Click Enroll → go through Stripe checkout → use test card `4242 4242 4242 4242`
- [ ] Confirm enrollment is created after payment
- [ ] Confirm `registration_status` changes to `active`
- [ ] Confirm PaymentBanner disappears after enrollment
- [ ] Test installment flow: enroll with installment plan, confirm 60% charge goes through
- [ ] Test admin unlock: go to Admin → Users → find a suspended user → Unlock Access
- [ ] Once everything passes → switch to live Stripe keys

---

### 10. (Post-Launch) WhatsApp / Twilio Setup

Defer until after launch. When ready:
- [ ] Create a Twilio account at **twilio.com**
- [ ] Apply for **WhatsApp Business API** through Twilio (requires Meta Business verification — allow 2–4 weeks)
- [ ] Once approved, get Twilio `ACCOUNT_SID`, `AUTH_TOKEN`, and WhatsApp sender number
- [ ] Add to Railway env vars and implement Phase 6 drip sequences

---

**When all checkboxes above are ticked → TekyPro is live.**



























 1. Gmail App Password — for email sending
  2. Stripe Account — create account, get live keys                      
  3. Stripe Webhook — register endpoint, get signing secret              
  4. Railway Env Vars — full table of every variable needed              
  5. Frontend Deployments — VITE_API_URL + VITE_STRIPE_PUBLISHABLE_KEY   
  for both frontends                                                     
  6. Set Course Prices — in Admin portal
  7. Mark Preview Lessons — flag is_preview on lesson 1 per course       
  8. Database Reset — clear dummy data before real users sign up         
  9. End-to-End Test — full funnel test with Stripe test mode first
  10. WhatsApp/Twilio — post-launch, when Meta approval is done          
                           