# Finance Audit — Page Innovation (2026-06-26)

End-to-end audit of the money flow across all 3 apps: student frontend,
instructor frontend (same React project), admin frontend, and the shared
backend. Covers checkout, payment providers, installments, refunds,
enrollments, coupons, bundles, and admin visibility.

---
@. check all email Services too, reminder emails, payment confirmation emails, refund emails,  welcome emails, promotional emails, happy birthday emails, emails for people taht regitser and idn't buy a course, follow up emails  etc and  many more i didn't think of 


Note that the one we are uing for our payment gateway for now is paypal

## TL;DR — what's working, what's broken

| Area | Status | Notes |
|---|---|---|
| Stripe checkout (full + installment) | ✅ Working | Solid — webhook signature verified, idempotent, comprehensive enrollment side-effects |
| Paystack checkout (full + installment) | ⚠️ Working but currency-fragile | Hardcoded `currency: 'USD'` on the popup — requires Paystack USD-enabled merchant account or breaks |
| PayPal checkout (full + installment) | ✅ Working | Webhook signature verified, idempotent |
| Installment lifecycle (60/40 + 7-stage reminder ladder) | ✅ Working | D21 → D42 escalation with hard-lock at day 42, well-built |
| Admin Payments list + stats | ✅ Working | Complete view, top courses, monthly chart, method breakdown |
| Admin refund (Stripe / Paystack) | ✅ Working | Hits provider API, revokes enrollment + chat membership |
| **Admin manual enroll** | ❌ Inconsistent | Skips chat-room join, test auto-assign, user activation, no payment record |
| **Admin manual unenroll** | ❌ Inconsistent | Doesn't remove chat-room membership, leaves payment as `completed` |
| **Bundle "purchase"** | ❌ Broken by design | Routes to checkout for only the first course in the bundle; bundle price is ignored |
| **Free-course bundle pricing** | ❌ N/A | Bundles have no working purchase path at all |
| **Currency display** | ❌ Wrong for NGN | `$` is hardcoded everywhere; `payments.currency` column is stored but never read |
| **Webhook atomicity** | ⚠️ Risk | Multi-step enrollment side-effects aren't wrapped in a transaction; partial failures aren't reversible |
| **Coupon redemption logging** | ⚠️ Stripe-only | `CouponRedemption.create()` is only called in the Stripe webhook (not Paystack / PayPal) |
| **Currency mismatch refund** | ⚠️ Minor | Paystack refund uses `Math.round(amount * 100)` assuming dollars→cents but Paystack settles in kobo (NGN minor units) for an NGN merchant |
| **Coupon increment race** | ⚠️ Minor | `CouponCode.increment('uses_count')` not atomic against the `uses_count < max_uses` check at create-time |
| **Manual enroll race** | ⚠️ Minor | A student can simultaneously self-pay + be manually enrolled → duplicate-enrollment 400 from one side, but no payment-side cleanup |

Legend: ✅ works, ⚠️ caveat, ❌ broken / missing

---

## 1. Payment provider matrix

Three providers wired, all in the same `payments` table differentiated by
`payment_gateway`:

| Provider | Code path | Webhook | Currency | Notes |
|---|---|---|---|---|
| **Stripe** | `controllers/payments/stripeController.js` | `/api/webhooks/stripe`, sig verified via `stripeService.constructWebhookEvent` | USD | Hosted checkout (redirect) |
| **Paystack** | `controllers/payments/paystackController.js` | `/api/webhooks/paystack`, HMAC-SHA512 | Hardcoded `USD` on popup ⚠️ | Inline.js popup (no redirect) |
| **PayPal** | `controllers/payments/paypalController.js` | `/api/webhooks/paypal`, sig verified via PayPal API | USD | Approve+capture flow with frontend `capture` step |

All three handle:
- Full + installment (60% upfront / 40% later)
- Coupon application
- Pending payment row created at initialize
- Webhook is the single source of truth for marking `completed` + creating
  enrollment
- Idempotent webhook (early-return if already `completed`)

Free courses (`price === 0`) bypass payment entirely via
`POST /api/courses/:id/enroll` which has its own payment gate that lets
zero-price courses through.

---

## 2. The 60/40 installment lifecycle

Genuinely well-designed. From `services/drip/installmentReminderService.js`
and `models/Payment.js`:

