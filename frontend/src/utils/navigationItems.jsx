import {
  Home, Search, BookOpen, FileCheck, Bookmark, Award, FileText,
  HelpCircle, Zap, ClipboardList, MessageSquare, Trophy, StickyNote,
  Heart, Gift, Package, CreditCard, Megaphone, Library, Bell, Video,
  ClipboardCheck, UserCheck, GraduationCap, Compass, Wrench,
} from 'lucide-react';

/**
 * Sidebar layout for the student + instructor app.
 *
 * Two entry shapes are supported:
 *   1. Flat items  → { type: 'item', label, path, icon, feature? }
 *   2. Groups      → { type: 'group', label, icon, children: [item, item, ...] }
 *
 * The Sidebar renders flat items as direct links and groups as
 * collapsible sections.
 *
 * Feature flag gating:
 *   Any item with a `feature` key is hidden when its flag in
 *   `config/featureFlags.js` is `false`. Items without a `feature` key are
 *   always visible (core tabs). Groups whose every child is hidden also
 *   disappear, so the sidebar never shows an empty section header.
 *
 * Layout choices:
 *   - Daily-use items (Home / My Courses / Messages / Notifications) stay
 *     flat at the top for one-click access.
 *   - Less-frequent items live in collapsible groups so the sidebar
 *     doesn't sprawl into 20 rows.
 */

const studentNavigation = [
  // ─── Daily use ──────────────────────────────────────────────────────────
  {
    type: 'item',
    label: 'Home',
    path: '/dashboard',
    icon: <Home className="w-5 h-5" />,
  },
  {
    type: 'item',
    label: 'My Courses',
    path: '/my-courses',
    icon: <BookOpen className="w-5 h-5" />,
  },
  {
    type: 'item',
    label: 'Messages',
    path: '/messages',
    icon: <MessageSquare className="w-5 h-5" />,
  },
  {
    type: 'item',
    label: 'Notifications',
    path: '/notifications',
    icon: <Bell className="w-5 h-5" />,
  },

  // ─── Learn — the active learning surface ────────────────────────────────
  {
    type: 'group',
    label: 'Learn',
    icon: <Compass className="w-5 h-5" />,
    children: [
      {
        type: 'item',
        label: 'Explore',
        path: '/courses',
        icon: <Search className="w-4 h-4" />,
      },
      {
        type: 'item',
        label: 'Practice Tests',
        path: '/practice-tests',
        icon: <FileCheck className="w-4 h-4" />,
        feature: 'practiceTests',
      },
      {
        type: 'item',
        label: 'Generate Test',
        path: '/generate-practice-test',
        icon: <Zap className="w-4 h-4" />,
        feature: 'generateTest',
      },
      {
        type: 'item',
        label: 'My Assigned Tests',
        path: '/my-assigned-tests',
        icon: <FileText className="w-4 h-4" />,
        feature: 'tests',
      },
      {
        type: 'item',
        label: 'My Assignments',
        path: '/my-assignments',
        icon: <ClipboardList className="w-4 h-4" />,
        feature: 'assignments',
      },
      {
        type: 'item',
        label: 'Attendance',
        path: '/attendance',
        icon: <UserCheck className="w-4 h-4" />,
        feature: 'attendance',
      },
    ],
  },

  // ─── Library — personal items ───────────────────────────────────────────
  {
    type: 'group',
    label: 'Library',
    icon: <Library className="w-5 h-5" />,
    children: [
      {
        type: 'item',
        // "Saved Lessons", not "Bookmarks" — students couldn't tell it apart
        // from Wishlist in the sidebar. Wishlist = courses to buy later;
        // this = lesson/article spots saved while studying.
        label: 'Saved Lessons',
        path: '/bookmarks',
        icon: <Bookmark className="w-4 h-4" />,
        feature: 'bookmarks',
      },
      {
        type: 'item',
        label: 'Wishlist',
        path: '/wishlist',
        icon: <Heart className="w-4 h-4" />,
        feature: 'wishlist',
      },
      {
        type: 'item',
        label: 'My Notes',
        path: '/my-notes',
        icon: <StickyNote className="w-4 h-4" />,
        feature: 'myNotes',
      },
      {
        type: 'item',
        label: 'Certificates',
        path: '/certificates',
        icon: <Award className="w-4 h-4" />,
        feature: 'certificates',
      },
    ],
  },

  // ─── Community — social / read-only ─────────────────────────────────────
  {
    type: 'group',
    label: 'Community',
    icon: <Trophy className="w-5 h-5" />,
    children: [
      {
        type: 'item',
        label: 'Leaderboard',
        path: '/leaderboard',
        icon: <Trophy className="w-4 h-4" />,
        feature: 'leaderboard',
      },
      {
        type: 'item',
        label: 'Announcements',
        path: '/announcements',
        icon: <Megaphone className="w-4 h-4" />,
        feature: 'announcements',
      },
      {
        type: 'item',
        label: 'Knowledge Base',
        path: '/knowledge',
        icon: <HelpCircle className="w-4 h-4" />,
        feature: 'knowledgeBase',
      },
    ],
  },

  // ─── Account — money & perks ────────────────────────────────────────────
  {
    type: 'group',
    label: 'Account',
    icon: <CreditCard className="w-5 h-5" />,
    children: [
      {
        type: 'item',
        label: 'Billing',
        path: '/billing',
        icon: <CreditCard className="w-4 h-4" />,
        feature: 'billing',
      },
      {
        type: 'item',
        label: 'Bundles',
        path: '/bundles',
        icon: <Package className="w-4 h-4" />,
        feature: 'bundles',
      },
      {
        type: 'item',
        label: 'Refer & Earn',
        path: '/referrals',
        icon: <Gift className="w-4 h-4" />,
        feature: 'referrals',
      },
    ],
  },
];

