import {
  LayoutDashboard,
  Users,
  BookOpen,
  BarChart3,
  Activity,
  UserCheck,
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
