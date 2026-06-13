import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { lazy, Suspense } from 'react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { ThemeProvider } from './contexts/ThemeContext';
import { ToastProvider } from './components/ui';
import AppLayout from './components/layout/AppLayout';
import ErrorBoundary from './components/common/ErrorBoundary';

/**
 * lazyWithReload — auto-recover from stale code-split chunks after a deploy.
 * When the user has an old bundle and navigates to a route whose new chunk
 * hash no longer exists on the server, the dynamic import throws a
 * "Failed to fetch dynamically imported module" / wrong MIME-type error.
 * Instead of crashing into the ErrorBoundary, force one reload to fetch the
 * new index.html with current hashes. sessionStorage guards against loops.
 */
const lazyWithReload = (factory) =>
  lazy(() =>
    factory().catch((err) => {
      const msg = String(err && err.message);
      const isChunkFailure =
        /Failed to fetch dynamically imported module/i.test(msg) ||
        /Loading chunk \d+ failed/i.test(msg) ||
        /text\/html/i.test(msg) ||
        /import\(\) failed/i.test(msg);
      const tried = sessionStorage.getItem('chunkReloadAttempt');
      if (isChunkFailure && !tried) {
        sessionStorage.setItem('chunkReloadAttempt', '1');
        window.location.reload();
        return new Promise(() => {});
      }
      throw err;
    })
  );
if (typeof window !== 'undefined') {
  setTimeout(() => sessionStorage.removeItem('chunkReloadAttempt'), 5000);
}

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
import AuthCallback from './pages/AuthCallback';

// Student pages - lazy loaded
const Dashboard = lazyWithReload(() => import('./pages/Dashboard'));
const Courses = lazyWithReload(() => import('./pages/Courses'));
const CourseDetail = lazyWithReload(() => import('./pages/CourseDetail'));
const MyCourses = lazyWithReload(() => import('./pages/MyCourses'));
const CoursePlayer = lazyWithReload(() => import('./pages/CoursePlayer'));
const ForgotPassword = lazyWithReload(() => import('./pages/ForgotPassword'));
const ResetPassword = lazyWithReload(() => import('./pages/ResetPassword'));
const VerifyEmail = lazyWithReload(() => import('./pages/VerifyEmail'));
const InstructorApply = lazyWithReload(() => import('./pages/InstructorApply'));
const ProfileSettings = lazyWithReload(() => import('./pages/ProfileSettings'));
const Notifications = lazyWithReload(() => import('./pages/Notifications'));
const Bookmarks = lazyWithReload(() => import('./pages/Bookmarks'));
const PracticeTests = lazyWithReload(() => import('./pages/PracticeTests'));
const Certificates = lazyWithReload(() => import('./pages/Certificates'));
const GeneratePracticeTest = lazyWithReload(() => import('./pages/GeneratePracticeTest'));
const TakeTest = lazyWithReload(() => import('./pages/TakeTest'));
const TestResults = lazyWithReload(() => import('./pages/TestResults'));
const MyAssignedTests = lazyWithReload(() => import('./pages/MyAssignedTests'));
const Messages = lazyWithReload(() => import('./pages/Messages'));
const Leaderboard = lazyWithReload(() => import('./pages/Leaderboard'));
const MyAssignments = lazyWithReload(() => import('./pages/MyAssignments'));
const MyNotes = lazyWithReload(() => import('./pages/MyNotes'));
const Wishlist = lazyWithReload(() => import('./pages/Wishlist'));
const Bundles = lazyWithReload(() => import('./pages/Bundles'));
const BundleDetail = lazyWithReload(() => import('./pages/BundleDetail'));
const Referrals = lazyWithReload(() => import('./pages/Referrals'));

