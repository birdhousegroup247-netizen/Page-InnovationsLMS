import { Home, Search, BookOpen, FileCheck, Bookmark, Award, FileText, HelpCircle, Zap, ClipboardList } from 'lucide-react';

// Shared navigation items for all authenticated pages
export const getNavigationItems = (role = 'student') => {
  const commonItems = [];

  const studentItems = [
    {
      label: 'Home',
      path: '/dashboard',
      icon: <Home className="w-5 h-5" />,
    },
    {
      label: 'Explore Courses',
      path: '/courses',
      icon: <Search className="w-5 h-5" />,
    },
    {
      label: 'My Courses',
      path: '/my-courses',
      icon: <BookOpen className="w-5 h-5" />,
    },
    {
      label: 'My Assigned Tests',
      path: '/my-assigned-tests',
      icon: <ClipboardList className="w-5 h-5" />,
    },
    {
      label: 'Practice Tests',
      path: '/practice-tests',
      icon: <FileCheck className="w-5 h-5" />,
    },
    {
      label: 'Generate Test',
      path: '/generate-practice-test',
      icon: <Zap className="w-5 h-5" />,
    },
    {
      label: 'Bookmarks',
      path: '/bookmarks',
      icon: <Bookmark className="w-5 h-5" />,
    },
    {
      label: 'Certificates',
      path: '/certificates',
      icon: <Award className="w-5 h-5" />,
    },
  ];

  const instructorItems = [
    {
      label: 'Dashboard',
      path: '/instructor/dashboard',
      icon: <Home className="w-5 h-5" />,
    },
    {
      label: 'My Courses',
      path: '/instructor/courses', // Separate route to fix sidebar highlighting
      icon: <BookOpen className="w-5 h-5" />,
    },
    {
      label: 'Create Course',
      path: '/instructor/courses/create',
      icon: <FileCheck className="w-5 h-5" />, // Using FileCheck as a placeholder for "Plus" or similar if not imported
    },
    {
      label: 'My Tests',
      path: '/instructor/tests',
      icon: <FileText className="w-5 h-5" />,
    },
    {
      label: 'Contribute Questions',
      path: '/instructor/contribute-questions',
      icon: <HelpCircle className="w-5 h-5" />,
    },
    {
      label: 'My Students',
      path: '/instructor/students',
      icon: <Award className="w-5 h-5" />, // Using Award as placeholder for Users
    },
  ];

  // Admin items removed - admins should use the separate admin app
  // In this student app, admins/super_admins see instructor navigation

  if (role === 'instructor' || role === 'admin' || role === 'super_admin') {
    return instructorItems;
  } else {
    return studentItems;
  }
};
