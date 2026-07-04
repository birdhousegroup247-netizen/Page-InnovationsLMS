import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { lazy, Suspense, useState } from 'react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { ThemeProvider } from './contexts/ThemeContext';
import { ToastProvider } from './components/ui/Toast';
import ErrorBoundary from './components/common/ErrorBoundary';
import AppLayout from './components/layout/AppLayout';
import FeatureGate from './components/auth/FeatureGate';

/**
 * lazyWithReload — wraps React.lazy so that if a code-split chunk fails to
 * load (almost always because the user has a stale bundle whose chunk hashes
 * no longer exist on the server after a new deploy), we force one hard
 * reload to fetch the new index.html with the current hashes. The
 * sessionStorage flag stops it from looping forever if the failure is
 * something else (e.g. real network down).
 *
 * Symptoms this catches:
 * - "Failed to fetch dynamically imported module"
 * - "Loading chunk N failed"
 * - "Expected a JavaScript-or-Wasm module script but the server responded
 *    with a MIME type of "text/html"
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
        // Return a never-resolving promise so React doesn't try to render
        // anything before the reload kicks in.
        return new Promise(() => {});
      }
      throw err;
    })
  );

// Clear the reload-once flag after a successful render so a later real chunk
// failure can still trigger one auto-reload.
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

// Public pages - load immediately
import Login from './pages/Login';

// Admin pages - lazy loaded for better performance
const AdminDashboard = lazyWithReload(() => import('./pages/admin/AdminDashboard'));
const Users = lazyWithReload(() => import('./pages/admin/Users'));
const AdminCourses = lazyWithReload(() => import('./pages/admin/Courses'));
const CourseBuilder = lazyWithReload(() => import('./pages/admin/CourseBuilder'));
const Categories = lazyWithReload(() => import('./pages/admin/Categories'));
const AdminAnalytics = lazyWithReload(() => import('./pages/admin/Analytics'));
const AdminActivity = lazyWithReload(() => import('./pages/admin/Activity'));
const InstructorApplications = lazyWithReload(() => import('./pages/admin/InstructorApplications'));
const QuestionBank = lazyWithReload(() => import('./pages/admin/QuestionBank'));
const QuestionsByCategory = lazyWithReload(() => import('./pages/admin/QuestionsByCategory'));
const QuestionDetail = lazyWithReload(() => import('./pages/admin/QuestionDetail'));
const QuestionEditor = lazyWithReload(() => import('./pages/admin/QuestionEditor'));
const Tests = lazyWithReload(() => import('./pages/admin/Tests'));
const TestBuilder = lazyWithReload(() => import('./pages/admin/TestBuilder'));
const TestResults = lazyWithReload(() => import('./pages/admin/TestResults'));
const ChatModeration = lazyWithReload(() => import('./pages/admin/ChatModeration'));
const Coupons = lazyWithReload(() => import('./pages/admin/Coupons'));
const Leads = lazyWithReload(() => import('./pages/admin/Leads'));
const Bundles = lazyWithReload(() => import('./pages/admin/Bundles'));
const Enrollments = lazyWithReload(() => import('./pages/admin/Enrollments'));
const Payments = lazyWithReload(() => import('./pages/admin/Payments'));
const Announcements = lazyWithReload(() => import('./pages/admin/Announcements'));
const Referrals = lazyWithReload(() => import('./pages/admin/Referrals'));
const Badges = lazyWithReload(() => import('./pages/admin/Badges'));
const EmailCampaigns = lazyWithReload(() => import('./pages/admin/EmailCampaigns'));
const Inbox = lazyWithReload(() => import('./pages/admin/Inbox'));
const AdminProfile = lazyWithReload(() => import('./pages/admin/AdminProfile'));
const AdminSettings = lazyWithReload(() => import('./pages/admin/AdminSettings'));
const AdminUserDetail = lazyWithReload(() => import('./pages/admin/AdminUserDetail'));
const OnboardingCenter = lazyWithReload(() => import('./pages/admin/onboarding/OnboardingCenter'));
const StudentOnboarding = lazyWithReload(() => import('./pages/admin/onboarding/StudentOnboarding'));
const StaffOnboarding = lazyWithReload(() => import('./pages/admin/onboarding/StaffOnboarding'));

// Root redirect honors the admin's saved default_landing preference
// (set on AdminSettings). Falls back to /dashboard for new admins.
function RootRedirect() {
  const { isAuthenticated, user, loading } = useAuth();
  if (loading) return null;
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  const target = user?.admin_preferences?.default_landing || '/dashboard';
  return <Navigate to={target} replace />;
}

// Protected Route Component with AppLayout (Admin Only)
function AdminRoute({ children }) {
  const { isAuthenticated, loading, user, logout } = useAuth();

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

  // Only allow admin and super_admin roles
  if (user?.role !== 'admin' && user?.role !== 'super_admin') {
    return (
      <div className="min-h-screen bg-dark-900 flex items-center justify-center">
        <div className="text-center max-w-md p-8">
          <h1 className="text-2xl font-bold text-white mb-4">Access Denied</h1>
          <p className="text-text-secondary mb-6">
            You don't have permission to access the admin panel.
          </p>
          <div className="flex flex-col gap-3">
             <button
              onClick={() => logout()}
              className="inline-block px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium"
            >
              Logout & Login as Admin
            </button>
            <a
              href={import.meta.env.VITE_MAIN_APP_URL || 'http://localhost:5173'}
              className="inline-block px-6 py-3 bg-dark-800 text-text-primary border border-dark-700 rounded-lg hover:bg-dark-700 transition-colors"
            >
              Return to Main App
            </a>
          </div>
        </div>
      </div>
    );
  }

  return <AppLayout>{children}</AppLayout>;
}


// Shown when the browser has a NON-admin session (e.g. a student logged in
// on the main app — the auth cookie is shared) and the user opens the admin
// login page. Without this, PublicRoute bounced them to /dashboard, AdminRoute
// bounced them to Access Denied, and the login form was unreachable.
function NonAdminSessionBlock() {
  const { user, logout } = useAuth();
  const [switching, setSwitching] = useState(false);

  const handleSwitchAccount = async () => {
    setSwitching(true);
    // redirect:false — once auth state clears, PublicRoute re-renders the
    // login form in place. A hard reload here just flashes the page.
    await logout({ redirect: false });
  };

  return (
    <div className="min-h-screen bg-dark-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-dark-800 rounded-2xl shadow-lg p-8 text-center">
        <h1 className="text-2xl font-bold text-white mb-2">Not an admin account</h1>
        <p className="text-text-secondary mb-8">
          This browser is signed in as{' '}
          <span className="font-semibold text-white">{user.email}</span>, which
          doesn't have admin access.
        </p>
        <button
          type="button"
          onClick={handleSwitchAccount}
          disabled={switching}
          className="block w-full px-6 py-3 bg-brand-blue hover:bg-blue-600 text-white font-semibold rounded-xl transition-colors disabled:opacity-60"
        >
          {switching ? 'Signing out…' : 'Sign out and log in as admin'}
        </button>
      </div>
    </div>
  );
}

// Public Route Component (redirect to dashboard if already logged in as an
// admin; non-admin sessions get an explicit switch-account screen)
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
    if (user.role === 'admin' || user.role === 'super_admin') {
      return <Navigate to="/dashboard" replace />;
    }
    return <NonAdminSessionBlock />;
  }

  return children;
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

            {/* Admin Routes */}
            <Route
              path="/dashboard"
              element={
                <AdminRoute>
                  <AdminDashboard />
                </AdminRoute>
              }
            />
            <Route
              path="/users"
              element={
                <AdminRoute>
                  <Users />
                </AdminRoute>
              }
            />
            {/* Per-user profile page — full record, replaces the
                old User Details modal so admins can deep link / share. */}
            <Route
              path="/users/:userId"
              element={
                <AdminRoute>
                  <AdminUserDetail />
                </AdminRoute>
              }
            />
            {/* Onboarding Center — student + staff registration wizards */}
            <Route
              path="/onboarding"
              element={
                <FeatureGate flag="onboarding">
                  <AdminRoute>
                    <OnboardingCenter />
                  </AdminRoute>
                </FeatureGate>
              }
            />
            <Route
              path="/onboarding/student"
              element={
                <FeatureGate flag="onboarding">
                  <AdminRoute>
                    <StudentOnboarding />
                  </AdminRoute>
                </FeatureGate>
              }
            />
            <Route
              path="/onboarding/staff"
              element={
                <FeatureGate flag="onboarding">
                  <AdminRoute>
                    <StaffOnboarding />
                  </AdminRoute>
                </FeatureGate>
              }
            />
            <Route
              path="/courses"
              element={
                <AdminRoute>
                  <AdminCourses />
                </AdminRoute>
              }
            />
            <Route
              path="/courses/:courseId/builder"
              element={
                <AdminRoute>
                  <CourseBuilder />
                </AdminRoute>
              }
            />
            <Route
              path="/categories"
              element={
                <FeatureGate flag="categories">
                  <AdminRoute>
                    <Categories />
                  </AdminRoute>
                </FeatureGate>
              }
            />
            <Route
              path="/analytics"
              element={
                <FeatureGate flag="analytics">
                  <AdminRoute>
                    <AdminAnalytics />
                  </AdminRoute>
                </FeatureGate>
              }
            />
            <Route
              path="/activity"
              element={
                <FeatureGate flag="activityLogs">
                  <AdminRoute>
                    <AdminActivity />
                  </AdminRoute>
                </FeatureGate>
              }
            />
            <Route
              path="/instructor-applications"
              element={
                <FeatureGate flag="instructorApplications">
                  <AdminRoute>
                    <InstructorApplications />
                  </AdminRoute>
                </FeatureGate>
              }
            />
            <Route
              path="/questions"
              element={
                <FeatureGate flag="questionBank">
                  <AdminRoute>
                    <QuestionBank />
                  </AdminRoute>
                </FeatureGate>
              }
            />
            <Route
              path="/questions/new"
              element={
                <FeatureGate flag="questionBank">
                  <AdminRoute>
                    <QuestionEditor />
                  </AdminRoute>
                </FeatureGate>
              }
            />
            <Route
              path="/questions/category/:categoryId"
              element={
                <FeatureGate flag="questionBank">
                  <AdminRoute>
                    <QuestionsByCategory />
                  </AdminRoute>
                </FeatureGate>
              }
            />
            <Route
              path="/questions/:questionId/edit"
              element={
                <FeatureGate flag="questionBank">
                  <AdminRoute>
                    <QuestionEditor />
                  </AdminRoute>
                </FeatureGate>
              }
            />
            <Route
              path="/questions/:questionId"
              element={
                <FeatureGate flag="questionBank">
                  <AdminRoute>
                    <QuestionDetail />
                  </AdminRoute>
                </FeatureGate>
              }
            />
            <Route
              path="/tests"
              element={
                <FeatureGate flag="tests">
                  <AdminRoute>
                    <Tests />
                  </AdminRoute>
                </FeatureGate>
              }
            />
            <Route
              path="/test-builder"
              element={
                <FeatureGate flag="tests">
                  <AdminRoute>
                    <TestBuilder />
                  </AdminRoute>
                </FeatureGate>
              }
            />
            <Route
              path="/test-builder/:testId"
              element={
                <FeatureGate flag="tests">
                  <AdminRoute>
                    <TestBuilder />
                  </AdminRoute>
                </FeatureGate>
              }
            />
            <Route
              path="/test-results/:testId"
              element={
                <FeatureGate flag="tests">
                  <AdminRoute>
                    <TestResults />
                  </AdminRoute>
                </FeatureGate>
              }
            />

            <Route
              path="/inbox"
              element={
                <FeatureGate flag="inbox">
                  <AdminRoute>
                    <Inbox />
                  </AdminRoute>
                </FeatureGate>
              }
            />

            <Route
              path="/chat"
              element={
                <FeatureGate flag="chatModeration">
                  <AdminRoute>
                    <ChatModeration />
                  </AdminRoute>
                </FeatureGate>
              }
            />

            <Route
              path="/coupons"
              element={
                <FeatureGate flag="coupons">
                  <AdminRoute>
                    <Coupons />
                  </AdminRoute>
                </FeatureGate>
              }
            />
            <Route
              path="/leads"
              element={
                <FeatureGate flag="leads">
                  <AdminRoute>
                    <Leads />
                  </AdminRoute>
                </FeatureGate>
              }
            />

            <Route
              path="/bundles"
              element={
                <FeatureGate flag="bundles">
                  <AdminRoute>
                    <Bundles />
                  </AdminRoute>
                </FeatureGate>
              }
            />
            <Route
              path="/enrollments"
              element={
                <FeatureGate flag="enrollments">
                  <AdminRoute>
                    <Enrollments />
                  </AdminRoute>
                </FeatureGate>
              }
            />
            <Route
              path="/payments"
              element={
                <FeatureGate flag="payments">
                  <AdminRoute>
                    <Payments />
                  </AdminRoute>
                </FeatureGate>
              }
            />
            <Route
              path="/announcements"
              element={
                <FeatureGate flag="announcements">
                  <AdminRoute>
                    <Announcements />
                  </AdminRoute>
                </FeatureGate>
              }
            />
            <Route
              path="/referrals"
              element={
                <FeatureGate flag="referrals">
                  <AdminRoute>
                    <Referrals />
                  </AdminRoute>
                </FeatureGate>
              }
            />
            <Route
              path="/badges"
              element={
                <FeatureGate flag="badges">
                  <AdminRoute>
                    <Badges />
                  </AdminRoute>
                </FeatureGate>
              }
            />
            <Route
              path="/email-campaigns"
              element={
                <FeatureGate flag="emailCampaigns">
                  <AdminRoute>
                    <EmailCampaigns />
                  </AdminRoute>
                </FeatureGate>
              }
            />
            {/* Topbar dropdown lands here. Two distinct pages: Profile
                = who you are, Settings = how the account works. */}
            <Route
              path="/profile"
              element={
                <AdminRoute>
                  <AdminProfile />
                </AdminRoute>
              }
            />
            <Route
              path="/settings"
              element={
                <AdminRoute>
                  <AdminSettings />
                </AdminRoute>
              }
            />

            {/* Redirect root — honors saved default_landing pref */}
            <Route path="/" element={<RootRedirect />} />

            {/* 404 - Redirect to dashboard */}
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
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
