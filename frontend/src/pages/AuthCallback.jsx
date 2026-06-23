import { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { tokenStorage } from '../utils/tokenStorage';

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
      checkAuth().then(() => {
        navigate('/dashboard', { replace: true });
      });
    } else {
      navigate('/login?error=google_auth_failed', { replace: true });
    }
  }, []);

  return (
    <div className="min-h-screen bg-dark-900 flex items-center justify-center">
      <div className="text-center">
        <div className="inline-block h-12 w-12 animate-spin rounded-full border-4 border-solid border-brand-blue border-r-transparent"></div>
        <p className="mt-4 text-text-secondary">Signing you in...</p>
      </div>
    </div>
  );
}
