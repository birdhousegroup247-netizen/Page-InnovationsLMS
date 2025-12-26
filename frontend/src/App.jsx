import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { ThemeProvider } from './contexts/ThemeContext';
// Universal theme support
import LandingPage from './pages/LandingPage';
import Login from './pages/Login';
import Register from './pages/Register';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';
import RoleSelector from './pages/RoleSelector';
import Dashboard from './pages/Dashboard';
import Courses from './pages/Courses';
import CourseDetail from './pages/CourseDetail';
import MyCourses from './pages/MyCourses';
import CoursePlayer from './pages/CoursePlayer';
import InstructorDashboard from './pages/InstructorDashboard';
import CreateCourse from './pages/instructor/CreateCourse';
import EditCourse from './pages/instructor/EditCourse';
import ManageModules from './pages/instructor/ManageModules';
import ManageLessons from './pages/instructor/ManageLessons';
import InstructorCourseBuilder from './pages/instructor/CourseBuilder';
import MyStudents from './pages/instructor/MyStudents';
import ProfileSettings from './pages/ProfileSettings';
import Notifications from './pages/Notifications';
import Bookmarks from './pages/Bookmarks';
import PracticeTests from './pages/PracticeTests';
import Certificates from './pages/Certificates';
import GeneratePracticeTest from './pages/GeneratePracticeTest';
import TakeTest from './pages/TakeTest';
import TestResults from './pages/TestResults';
import MyAssignedTests from './pages/MyAssignedTests';
import ManageTests from './pages/instructor/ManageTests';
import ContributeQuestions from './pages/instructor/ContributeQuestions';
import AdminDashboard from './pages/admin/AdminDashboard';
import Users from './pages/admin/Users';
import AdminCourses from './pages/admin/Courses';
import AdminAnalytics from './pages/admin/Analytics';
import AdminActivity from './pages/admin/Activity';
import InstructorApplications from './pages/admin/InstructorApplications';
import AppLayout from './components/layout/AppLayout';

// Protected Route Component with AppLayout
function ProtectedRoute({ children }) {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-dark-900 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block h-12 w-12 animate-spin rounded-full border-4 border-solid border-brand-blue border-r-transparent"></div>
          <p className="mt-4 text-text-secondary">Loading...</p>
        </div>
      </div>
    );
  }

  return isAuthenticated ? <AppLayout>{children}</AppLayout> : <Navigate to="/login" replace />;
}

// Admin Route Component
function AdminRoute({ children }) {
  const { isAuthenticated, loading, user } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-dark-900 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block h-12 w-12 animate-spin rounded-full border-4 border-solid border-brand-blue border-r-transparent"></div>
          <p className="mt-4 text-text-secondary">Loading...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (user?.role !== 'admin' && user?.role !== 'super_admin') {
    return <Navigate to="/dashboard" replace />;
  }

  return <AppLayout>{children}</AppLayout>;
}

// Instructor Route Component
function InstructorRoute({ children }) {
  const { isAuthenticated, loading, user } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-dark-900 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block h-12 w-12 animate-spin rounded-full border-4 border-solid border-brand-blue border-r-transparent"></div>
          <p className="mt-4 text-text-secondary">Loading...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (user?.role !== 'instructor' && user?.role !== 'admin' && user?.role !== 'super_admin') {
    return <Navigate to="/dashboard" replace />;
  }

  return <AppLayout>{children}</AppLayout>;
}

// Public Route Component (redirect to appropriate dashboard if already logged in)
function PublicRoute({ children }) {
  const { isAuthenticated, loading, user } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-dark-900 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block h-12 w-12 animate-spin rounded-full border-4 border-solid border-brand-blue border-r-transparent"></div>
          <p className="mt-4 text-text-secondary">Loading...</p>
        </div>
      </div>
    );
  }

  if (isAuthenticated && user) {
    // NEW: Redirect to role selector instead of auto-redirect
    return <Navigate to="/role-selector" replace />;
  }

  return children;
}

// Role Selector Route (authenticated but no AppLayout)
function RoleSelectorRoute() {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-dark-900 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block h-12 w-12 animate-spin rounded-full border-4 border-solid border-brand-blue border-r-transparent"></div>
          <p className="mt-4 text-text-secondary">Loading...</p>
        </div>
      </div>
    );
  }

  return isAuthenticated ? <RoleSelector /> : <Navigate to="/login" replace />;
}

// Role-based redirect component for root path
function RoleBasedRedirect() {
  const { isAuthenticated, loading, user } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-dark-900 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block h-12 w-12 animate-spin rounded-full border-4 border-solid border-brand-blue border-r-transparent"></div>
          <p className="mt-4 text-text-secondary">Loading...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  // NEW: Redirect to role selector
  return <Navigate to="/role-selector" replace />;
}

