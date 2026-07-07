import { Navigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { isFeatureOn } from '../../config/featureFlags';
import { homePathFor } from '../../utils/authz';

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

  // One routing decision for everyone (utils/authz.js) — respects the user's
  // active view + teaching capability.
  return <Navigate to={fallback || homePathFor(user)} replace />;
}
