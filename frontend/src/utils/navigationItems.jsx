import { Home, Search, BookOpen, FileCheck, Bookmark, Award, FileText, HelpCircle, Zap, ClipboardList, MessageSquare, Trophy, StickyNote, Heart, Gift, Package, CreditCard } from 'lucide-react';

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
      label: 'Messages',
      path: '/messages',
      icon: <MessageSquare className="w-5 h-5" />,
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
      icon: <FileText className="w-5 h-5" />,
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
      label: 'Wishlist',
      path: '/wishlist',
      icon: <Heart className="w-5 h-5" />,
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
    {
      label: 'My Assignments',
      path: '/my-assignments',
      icon: <ClipboardList className="w-5 h-5" />,
    },
    {
      label: 'My Notes',
      path: '/my-notes',
      icon: <StickyNote className="w-5 h-5" />,
    },
    {
      label: 'Leaderboard',
      path: '/leaderboard',
      icon: <Trophy className="w-5 h-5" />,
    },
    {
      label: 'Bundles',
      path: '/bundles',
      icon: <Package className="w-5 h-5" />,
    },
    {
      label: 'Refer & Earn',
      path: '/referrals',
      icon: <Gift className="w-5 h-5" />,
    },
    {
      label: 'Billing',
      path: '/billing',
      icon: <CreditCard className="w-5 h-5" />,
    },
  ];

  const instructorItems = [
    {
      label: 'Dashboard',
      path: '/instructor/dashboard',
      icon: <Home className="w-5 h-5" />,
    },
    {
      label: 'Messages',
      path: '/messages',
      icon: <MessageSquare className="w-5 h-5" />,
    },
    {
      label: 'My Courses',
      path: '/instructor/courses',
      icon: <BookOpen className="w-5 h-5" />,
    },
    {
      label: 'Create Course',
      path: '/instructor/courses/create',
      icon: <FileCheck className="w-5 h-5" />,
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
      icon: <Award className="w-5 h-5" />,
    },
  ];

  // Show navigation based on selected role
  if (role === 'instructor') {
    return instructorItems;
  }
  // Default to student navigation
  return studentItems;
};
