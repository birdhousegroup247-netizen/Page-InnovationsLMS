# Course Lifecycle Audit — Page Innovations (2026-07-01)

End-to-end audit of a course's journey: **create → publish → enroll →
progress → completion → certificate**. Also covers drip content,
prerequisites, deletion, and instructor updates.

---

## TL;DR

| Stage | Status | Notes |
|---|---|---|
| Create | ✅ Solid | Instructors default to `draft`; admin approval required for `published` |
| Publish flow | ✅ Solid | Auto-creates chat room, fanouts pending join requests, first-course email fires |
| Free-course enrol | ⚠️ Duplicated | Its own side-effects code — NOT the shared `runEnrollmentSideEffects` helper |
| Paid enrol (Stripe/PayPal/Paystack) | ✅ Solid | Post-finance-audit: goes through shared helper inside a transaction |
| Admin comp enrol | ✅ Solid | Post-finance-audit: shared helper + `payment_method: 'comp'` marker |
| Progress percentage math | ✅ Excellent | Denominator = "currently accessible" content, respects drip locks, falls back to full set if all locked |
| `completed_at` one-way | ✅ Deliberate | Documented — instructor adding lessons doesn't un-complete a student |
| Certificate auto-issue on 100% | ✅ Solid | Deduplicated via `Certificate.findOne` |
| Drip content (`unlock_after_days`, `unlock_date`) | ✅ Server-enforced | Both `markContentComplete` and `updateCourseProgress` gate on it |
| Prerequisite course | ✅ Enforced | Blocks enrol until `completed_at` on the prereq |
| Chat auto-join at enrol | ✅ | If room exists (created on first publish) |
| Discord role assignment | ✅ Non-blocking | Failure logged, doesn't break enrol |
| Test auto-assign on enrol | ✅ Non-blocking | Skips ended tests |
| Instructor gets "new enrollment" notif | ✅ | Lead + co-instructors + TAs, deduped, skips self-enrol |
| **`course_update` notif on every save** | ⚠️ Spammy | Instructor iterating on content fires a notification per PUT |
| **Free-enrol code path diverges from shared helper** | ⚠️ Drift risk | Two implementations = eventual behavior gap |
| **No transaction around free-enrol side-effects** | ⚠️ Atomicity | If chat-join fails mid-flow, enrolment already committed |
| **Content deletion doesn't unwind progress** | ⚠️ Edge case | Orphaned ContentProgress rows referencing deleted content_id |
| **Delete course = soft archive** | ✅ Correct | But enrolled students keep progress rows they can never re-access |
| **`isAccessible()` uses server local time** | ⚠️ Timezone | Drip unlock compares against server UTC, student sees local — potential 1-day drift |
| **`updateCourseProgress` fires per-lesson complete** | ⚠️ Cost | Every lesson click triggers a full-course scan + count query |
| **Prerequisite check missing on bundle enrol** | ⚠️ Bypass | Buying a bundle enrolls into every course without checking each one's prereq |

Legend: ✅ solid, ⚠️ caveat

---

## 1. Create + Publish

**Create.** `POST /api/courses` from instructor:
- Instructors can only create at `status: 'draft'` (or `'pending'` if
  they explicitly submit for review). Line 249 blocks direct
  `published` unless the caller is admin.
- Course starts with `enrollment_count: 0`, no chat room, no drip
  schedule.

