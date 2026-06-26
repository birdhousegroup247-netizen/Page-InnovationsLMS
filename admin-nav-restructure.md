# Admin Sidebar Restructure + Messages Tab

Tracking doc for the admin nav re-org. 18 flat sidebar items → a hybrid layout
with the daily-used items flat at the top and the less-frequent stuff grouped
underneath.

Backend already supports admin → DM to any instructor/student
(`searchCoursemates` in `backend/controllers/chat/chatController.js`). What's
missing is a Messages page on the admin side. We're adding one and nesting
related items under it.

---

## Final structure (hybrid)

```
Dashboard                       (flat)
Users                           (flat)
Courses                         (flat)
Messages                        (group)
  ├── Inbox                     ← NEW page: admin DMs to users
  └── Chat Moderation           ← moved from top-level
Announcements                   (flat — composed often, stays visible)
Payments                        (flat)
Enrollments                     (flat)

People                          (group)        ← less frequent
  ├── Instructor Applications
  └── Leads

Learning                        (group)        ← set up once
  ├── Categories
  ├── Bundles
  ├── Question Bank
  └── Tests

Growth                          (group)        ← occasional
  ├── Coupons
  ├── Referrals
  └── Badges

Reports                         (group)        ← review-only
  ├── Analytics
  └── Activity Logs
```

7 flat items + 5 small groups. Power-user-friendly: one click to daily stuff,
one expand + one click to everything else.

### Reasoning

- **Flat (used daily)**: Dashboard, Users, Courses, Announcements, Payments,
  Enrollments. Plus Messages as a group because it has 2 children.
- **People & Apps** — user-record operations that aren't routine (vetting
  instructors, working leads)
- **Learning Config** — catalog setup that's mostly one-time (categories,
  bundles, question bank, tests)
- **Growth** — acquisition/retention levers you touch when running campaigns
- **Reports** — read-only review surfaces (analytics, activity logs)

---

## Sidebar behavior

- Each group has a label row + chevron. Click the chevron (or label) to
  expand/collapse the children.
- Whichever group contains the current route auto-expands on first load.
- Last expand/collapse state persists per group in `localStorage`.
- Group label is NOT a navigable route — only the children are pages.
- Children indented ~12px so they read as nested, not as separate tabs.

---

## Feature flags (so we can hide tabs without rewriting)

Client hasn't fully paid — some tabs/features will need to go dark and come
back later. To make that a one-line flip:

- Single config file: `frontend-admin/src/config/featureFlags.js`
- One named flag per hideable feature: `badges`, `referrals`, `bundles`, etc.
- Every nav item that's hideable references a flag key:

  ```js
  { label: 'Badges', path: '/badges', icon: ..., feature: 'badges' }
  ```

  Items with `feature` set are filtered out of the sidebar when their flag is
  `false`. Items with no `feature` key are always shown (core tabs).

- The same flag also guards the React route in `App.jsx` so a hidden tab
  isn't reachable by typing the URL — hits redirect to `/dashboard`.

- Pages can also import the flag map to hide internal sections / CTAs that
  belong to the same feature (e.g. a "Refer a friend" button on Users when
  `referrals` is off).

- Default everything to `true` for now. To hide a tab later: change `true`
  to `false` in one place, commit, deploy. No other code changes needed.

- Later evolution: this same flag map can be sourced from env vars or a
  backend endpoint for runtime-toggling without redeploy. Not needed yet.

---

## Build order

- [x] **1. Backend Inbox prerequisites** — done in commit `fd5b65e`
      (`searchCoursemates` already returns the right set for admins)
- [ ] **2. Add `featureFlags.js`** — central config, defaults everything to
      `true`. Documented at the top with how to hide things.
- [ ] **3. Add `/inbox` page** to the admin app — mirrors student Messages UX:
      - left rail: list of existing DM threads + "New message" CTA
      - right rail: thread view (compose, send, attach, emoji)
      - shares the same `/api/chat/*` endpoints
- [ ] **4. Restructure `navigationItems.jsx`** to hybrid (flat items +
      groups), with `feature` keys on every hideable item
- [ ] **5. Update `Sidebar.jsx`** to render groups with expand/collapse,
      localStorage persistence, AND skip items whose `feature` flag is off.
      Skip empty groups too (a group with zero visible children disappears
      entirely).
- [ ] **6. Add route guards in `App.jsx`** — wrap each gated route with a
      `<FeatureGate flag="...">` that redirects to `/dashboard` when off
- [ ] **7. Mobile sanity-check** — verify groups + hidden items behave in
      the mobile drawer
- [ ] **8. Single commit + push**

---

## Open questions

(all resolved — see decisions log)

---

## Notes / decisions log

- 2026-06-26 — Plan created.
- 2026-06-26 — Picked hybrid over strict 6-group, so daily-used items stay
  one-click.
- 2026-06-26 — Inbox label = `Inbox` (universal email/Slack mental model;
  avoids awkward "Messages → Direct Messages" path).
- 2026-06-26 — Group labels = short (`People`, `Learning`, `Growth`,
  `Reports`). Standard across Stripe / Linear / Vercel. Users learn meaning
  after a visit or two; descriptive labels read like documentation, not nav.
