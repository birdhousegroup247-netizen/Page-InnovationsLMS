import { BrowserRouter as Router, Routes, Route, Navigate, Link } from 'react-router-dom';
import { lazy, Suspense, useState } from 'react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { ThemeProvider } from './contexts/ThemeContext';
import { ToastProvider } from './components/ui';
import AppLayout from './components/layout/AppLayout';
import ErrorBoundary from './components/common/ErrorBoundary';
import FeatureGate from './components/auth/FeatureGate';

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
const Unsubscribe = lazyWithReload(() => import('./pages/Unsubscribe'));
const InstructorApply = lazyWithReload(() => import('./pages/InstructorApply'));
const ProfileSettings = lazyWithReload(() => import('./pages/ProfileSettings'));
const CompleteProfile = lazyWithReload(() => import('./pages/CompleteProfile'));
const SelectCourse = lazyWithReload(() => import('./pages/SelectCourse'));
const Notifications = lazyWithReload(() => import('./pages/Notifications'));
const Bookmarks = lazyWithReload(() => import('./pages/Bookmarks'));
const PracticeTests = lazyWithReload(() => import('./pages/PracticeTests'));
const Certificates = lazyWithReload(() => import('./pages/Certificates'));
const GeneratePracticeTest = lazyWithReload(() => import('./pages/GeneratePracticeTest'));
const TakeTest = lazyWithReload(() => import('./pages/TakeTest'));
const EditTest = lazyWithReload(() => import('./pages/instructor/EditTest'));
const TestResults = lazyWithReload(() => import('./pages/TestResults'));
const MyAssignedTests = lazyWithReload(() => import('./pages/MyAssignedTests'));
const Messages = lazyWithReload(() => import('./pages/Messages'));
const Leaderboard = lazyWithReload(() => import('./pages/Leaderboard'));
const MyAssignments = lazyWithReload(() => import('./pages/MyAssignments'));
const Attendance = lazyWithReload(() => import('./pages/Attendance'));
const InstructorAttendance = lazyWithReload(() => import('./pages/instructor/AttendancePage'));
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
// Old MyQuestions page merged into ContributeQuestions; legacy route
// redirects there (see <Route path="/instructor/questions" /> below).
const CourseAnalytics = lazyWithReload(() => import('./pages/instructor/CourseAnalytics'));
const InstructorAnnouncements = lazyWithReload(() => import('./pages/instructor/Announcements'));
const EnrollmentManagement = lazyWithReload(() => import('./pages/instructor/EnrollmentManagement'));
const ManageTests = lazyWithReload(() => import('./pages/instructor/ManageTests'));
const CreateTest = lazyWithReload(() => import('./pages/instructor/CreateTest'));
const ContributeQuestions = lazyWithReload(() => import('./pages/instructor/ContributeQuestions'));
const GradeAssignments = lazyWithReload(() => import('./pages/instructor/GradeAssignments'));
// One unified page per feature, mounted at multiple routes so the
// course-context preselection comes from URL (path param or ?course=).
const LiveSessionsPage = lazyWithReload(() => import('./pages/instructor/LiveSessionsPage'));
const AssignmentsPage = lazyWithReload(() => import('./pages/instructor/AssignmentsPage'));
const SearchResults = lazyWithReload(() => import('./pages/SearchResults'));
const Checkout = lazyWithReload(() => import('./pages/Checkout'));
const PaymentSuccess = lazyWithReload(() => import('./pages/PaymentSuccess'));
const PaymentCancelled = lazyWithReload(() => import('./pages/PaymentCancelled'));
const Billing = lazyWithReload(() => import('./pages/Billing'));
const Announcements = lazyWithReload(() => import('./pages/Announcements'));

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

// Dual-role model: an approved instructor keeps role='student' and gains
// teaching access via instructor_status (mirror of the backend authorize()
// rule). Admins can view instructor routes too. Checking role==='instructor'
// alone wrongly bounced approved student-instructors off /instructor/*.
function canTeach(user) {
  return (
    user?.role === 'instructor' ||
    user?.instructor_status === 'approved' ||
    user?.role === 'admin' ||
    user?.role === 'super_admin'
  );
}

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

  // Only users with teaching access can reach instructor routes. Dual-role:
  // approved instructors keep role='student', so check the capability, not
  // just the primary role (this was why "switch to instructor" bounced back).
  if (!canTeach(user)) {
    return <Navigate to="/" replace />;
  }

  return <AppLayout>{children}</AppLayout>;
}

