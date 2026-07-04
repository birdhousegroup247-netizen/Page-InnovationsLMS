// Canonical list of notification types that show up on the Settings
// page. Keys match the `type` value the backend stores on each
// Notification row, so the in_app gate in NotificationsController
// matches the toggle the user sees. Default is ON; missing entry
// = ON. Email column shown but applies as we wire each email path.

export const NOTIF_TYPES = [
  {
    key: 'course_enrollment',
    label: 'Course enrollment',
    description: 'When you enroll in a course (or — for instructors — when a student joins yours).',
  },
  {
    key: 'course_announcement',
    label: 'Course announcements',
    description: 'Posts from instructors in courses you’re enrolled in.',
  },
  {
    key: 'assignment_submitted',
    label: 'Assignment submission',
    description: 'When a student turns in an assignment in one of your courses.',
  },
  {
    key: 'assignment_graded',
    label: 'Assignment graded',
    description: 'When an instructor returns a grade on your submission.',
  },
  {
    key: 'test_assignment',
    label: 'Test assigned',
    description: 'When a new test is assigned to you.',
  },
  {
    key: 'question_approved',
    label: 'Question approved',
    description: 'When an admin approves a question you contributed.',
  },
  {
    key: 'question_rejected',
    label: 'Question needs changes',
    description: 'When an admin sends a contributed question back for changes.',
  },
  {
    key: 'new_enrollment',
    label: 'New student enrolled in my course',
    description: 'When someone enrolls in a course you teach.',
  },
  {
    key: 'forum_reply',
    label: 'Forum reply',
    description: 'When someone replies to your post.',
  },
  {
    key: 'chat_mention',
    label: '@mentions in chat',
    description: 'When someone @mentions you in a chat room.',
  },
  {
    key: 'birthday',
    label: 'Birthday wishes',
    description: 'The Page Innovations birthday note on your day.',
  },
  {
    key: 'marketing',
    label: 'Product updates & tips',
    description: 'Occasional product news, feature launches, and learning tips.',
  },
];

// Same idea, admin-only events. Used on the AdminSettings page.
export const ADMIN_NOTIF_TYPES = [
  {
    key: 'instructor_application',
    label: 'New instructor application',
    description: 'When someone applies to teach on the platform.',
  },
  {
    key: 'course_pending_approval',
    label: 'Course pending approval',
    description: 'When an instructor submits a course for admin review.',
  },
  {
    key: 'question_pending_approval',
    label: 'Question pending approval',
    description: 'When an instructor contributes a question that needs review.',
  },
  {
    key: 'payment_event',
    label: 'Payment events',
    description: 'Notable platform payments — successful purchases, failures, etc.',
  },
  {
    key: 'refund_request',
    label: 'Refund requests',
    description: 'When a student requests a refund.',
  },
  {
    key: 'content_report',
    label: 'Content reports',
    description: 'Chat or forum reports flagged by users.',
  },
  {
    key: 'system_alert',
    label: 'System alerts',
    description: 'Background job failures, queue backlogs, and other system signals.',
  },
];

// Treat null / undefined / missing as "on" so users who never
// touched the page still get everything.
export const isOn = (prefs, key, column = 'in_app') =>
  prefs?.[key]?.[column] !== false;