// Instructor pages - lazy loaded
const InstructorDashboard = lazyWithReload(() => import('./pages/InstructorDashboard'));
const InstructorCourses = lazyWithReload(() => import('./pages/instructor/InstructorCourses'));
const CreateCourse = lazyWithReload(() => import('./pages/instructor/CreateCourse'));
const EditCourse = lazyWithReload(() => import('./pages/instructor/EditCourse'));
const ManageModules = lazyWithReload(() => import('./pages/instructor/ManageModules'));
const ManageLessons = lazyWithReload(() => import('./pages/instructor/ManageLessons'));
const InstructorCourseBuilder = lazyWithReload(() => import('./pages/instructor/CourseBuilder'));
const MyStudents = lazyWithReload(() => import('./pages/instructor/MyStudents'));
const StudentProgress = lazyWithReload(() => import('./pages/instructor/StudentProgress'));
const TestAnalytics = lazyWithReload(() => import('./pages/instructor/TestAnalytics'));
const MyQuestions = lazyWithReload(() => import('./pages/instructor/MyQuestions'));
const CourseAnalytics = lazyWithReload(() => import('./pages/instructor/CourseAnalytics'));
const Announcements = lazyWithReload(() => import('./pages/instructor/Announcements'));
const EnrollmentManagement = lazyWithReload(() => import('./pages/instructor/EnrollmentManagement'));
const ManageTests = lazyWithReload(() => import('./pages/instructor/ManageTests'));
const CreateTest = lazyWithReload(() => import('./pages/instructor/CreateTest'));
const ContributeQuestions = lazyWithReload(() => import('./pages/instructor/ContributeQuestions'));
const LiveSessions = lazyWithReload(() => import('./pages/instructor/LiveSessions'));
const GradeAssignments = lazyWithReload(() => import('./pages/instructor/GradeAssignments'));
const CourseAssignments = lazyWithReload(() => import('./pages/instructor/CourseAssignments'));
const SearchResults = lazyWithReload(() => import('./pages/SearchResults'));
const Checkout = lazyWithReload(() => import('./pages/Checkout'));
const PaymentSuccess = lazyWithReload(() => import('./pages/PaymentSuccess'));
const PaymentCancelled = lazyWithReload(() => import('./pages/PaymentCancelled'));
const Billing = lazyWithReload(() => import('./pages/Billing'));

const KnowledgeBase = lazyWithReload(() => import('./pages/KnowledgeBase'));
const CertificateVerify = lazyWithReload(() => import('./pages/CertificateVerify'));

// Admin pages
const AdminChatModeration = lazyWithReload(() => import('./pages/admin/AdminChatModeration'));

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
// Redirects non-instructors to landing page - keeps instructor/student apps separate
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

  // Only instructors can access instructor routes
  // Non-instructors are redirected to landing page (separate apps concept)
  if (user?.role !== 'instructor') {
    return <Navigate to="/" replace />;
  }

  return <AppLayout>{children}</AppLayout>;
}

// Public Route Component (redirect to appropriate dashboard if already logged in)
function PublicRoute({ children }) {
  const { isAuthenticated, loading, user } = useAuth();

  console.log('[PublicRoute] isAuthenticated:', isAuthenticated, 'loading:', loading, 'user:', user?.email);

  if (loading) {
    console.log('[PublicRoute] Still loading...');
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
    // Redirect based on selected role from landing page
    const selectedRole = localStorage.getItem('selectedRole');
    console.log('[PublicRoute] User is authenticated, selectedRole:', selectedRole, 'user.role:', user.role);
    if (selectedRole === 'instructor' && user.role === 'instructor') {
      console.log('[PublicRoute] Redirecting to /instructor/dashboard');
      return <Navigate to="/instructor/dashboard" replace />;
    }
    console.log('[PublicRoute] Redirecting to /dashboard');
    return <Navigate to="/dashboard" replace />;
  }

  console.log('[PublicRoute] Showing public content (login/register)');
  return children;
}