// Shown when an already-signed-in user opens /login or /signup. The old
// behavior was a silent Navigate to the dashboard — which made it impossible
// to ever reach the login form to switch accounts ("the browser always opens
// the old account"). Now the user gets an explicit choice.
function AlreadySignedIn() {
  const { user, logout } = useAuth();
  const [switching, setSwitching] = useState(false);

  const selectedRole = localStorage.getItem('selectedRole');
  const dashboardPath =
    selectedRole === 'instructor' && (user.role === 'instructor' || user.instructor_status === 'approved')
      ? '/instructor/dashboard'
      : '/dashboard';

  const handleSwitchAccount = async () => {
    setSwitching(true);
    // redirect:false — clearing auth state makes PublicRoute re-render its
    // children (the login form) in place; a hard reload isn't needed and
    // would just flash the page.
    await logout({ redirect: false });
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-dark-900 flex items-center justify-center p-4 transition-colors">
      <div className="w-full max-w-md bg-white dark:bg-dark-800 rounded-2xl shadow-lg p-8 text-center">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
          You're already signed in
        </h1>
        <p className="text-gray-600 dark:text-gray-400 mb-8">
          Signed in as <span className="font-semibold text-gray-900 dark:text-white">{user.email}</span>
        </p>
        <div className="space-y-3">
          <Link
            to={dashboardPath}
            className="block w-full px-6 py-3 bg-brand-blue hover:bg-blue-600 text-white font-semibold rounded-xl transition-colors"
          >
            Continue as {user.full_name || user.email}
          </Link>
          <button
            type="button"
            onClick={handleSwitchAccount}
            disabled={switching}
            className="block w-full px-6 py-3 bg-gray-100 dark:bg-dark-700 hover:bg-gray-200 dark:hover:bg-dark-600 text-gray-700 dark:text-gray-200 font-semibold rounded-xl transition-colors disabled:opacity-60"
          >
            {switching ? 'Signing out…' : 'Use a different account'}
          </button>
        </div>
      </div>
    </div>
  );
}