**Publish (draft → published).** Two paths: instructor via
`updateCourse` (admin-only, since instructors can't set `published`),
or admin via `PATCH /api/admin/courses/:id/status`. Both:
1. Update status.
2. Create chat room via `ChatRoom.findOrCreate`.
3. Fanout pending `ChatRoomMember` requests for any already-enrolled
   students (from the free enrol path).
4. Auto-join the instructor as approved.
5. On the instructor's first-ever publish, fire the celebration email
   (via §5 of email-audit).

Correct sequence. ✅

**Note:** if the chat room was manually deleted after publish, the
next publish (e.g. draft revert cycle) will recreate it via
`findOrCreate`. No orphan risk here.

---

## 2. Enrollment paths

Three code paths lead to `Enrollment.create`:

| Path | Where | Runs shared helper? | In a transaction? |
|---|---|---|---|
| Free course self-enrol | `courseController.enrollCourse` | ❌ **No** | ❌ No |
| Paid enrol (webhook / capture) | provider controllers → `enrollmentService.runTransactionalSideEffects` | ✅ Yes | ✅ Yes |
| Admin comp enrol | `admin/enrollmentsController.createEnrollment` | ✅ Yes | ✅ Yes |

**Finding 2.1 — Free-course enrollment duplicates all the
side-effects logic instead of calling the shared helper.**

Every side-effect in `courseController.enrollCourse` (chat join, test
auto-assign, notification, instructor notif, badge, Discord) also
exists in `enrollmentService.runTransactionalSideEffects`. Two
implementations means eventual drift — a future improvement to one
path won't automatically apply to the other.

**Fix:** rewrite `enrollCourse` to call the shared helper. Same
transaction wrapper. Free enrol becomes just "no payment needed →
directly call runEnrollmentSideEffects."

**Finding 2.2 — Free-enrol is not transactional.**

`Enrollment.create` → `ChatRoomMember.findOrCreate` → `Course.increment` →
`Notification.create` → `TestAssignment.findOrCreate` → `Discord.hook`.
If any of steps 2–6 fail, the Enrollment already committed. Result:
enrolled student without chat access, or missing test assignments.

Same problem the finance audit called out for paid enrolls (now
fixed). Free enrols need the same wrapping.

**Fix:** ties to 2.1. Moving to shared helper gives you the
transaction for free.

---

## 3. Progress tracking

**Model:** `ContentProgress` row per (student, content) with
`watch_time_seconds`, `last_position_seconds`, `completed`,
`completed_at`.

**Every lesson complete triggers `updateCourseProgress`** (line 63
of progressController):
```
markContentComplete → ContentProgress upsert
                   → updateCourseProgress(studentId, moduleId)
                         → fetch all modules + all contents
                         → recompute % on accessible pool
                         → maybe issue certificate
```

**The progress math is genuinely thoughtful:**
- `isAccessible(c)` respects both `unlock_date` (absolute) and
  `unlock_after_days` (relative to enrollment).
- Denominator = accessible content only. So on Day 1 of a course
  where only 5% of lessons are unlocked, finishing them gives 100%
  — not 5% as a naive calculation would.
- Fallback: if *no* content is accessible (extreme drip), the
  denominator falls back to the full content set. Avoids
  divide-by-zero.

**Finding 3.1 — `updateCourseProgress` fires on every lesson click.**

A student who marks 20 lessons complete in an hour triggers 20 full
scans (course + modules + contents + enrollment + count of completed).
Each scan is ~5 queries. Add up: 100 queries/hour per active student.

**Fix:** either
- (a) Debounce: only recompute when total completed count changes,
  cached in `enrollment.progress_percentage`. Compare
  `count_completed_now vs cached_count` — if same, skip recompute.
- (b) Batch the certificate check: only run the "issue cert on 100%"
  branch, not the full re-scan, when the delta is +1 lesson.
- (c) Move the recompute to a background worker triggered by an
  event. But that adds infrastructure.

**Finding 3.2 — Timezone drift in `isAccessible`.**

`updateCourseProgress` computes `unlockAt` from `enrolledAt.setDate(+ N)`,
which uses server local time (but Railway runs UTC, so effectively UTC).
The student's browser is in their local timezone. So an
`unlock_after_days: 7` lesson unlocks at UTC 00:00 → for a Nigerian
student that's 01:00 WAT, effectively "on day 7" (correct). For a
Californian student at UTC-8, that's 16:00 PT the day before →
appears to unlock a day "early."

Not catastrophic — but if a course is time-sensitive (e.g. daily
lessons synced to a cohort), the drip window can look wrong.

**Fix:** either (a) document that unlocks are UTC-anchored (fine for
LMS), or (b) allow instructors to set a specific TZ per course.

**Finding 3.3 — `completed_at` never gets unset (correct).**

Line 220-224 explicitly preserves `completed_at`:
```js
completed_at: isComplete ? (enrollment.completed_at || now) : enrollment.completed_at
```
Once set, stays set. Documented reason: certificate was issued, the
student's "completed courses" filter should stay truthful even if
the instructor adds new lessons later.

**This is correct** — but has a knock-on: if a student was 100% at
the time of certificate issue, and the instructor adds 5 new
lessons, the student's percentage drops back to (say) 80%. UI shows
"80% complete" but "Completed 2 months ago" — potentially confusing.

**Suggested UI:** hide the progress bar (or show "Refreshed with new
content") when `completed_at IS NOT NULL` but progress < 100%.

---

## 4. Certificate

**Auto-issue** (progressController line 228+):
- Only when `isComplete && !wasCompleted` (fresh 100%).
- Deduplicated: `Certificate.findOne({ student_id, course_id })`
  first — no double-issue.
- Uses `CertificateService.generateCertificateId` for the
  human-readable code.
- Fires notification + email in fire-and-forget style.

Correct. ✅

**Verify links** are behind the public route `/verify/:id` (frontend
route, backend controller `certificateController`). Anyone can
verify with the certificate_id — that's the whole point of a public
credential.

---

## 5. Content updates + delete

**Delete a course** = soft-delete via `status: 'archived'`. Correct
— avoids cascading data loss.

**Finding 5.1 — `course_update` notif fires on every save.**

`updateCourse` (line 318 of courseController) fires an in-app
notification to every enrolled student on any save where
`status === 'published'`. Any typo fix, module reorder, description
tweak → all enrolled students get pinged.

**Fix:**
- Suppress the notification unless the update touched user-facing
  content (title, description, new module, new lesson).
- Or introduce a "publish updated content" explicit action.
- Or dedupe: don't notify if last notification was < 24h ago.

**Finding 5.2 — Content deletion leaves orphaned ContentProgress rows.**

If an instructor deletes a lesson (via `contentsAPI.delete`), the
`ContentProgress` rows referencing it stay. Then `updateCourseProgress`
counts them but no matching content exists. The denominator uses
`ModuleContent.findAll` which returns current content, but the
`ContentProgress.count` matches on `content_id: denomIds` — so
orphans are naturally excluded from the count anyway.

**No math bug** — but the rows are stale storage. Cleanup cron
(delete `ContentProgress WHERE content_id NOT IN (SELECT id FROM
module_contents)`) would keep the table lean.

---

## 6. Prerequisites + bundles

**Prerequisites** (line 433-447 of courseController):
- Blocks enrol if `course.prerequisite_course_id` set and student
  doesn't have `completed_at` on the prereq.
- Correct and enforced server-side.

**Finding 6.1 — Bundle purchases bypass prerequisite checks.**

The bundle purchase flow (shipped in the finance audit fix) calls
`enrollmentSvc.runTransactionalSideEffects` with `courseIds: [all]`.
That helper does NOT check each course's `prerequisite_course_id`.
So buying a bundle can enroll a student into a course they don't
meet the prerequisite for.

**Fix:** in `enrollmentSvc.runTransactionalSideEffects`, for each
`courseId`, check the prerequisite. Skip (with warning log) if
unmet, or block the whole bundle purchase before payment.

Deciding which is a product call. Skip-with-log is friendlier —
bundle purchase still succeeds, unmet-prereq courses just aren't
enrolled until the student completes the prereq.

---

## 7. What's NOT broken

- Progress percentage math is arguably one of the smartest parts of
  the codebase — the drip-aware denominator + fallback is exactly
  right.
- `completed_at` semantics are documented in comments and
  consistently enforced.
- Chat auto-join, test auto-assign, badge triggers, Discord role
  granting — all fire from enrollment and all handle the
  "chat room doesn't exist yet" case correctly.
- Free-course enrollment doesn't accidentally skip payment — the
  payment gate on line 450 returns 402 if `course.price > 0` and no
  completed payment.
- Cloning a course preserves modules + content structure (via
  `cloneCourse`).
- Prerequisites are DB-enforced, not just UI-hidden.
- The instructor-notification-on-new-enrollment path dedupes across
  lead + co-instructors + TAs.
- Course deletion is soft (archive) — no data loss.

---

## 8. Prioritized punch list

### P1 — consistency + correctness
1. **Free-enrol path → shared `runEnrollmentSideEffects` helper.** §2.1
2. **Free-enrol needs transaction wrapping.** §2.2 (falls out of 1)
3. **Bundle purchases should honor prerequisites.** §6.1

### P2 — UX + cost
4. **`course_update` notif → only on user-facing changes or 24h dedup.** §5.1
5. **Debounce `updateCourseProgress`** — skip recompute when completed_count didn't change. §3.1

### P3 — cleanup + polish
6. **Cleanup cron for orphaned ContentProgress** rows. §5.2
7. **UI polish for "was 100%, now < 100% due to new content"** state. §3.3
8. **Document drip unlock timezone semantics** (UTC-anchored). §3.2

---

## 9. Files of interest

- `backend/controllers/courses/courseController.js` — create / update / delete / free enrol
- `backend/controllers/courses/progressController.js` — progress math + cert auto-issue
- `backend/controllers/admin/coursesController.js` — admin publish path
- `backend/services/enrollment/enrollmentService.js` — the shared side-effects helper (used by paid + admin enrol; free enrol should join)
- `backend/services/certificate/certificateService.js` — cert ID generation
- `backend/models/Enrollment.js` — progress_percentage + completed_at
- `backend/models/ContentProgress.js` — per-lesson tracking
- `backend/models/Certificate.js` — cert records + share_nudge_sent_at (from email audit)
