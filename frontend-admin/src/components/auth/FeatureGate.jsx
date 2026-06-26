import { Navigate } from 'react-router-dom';
import { isFeatureOn } from '../../config/featureFlags';

/**
 * Route-level feature gate.
 *
 * When the named flag is on, renders the children (the route).
 * When off, redirects to /dashboard so the URL isn't reachable by direct
 * navigation either — bookmarked links to gated tabs just bounce home.
 *
 * Usage:
 *   <Route path="/badges" element={
 *     <FeatureGate flag="badges">
 *       <AdminRoute><Badges /></AdminRoute>
 *     </FeatureGate>
 *   } />
 *
 * Always wrap OUTSIDE of AdminRoute so the redirect happens before the
 * auth check spins up — saves a network round-trip on hidden routes.
 */
export default function FeatureGate({ flag, children, fallback = '/dashboard' }) {
  if (!isFeatureOn(flag)) {
    return <Navigate to={fallback} replace />;
  }
  return children;
}