// Protected route WITHOUT AppLayout (for pages with their own chrome, e.g. CoursePlayer)
function ProtectedRouteNoLayout({ children }) {
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

  return isAuthenticated ? children : <Navigate to="/login" replace />;
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

  // Redirect based on selectedRole from landing page or user's actual role
  const selectedRole = localStorage.getItem('selectedRole');
  if (selectedRole === 'instructor' && user.role === 'instructor') {
    return <Navigate to="/instructor/dashboard" replace />;
  }
  // Default to student dashboard
  return <Navigate to="/dashboard" replace />;
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider>
        <ToastProvider>
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
          <Route path="/verify-email" element={<VerifyEmail />} />
          <Route path="/instructor-apply" element={<InstructorApply />} />

          {/* Google OAuth Callback */}
          <Route path="/auth/callback" element={<AuthCallback />} />

          {/* Public certificate verification — no auth required */}
          <Route path="/verify/:id" element={<CertificateVerify />} />

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
              <ProtectedRouteNoLayout>
                <CoursePlayer />
              </ProtectedRouteNoLayout>
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
            path="/instructor/courses/:courseId/sessions"
            element={
              <InstructorRoute>
                <LiveSessions />
              </InstructorRoute>
            }
          />
          <Route
            path="/instructor/assignments/:assignmentId/grade"
            element={
              <InstructorRoute>
                <GradeAssignments />
              </InstructorRoute>
            }
          />
          <Route
            path="/instructor/courses/:courseId/assignments-grading"
            element={
              <InstructorRoute>
                <CourseAssignments />
              </InstructorRoute>
            }
          />
          <Route
            path="/search"
            element={
              <ProtectedRoute>
                <SearchResults />
              </ProtectedRoute>
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

          <Route
            path="/messages"
            element={
              <ProtectedRoute>
                <Messages />
              </ProtectedRoute>
            }
          />

          <Route
            path="/leaderboard"
            element={
              <ProtectedRoute>
                <Leaderboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/my-assignments"
            element={
              <ProtectedRoute>
                <MyAssignments />
              </ProtectedRoute>
            }
          />
          <Route
            path="/my-notes"
            element={
              <ProtectedRoute>
                <MyNotes />
              </ProtectedRoute>
            }
          />
          <Route
            path="/wishlist"
            element={
              <ProtectedRoute>
                <Wishlist />
              </ProtectedRoute>
            }
          />
          <Route
            path="/bundles"
            element={
              <ProtectedRoute>
                <Bundles />
              </ProtectedRoute>
            }
          />
          <Route
            path="/bundles/:id"
            element={
              <ProtectedRoute>
                <BundleDetail />
              </ProtectedRoute>
            }
          />
          <Route
            path="/referrals"
            element={
              <ProtectedRoute>
                <Referrals />
              </ProtectedRoute>
            }
          />

          {/* Billing (within AppLayout) */}
          <Route
            path="/billing"
            element={
              <ProtectedRoute>
                <Billing />
              </ProtectedRoute>
            }
          />
          <Route
            path="/knowledge"
            element={
              <ProtectedRoute>
                <KnowledgeBase />
              </ProtectedRoute>
            }
          />

          {/* Payment Routes (no AppLayout — standalone pages) */}
          <Route
            path="/checkout"
            element={
              <ProtectedRouteNoLayout>
                <Checkout />
              </ProtectedRouteNoLayout>
            }
          />
          <Route
            path="/payment-success"
            element={
              <ProtectedRouteNoLayout>
                <PaymentSuccess />
              </ProtectedRouteNoLayout>
            }
          />
          <Route
            path="/payment-cancelled"
            element={
              <ProtectedRouteNoLayout>
                <PaymentCancelled />
              </ProtectedRouteNoLayout>
            }
          />

          {/* Admin Routes */}
          <Route
            path="/admin/chat"
            element={
              <ProtectedRoute>
                <AdminChatModeration />
              </ProtectedRoute>
            }
          />
          <Route path="/admin/*" element={<Navigate to="/dashboard" replace />} />

          {/* Landing Page - Root */}
          <Route path="/" element={<LandingPage />} />

          {/* 404 - Redirect to landing page */}
          <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </Suspense>
        </AuthProvider>
        </Router>
        </ToastProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
