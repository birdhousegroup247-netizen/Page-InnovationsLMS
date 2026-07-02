import { createContext, useContext, useState, useEffect } from 'react';
import { authAPI } from '../lib/api';
import logger from '../utils/logger';
import { tokenStorage } from '../utils/tokenStorage';

const AuthContext = createContext(null);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  // Check if user is logged in on mount
  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      // Try to get user profile - if accessToken cookie exists and is valid, this will succeed
      const response = await authAPI.getProfile();
      setUser(response.data.data.user);
      setIsAuthenticated(true);

      // If we authenticated via cookie but this tab has no Bearer yet,
      // mint a pair via /refresh so the CSRF auto-bypass works on writes.
      // Tokens land per-tab (sessionStorage); the original Remember-me
      // flag is preserved by checking the existing localStorage seed.
      if (!tokenStorage.get('accessToken')) {
        try {
          const ref = await authAPI.refreshToken();
          const { accessToken, refreshToken } = ref.data?.data || {};
          const wasPersisted = !!localStorage.getItem('refreshToken');
          if (accessToken) tokenStorage.set('accessToken', accessToken, { persist: wasPersisted });
          if (refreshToken) tokenStorage.set('refreshToken', refreshToken, { persist: wasPersisted });
        } catch (_) {
          // Refresh failing here is OK — writes will then surface a CSRF
          // error that nudges the user to log in fresh.
        }
      }
    } catch (error) {
      logger.error('Auth check failed:', error);
      // If profile fetch fails, user is not authenticated
      setIsAuthenticated(false);
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  const login = async (email, password, rememberMe = false) => {
    try {
      const response = await authAPI.login({ email, password, remember_me: rememberMe });
      const { user, accessToken, refreshToken } = response.data.data;

      // Per-tab tokens. Bearer auto-bypasses CSRF (admin app and API are
      // on different subdomains so cookie-only auth doesn't cut it).
      // Remember me seeds localStorage so a closed-and-reopened tab can
      // pick up the same session.
      tokenStorage.setTokens({ accessToken, refreshToken }, { rememberMe });

      setUser(user);
      setIsAuthenticated(true);

      return { success: true, user };
    } catch (error) {
      const status = error.response?.status;
      const data = error.response?.data;
      if (status === 403 && data?.code === 'EMAIL_NOT_VERIFIED') {
        return { success: false, emailNotVerified: true, email: data.email, error: data.message };
      }
      const message = data?.message || 'Login failed';
      return { success: false, error: message };
    }
  };

  const register = async (userData) => {
    try {
      const response = await authAPI.register(userData);
      const { user, accessToken, refreshToken } = response.data.data || {};

      tokenStorage.setTokens({ accessToken, refreshToken }, { rememberMe: false });

      if (user) {
        setUser(user);
        setIsAuthenticated(true);
      }

      return { success: true, user };
    } catch (error) {
      const message = error.response?.data?.message || 'Registration failed';
      return { success: false, error: message };
    }
  };

  /**
   * @param {{ redirect?: string | false }} opts redirect defaults to
   *   '/login'. Pass false to skip the hard reload — e.g. the login page's
   *   "use a different account" flow wants to stay in place and just
   *   re-render the form.
   */
  const logout = async ({ redirect = '/login' } = {}) => {
    try {
      await authAPI.logout();
    } catch (error) {
      logger.error('Logout error:', error);
    } finally {
      // Clear every piece of auth state — without this, stale tokens
      // keep the user logged in after they click logout.
      tokenStorage.clearAll();
      try { sessionStorage.clear(); } catch (_) {}
      try {
        document.cookie = 'csrf-token=; Path=/; Expires=Thu, 01 Jan 1970 00:00:00 GMT';
      } catch (_) {}

      setUser(null);
      setIsAuthenticated(false);
      if (redirect !== false) {
        window.location.assign(redirect);
      }
    }
  };

  const updateProfile = async (userData) => {
    try {
      const response = await authAPI.updateProfile(userData);
      setUser(response.data.data.user);
      return { success: true };
    } catch (error) {
      const message = error.response?.data?.message || 'Profile update failed';
      return { success: false, error: message };
    }
  };

  const updateUser = (userData) => {
    setUser((prev) => ({ ...prev, ...userData }));
  };

  const value = {
    user,
    loading,
    isAuthenticated,
    login,
    register,
    logout,
    updateProfile,
    updateUser,
    checkAuth,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