function App() {
  return (
    <ThemeProvider>
      <Router>
        <AuthProvider>
          <Routes>
          {/* Public Routes */}
          <Route
            path="/login"
            element={
              <PublicRoute>
                <Login />
              </PublicRoute>
            }
          />
          <Route
            path="/register"
            element={
              <PublicRoute>
                <Register />
              </PublicRoute>
            }
          />
          <Route
            path="/forgot-password"
            element={
              <PublicRoute>
                <ForgotPassword />
              </PublicRoute>
            }
          />
          <Route
            path="/reset-password"
            element={
              <PublicRoute>
                <ResetPassword />
              </PublicRoute>
            }
          />

          {/* Role Selector (authenticated users only, no layout) */}
          <Route path="/role-selector" element={<RoleSelectorRoute />} />

          {/* Protected Routes */}
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/courses"
            element={
              <ProtectedRoute>
                <Courses />
              </ProtectedRoute>
            }
          />
          <Route
            path="/courses/:id"
            element={
              <ProtectedRoute>
                <CourseDetail />
              </ProtectedRoute>
            }
          />
          <Route
            path="/my-courses"
            element={
              <ProtectedRoute>
                <MyCourses />
              </ProtectedRoute>
            }
          />
          <Route
            path="/courses/:id/learn"
            element={
              <ProtectedRoute>
                <CoursePlayer />
              </ProtectedRoute>
            }
          />
          <Route
            path="/instructor/dashboard"
            element={
              <InstructorRoute>
                <InstructorDashboard />
              </InstructorRoute>
            }
          />
          <Route
            path="/instructor/courses/create"
            element={
              <InstructorRoute>
                <CreateCourse />
              </InstructorRoute>
            }
          />
          <Route
            path="/instructor/courses/:id/edit"
            element={
              <InstructorRoute>
                <EditCourse />
              </InstructorRoute>
            }
          />
          <Route
            path="/instructor/courses/:courseId/modules"
            element={
              <InstructorRoute>
                <ManageModules />
              </InstructorRoute>
            }
          />
          <Route
            path="/instructor/courses/:courseId/modules/:moduleId/lessons"
            element={
              <InstructorRoute>
                <ManageLessons />
              </InstructorRoute>
            }
          />
          <Route
            path="/instructor/courses/:courseId/builder"
            element={
              <InstructorRoute>
                <InstructorCourseBuilder />
              </InstructorRoute>
            }
          />
          <Route
            path="/instructor/students"
            element={
              <InstructorRoute>
                <MyStudents />
              </InstructorRoute>
            }
          />
          <Route
            path="/instructor/tests"
            element={
              <InstructorRoute>
                <ManageTests />
              </InstructorRoute>
            }
          />
          <Route
            path="/instructor/tests/create"
            element={
              <InstructorRoute>
                <TakeTest />
              </InstructorRoute>
            }
          />
          <Route
            path="/instructor/tests/:testId/edit"
            element={
              <InstructorRoute>
                <TakeTest />
              </InstructorRoute>
            }
          />
          <Route
            path="/instructor/tests/:testId/results"
            element={
              <InstructorRoute>
                <TestResults />
              </InstructorRoute>
            }
          />
          <Route
            path="/instructor/contribute-questions"
            element={
              <InstructorRoute>
                <ContributeQuestions />
              </InstructorRoute>
            }
          />
          <Route
            path="/profile/settings"
            element={
              <ProtectedRoute>
                <ProfileSettings />
              </ProtectedRoute>
            }
          />
          <Route
            path="/notifications"
            element={
              <ProtectedRoute>
                <Notifications />
              </ProtectedRoute>
            }
          />
          <Route
            path="/bookmarks"
            element={
              <ProtectedRoute>
                <Bookmarks />
              </ProtectedRoute>
            }
          />
          <Route
            path="/practice-tests"
            element={
              <ProtectedRoute>
                <PracticeTests />
              </ProtectedRoute>
            }
          />
          <Route
            path="/certificates"
            element={
              <ProtectedRoute>
                <Certificates />
              </ProtectedRoute>
            }
          />
          <Route
            path="/my-assigned-tests"
            element={
              <ProtectedRoute>
                <MyAssignedTests />
              </ProtectedRoute>
            }
          />
          <Route
            path="/generate-practice-test"
            element={
              <ProtectedRoute>
                <GeneratePracticeTest />
              </ProtectedRoute>
            }
          />
          <Route
            path="/practice-tests/:attemptId/take"
            element={
              <ProtectedRoute>
                <TakeTest />
              </ProtectedRoute>
            }
          />
          <Route
            path="/test-results/:attemptId"
            element={
              <ProtectedRoute>
                <TestResults />
              </ProtectedRoute>
            }
          />
          <Route
            path="/assigned-tests/:testId/take"
            element={
              <ProtectedRoute>
                <TakeTest />
              </ProtectedRoute>
            }
          />

          {/* Admin Routes */}
          <Route
            path="/admin/dashboard"
            element={
              <AdminRoute>
                <AdminDashboard />
              </AdminRoute>
            }
          />
          <Route
            path="/admin/users"
            element={
              <AdminRoute>
                <Users />
              </AdminRoute>
            }
          />
          <Route
            path="/admin/instructor-applications"
            element={
              <AdminRoute>
                <InstructorApplications />
              </AdminRoute>
            }
          />
          <Route
            path="/admin/courses"
            element={
              <AdminRoute>
                <AdminCourses />
              </AdminRoute>
            }
          />
          <Route
            path="/admin/analytics"
            element={
              <AdminRoute>
                <AdminAnalytics />
              </AdminRoute>
            }
          />
          <Route
            path="/admin/activity"
            element={
              <AdminRoute>
                <AdminActivity />
              </AdminRoute>
            }
          />

          {/* Landing Page - Root */}
          <Route path="/" element={<LandingPage />} />

          {/* 404 - Redirect to landing page */}
          <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </AuthProvider>
      </Router>
    </ThemeProvider>
  );
}

export default App;
