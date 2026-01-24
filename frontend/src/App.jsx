import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { lazy, Suspense } from 'react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { ThemeProvider } from './contexts/ThemeContext';
import AppLayout from './components/layout/AppLayout';

// Loading component for Suspense fallback
const PageLoader = () => (
  <div className="min-h-screen bg-dark-900 flex items-center justify-center">
    <div className="text-center">
      <div className="inline-block h-12 w-12 animate-spin rounded-full border-4 border-solid border-brand-blue border-r-transparent"></div>
      <p className="mt-4 text-text-secondary">Loading...</p>
    </div>
  </div>
);

// Lazy load all page components for better performance
// Public pages - load immediately (no lazy loading for critical paths)
import LandingPage from './pages/LandingPage';
import Login from './pages/Login';
import Register from './pages/Register';
import RoleSelector from './pages/RoleSelector';

// Student pages - lazy loaded
const Dashboard = lazy(() => import('./pages/Dashboard'));
const Courses = lazy(() => import('./pages/Courses'));
const CourseDetail = lazy(() => import('./pages/CourseDetail'));
const MyCourses = lazy(() => import('./pages/MyCourses'));
const CoursePlayer = lazy(() => import('./pages/CoursePlayer'));
const ForgotPassword = lazy(() => import('./pages/ForgotPassword'));
const ResetPassword = lazy(() => import('./pages/ResetPassword'));
const ProfileSettings = lazy(() => import('./pages/ProfileSettings'));
const Notifications = lazy(() => import('./pages/Notifications'));
const Bookmarks = lazy(() => import('./pages/Bookmarks'));
const PracticeTests = lazy(() => import('./pages/PracticeTests'));
const Certificates = lazy(() => import('./pages/Certificates'));
const GeneratePracticeTest = lazy(() => import('./pages/GeneratePracticeTest'));
const TakeTest = lazy(() => import('./pages/TakeTest'));
const TestResults = lazy(() => import('./pages/TestResults'));
const MyAssignedTests = lazy(() => import('./pages/MyAssignedTests'));

// Instructor pages - lazy loaded
const InstructorDashboard = lazy(() => import('./pages/InstructorDashboard'));
const InstructorCourses = lazy(() => import('./pages/instructor/InstructorCourses'));
const CreateCourse = lazy(() => import('./pages/instructor/CreateCourse'));
const EditCourse = lazy(() => import('./pages/instructor/EditCourse'));
const ManageModules = lazy(() => import('./pages/instructor/ManageModules'));
const ManageLessons = lazy(() => import('./pages/instructor/ManageLessons'));
const InstructorCourseBuilder = lazy(() => import('./pages/instructor/CourseBuilder'));
const MyStudents = lazy(() => import('./pages/instructor/MyStudents'));
const StudentProgress = lazy(() => import('./pages/instructor/StudentProgress'));
const TestAnalytics = lazy(() => import('./pages/instructor/TestAnalytics'));
const MyQuestions = lazy(() => import('./pages/instructor/MyQuestions'));
const CourseAnalytics = lazy(() => import('./pages/instructor/CourseAnalytics'));
const Announcements = lazy(() => import('./pages/instructor/Announcements'));
const EnrollmentManagement = lazy(() => import('./pages/instructor/EnrollmentManagement'));
const ManageTests = lazy(() => import('./pages/instructor/ManageTests'));
const CreateTest = lazy(() => import('./pages/instructor/CreateTest'));
const ContributeQuestions = lazy(() => import('./pages/instructor/ContributeQuestions'));

// Admin pages removed - admins should use the separate admin app

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

// Admin Route Component removed - admins should use the separate admin app

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
    // Redirect to role selector for users with multiple roles, otherwise to dashboard
    if (user.role === 'instructor' || user.role === 'admin' || user.role === 'super_admin') {
      return <Navigate to="/role-selector" replace />;
    } else {
      return <Navigate to="/dashboard" replace />;
    }
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

  // Redirect to role selector for users with multiple roles, otherwise to dashboard
  if (user.role === 'instructor' || user.role === 'admin' || user.role === 'super_admin') {
    return <Navigate to="/role-selector" replace />;
  } else {
    return <Navigate to="/dashboard" replace />;
  }
}

function App() {
  return (
    <ThemeProvider>
      <Router>
        <AuthProvider>
          <Suspense fallback={<PageLoader />}>
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
            path="/instructor/courses"
            element={
              <InstructorRoute>
                <InstructorCourses />
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
            path="/instructor/students/:studentId/progress/:courseId"
            element={
              <InstructorRoute>
                <StudentProgress />
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
                <CreateTest />
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
                <TestAnalytics />
              </InstructorRoute>
            }
          />
          <Route
            path="/instructor/attempts/:attemptId/details"
            element={
              <InstructorRoute>
                <TestResults />
              </InstructorRoute>
            }
          />
          <Route
            path="/instructor/questions"
            element={
              <InstructorRoute>
                <MyQuestions />
              </InstructorRoute>
            }
          />
          <Route
            path="/instructor/courses/:courseId/analytics"
            element={
              <InstructorRoute>
                <CourseAnalytics />
              </InstructorRoute>
            }
          />
          <Route
            path="/instructor/courses/:courseId/students"
            element={
              <InstructorRoute>
                <MyStudents />
              </InstructorRoute>
            }
          />
          <Route
            path="/instructor/announcements"
            element={
              <InstructorRoute>
                <Announcements />
              </InstructorRoute>
            }
          />
          <Route
            path="/instructor/courses/:courseId/enrollments"
            element={
              <InstructorRoute>
                <EnrollmentManagement />
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

          {/* Admin Routes - Redirect to dashboard (admins should use the admin app) */}
          <Route path="/admin/*" element={<Navigate to="/dashboard" replace />} />

          {/* Landing Page - Root */}
          <Route path="/" element={<LandingPage />} />

          {/* 404 - Redirect to landing page */}
          <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </Suspense>
        </AuthProvider>
      </Router>
    </ThemeProvider>
  );
}

export default App;
