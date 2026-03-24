# Week 3 Admin Completeness — Progress Tracker

**Started:** 2026-03-24
**Completed:** 2026-03-24
**Status:** ✅ ALL DONE

---

## What This Week Fixes

These are **operational gaps** found in a critical audit — things that exist in the
database/backend but were never wired to the admin UI, or are completely missing.
Without these, the platform cannot be run properly by a real admin.

---

## Feature List

| # | Feature | Status |
|---|---------|--------|
| 1 | Instructor Assignment to Course | ✅ Done |
| 2 | Enrollment Management (Manual Enroll / Unenroll / View) | ✅ Done |
| 3 | Revenue & Payments Dashboard | ✅ Done |
| 4 | Global Admin Announcements | ✅ Done |

---

## Feature Details

---

### 1. Instructor Assignment to Course ⬜

**The Problem:**
The `Course` model has an `instructor_id` column. But the admin Courses edit form
has no instructor field — so once a course is created, the admin cannot reassign
it to a different teacher. There is also no backend route to change instructor_id.

**Solution — Backend:**
- Add `PATCH /api/admin/courses/:id/instructor` — takes `{ instructor_id }`, validates
  the user exists and has role `instructor`/`admin`, updates the course.
- Add `instructor_id` to the `bulkUpdateField` whitelist so bulk-reassignment is
  also possible.

**Solution — Frontend (Admin):**
- **Courses.jsx**: Add `instructor_id` field to the edit modal dropdown. Fetch all
  users with `role=instructor` and populate the selector. Show current instructor.
- **CourseBuilder.jsx (Step 1 — Basic Info)**: Add instructor selector here too,
  so when creating a new course the admin can assign a teacher from the start.
- The dropdown must show `full_name` + email so admin can tell instructors apart.

**Files to change:**
- `backend/controllers/admin/coursesController.js` — add `assignInstructor` method
- `backend/routes/api/admin/courses.js` — add `PATCH /:id/instructor`
- `frontend-admin/src/pages/admin/Courses.jsx` — add instructor dropdown in edit form
- `frontend-admin/src/pages/admin/CourseBuilder.jsx` — add instructor selector in Step 1

---

### 2. Enrollment Management ⬜

**The Problem:**
Admins have zero control over enrollments. They cannot:
- See a list of all enrolled students for any course
- Manually enroll a student who paid offline / needs special access
- Unenroll a student (e.g. chargeback, policy violation)
- See an individual student's progress percentage

**Solution — Backend:**
- `GET /api/admin/enrollments` — all enrollments, filters: `course_id`, `student_id`,
  `progress_min`, `progress_max`, `completed`, pagination + search
- `POST /api/admin/enrollments` — manually create enrollment `{ student_id, course_id }`.
  Skips payment (admin override). Sets progress to 0.
- `DELETE /api/admin/enrollments/:id` — remove enrollment (with confirmation guard).
- `PATCH /api/admin/enrollments/:id/progress` — manually set progress % (for imported users)
- `GET /api/admin/courses/:id/enrollments` — convenience: enrollments for one course
  (used by the "View Students" button on the Courses page)

**Solution — Frontend (Admin):**
- **New page `Enrollments.jsx`** at `/enrollments`:
  - Stats bar: Total Enrollments, Completed, In Progress, Not Started
  - Filter bar: search student name/email, filter by course, filter by progress range
  - Table: Student, Course, Enrolled Date, Progress bar, Completed badge, Actions
  - Actions per row: View Student, View Course, Remove Enrollment
  - "Enroll Student" button → modal: pick student (searchable) + pick course + confirm
  - Export CSV button (same as Users page pattern)
  - Clicking a course name filters the table to that course
- **Courses.jsx**: Add "View Students" button in course actions → navigates to
  `/enrollments?course_id=X` (pre-filtered)
- **Users.jsx**: Add "View Enrollments" in user actions → navigates to
  `/enrollments?student_id=X`

**Files to change / create:**
- `backend/controllers/admin/enrollmentsController.js` — new file
- `backend/routes/api/admin/enrollments.js` — new file
- `backend/server.js` — add `/api/admin/enrollments` route
- `frontend-admin/src/pages/admin/Enrollments.jsx` — new page
- `frontend-admin/src/utils/navigationItems.jsx` — add Enrollments nav item
- `frontend-admin/src/App.jsx` — add `/enrollments` route
- `frontend-admin/src/pages/admin/Courses.jsx` — add "View Students" button
- `frontend-admin/src/pages/admin/Users.jsx` — add "View Enrollments" link