```
Day 0   payment.installment_due_date arrives  (= payment_date + 21 days)
Day +0  D21  friendly reminder email
Day +3  D24  orange-banner email
Day +7  D28  red-urgent email (warns of D32 partial lock)
Day +11 D32  partial lock (disable new content) + email
Day +14 D35  soft lock (fullscreen overlay) + email
Day +21 D42  HARD LOCK: user.registration_status='suspended'
```

- `installment_status` flips `pending` → `overdue` automatically the first
  sweep after the due date.
- Each reminder is tracked in `metadata.reminders_sent[]` so the sweep
  never re-sends a stage.
- When student pays the remainder via Stripe / Paystack / PayPal:
  - `installment_status` → `completed`, `installment_paid_at` set
  - User unsuspended if they were on hard-lock
  - Confirmation notification + email

This is the most polished part of the system.

---

## 3. Admin Payments page (frontend-admin/src/pages/admin/Payments.jsx)

What admins see today:

✅ Total revenue / month revenue / refunds / pending count
✅ Avg order value
✅ Monthly revenue chart (last 12 months)
✅ Top 5 courses by revenue
✅ Payment method breakdown
✅ Filter by status / gateway / method / date range / student / course / search
✅ Per-row refund action (calls provider API + revokes enrollment + chat)
✅ Refund confirmation email to student

Backed by `controllers/admin/paymentsController.js`:
- `GET /api/admin/payments/stats`
- `GET /api/admin/payments`
- `POST /api/admin/payments/:id/refund`

The data is in good shape. The only display issue is the `$` symbol is
hardcoded — if any payment is made in a non-USD currency, the admin still
sees `$X` and can't tell the difference.

---

## 4. Specific findings (ordered by severity)

### 🔴 Critical — must fix before going live with bundles

**4.1 Bundles have no real purchase flow.**
`frontend/src/pages/BundleDetail.jsx` line 25:
```js
navigate(`/checkout?course_id=${bundle.courses[0].id}&bundle_id=${bundle.id}`);
```
The button "Buy Bundle" navigates the user to checkout for ONLY the first
course in the bundle. The `bundle_id` query param is ignored by every
payment controller. The bundle's `price` field is decorative — there's no
backend endpoint that creates a bundle purchase.

What a real bundle purchase would need:
- A `POST /api/payments/.../bundle-checkout` per provider, OR a unified
  `bundle_id` branch in each provider's `initialize` endpoint
- Pricing rule: charge bundle price ONCE
- Side-effect: enroll the student into ALL courses in the bundle in one
  transaction
- Webhook handler: loop the bundle's courses for chat-room join, test
  auto-assign, etc.
- `Payment` row: probably a single row with `bundle_id` + a join table or
  `metadata.bundle_courses[]`

This is the biggest gap — listed first because if the client expects
bundles to work, this is non-shippable.

---

**4.2 Admin manual enroll is inconsistent with paid enroll.**
`controllers/admin/enrollmentsController.js#createEnrollment`:

| Side-effect | Paid (Stripe webhook) | Admin manual enroll |
|---|---|---|
| Create `Enrollment` | ✅ | ✅ |
| Send confirmation email | ✅ | ✅ |
| Award `enrollment_count` badge | ✅ | ✅ |
| Auto-join course chat room | ✅ | ❌ |
| Auto-assign published tests | ✅ | ❌ |
| Activate `user.registration_status` | ✅ | ❌ |
| Notification entry | ✅ | ❌ |
| Discord hook (course role) | ❌ | ❌ |
| Create a `Payment` row (marker: amount=0 or admin-comped) | ✅ | ❌ |

Result: admin-enrolled students show up in My Courses but can't post in
the course chat, don't get the tests, and (if registered but never
activated) the rest of the platform still treats them like trial users.

---

**4.3 Admin manual unenroll doesn't clean up chat + payment.**
`controllers/admin/enrollmentsController.js#deleteEnrollment`:
- Removes the `Enrollment`
- Decrements `course.enrollment_count`
- Fires Discord unenroll hook
- **Does NOT** remove `ChatRoomMember` (refund flow does)
- **Does NOT** touch the `Payment` row (still `completed`)
- **Does NOT** flag the payment in any way

So an admin can revoke access without refunding, but admin Payments page
will still show the student paid in full. This is a books-vs-access
discrepancy that will eventually bite during reconciliation.

---

### 🟡 Important — fix before scaling beyond Stripe-only

