# Week 2 LMS Features — Progress Tracker

**Started:** 2026-03-24
**Completed:** 2026-03-24
**Status:** ✅ ALL DONE

---

## Feature List

| # | Feature | Status |
|---|---------|--------|
| 1 | Course Wishlist | ✅ Done |
| 2 | Course Bundles | ✅ Done |
| 3 | Referral Program | ✅ Done |
| 4 | Drip Content Scheduling | ✅ Done |
| 5 | Bulk User Import (CSV) | ✅ Done |
| 6 | Course Clone | ✅ Done |

---

## Feature Details

### 1. Course Wishlist ⏳
Students can save courses they want to take later. Shows on a dedicated Wishlist page with enroll CTA.

**Backend:**
- [ ] `POST /api/wishlist/:courseId` — add course to wishlist
- [ ] `DELETE /api/wishlist/:courseId` — remove from wishlist
- [ ] `GET /api/wishlist` — get my wishlist
- [ ] `GET /api/wishlist/:courseId/check` — is this course wishlisted?

**Frontend (student):**
- [ ] Wishlist page (`/wishlist`)
- [ ] Heart/bookmark icon on course cards + CourseDetail page
- [ ] Toast feedback on add/remove

**Admin:**
- [ ] N/A

---

### 2. Course Bundles ⬜
Admin/instructor groups 2+ courses into a bundle with a discounted price. Students buy the bundle and get enrolled in all courses.

**Backend:**
- [ ] Bundle model (id, title, description, price, is_active)
- [ ] BundleCourse join table (bundle_id, course_id)
- [ ] `GET /api/bundles` — list active bundles
- [ ] `GET /api/bundles/:id` — bundle detail with courses
- [ ] `POST /api/payments/bundle-checkout` — Stripe checkout for bundle
- [ ] Admin CRUD: `GET/POST/PUT/DELETE /api/admin/bundles`

**Frontend (student):**
- [ ] Bundles listing page (`/bundles`)
- [ ] Bundle detail page (`/bundles/:id`)
- [ ] Buy Bundle button → Stripe checkout

**Admin:**
- [ ] Bundles management page (create, edit, add courses, deactivate)

---

### 3. Referral Program ⬜
Each student has a unique referral link. When someone signs up using their link and enrolls, the referrer earns credit/points.

**Backend:**
- [ ] `referral_code` column on Users table (auto-generated on register)
- [ ] Referrals table (referrer_id, referred_id, status, reward_given_at)
- [ ] Registration accepts `?ref=CODE` query param
- [ ] `GET /api/referrals/my-stats` — referrer sees their stats
- [ ] `POST /api/referrals/reward` — internal: trigger reward after first enrollment
- [ ] Admin: `GET /api/admin/referrals` — overview

**Frontend (student):**
- [ ] Referral page (`/referrals`) — copy link, stats (invited, enrolled, credits earned)

**Admin:**
- [ ] Referrals overview in admin panel

---

### 4. Drip Content Scheduling ⬜
Instructor can set an unlock date on any lesson. Students can't access it until that date, even if enrolled.

**Backend:**
- [ ] `unlock_date` column on `module_contents` table
- [ ] Progress controller: block content access if `unlock_date > now`
- [ ] CoursePlayer API returns `is_locked` + `unlock_date` per content item
- [ ] Admin/Instructor: `PATCH /api/courses/:id/contents/:contentId/unlock-date`

**Frontend (student):**
- [ ] CoursePlayer sidebar shows locked items with countdown/date
- [ ] LockOverlay variant: "Available on [date]"

**Admin/Instructor:**
- [ ] CourseBuilder: date picker per lesson to set unlock date

---

### 5. Bulk User Import (CSV) ⬜
Admin uploads a CSV file of users (name, email, role, password). System creates accounts in bulk and sends welcome emails.

**Backend:**
- [ ] `POST /api/admin/users/import` — accepts CSV file (multipart)
- [ ] Parse CSV, validate each row, create users, send welcome email
- [ ] Return summary: created, skipped (duplicate email), errors

**Frontend (admin):**
- [ ] Import button on Users page → modal with CSV upload
- [ ] Download sample CSV template
- [ ] Show import results summary (X created, Y skipped, Z errors)

---

### 6. Course Clone ⬜
Instructor can duplicate an existing course (their own). Creates a new draft with all modules and lessons copied.

**Backend:**
- [ ] `POST /api/courses/:id/clone` — deep clone course + modules + contents
- [ ] New course gets title "Copy of [original]", status = draft
- [ ] Instructor must own the original course

**Frontend (admin/instructor):**
- [ ] "Clone Course" button in course actions (admin Courses page)
- [ ] Toast confirmation with link to new draft

---

## Progress Log

- **2026-03-24** — Progress file created. Starting Day 1: Course Wishlist.
