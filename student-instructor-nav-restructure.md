# Student + Instructor Sidebar Restructure

Tracking doc for the student/instructor nav re-org. Same hybrid pattern we
used for the admin app: daily-use items flat at the top, less-frequent items
grouped underneath. Plus the same feature-flag gating so any tab can be
hidden later by flipping one line.

Both apps live in the same React project (`frontend/`), with role-based nav
returned by `getNavigationItems(role)` in
`frontend/src/utils/navigationItems.jsx`. We'll handle them in one file so
shared keys (like `announcements`, `attendance`) reuse a single flag.

---

## Current counts

- **Student**: 20 flat tabs.
- **Instructor**: 12 flat tabs.

That's too many for the student side especially. Even the instructor side
benefits from light grouping.

---

## Proposed student layout (4 flat + 4 groups)

```
Home                            (flat)
My Courses                      (flat)
Messages                        (flat)
Notifications                   (flat)

Learn                           (group — active learning surface)
  ├── Explore Courses
  ├── Practice Tests
  ├── Generate Test
  ├── My Assigned Tests
  ├── My Assignments
  └── Attendance

My Stuff                        (group — personal items)
  ├── Bookmarks
  ├── Wishlist
  ├── My Notes
  └── Certificates

Community                       (group — social / read-only)
  ├── Leaderboard
  ├── Announcements
  └── Knowledge Base

Account                         (group — money & perks)
  ├── Billing
  ├── Bundles
  └── Refer & Earn
```

8 sidebar headers (down from 20). Daily stuff stays one click.

---

## Proposed instructor layout (5 flat + 2 groups)

```
Dashboard                       (flat)
My Courses                      (flat)
Messages                        (flat)
Notifications                   (flat)
Announcements                   (flat — composed often)

Teach                           (group — active teaching tools)
  ├── Live Sessions
  ├── Assignments
  ├── Attendance
  ├── My Tests
  └── My Students

Build                           (group — authoring)
  ├── Create Course
  └── Contribute Questions
```

7 sidebar headers (down from 12).

---

## Feature flags

Add `frontend/src/config/featureFlags.js` mirroring the admin pattern.
Defaults all `true`.

Likely-to-be-hidden features (we set up the flags now; flip later):

**Student**
- `practiceTests`
- `generateTest`
- `wishlist`
- `bookmarks`
- `leaderboard`
- `bundles`
- `referrals`
- `knowledgeBase`
- `myNotes`
- `certificates`

**Shared (one flag controls both apps)**
- `announcements`
- `attendance`
- `assignments`     (gates student `My Assignments` + instructor `Assignments`)
- `tests`           (gates student `My Assigned Tests` + instructor `My Tests`)

**Instructor**
- `liveSessions`
- `myStudents`
- `contributeQuestions`
- `createCourse`

Core (never gated — no `feature` key):
- Home / Dashboard
- My Courses
- Messages
- Notifications
- Explore Courses (student)

---

## Sidebar behavior

Same as admin:
- Click group label or chevron to expand/collapse
- Per-group state persists in `localStorage`
  (key: `frontend.sidebar.openGroups.v1` — namespaced separately from admin)
- Group containing active route auto-expands on load
- Items hidden by feature flag are filtered out
- Empty groups disappear entirely

---

## Route guards

Add `frontend/src/components/auth/FeatureGate.jsx` (same as the admin one).
Wrap each hideable route in `App.jsx` so a hidden tab can't be reached via
URL either. Redirect target on miss:
- Student → `/dashboard`
- Instructor → `/instructor/dashboard`

(Both redirect to the right home based on role — keep an eye on this when
wiring the FeatureGate so we don't accidentally bounce an instructor to the
student dashboard.)

---

## Build order

- [ ] **1.** Add `frontend/src/config/featureFlags.js` with all flags
       defaulted to `true`
- [ ] **2.** Add `frontend/src/components/auth/FeatureGate.jsx`
- [ ] **3.** Restructure `frontend/src/utils/navigationItems.jsx` to the
       new shape (typed entries: `item` vs `group`, optional `feature`)
- [ ] **4.** Update `frontend/src/components/layout/Sidebar.jsx` to render
       both shapes, persist per-group state, filter by flag
- [ ] **5.** Wrap hideable routes in `frontend/src/App.jsx` with
       `<FeatureGate>` (role-aware redirect target)
- [ ] **6.** Build + mobile drawer sanity-check
- [ ] **7.** Single commit + push

---

## Open questions (resolve before build)

- [ ] **"Create Course"** — keep as a nav entry under Build, or remove
      since it's already a CTA on the My Courses page?
- [ ] **Student "Explore Courses" label** — keep as-is, or rename to
      `Discover` for shorter? (Standard term for browse-everything pages.)
- [ ] **Student "My Stuff" group label** — too casual? Alternatives:
      `Library`, `Saved`, `Personal`.

---

## Notes / decisions log

- 2026-06-26 — Plan created. Mirrors the admin pattern (hybrid layout +
  feature flags + per-group localStorage). Awaiting answers to open
  questions before starting.
