import { Navigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { isFeatureOn } from '../../config/featureFlags';

/**
 * Route-level feature gate.
 *
 * When the named flag is on, renders the children (the route).
 * When off, redirects to the role's home so URLs to hidden tabs bounce
 * back home — not to a 404, not to a blank screen.
 *
 * Redirect target picks the right home for the active role:
 *   - instructor mode → /instructor/dashboard
 *   - everyone else   → /dashboard
 *
 * Override with the `fallback` prop if a specific route should redirect
 * elsewhere.
 *
 * Usage:
 *   <Route path="/wishlist" element={
 *     <FeatureGate flag="wishlist">
 *       <Wishlist />
 *     </FeatureGate>
 *   } />
 */
export default function FeatureGate({ flag, children, fallback }) {
  const { user } = useAuth();

  if (isFeatureOn(flag)) return children;

  // Pick the right home for this user. `selectedRole` is set in localStorage
  // when an instructor switches into instructor mode (see AppLayout).
  let target = fallback;
  if (!target) {
    const actualUserRole = user?.role || 'student';
    const storedRole = typeof window !== 'undefined' ? localStorage.getItem('selectedRole') : null;
    const inInstructorMode = actualUserRole === 'instructor' && storedRole === 'instructor';
    target = inInstructorMode ? '/instructor/dashboard' : '/dashboard';
  }
  return <Navigate to={target} replace />;
}