// Public Route Component. If the visitor already has a session, offer to
// continue or switch accounts instead of silently bouncing to the dashboard.
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
    return <AlreadySignedIn />;
  }

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

  // Redirect based on selectedRole from landing page or user's actual role.
  // Dual-role: an approved instructor (role still 'student') can pick the
  // instructor dashboard, so key off teaching capability, not role alone.
  const selectedRole = localStorage.getItem('selectedRole');
  if (selectedRole === 'instructor' && (user.role === 'instructor' || user.instructor_status === 'approved')) {
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
            path="/signup"
            element={
              <PublicRoute>
                <Register />
              </PublicRoute>
            }
          />
          {/* Legacy /register redirects to /signup so old links/emails still work. */}
          <Route path="/register" element={<Navigate to="/signup" replace />} />
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
          <Route path="/unsubscribe" element={<Unsubscribe />} />
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
              <FeatureGate flag="createCourse">
                <InstructorRoute>
                  <CreateCourse />
                </InstructorRoute>
              </FeatureGate>
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
              <FeatureGate flag="myStudents">
                <InstructorRoute>
                  <MyStudents />
                </InstructorRoute>
              </FeatureGate>
            }
          />
          <Route
            path="/instructor/students/:studentId/progress/:courseId"
            element={
              <FeatureGate flag="myStudents">
                <InstructorRoute>
                  <StudentProgress />
                </InstructorRoute>
              </FeatureGate>
            }
          />
          <Route
            path="/instructor/tests"
            element={
              <FeatureGate flag="tests">
                <InstructorRoute>
                  <ManageTests />
                </InstructorRoute>
              </FeatureGate>
            }
          />
          <Route
            path="/instructor/tests/create"
            element={
              <FeatureGate flag="tests">
                <InstructorRoute>
                  <CreateTest />
                </InstructorRoute>
              </FeatureGate>
            }
          />
          <Route
            path="/instructor/tests/:testId/edit"
            element={
              <FeatureGate flag="tests">
                <InstructorRoute>
                  <EditTest />
                </InstructorRoute>
              </FeatureGate>
            }
          />
          <Route
            path="/instructor/tests/:testId/results"
            element={
              <FeatureGate flag="tests">
                <InstructorRoute>
                  <TestAnalytics />
                </InstructorRoute>
              </FeatureGate>
            }
          />
          <Route
            path="/instructor/attempts/:attemptId/details"
            element={
              <FeatureGate flag="tests">
                <InstructorRoute>
                  <TestResults />
                </InstructorRoute>
              </FeatureGate>
            }
          />
          {/* Legacy My Questions route now redirects to the merged
              Contribute Questions page. Old links + bookmarks still work. */}
          <Route
            path="/instructor/questions"
            element={<Navigate to="/instructor/contribute-questions" replace />}
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
              <FeatureGate flag="myStudents">
                <InstructorRoute>
                  <MyStudents />
                </InstructorRoute>
              </FeatureGate>
            }
          />
          <Route
            path="/instructor/announcements"
            element={
              <FeatureGate flag="announcements">
                <InstructorRoute>
                  <InstructorAnnouncements />
                </InstructorRoute>
              </FeatureGate>
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
              <FeatureGate flag="contributeQuestions">
                <InstructorRoute>
                  <ContributeQuestions />
                </InstructorRoute>
              </FeatureGate>
            }
          />
          {/* Live Sessions — one component, three URLs.
              No scope  → pick a course in the Create modal.
              ?course=N → preselected via query.
              /courses/:courseId/sessions → preselected via path (course card). */}
          <Route
            path="/instructor/live-sessions"
            element={<FeatureGate flag="liveSessions"><InstructorRoute><LiveSessionsPage /></InstructorRoute></FeatureGate>}
          />
          <Route
            path="/instructor/courses/:courseId/sessions"
            element={<FeatureGate flag="liveSessions"><InstructorRoute><LiveSessionsPage /></InstructorRoute></FeatureGate>}
          />

          {/* Assignments — same pattern. */}
          <Route
            path="/instructor/assignments"
            element={<FeatureGate flag="assignments"><InstructorRoute><AssignmentsPage /></InstructorRoute></FeatureGate>}
          />
          <Route
            path="/instructor/courses/:courseId/assignments-grading"
            element={<FeatureGate flag="assignments"><InstructorRoute><AssignmentsPage /></InstructorRoute></FeatureGate>}
          />

          {/* Per-assignment grading page (drill-down) stays separate. */}
          <Route
            path="/instructor/assignments/:assignmentId/grade"
            element={
              <FeatureGate flag="assignments">
                <InstructorRoute>
                  <GradeAssignments />
                </InstructorRoute>
              </FeatureGate>
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
          {/* Profile + Settings — same component, two distinct routes.
              The component picks header copy + default tab from the
              pathname. /profile/settings kept as a legacy alias. */}
          {/* Post-signup enrollment profile (next-of-kin + academic).
              Own chrome, so no sidebar layout. */}
          <Route
            path="/complete-profile"
            element={
              <ProtectedRouteNoLayout>
                <CompleteProfile />
              </ProtectedRouteNoLayout>
            }
          />
          {/* Cohort-mode: students with no enrollment (esp. Google sign-ups)
              pick the course they paid for here. Own chrome, no sidebar. */}
          <Route
            path="/select-course"
            element={
              <ProtectedRouteNoLayout>
                <SelectCourse />
              </ProtectedRouteNoLayout>
            }
          />
          <Route
            path="/profile"
            element={
              <ProtectedRoute>
                <ProfileSettings />
              </ProtectedRoute>
            }
          />
          <Route
            path="/settings"
            element={
              <ProtectedRoute>
                <ProfileSettings />
              </ProtectedRoute>
            }
          />
          <Route
            path="/profile/settings"
            element={<Navigate to="/profile" replace />}
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
              <FeatureGate flag="bookmarks">
                <ProtectedRoute>
                  <Bookmarks />
                </ProtectedRoute>
              </FeatureGate>
            }
          />
          <Route
            path="/practice-tests"
            element={
              <FeatureGate flag="practiceTests">
                <ProtectedRoute>
                  <PracticeTests />
                </ProtectedRoute>
              </FeatureGate>
            }
          />
          <Route
            path="/certificates"
            element={
              <FeatureGate flag="certificates">
                <ProtectedRoute>
                  <Certificates />
                </ProtectedRoute>
              </FeatureGate>
            }
          />
          <Route
            path="/my-assigned-tests"
            element={
              <FeatureGate flag="tests">
                <ProtectedRoute>
                  <MyAssignedTests />
                </ProtectedRoute>
              </FeatureGate>
            }
          />
          <Route
            path="/generate-practice-test"
            element={
              <FeatureGate flag="generateTest">
                <ProtectedRoute>
                  <GeneratePracticeTest />
                </ProtectedRoute>
              </FeatureGate>
            }
          />
          <Route
            path="/practice-tests/:attemptId/take"
            element={
              <FeatureGate flag="practiceTests">
                <ProtectedRoute>
                  <TakeTest />
                </ProtectedRoute>
              </FeatureGate>
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
              <FeatureGate flag="tests">
                <ProtectedRoute>
                  <TakeTest />
                </ProtectedRoute>
              </FeatureGate>
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
              <FeatureGate flag="leaderboard">
                <ProtectedRoute>
                  <Leaderboard />
                </ProtectedRoute>
              </FeatureGate>
            }
          />
          <Route
            path="/my-assignments"
            element={
              <FeatureGate flag="assignments">
                <ProtectedRoute>
                  <MyAssignments />
                </ProtectedRoute>
              </FeatureGate>
            }
          />
          <Route
            path="/attendance"
            element={
              <FeatureGate flag="attendance">
                <ProtectedRoute>
                  <Attendance />
                </ProtectedRoute>
              </FeatureGate>
            }
          />
          <Route
            path="/instructor/attendance"
            element={
              <FeatureGate flag="attendance">
                <InstructorRoute>
                  <InstructorAttendance />
                </InstructorRoute>
              </FeatureGate>
            }
          />
          <Route
            path="/instructor/sessions/:sessionId/attendance"
            element={
              <FeatureGate flag="attendance">
                <InstructorRoute>
                  <InstructorAttendance />
                </InstructorRoute>
              </FeatureGate>
            }
          />
          <Route
            path="/my-notes"
            element={
              <FeatureGate flag="myNotes">
                <ProtectedRoute>
                  <MyNotes />
                </ProtectedRoute>
              </FeatureGate>
            }
          />
          <Route
            path="/wishlist"
            element={
              <FeatureGate flag="wishlist">
                <ProtectedRoute>
                  <Wishlist />
                </ProtectedRoute>
              </FeatureGate>
            }
          />
          <Route
            path="/bundles"
            element={
              <FeatureGate flag="bundles">
                <ProtectedRoute>
                  <Bundles />
                </ProtectedRoute>
              </FeatureGate>
            }
          />
          <Route
            path="/bundles/:id"
            element={
              <FeatureGate flag="bundles">
                <ProtectedRoute>
                  <BundleDetail />
                </ProtectedRoute>
              </FeatureGate>
            }
          />
          <Route
            path="/referrals"
            element={
              <FeatureGate flag="referrals">
                <ProtectedRoute>
                  <Referrals />
                </ProtectedRoute>
              </FeatureGate>
            }
          />

          {/* Billing (within AppLayout) */}
          <Route
            path="/billing"
            element={
              <FeatureGate flag="billing">
                <ProtectedRoute>
                  <Billing />
                </ProtectedRoute>
              </FeatureGate>
            }
          />
          <Route
            path="/announcements"
            element={
              <FeatureGate flag="announcements">
                <ProtectedRoute>
                  <Announcements />
                </ProtectedRoute>
              </FeatureGate>
            }
          />
          <Route
            path="/knowledge"
            element={
              <FeatureGate flag="knowledgeBase">
                <ProtectedRoute>
                  <KnowledgeBase />
                </ProtectedRoute>
              </FeatureGate>
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