**4.4 Paystack popup hardcodes `currency: 'USD'`.**
`frontend/src/pages/Checkout.jsx:223` and `:269`:
```js
const handler = window.PaystackPop.setup({
  ...,
  currency: 'USD',
  ...
});
```
For this to work, the Paystack merchant account at the configured
`VITE_PAYSTACK_PUBLIC_KEY` MUST have USD support enabled on Paystack's
side (a paid feature). If only NGN is enabled, the popup throws
"Currency not supported" — the student sees a broken payment flow.

The right fix is either:
- (a) Confirm USD is enabled on the merchant account and document it (no code change)
- (b) Drive currency from a per-environment config (`VITE_PAYMENT_CURRENCY`) so different deployments can use different settlement currencies
- (c) For NGN-only Paystack, convert USD → NGN on the backend before initializing and store both `amount` (NGN) + `original_amount` + `currency` correctly

---

**4.5 `$` symbol is hardcoded across both UIs even though `payments.currency` exists.**

Both `frontend/src/pages/Billing.jsx` and
`frontend-admin/src/pages/admin/Payments.jsx` render `$X.XX`
unconditionally. The `payments.currency` column is correctly stored
(`USD` by default) but never read. If a non-USD payment ever lands in
the DB (e.g. mid-deployment provider switch, manual DB insert, or 4.4
above), the UI will lie about the currency.

Cheap fix: replace `formatCurrency(v)` with one that reads
`payment.currency` and falls back to `USD`. Two small one-line helpers.

---

**4.6 Webhook side-effects aren't transactional.**
`stripeController._handleCheckoutCompleted` does, sequentially, with no
transaction wrapper:
1. Update `payment` → `completed`
2. Create `Enrollment`
3. Update `Payment.enrollment_id`
4. Activate `User`
5. `CouponCode.increment(uses_count)` + create `CouponRedemption`
6. Auto-join `ChatRoomMember`
7. Auto-assign `TestAssignment` (for-loop)
8. Notification + emails
9. Referral reward
10. Badge check

If any step 2–10 throws, the partial state is committed to DB. The
webhook handler then logs and returns 200, so Stripe doesn't retry. We
end up with a `payment.completed` and possibly a partial enrollment, or
an enrollment without chat membership, etc.

