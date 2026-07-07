import { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { tokenStorage } from '../utils/tokenStorage';
import { postAuthPath, clearActiveView } from '../utils/authz';

export default function AuthCallback() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { checkAuth } = useAuth();

  useEffect(() => {
    const accessToken = searchParams.get('accessToken');
    const refreshToken = searchParams.get('refreshToken');

    if (accessToken && refreshToken) {
      // Google OAuth callback — treat as Remember me so the session
      // survives a browser restart (matches Gmail/standard OAuth UX).
      tokenStorage.setTokens({ accessToken, refreshToken }, { rememberMe: true });
      clearActiveView(); // ask fresh each login (dual-role users get the chooser)
      checkAuth().then((u) => {
        navigate(postAuthPath(u), { replace: true });
      });
    } else {
      navigate('/login?error=google_auth_failed', { replace: true });
    }
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-dark-900 flex items-center justify-center transition-colors">
      <div className="text-center">
        <div className="inline-block h-12 w-12 animate-spin rounded-full border-4 border-solid border-brand-blue border-r-transparent"></div>
        <p className="mt-4 text-gray-600 dark:text-text-dark-secondary">Signing you in...</p>
      </div>
    </div>
  );
}
