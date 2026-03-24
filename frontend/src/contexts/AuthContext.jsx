import { createContext, useContext, useState, useEffect } from 'react';
import { authAPI, paymentsAPI } from '../lib/api';

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
      const { user, accessToken, refreshToken } = response.data.data;

      // Store tokens in localStorage
      localStorage.setItem('accessToken', accessToken);
      localStorage.setItem('refreshToken', refreshToken);
      
      setUser(user);
      setIsAuthenticated(true);

      return { success: true, user };
    } catch (error) {
      const message = error.response?.data?.message || 'Registration failed';
      return { success: false, error: message };
    }
  };

  const login = async (email, password) => {
    try {
      const response = await authAPI.login({ email, password });
      const { user, accessToken, refreshToken } = response.data.data;

      // Store tokens in localStorage
      localStorage.setItem('accessToken', accessToken);
      localStorage.setItem('refreshToken', refreshToken);
      
      setUser(user);
      setIsAuthenticated(true);

      return { success: true, user };
    } catch (error) {
      const message = error.response?.data?.message || 'Login failed';
      return { success: false, error: message };
    }
  };

  const logout = async () => {
    try {
      await authAPI.logout();
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      // Clear tokens and selected role from localStorage
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
      localStorage.removeItem('selectedRole');

      setUser(null);
      setIsAuthenticated(false);
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
    register,
    logout,
    updateProfile,
    updateUser,
    checkAuth,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