const instructorNavigation = [
  // ─── Daily use ──────────────────────────────────────────────────────────
  {
    type: 'item',
    label: 'Dashboard',
    path: '/instructor/dashboard',
    icon: <Home className="w-5 h-5" />,
  },
  {
    type: 'item',
    label: 'My Courses',
    path: '/instructor/courses',
    icon: <BookOpen className="w-5 h-5" />,
  },
  {
    type: 'item',
    label: 'Messages',
    path: '/messages',
    icon: <MessageSquare className="w-5 h-5" />,
  },
  {
    type: 'item',
    label: 'Notifications',
    path: '/notifications',
    icon: <Bell className="w-5 h-5" />,
  },
  {
    type: 'item',
    label: 'Announcements',
    path: '/instructor/announcements',
    icon: <Megaphone className="w-5 h-5" />,
    feature: 'announcements',
  },

  // ─── Teach — active teaching tools ──────────────────────────────────────
  {
    type: 'group',
    label: 'Teach',
    icon: <GraduationCap className="w-5 h-5" />,
    children: [
      {
        type: 'item',
        label: 'Live Sessions',
        path: '/instructor/live-sessions',
        icon: <Video className="w-4 h-4" />,
        feature: 'liveSessions',
      },
      {
        type: 'item',
        label: 'Assignments',
        path: '/instructor/assignments',
        icon: <ClipboardCheck className="w-4 h-4" />,
        feature: 'assignments',
      },
      {
        type: 'item',
        label: 'Attendance',
        path: '/instructor/attendance',
        icon: <UserCheck className="w-4 h-4" />,
        feature: 'attendance',
      },
      {
        type: 'item',
        label: 'My Tests',
        path: '/instructor/tests',
        icon: <FileText className="w-4 h-4" />,
        feature: 'tests',
      },
      {
        type: 'item',
        label: 'My Students',
        path: '/instructor/students',
        icon: <Award className="w-4 h-4" />,
        feature: 'myStudents',
      },
    ],
  },

  // ─── Build — authoring ──────────────────────────────────────────────────
  {
    type: 'group',
    label: 'Build',
    icon: <Wrench className="w-5 h-5" />,
    children: [
      {
        type: 'item',
        label: 'Create Course',
        path: '/instructor/courses/create',
        icon: <FileCheck className="w-4 h-4" />,
        feature: 'createCourse',
      },
      {
        type: 'item',
        label: 'Contribute Questions',
        path: '/instructor/contribute-questions',
        icon: <HelpCircle className="w-4 h-4" />,
        feature: 'contributeQuestions',
      },
    ],
  },
];

export const getNavigationItems = (role = 'student') =>
  role === 'instructor' ? instructorNavigation : studentNavigation;

export default getNavigationItems;
