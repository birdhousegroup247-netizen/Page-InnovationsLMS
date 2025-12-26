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
} from 'lucide-react';

/**
 * Admin panel navigation items
 * Simplified navigation for admin-only access
 */
const adminNavigationItems = [
  {
    label: 'Dashboard',
    path: '/dashboard',
    icon: <LayoutDashboard className="w-5 h-5" />,
  },
  {
    label: 'Users',
    path: '/users',
    icon: <Users className="w-5 h-5" />,
  },
  {
    label: 'Courses',
    path: '/courses',
    icon: <BookOpen className="w-5 h-5" />,
  },
  {
    label: 'Categories',
    path: '/categories',
    icon: <FolderTree className="w-5 h-5" />,
  },
  {
    label: 'Question Bank',
    path: '/questions',
    icon: <HelpCircle className="w-5 h-5" />,
  },
  {
    label: 'Tests',
    path: '/tests',
    icon: <FileText className="w-5 h-5" />,
  },
  {
    label: 'Analytics',
    path: '/analytics',
    icon: <BarChart3 className="w-5 h-5" />,
  },
  {
    label: 'Activity Logs',
    path: '/activity',
    icon: <Activity className="w-5 h-5" />,
  },
  {
    label: 'Instructor Applications',
    path: '/instructor-applications',
    icon: <UserCheck className="w-5 h-5" />,
  },
];

// For admin panel, we always return admin items
export const getNavigationItems = () => {
  return adminNavigationItems;
};

export default adminNavigationItems;
