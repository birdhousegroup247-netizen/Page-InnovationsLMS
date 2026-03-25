# TekyPro LMS — Integration Progress
**Started: 25 March 2026**

---

## 1. Paystack Payment Gateway
**Status: ✅ Done**

Add Paystack alongside Stripe so Nigerian students can pay with local cards in USD (auto-converts to NGN). Same installment logic (60/40) as Stripe.

### Backend
- [x] Create `backend/services/payment/paystackService.js`
- [x] Create `backend/controllers/payments/paystackController.js` (one-time checkout)
- [x] Add installment checkout to paystackController (60% now, 40% later)
- [x] Create Paystack webhook handler (verify payment → enroll student → trigger emails)
- [x] Add Paystack routes to `backend/routes/api/payments.js`
- [x] Add rate limiting to Paystack checkout endpoints
- [x] On enrollment: trigger receipt + congrats emails (same as Stripe)
- [x] On refund: remove enrollment + chat room access + send refund email

### Frontend (Student)
- [x] Updated Checkout page to show two payment buttons:
  - "International (Stripe)" → Stripe redirect
  - "Nigeria (Paystack)" → Paystack popup
- [x] Paystack Inline.js loaded dynamically
- [x] Installment plan works for both gateways
- [x] Second installment payment locked to original gateway
- [x] PaymentSuccess page handles both Stripe session_id and Paystack reference

### Admin
- [x] Gateway column added to payments table (blue=Stripe, green=Paystack)
- [x] Gateway filter dropdown added (All / Stripe / Paystack)
- [x] Refund works for both gateways from admin panel

### Environment Variables Needed
```
PAYSTACK_SECRET_KEY=sk_live_...
PAYSTACK_PUBLIC_KEY=pk_live_...
```

---

## 2. Zoom Integration
**Status: ✅ Done**

Auto-create Zoom meetings when a live session is scheduled. Students get a join link directly on the Live Sessions page.

### Backend
- [x] Created `backend/services/zoom/zoomService.js` (Server-to-Server OAuth + token caching)
- [x] Auto-create Zoom meeting on session creation when platform='zoom'
- [x] Store `zoom_meeting_id`, `zoom_start_url` on LiveSession — `meeting_url` = join URL
- [x] Auto-update Zoom meeting when title/time/duration changes
- [x] Auto-delete Zoom meeting when session is cancelled
- [x] `zoom_start_url` hidden from students in API response

### Frontend (Student)
- [x] Join link (meeting_url) visible immediately from the moment session is scheduled
- [x] CourseDetail.jsx already uses meeting_url — works automatically

### Frontend (Instructor)
- [x] Platform defaults to "Zoom (auto-create)"
- [x] Meeting URL field hidden when Zoom is selected
- [x] "Start Meeting" button (host link) shown on Zoom sessions
- [x] "Student Join Link" shown separately

### Environment Variables Needed
```
ZOOM_ACCOUNT_ID=...
ZOOM_CLIENT_ID=...
ZOOM_CLIENT_SECRET=...
```

---

## 3. Discord Integration
**Status: 🔲 Not Started**

Auto-invite enrolled students to the Discord server and assign them a course-specific role. Remove access when they are unenrolled or refunded.

### Backend
- [ ] Create `backend/services/discord/discordService.js` (bot API wrapper)
- [ ] On enrollment: send Discord invite link to student via email/notification
- [ ] On enrollment: assign course role to student in Discord (if they've linked their Discord)
- [ ] On unenrollment/refund: remove course role from student in Discord
- [ ] Create endpoint for students to link their Discord account
- [ ] Store `discord_user_id` on the User record

### Frontend (Student)
- [ ] Add "Connect Discord" button on Profile Settings page
- [ ] Show Discord server invite link on Course page (enrolled students only)
- [ ] Show which Discord role/channel they have access to

### Frontend (Admin)
- [ ] Show Discord connection status per user in Users page
- [ ] Allow admin to manually sync Discord roles

### Environment Variables Needed
```
DISCORD_BOT_TOKEN=...
DISCORD_GUILD_ID=...
DISCORD_INVITE_URL=...
```

---

## Overall Progress

| Integration | Backend | Frontend | Admin | Status |
|---|---|---|---|---|
| Paystack | 🔲 | 🔲 | 🔲 | Not Started |
| Zoom | 🔲 | 🔲 | 🔲 | Not Started |
| Discord | 🔲 | 🔲 | 🔲 | Not Started |

---

## Notes
- All integrations will be built with placeholder env vars — drop in real keys when ready
- Paystack is priority (directly affects revenue)
- Zoom is second (directly affects live classes)
- Discord is third (community feature)
