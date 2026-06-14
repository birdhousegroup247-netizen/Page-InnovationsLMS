import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { lazy, Suspense } from 'react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { ThemeProvider } from './contexts/ThemeContext';
import { ToastProvider } from './components/ui/Toast';
import ErrorBoundary from './components/common/ErrorBoundary';
import AppLayout from './components/layout/AppLayout';

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


// Public Route Component (redirect to dashboard if already logged in)
function PublicRoute({ children }) {
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

  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
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
                <AdminRoute>
                  <Categories />
                </AdminRoute>
              }
            />
            <Route
              path="/analytics"
              element={
                <AdminRoute>
                  <AdminAnalytics />
                </AdminRoute>
              }
            />
            <Route
              path="/activity"
              element={
                <AdminRoute>
                  <AdminActivity />
                </AdminRoute>
              }
            />
            <Route
              path="/instructor-applications"
              element={
                <AdminRoute>
                  <InstructorApplications />
                </AdminRoute>
              }
            />
            <Route
              path="/questions"
              element={
                <AdminRoute>
                  <QuestionBank />
                </AdminRoute>
              }
            />
            <Route
              path="/questions/new"
              element={
                <AdminRoute>
                  <QuestionEditor />
                </AdminRoute>
              }
            />
            <Route
              path="/questions/category/:categoryId"
              element={
                <AdminRoute>
                  <QuestionsByCategory />
                </AdminRoute>
              }
            />
            <Route
              path="/questions/:questionId/edit"
              element={
                <AdminRoute>
                  <QuestionEditor />
                </AdminRoute>
              }
            />
            <Route
              path="/questions/:questionId"
              element={
                <AdminRoute>
                  <QuestionDetail />
                </AdminRoute>
              }
            />
            <Route
              path="/tests"
              element={
                <AdminRoute>
                  <Tests />
                </AdminRoute>
              }
            />
            <Route
              path="/test-builder"
              element={
                <AdminRoute>
                  <TestBuilder />
                </AdminRoute>
              }
            />
            <Route
              path="/test-builder/:testId"
              element={
                <AdminRoute>
                  <TestBuilder />
                </AdminRoute>
              }
            />
            <Route
              path="/test-results/:testId"
              element={
                <AdminRoute>
                  <TestResults />
                </AdminRoute>
              }
            />

            <Route
              path="/chat"
              element={
                <AdminRoute>
                  <ChatModeration />
                </AdminRoute>
              }
            />

            <Route
              path="/coupons"
              element={
                <AdminRoute>
                  <Coupons />
                </AdminRoute>
              }
            />
            <Route
              path="/leads"
              element={
                <AdminRoute>
                  <Leads />
                </AdminRoute>
              }
            />

            <Route
              path="/bundles"
              element={
                <AdminRoute>
                  <Bundles />
                </AdminRoute>
              }
            />
            <Route
              path="/enrollments"
              element={
                <AdminRoute>
                  <Enrollments />
                </AdminRoute>
              }
            />
            <Route
              path="/payments"
              element={
                <AdminRoute>
                  <Payments />
                </AdminRoute>
              }
            />
            <Route
              path="/announcements"
              element={
                <AdminRoute>
                  <Announcements />
                </AdminRoute>
              }
            />
            <Route
              path="/referrals"
              element={
                <AdminRoute>
                  <Referrals />
                </AdminRoute>
              }
            />
            <Route
              path="/badges"
              element={
                <AdminRoute>
                  <Badges />
                </AdminRoute>
              }
            />

            {/* Redirect root to dashboard */}
            <Route path="/" element={<Navigate to="/dashboard" replace />} />

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