---

### 3. Revenue & Payments Dashboard ⬜

**The Problem:**
The `Payment` model is fully built (36 fields: amount, status, Stripe IDs, refunds,
installments, coupons). But there is NO admin page to see any of it. The admin
is flying blind on revenue.

**Solution — Backend:**
- `GET /api/admin/payments` — all payments, filters: `status`, `date_from`, `date_to`,
  `student_id`, `course_id`. Includes student name, course title. Pagination.
- `GET /api/admin/payments/stats` — dashboard numbers:
  - `total_revenue` (sum of completed payments)
  - `this_month_revenue`
  - `total_refunds`
  - `pending_payments`
  - `avg_order_value`
  - `monthly_chart` (last 12 months revenue grouped by month)
  - `top_courses` (top 5 by revenue)
  - `payment_method_breakdown` (card / bank / paypal percentages)
- `POST /api/admin/payments/:id/refund` — trigger Stripe refund for a completed payment.
  Updates `payment_status = 'refunded'`, records `refund_date + refund_amount`.

**Solution — Frontend (Admin):**
- **New page `Payments.jsx`** at `/payments`:
  - Stats cards row: Total Revenue, This Month, Total Refunds, Pending
  - Revenue chart (line chart, last 12 months) — same chart lib as Analytics
  - Top Courses by Revenue (mini table, top 5)
  - Payment Method breakdown (pie chart)
  - Full transactions table:
    - Columns: Student, Course, Amount, Method, Status badge, Date, Actions
    - Status badges: green (completed), yellow (pending), red (failed/refunded)
    - Filter bar: status dropdown, date range picker, search
    - Per-row action: "Issue Refund" button (only for completed payments, shows confirm modal)
  - Export CSV button

**Files to create / change:**
- `backend/controllers/admin/paymentsController.js` — new file
- `backend/routes/api/admin/payments.js` — new file
- `backend/server.js` — add `/api/admin/payments` route
- `frontend-admin/src/pages/admin/Payments.jsx` — new page
- `frontend-admin/src/utils/navigationItems.jsx` — add Payments nav item
- `frontend-admin/src/App.jsx` — add `/payments` route

---

### 4. Global Admin Announcements ⬜

**The Problem:**
Instructors can post announcements inside a course. But there is no way for
the admin to send a message to: all users, all students, all instructors, or
everyone enrolled in a specific course.

**Solution — Backend:**
Uses the existing `NotificationsController.createBulkNotifications` internally.

- `POST /api/admin/announcements` — create and send announcement:
  ```json
  {
    "title": "System Maintenance",
    "message": "...",
    "target": "all_users" | "all_students" | "all_instructors" | "course",
    "course_id": 5,           // only if target = 'course'
    "link": "/courses/5"      // optional CTA link
  }
  ```
  Resolves the target audience, bulk-inserts Notification rows for every matching user.
- `GET /api/admin/announcements` — history of past announcements (stored in a new
  `AdminAnnouncement` model: id, admin_id, title, message, target, course_id,
  recipient_count, created_at).

**Solution — Frontend (Admin):**
- **New page `Announcements.jsx`** at `/announcements`:
  - Compose section (top card):
    - Title input
    - Message textarea
    - Audience selector: All Users / Students Only / Instructors Only / Specific Course
    - Course dropdown (shown only if "Specific Course" selected)
    - Optional CTA link input
    - Send Announcement button → confirm modal showing estimated recipient count
  - History table (below):
    - Columns: Title, Audience, Recipients, Date, Admin
    - Preview message on row click

**Files to create / change:**
- `backend/models/AdminAnnouncement.js` — new model
- `backend/controllers/admin/announcementsController.js` — new file
- `backend/routes/api/admin/announcements.js` — new file
- `backend/server.js` — add `/api/admin/announcements` route
- `backend/models/index.js` — add AdminAnnouncement
- `frontend-admin/src/pages/admin/Announcements.jsx` — new page
- `frontend-admin/src/utils/navigationItems.jsx` — add Announcements nav item
- `frontend-admin/src/App.jsx` — add `/announcements` route

---

## Progress Log

- **2026-03-24** — Audit complete. All 4 gaps identified. Progress file created.

