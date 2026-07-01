import {
  LayoutDashboard,
  Users,
  BookOpen,
  BarChart3,
  Activity,
  UserCheck,
  FolderTree,
  HelpCircle,
  FileText,
  MessageSquare,
  Tag,
  UserPlus,
  Package,
  GraduationCap,
  DollarSign,
  Megaphone,
  Gift,
  Award,
  Inbox as InboxIcon,
  ShieldCheck,
  Mail,
} from 'lucide-react';

/**
 * Admin sidebar layout.
 *
 * Two shapes coexist in this list:
 *   1. Flat items  → { type: 'item', label, path, icon, feature? }
 *   2. Groups      → { type: 'group', label, children: [item, item, ...] }
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
 * What sits where:
 *   - Daily-use items are flat at the top for one-click access.
 *   - Less-frequent / configuration-style items are grouped to cut clutter.
 */
const adminNavigation = [
  // ─── Top-level: things admins touch every day ────────────────────────────
  {
    type: 'item',
    label: 'Dashboard',
    path: '/dashboard',
    icon: <LayoutDashboard className="w-5 h-5" />,
  },
  {
    type: 'item',
    label: 'Users',
    path: '/users',
    icon: <Users className="w-5 h-5" />,
  },
  {
    type: 'item',
    label: 'Courses',
    path: '/courses',
    icon: <BookOpen className="w-5 h-5" />,
  },
  {
    type: 'group',
    label: 'Messages',
    icon: <MessageSquare className="w-5 h-5" />,
    children: [
      {
        type: 'item',
        label: 'Inbox',
        path: '/inbox',
        icon: <InboxIcon className="w-4 h-4" />,
        feature: 'inbox',
      },
      {
        type: 'item',
        label: 'Chat Moderation',
        path: '/chat',
        icon: <ShieldCheck className="w-4 h-4" />,
        feature: 'chatModeration',
      },
    ],
  },
  {
    type: 'item',
    label: 'Announcements',
    path: '/announcements',
    icon: <Megaphone className="w-5 h-5" />,
    feature: 'announcements',
  },
  {
    type: 'item',
    label: 'Payments',
    path: '/payments',
    icon: <DollarSign className="w-5 h-5" />,
    feature: 'payments',
  },
  {
    type: 'item',
    label: 'Enrollments',
    path: '/enrollments',
    icon: <GraduationCap className="w-5 h-5" />,
    feature: 'enrollments',
  },

  // ─── People (less frequent) ──────────────────────────────────────────────
  {
    type: 'group',
    label: 'People',
    icon: <UserCheck className="w-5 h-5" />,
    children: [
      {
        type: 'item',
        label: 'Instructor Applications',
        path: '/instructor-applications',
        icon: <UserCheck className="w-4 h-4" />,
        feature: 'instructorApplications',
      },
      {
        type: 'item',
        label: 'Leads',
        path: '/leads',
        icon: <UserPlus className="w-4 h-4" />,
        feature: 'leads',
      },
    ],
  },

  // ─── Learning catalog (set up once) ──────────────────────────────────────
  {
    type: 'group',
    label: 'Learning',
    icon: <FolderTree className="w-5 h-5" />,
    children: [
      {
        type: 'item',
        label: 'Categories',
        path: '/categories',
        icon: <FolderTree className="w-4 h-4" />,
        feature: 'categories',
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
        label: 'Question Bank',
        path: '/questions',
        icon: <HelpCircle className="w-4 h-4" />,
        feature: 'questionBank',
      },
      {
        type: 'item',
        label: 'Tests',
        path: '/tests',
        icon: <FileText className="w-4 h-4" />,
        feature: 'tests',
      },
    ],
  },

  // ─── Growth (occasional) ─────────────────────────────────────────────────
  {
    type: 'group',
    label: 'Growth',
    icon: <Gift className="w-5 h-5" />,
    children: [
      {
        type: 'item',
        label: 'Coupons',
        path: '/coupons',
        icon: <Tag className="w-4 h-4" />,
        feature: 'coupons',
      },
      {
        type: 'item',
        label: 'Referrals',
        path: '/referrals',
        icon: <Gift className="w-4 h-4" />,
        feature: 'referrals',
      },
      {
        type: 'item',
        label: 'Badges',
        path: '/badges',
        icon: <Award className="w-4 h-4" />,
        feature: 'badges',
      },
      {
        type: 'item',
        label: 'Email Campaigns',
        path: '/email-campaigns',
        icon: <Mail className="w-4 h-4" />,
        feature: 'emailCampaigns',
      },
    ],
  },

  // ─── Reports (review-only) ───────────────────────────────────────────────
  {
    type: 'group',
    label: 'Reports',
    icon: <BarChart3 className="w-5 h-5" />,
    children: [
      {
        type: 'item',
        label: 'Analytics',
        path: '/analytics',
        icon: <BarChart3 className="w-4 h-4" />,
        feature: 'analytics',
      },
      {
        type: 'item',
        label: 'Activity Logs',
        path: '/activity',
        icon: <Activity className="w-4 h-4" />,
        feature: 'activityLogs',
      },
    ],
  },
];

// For admin panel, we always return admin items
export const getNavigationItems = () => adminNavigation;

export default adminNavigation;
