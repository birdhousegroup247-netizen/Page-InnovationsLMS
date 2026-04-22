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
**Status: ✅ Done (awaiting credentials)**

Auto-invite enrolled students to Discord. Per-cohort channels, interview prep room for fully-paid students, remove from everything on unenroll/refund.

### Backend
- [x] Created `backend/services/discord/discordService.js` (Discord REST API wrapper)
- [x] Created `backend/controllers/discord/discordController.js` (business logic)
- [x] Created `backend/routes/api/discord.js` (routes)
- [x] OAuth 2.0 flow to link Discord account (`identify guilds.join` scope)
- [x] On enrollment: auto-assign course role + send invite via email + in-app notification
- [x] On enrollment: assign Interview Prep role for fully-paid students
- [x] On unenrollment/refund: remove course role; kick from server if no enrollments remain
- [x] Admin manual unenroll also triggers Discord removal
- [x] Added `discord_user_id`, `discord_access_token` to User model
- [x] Added `discord_role_id`, `discord_channel_id` to Course model
- [x] `GET /api/discord/course/:courseId/invite` — fetch invite for enrolled student
- [x] `POST /api/discord/admin/sync/:userId` — admin re-sync a user's roles
- [x] Discord email template added to emailService

### Frontend (Student)
- [x] "Discord" tab added to Profile Settings page
- [x] "Connect Discord Account" button (OAuth redirect)
- [x] Shows connected status + in-server status
- [x] Discord channel banner on Course Detail page (enrolled students only)
- [x] "Join Channel" link shown on course page when Discord is configured

### Frontend (Admin)
- [ ] Discord status column in Users page (pending — admin frontend update)

### Environment Variables Needed
```
DISCORD_BOT_TOKEN=         ← from Discord Developer Portal
DISCORD_GUILD_ID=          ← right-click server > Copy Server ID
DISCORD_CLIENT_ID=         ← from Discord Developer Portal (OAuth2)
DISCORD_CLIENT_SECRET=     ← from Discord Developer Portal (OAuth2)
DISCORD_REDIRECT_URI=https://yourdomain.com/api/discord/callback
DISCORD_INVITE_URL=        ← fallback invite (optional)
DISCORD_INTERVIEW_PREP_ROLE_ID=  ← create this role in Discord, paste ID here
```

---

## Overall Progress

| Integration | Backend | Frontend | Admin | Status |
|---|---|---|---|---|
| Paystack | ✅ | ✅ | ✅ | Done |
| Zoom | ✅ | ✅ | ✅ | Done |
| Discord | ✅ | ✅ | 🔲 | Done (awaiting credentials) |

---

## Notes
- Discord code is complete — just needs Bot Token + Guild ID to go live
- Interview Prep role ID must be created in Discord server, then pasted into env
- Discord OAuth requires adding the callback URL in Discord Developer Portal → OAuth2 → Redirects
