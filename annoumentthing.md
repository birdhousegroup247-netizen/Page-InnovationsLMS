What I think we should add — ranked by real LMS value

  Tier 1 — high impact, contained scope

  1. Honor scheduled_at — if it's in the future, hide from the feed (and don't fire notifications until the cron tick).
  Right now scheduling is a lie.
  2. Important / Pinned flag — is_important boolean + is_pinned boolean. Pinned ones float to the top of the feed; Important
  gets the red badge the old UI hinted at.
  3. Detail page (/announcements/:source/:id) — bell notification's link points here. Full body, attachments inline, read
  receipt registered on open.
  4. Linkify URLs in body — auto-detect http(s)://... in plain text and render as clickable links. No markdown engine, no
  risk.
  5. Read tracking: a tiny announcement_reads table (or just mark the linked notification is_read when the user opens the
  detail page). On instructor view show "14 of 22 seen" — huge accountability win, common LMS expectation.

  Tier 2 — bigger, but real

  6. Email broadcast checkbox on admin compose — "Also send via email". Uses the existing email path. Important for things
  students might miss in the bell.
  7. Attachments on instructor-side course announcements — admin already has them; instructors don't. Same CloudinaryUpload
  pattern we used for course thumbnails.
  8. Hand-picked recipients (admin) — beyond all_users / all_students / all_instructors / course, let admin pick specific
  users. A user-multi-select in the compose modal.
  9. Search box on the feed — quick filter by title/body. Trivial client-side filter, big UX win when there are >20
  announcements.

  Tier 3 — engagement polish

  10. Acknowledgments ("I've read this") — for announcements flagged "requires acknowledgment". Instructors see exactly who
  hasn't.
  11. Auto-archive after N days — keeps the feed snappy.
  12. Reactions (👍, ❤️ ) — small social touch.

  ---
  If you want me to ship right now, my recommendation is Tier 1 in one focused commit: scheduled-at honored, pinned +
  important flags, a detail page wired to bell notifications, URL linkify, and read receipts powered by reusing the existing
  Notification.is_read (no new table needed). That's a meaningful "feels complete" pass without scope creep.

  Want me to go with that scope, or pick different items?


  Already polished
  - My Courses · Create Course · Edit Course
  - My Tests · Create Test · Edit Test · Test Analytics
  - Contribute Questions (merged page + view/edit modal)
  - My Students → View Details

  Not touched yet
  - Announcements
  - Live Sessions
  - Course Assignments
  - Grade Assignments
  - Enrollment Management
  - Course Analytics
  - Manage Modules / Lessons (the CourseBuilder section)

  Want me to:
  1. Start at the top of the sidebar order and QA them in sequence (Announcements first), or
  2. Go for the highest-value LMS surface — Grade Assignments + Course Analytics — since those are the ones instructors actually run their courses through, or
  3. Jump to whichever specific tab you're about to test next?

1,7, 12,2