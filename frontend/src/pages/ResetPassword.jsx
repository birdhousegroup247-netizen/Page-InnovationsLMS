import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { Lock, Eye, EyeOff, CheckCircle, AlertCircle, Check, X } from 'lucide-react';
import { authAPI } from '../lib/api';
import { Button, Alert } from '../components/ui';
import logo from '../assets/logo.png';

export default function ResetPassword() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');

  const [formData, setFormData] = useState({
    password: '',
    confirmPassword: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [tokenError, setTokenError] = useState(false);

  // Password strength state
  const [passwordStrength, setPasswordStrength] = useState({
    score: 0,
    label: '',
    color: '',
    checks: {
      length: false,
      uppercase: false,
      lowercase: false,
      number: false,
      special: false,
    },
  });

  useEffect(() => {
    // Check if token exists
    if (!token) {
      setTokenError(true);
      setError('Invalid or missing reset token. Please request a new password reset link.');
    }
  }, [token]);

  // Calculate password strength
  useEffect(() => {
    const password = formData.password;
    const checks = {
      length: password.length >= 8,
      uppercase: /[A-Z]/.test(password),
      lowercase: /[a-z]/.test(password),
      number: /[0-9]/.test(password),
      special: /[!@#$%^&*(),.?":{}|<>]/.test(password),
    };

    const score = Object.values(checks).filter(Boolean).length;
    let label = '';
    let color = '';

    if (score === 0) {
      label = '';
      color = '';
    } else if (score <= 2) {
      label = 'Weak';
      color = 'text-red-600 dark:text-red-400';
    } else if (score <= 3) {
      label = 'Fair';
      color = 'text-yellow-600 dark:text-yellow-400';
    } else if (score <= 4) {
      label = 'Good';
      color = 'text-blue-600 dark:text-blue-400';
    } else {
      label = 'Strong';
      color = 'text-green-600 dark:text-green-400';
    }

    setPasswordStrength({ score, label, color, checks });
  }, [formData.password]);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
    setError('');
  };

  const validateForm = () => {
    if (!formData.password) {
      setError('Password is required');
      return false;
    }

    if (formData.password.length < 8) {
      setError('Password must be at least 8 characters long');
      return false;
    }

    if (passwordStrength.score < 3) {
      setError('Password is too weak. Please use a stronger password.');
      return false;
    }

    if (!formData.confirmPassword) {
      setError('Please confirm your password');
      return false;
    }

    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      return false;
    }

    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!validateForm()) {
      return;
    }

    if (!token) {
      setError('Invalid reset token');
      return;
    }

    try {
      setLoading(true);
      await authAPI.resetPassword(token, formData.password);
      setSuccess(true);

      // Redirect to login after 3 seconds
      setTimeout(() => {
        navigate('/login', { state: { message: 'Password reset successful! Please login with your new password.' } });
      }, 3000);
    } catch (err) {
      console.error('Reset password error:', err);
      const errorMessage = err.response?.data?.message || 'Failed to reset password. The link may have expired.';
      setError(errorMessage);

      // If token is invalid/expired, show token error
      if (errorMessage.toLowerCase().includes('invalid') || errorMessage.toLowerCase().includes('expired')) {
        setTokenError(true);
      }
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-dark-900 flex items-center justify-center px-4 sm:px-6 lg:px-8 transition-colors">
        <div className="max-w-md w-full">
          <div className="text-center mb-8 animate-fade-in">
            <img
              src={logo}
              alt="TekyPro"
              className="h-12 sm:h-16 w-auto mx-auto mb-6"
            />
          </div>

          <div className="bg-white dark:bg-dark-800 rounded-2xl shadow-lg dark:shadow-elevated p-8 animate-scale-in transition-colors">
            <div className="text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-green-50 dark:bg-green-500/10 rounded-full mb-4 transition-colors">
                <CheckCircle className="h-8 w-8 text-green-600 dark:text-green-400 transition-colors" />
              </div>

              <h2 className="text-2xl font-bold text-gray-900 dark:text-text-dark-primary mb-2 transition-colors">
                Password Reset Successful!
              </h2>

              <p className="text-gray-600 dark:text-text-dark-secondary mb-6 transition-colors">
                Your password has been successfully reset. You can now login with your new password.
              </p>

              <p className="text-sm text-gray-500 dark:text-text-dark-muted transition-colors">
                Redirecting to login page in 3 seconds...
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (tokenError) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-dark-900 flex items-center justify-center px-4 sm:px-6 lg:px-8 transition-colors">
        <div className="max-w-md w-full">
          <div className="text-center mb-8 animate-fade-in">
            <img
              src={logo}
              alt="TekyPro"
              className="h-12 sm:h-16 w-auto mx-auto mb-6"
            />
          </div>

          <div className="bg-white dark:bg-dark-800 rounded-2xl shadow-lg dark:shadow-elevated p-8 animate-scale-in transition-colors">
            <div className="text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-red-50 dark:bg-red-500/10 rounded-full mb-4 transition-colors">
                <AlertCircle className="h-8 w-8 text-red-600 dark:text-red-400 transition-colors" />
              </div>

              <h2 className="text-2xl font-bold text-gray-900 dark:text-text-dark-primary mb-2 transition-colors">
                Invalid Reset Link
              </h2>

              <p className="text-gray-600 dark:text-text-dark-secondary mb-6 transition-colors">
                {error || 'This password reset link is invalid or has expired. Please request a new one.'}
              </p>

              <div className="space-y-3">
                <Link to="/forgot-password" className="block">
                  <Button variant="primary" size="lg" fullWidth>
                    Request New Reset Link
                  </Button>
                </Link>

                <Link to="/login" className="block">
                  <Button variant="ghost" size="lg" fullWidth>
                    Back to login
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-dark-900 flex items-center justify-center px-4 sm:px-6 lg:px-8 transition-colors">
      <div className="max-w-md w-full">
        {/* Logo */}
        <div className="text-center mb-8 animate-fade-in">
          <img
            src={logo}
            alt="TekyPro"
            className="h-12 sm:h-16 w-auto mx-auto mb-6"
          />
          <h2 className="text-3xl font-bold text-gray-900 dark:text-text-dark-primary mb-2 transition-colors">
            Reset Password
          </h2>
          <p className="text-gray-600 dark:text-text-dark-secondary transition-colors">
            Create a strong new password for your account
          </p>
        </div>

        {/* Form Card */}
        <div className="bg-white dark:bg-dark-800 rounded-2xl shadow-lg dark:shadow-elevated p-8 animate-scale-in transition-colors">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Error Message */}
            {error && (
              <Alert variant="danger" onClose={() => setError('')}>
                {error}
              </Alert>
            )}

            {/* New Password Input */}
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 dark:text-text-dark-primary mb-2 transition-colors">
                New Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-gray-400 dark:text-text-dark-muted transition-colors" />
                </div>
                <input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="new-password"
                  required
                  value={formData.password}
                  onChange={handleChange}
                  className="block w-full pl-10 pr-12 py-3 bg-white dark:bg-dark-700 border border-gray-300 dark:border-dark-600 rounded-lg text-gray-900 dark:text-text-dark-primary placeholder-gray-400 dark:placeholder-text-dark-muted focus:outline-none focus:border-brand-blue focus:ring-2 focus:ring-brand-blue transition-all"
                  placeholder="Enter new password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 dark:text-text-dark-muted hover:text-gray-600 dark:hover:text-text-dark-secondary transition-colors"
                >
                  {showPassword ? (
                    <EyeOff className="h-5 w-5" />
                  ) : (
                    <Eye className="h-5 w-5" />
                  )}
                </button>
              </div>

              {/* Password Strength Indicator */}
              {formData.password && (
                <div className="mt-3">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs text-gray-500 dark:text-text-dark-muted transition-colors">Password Strength:</span>
                    <span className={`text-xs font-medium ${passwordStrength.color} transition-colors`}>
                      {passwordStrength.label}
                    </span>
                  </div>
                  <div className="h-2 bg-gray-200 dark:bg-dark-600 rounded-full overflow-hidden transition-colors">
                    <div
                      className={`h-full transition-all duration-300 ${
                        passwordStrength.score <= 2
                          ? 'bg-red-500'
                          : passwordStrength.score <= 3
                          ? 'bg-yellow-500'
                          : passwordStrength.score <= 4
                          ? 'bg-blue-500'
                          : 'bg-green-500'
                      }`}
                      style={{ width: `${(passwordStrength.score / 5) * 100}%` }}
                    ></div>
                  </div>

                  {/* Password Requirements */}
                  <div className="mt-3 space-y-1">
                    <p className="text-xs text-gray-500 dark:text-text-dark-muted mb-1 transition-colors">Password must contain:</p>
                    <div className="grid grid-cols-1 gap-1">
                      <div className="flex items-center gap-2">
                        {passwordStrength.checks.length ? (
                          <Check className="h-3 w-3 text-green-600 dark:text-green-400 transition-colors" />
                        ) : (
                          <X className="h-3 w-3 text-gray-400 dark:text-text-dark-muted transition-colors" />
                        )}
                        <span className={`text-xs ${passwordStrength.checks.length ? 'text-green-600 dark:text-green-400' : 'text-gray-500 dark:text-text-dark-muted'} transition-colors`}>
                          At least 8 characters
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        {passwordStrength.checks.uppercase ? (
                          <Check className="h-3 w-3 text-green-600 dark:text-green-400 transition-colors" />
                        ) : (
                          <X className="h-3 w-3 text-gray-400 dark:text-text-dark-muted transition-colors" />
                        )}
                        <span className={`text-xs ${passwordStrength.checks.uppercase ? 'text-green-600 dark:text-green-400' : 'text-gray-500 dark:text-text-dark-muted'} transition-colors`}>
                          One uppercase letter
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        {passwordStrength.checks.lowercase ? (
                          <Check className="h-3 w-3 text-green-600 dark:text-green-400 transition-colors" />
                        ) : (
                          <X className="h-3 w-3 text-gray-400 dark:text-text-dark-muted transition-colors" />
                        )}
                        <span className={`text-xs ${passwordStrength.checks.lowercase ? 'text-green-600 dark:text-green-400' : 'text-gray-500 dark:text-text-dark-muted'} transition-colors`}>
                          One lowercase letter
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        {passwordStrength.checks.number ? (
                          <Check className="h-3 w-3 text-green-600 dark:text-green-400 transition-colors" />
                        ) : (
                          <X className="h-3 w-3 text-gray-400 dark:text-text-dark-muted transition-colors" />
                        )}
                        <span className={`text-xs ${passwordStrength.checks.number ? 'text-green-600 dark:text-green-400' : 'text-gray-500 dark:text-text-dark-muted'} transition-colors`}>
                          One number
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        {passwordStrength.checks.special ? (
                          <Check className="h-3 w-3 text-green-600 dark:text-green-400 transition-colors" />
                        ) : (
                          <X className="h-3 w-3 text-gray-400 dark:text-text-dark-muted transition-colors" />
                        )}
                        <span className={`text-xs ${passwordStrength.checks.special ? 'text-green-600 dark:text-green-400' : 'text-gray-500 dark:text-text-dark-muted'} transition-colors`}>
                          One special character (!@#$%^&*)
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Confirm Password Input */}
            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 dark:text-text-dark-primary mb-2 transition-colors">
                Confirm New Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-gray-400 dark:text-text-dark-muted transition-colors" />
                </div>
                <input
                  id="confirmPassword"
                  name="confirmPassword"
                  type={showConfirmPassword ? 'text' : 'password'}
                  autoComplete="new-password"
                  required
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  className="block w-full pl-10 pr-12 py-3 bg-white dark:bg-dark-700 border border-gray-300 dark:border-dark-600 rounded-lg text-gray-900 dark:text-text-dark-primary placeholder-gray-400 dark:placeholder-text-dark-muted focus:outline-none focus:border-brand-blue focus:ring-2 focus:ring-brand-blue transition-all"
                  placeholder="Confirm new password"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 dark:text-text-dark-muted hover:text-gray-600 dark:hover:text-text-dark-secondary transition-colors"
                >
                  {showConfirmPassword ? (
                    <EyeOff className="h-5 w-5" />
                  ) : (
                    <Eye className="h-5 w-5" />
                  )}
                </button>
              </div>
              {formData.confirmPassword && formData.password !== formData.confirmPassword && (
                <p className="mt-2 text-xs text-red-600 dark:text-red-400 flex items-center gap-1 transition-colors">
                  <X className="h-3 w-3" />
                  Passwords do not match
                </p>
              )}
              {formData.confirmPassword && formData.password === formData.confirmPassword && (
                <p className="mt-2 text-xs text-green-600 dark:text-green-400 flex items-center gap-1 transition-colors">
                  <Check className="h-3 w-3" />
                  Passwords match
                </p>
              )}
            </div>

            {/* Submit Button */}
            <Button
              type="submit"
              variant="primary"
              size="lg"
              fullWidth
              disabled={loading || passwordStrength.score < 3}
              loading={loading}
            >
              {loading ? 'Resetting Password...' : 'Reset Password'}
            </Button>
          </form>

          {/* Back to Login */}
          <div className="mt-6 text-center">
            <Link
              to="/login"
              className="text-gray-600 dark:text-text-dark-secondary hover:text-gray-900 dark:hover:text-text-dark-primary transition-colors"
            >
              Back to login
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
