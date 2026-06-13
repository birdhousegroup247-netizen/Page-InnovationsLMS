import { createContext, useContext, useState, useEffect } from 'react';
import { authAPI } from '../lib/api';
import logger from '../utils/logger';

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
    } catch (error) {
      logger.error('Auth check failed:', error);
      // If profile fetch fails, user is not authenticated
      setIsAuthenticated(false);
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  const login = async (email, password) => {
    try {
      const response = await authAPI.login({ email, password });
      const { user, accessToken, refreshToken } = response.data.data;

      // Store tokens in localStorage so the api.js Bearer-token interceptor
      // can attach them. This is what makes CSRF auto-bypass work across
      // subdomains (admin app vs API on different *.up.railway.app hosts).
      if (accessToken) localStorage.setItem('accessToken', accessToken);
      if (refreshToken) localStorage.setItem('refreshToken', refreshToken);

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

      if (accessToken) localStorage.setItem('accessToken', accessToken);
      if (refreshToken) localStorage.setItem('refreshToken', refreshToken);

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

  const logout = async () => {
    try {
      await authAPI.logout();
    } catch (error) {
      logger.error('Logout error:', error);
    } finally {
      // Clear every piece of auth state — without this, stale tokens in
      // localStorage keep the user logged in after they click logout.
      try { localStorage.removeItem('accessToken'); } catch (_) {}
      try { localStorage.removeItem('refreshToken'); } catch (_) {}
      try { sessionStorage.clear(); } catch (_) {}
      try {
        document.cookie = 'csrf-token=; Path=/; Expires=Thu, 01 Jan 1970 00:00:00 GMT';
      } catch (_) {}

      setUser(null);
      setIsAuthenticated(false);
      window.location.assign('/login');
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
