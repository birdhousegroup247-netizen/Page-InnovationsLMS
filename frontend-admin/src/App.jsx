import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { lazy, Suspense } from 'react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { ThemeProvider } from './contexts/ThemeContext';
import { ToastProvider } from './components/ui/Toast';
import ErrorBoundary from './components/common/ErrorBoundary';
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

// Public pages - load immediately
import Login from './pages/Login';

// Admin pages - lazy loaded for better performance
const AdminDashboard = lazy(() => import('./pages/admin/AdminDashboard'));
const Users = lazy(() => import('./pages/admin/Users'));
const AdminCourses = lazy(() => import('./pages/admin/Courses'));
const CourseBuilder = lazy(() => import('./pages/admin/CourseBuilder'));
const Categories = lazy(() => import('./pages/admin/Categories'));
const AdminAnalytics = lazy(() => import('./pages/admin/Analytics'));
const AdminActivity = lazy(() => import('./pages/admin/Activity'));
const InstructorApplications = lazy(() => import('./pages/admin/InstructorApplications'));
const QuestionBank = lazy(() => import('./pages/admin/QuestionBank'));
const Tests = lazy(() => import('./pages/admin/Tests'));
const TestBuilder = lazy(() => import('./pages/admin/TestBuilder'));
const TestResults = lazy(() => import('./pages/admin/TestResults'));

// Protected Route Component with AppLayout (Admin Only)
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

  // Only allow admin and super_admin roles
  if (user?.role !== 'admin' && user?.role !== 'super_admin') {
    return (
      <div className="min-h-screen bg-dark-900 flex items-center justify-center">
        <div className="text-center max-w-md p-8">
          <h1 className="text-2xl font-bold text-white mb-4">Access Denied</h1>
          <p className="text-text-secondary mb-6">
            You don't have permission to access the admin panel.
          </p>
          <a
            href={import.meta.env.VITE_MAIN_APP_URL || 'http://localhost:5173'}
            className="inline-block px-6 py-3 bg-brand-blue text-white rounded-lg hover:bg-brand-blue/90 transition-colors"
          >
            Return to Main App
          </a>
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