Two acceptable mitigations:
- (a) Wrap steps 1–7 in `sequelize.transaction` — emails and badge checks
  stay outside (they're fire-and-forget already).
- (b) Build a "post-enrollment-side-effects" reconciler that the
  installment sweep cron can also exercise on an interval (verify every
  recent `completed` payment has matching chat membership, test
  assignments, etc.). This is what most billing-heavy SaaS do.

Same pattern applies to PayPal and Paystack handlers — they all repeat
the same multi-step side-effects.

---

**4.7 Coupon redemption logging is Stripe-only.**
In `stripeController._handleCheckoutCompleted` (line 449-456), a
`CouponRedemption` row is created when a coupon was used. The Paystack
and PayPal webhook flows update `payment.coupon_code_id` but never call
`CouponCode.increment('uses_count')` or `CouponRedemption.create()`.

Effect: coupons used on Paystack/PayPal don't count toward `max_uses`,
and admin redemption history is incomplete.

Fix: extract the coupon-bookkeeping block into a shared helper
(`processCouponRedemption(payment)`) and call it from all three webhook
handlers.

---

**4.8 Paystack refund amount unit mismatch.**
`services/payment/paystackService.js:44`:
```js
if (amount) params.amount = Math.round(amount * 100); // to cents
```
This converts dollars → cents. But Paystack settles in the merchant
account's currency's minor unit:
- USD account → cents ✓
- NGN account → kobo (1 NGN = 100 kobo, but the underlying `amount`
  passed in is in *dollars*, not naira, so the math is wrong)

If 4.4 is resolved by going USD-only, this is automatically fine. If the
backend ever stores NGN amounts, this needs to convert from naira → kobo
(still `* 100`) but only if the `payments.currency` is `NGN`.

---

### 🟢 Minor — defensive cleanups

**4.9 Coupon `uses_count < max_uses` check is not atomic.**
Two students hitting checkout at the same time on a coupon with
`max_uses: 1` can both read `uses_count: 0`, pass the check, and create
two `pending` payments before either increments. Whoever's webhook
arrives first wins the slot; the other's coupon redemption row gets
written but the coupon's `uses_count` overshoots `max_uses`. Not a
financial issue (real money paid is correct), but cosmetically wrong.

Fix: in the webhook, lock the `CouponCode` row with `SELECT ... FOR
UPDATE` inside the transaction and re-check `uses_count < max_uses`
before incrementing. If full, throw — and let admin reconcile.

---

**4.10 Per-row refund button only works for completed payments.**
`paymentsController.js#issueRefund` blocks refunds on non-completed
payments. Reasonable — but the UI doesn't disable the button for
`pending` rows, so the admin gets a toast. Cheap UX fix: disable the
button on non-completed rows.

---

**4.11 `payment.amount` is overwritten by Stripe's reported amount.**
`stripeController._handleCheckoutCompleted` line 424:
```js
await payment.update({ ..., amount: amountPaid, ... });
```
This overwrites the initially-stored `amount` with whatever Stripe says.
Usually they match, but if a Stripe coupon misfires or settles to a
different amount, the audit trail loses the original intent. Not a bug
right now, but worth keeping `intended_amount` and `actual_amount`
separate if you ever need to dispute a charge.

---

**4.12 No "manual comp" Payment row for admin enrolls.**
Tied to 4.2. Even if all the side-effects were aligned, the absence of a
Payment row for admin-enrolled students means:
- Revenue stats don't see comped enrollments (correct)
- But admin Payments page shows no record of "free comp" for a course
  the student is taking — accountants will ask

Suggested fix: admin enroll can create a `Payment` with
`amount: 0, payment_method: 'comp', payment_status: 'completed',
metadata: { comped_by_admin_id: req.user.id }`. Then the existing list
view + filters work uniformly.

---

## 5. What needs doing (prioritized)

### P0 — finance-breaking
1. **Bundle purchase** — design + build end-to-end. Per provider.
   Estimate: medium (touches 3 controllers, 1 webhook helper, 2 frontend
   pages).

### P1 — operational correctness
2. **Admin manual enroll** — add chat join, test auto-assign, user
   activation, and a `comp` Payment row. (Re-use the existing
   "post-enroll side-effects" code; extract to a helper if not already.)
3. **Admin manual unenroll** — remove chat membership, mark Payment as
   `comped_revoked` or similar. Don't issue a refund automatically — the
   admin already has a separate refund flow.
4. **Webhook transactional integrity** — wrap the multi-step
   side-effects in `sequelize.transaction`. Extract a shared
   `runEnrollmentSideEffects(payment, transaction)` helper used by all
   three webhooks AND the admin manual enroll.
5. **Coupon redemption logging in Paystack + PayPal webhooks** — extract
   the Stripe block into a shared helper and call from all three.

### P2 — currency / display
6. **Paystack currency** — decide policy (USD-only vs configurable vs
   NGN with conversion). Document and lock it in.
7. **Currency-aware formatters** — both UIs respect
   `payment.currency`. One-line shared util.

### P3 — hardening
8. **Coupon `uses_count` atomicity** — `SELECT FOR UPDATE` in webhook.
9. **Refund button UI** — disable on non-completed rows.
10. **Keep `intended_amount` and `actual_amount` separate** on Payment
    model so reconciliation diffs are visible.

---

## 6. What's NOT broken (so we don't pay tax on it later)

- Webhook signatures are verified on all three providers (Stripe sig,
  Paystack HMAC-SHA512, PayPal API).
- Webhook idempotency: each handler early-returns when
  `payment_status === 'completed'`.
- Pending payment rows are created at initialize so the webhook always
  has a row to match against (no race where webhook arrives before our
  row exists).
- Free course enrollment short-circuits cleanly via
  `POST /api/courses/:id/enroll` with a 402 if a paid course has no
  completed payment.
- `payments` table has all the indexes you'd want for the admin filters
  (status, gateway, dates, student, course).
- Installment 7-stage reminder ladder is well-built — idempotent via
  `metadata.reminders_sent[]`.
- Refunds via admin actually call the provider API (no fake refund
  status updates).
- Refund flow correctly destroys `Enrollment` and `ChatRoomMember`.

---

## 7. Files of interest (so we can return here)

- `backend/models/Payment.js` — the central record
- `backend/controllers/payments/stripeController.js`
- `backend/controllers/payments/paystackController.js`
- `backend/controllers/payments/paypalController.js`
- `backend/controllers/admin/paymentsController.js`
- `backend/controllers/admin/enrollmentsController.js`
- `backend/services/drip/installmentReminderService.js`
- `backend/services/payment/paystackService.js`
- `backend/routes/api/payments.js` + `backend/routes/api/webhooks.js`
- `frontend/src/pages/Checkout.jsx`
- `frontend/src/pages/Billing.jsx`
- `frontend/src/pages/BundleDetail.jsx`
- `frontend-admin/src/pages/admin/Payments.jsx`
