import { createContext, useContext, useState, useEffect } from 'react';
import { authAPI, paymentsAPI, twoFactorAPI } from '../lib/api';
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
  const [installmentData, setInstallmentData] = useState(null);

  // Check if user is logged in on mount
  useEffect(() => {
    checkAuth();
  }, []);

  // Fetch installment payment data for overdue warnings (active users only)
  useEffect(() => {
    if (!isAuthenticated || !user || user.registration_status === 'preview') return;
    paymentsAPI.getMyPayments()
      .then((r) => {
        const payments = r.data?.data?.payments || [];
        const overdue = payments.find(
          (p) =>
            p.payment_plan === 'installment' &&
            p.payment_status === 'completed' &&
            ['pending', 'overdue'].includes(p.installment_status)
        );
        setInstallmentData(overdue || null);
      })
      .catch(() => {});
  }, [isAuthenticated, user?.id]);

  const checkAuth = async () => {
    try {
      // Try to get user profile - if accessToken cookie exists and is valid, this will succeed
      const response = await authAPI.getProfile();
      setUser(response.data.data.user);
      setIsAuthenticated(true);
    } catch (error) {
      // Silently fail - don't log errors to console on mount
      // This is expected when user is not logged in or has expired tokens
      // If profile fetch fails, user is not authenticated
      setIsAuthenticated(false);
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  const register = async (userData) => {
    try {
      const response = await authAPI.register(userData);
      const data = response.data.data || {};
      // New flow: register returns { verification_required, email } and does NOT
      // log the user in. Caller redirects to /verify-email.
      if (data.verification_required) {
        return { success: true, verificationRequired: true, email: data.email };
      }
      // Legacy fallback if tokens are present (shouldn't happen post-verification rollout)
      const { user, accessToken, refreshToken } = data;
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

  const login = async (email, password, rememberMe = false) => {
    try {
      const response = await authAPI.login({ email, password, remember_me: rememberMe });
      const payload = response.data.data;

      // 2FA branch — backend returns { requires2FA, userId, rememberMe }
      // instead of tokens. The Login page hands off to a code-input UI
      // that calls verify2FA() with the userId + TOTP code.
      if (payload?.requires2FA) {
        return {
          success: false,
          requires2FA: true,
          userId: payload.userId,
          rememberMe: !!payload.rememberMe,
        };
      }

      const { user, accessToken, refreshToken } = payload;

      // Per-tab storage. rememberMe seeds localStorage so new tabs /
      // browser restarts can recover the session; without it the tokens
      // live only in this tab's sessionStorage.
      tokenStorage.setTokens({ accessToken, refreshToken }, { rememberMe });

      setUser(user);
      setIsAuthenticated(true);

      return { success: true, user };
    } catch (error) {
      // Surface email-not-verified so the Login page can redirect to /verify-email
      const status = error.response?.status;
      const data = error.response?.data;
      if (status === 403 && data?.code === 'EMAIL_NOT_VERIFIED') {
        return { success: false, emailNotVerified: true, email: data.email, error: data.message };
      }
      const message = data?.message || 'Login failed';
      return { success: false, error: message };
    }
  };

  // Step 2 of a 2FA login. Called by the OTP input on the Login page
  // after the initial email+password succeeded and returned
  // requires2FA. Success returns the same shape as a normal login.
  const verify2FA = async (userId, token, rememberMe = false) => {
    try {
      const response = await twoFactorAPI.authenticate(userId, token, rememberMe);
      const { user, accessToken, refreshToken } = response.data.data;
      tokenStorage.setTokens({ accessToken, refreshToken }, { rememberMe });
      setUser(user);
      setIsAuthenticated(true);
      return { success: true, user };
    } catch (error) {
      const message = error.response?.data?.message || 'Invalid 2FA code';
      return { success: false, error: message };
    }
  };

  const logout = async () => {
    try {
      await authAPI.logout();
    } catch (error) {
      // Continue with local cleanup even if the server call fails
      console.error('Logout error:', error);
    } finally {
      // Clear every piece of auth state we control. Anything left behind here
      // is exactly what causes "reopen browser and you're logged back in".
      tokenStorage.clearAll();
      try { localStorage.removeItem('selectedRole'); } catch (_) {}
      try { sessionStorage.clear(); } catch (_) {}

      // The httpOnly auth cookies are owned by the server (cleared via clearCookie).
      // csrf-token is not httpOnly so we can nuke it from JS too — belt and braces
      // in case the server's clearCookie attrs didn't match in some environments.
      try {
        document.cookie = 'csrf-token=; Path=/; Expires=Thu, 01 Jan 1970 00:00:00 GMT';
      } catch (_) {}

      setUser(null);
      setIsAuthenticated(false);

      // Hard reload to landing so any in-memory state from protected routes is dropped.
      // Using assign (not replace) so the back button doesn't drop them right back into
      // a stale authenticated route.
      window.location.assign('/');
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

  const isPreview = user?.registration_status === 'preview';
  const isSuspended = user?.registration_status === 'suspended';

  // Derive which installment warning stage the user is in
  const getInstallmentStage = () => {
    if (!installmentData) return null;
    const sent = installmentData.metadata?.reminders_sent || [];
    if (sent.includes('r_d35')) return 'soft';
    if (sent.includes('r_d32')) return 'partial';
    if (sent.includes('r_d28')) return 'red';
    if (sent.includes('r_d24')) return 'orange';
    if (installmentData.installment_status === 'overdue') return 'warning';
    return null;
  };
  const installmentStage = getInstallmentStage();

  const value = {
    user,
    loading,
    isAuthenticated,
    isPreview,
    isSuspended,
    installmentData,
    installmentStage,
    login,
    verify2FA,
    register,
    logout,
    updateProfile,
    updateUser,
    checkAuth,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
