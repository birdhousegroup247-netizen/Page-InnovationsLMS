import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Mail, ArrowLeft, CheckCircle, Send } from 'lucide-react';
import { authAPI } from '../lib/api';
import { Button, Alert } from '../components/ui';
import logo from '../assets/logo.png';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const validateEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    // Validation
    if (!email) {
      setError('Email is required');
      return;
    }

    if (!validateEmail(email)) {
      setError('Please enter a valid email address');
      return;
    }

    try {
      setLoading(true);
      await authAPI.forgotPassword(email);
      setSuccess(true);
    } catch (err) {
      console.error('Forgot password error:', err);
      setError(
        err.response?.data?.message ||
        'Failed to send reset email. Please try again.'
      );
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-dark-900 flex items-center justify-center px-4 sm:px-6 lg:px-8 transition-colors">
        <div className="max-w-md w-full">
          {/* Logo */}
          <div className="text-center mb-8 animate-fade-in">
            <img
              src={logo}
              alt="Page Innovation"
              className="h-12 sm:h-16 w-auto mx-auto mb-6"
            />
          </div>

          {/* Success Card */}
          <div className="bg-white dark:bg-dark-800 rounded-2xl shadow-lg dark:shadow-elevated p-8 animate-scale-in transition-colors">
            <div className="text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-green-50 dark:bg-green-500/10 rounded-full mb-4 transition-colors">
                <CheckCircle className="h-8 w-8 text-green-600 dark:text-green-400 transition-colors" />
              </div>

              <h2 className="text-2xl font-bold text-gray-900 dark:text-text-dark-primary mb-2 transition-colors">
                Check Your Email
              </h2>

              <p className="text-gray-600 dark:text-text-dark-secondary mb-6 transition-colors">
                We've sent a password reset link to:
              </p>

              <p className="text-brand-blue font-medium mb-6">
                {email}
              </p>

              <div className="bg-gray-100 dark:bg-dark-700 border border-gray-200 dark:border-dark-600 rounded-lg p-4 mb-6 transition-colors">
                <p className="text-sm text-gray-600 dark:text-text-dark-secondary text-left transition-colors">
                  <strong className="text-gray-900 dark:text-text-dark-primary transition-colors">Next steps:</strong>
                  <br />
                  1. Check your email inbox
                  <br />
                  2. Click the reset link in the email
                  <br />
                  3. Create a new password
                  <br />
                  <br />
                  The link will expire in <strong className="text-gray-900 dark:text-text-dark-primary transition-colors">1 hour</strong>.
                </p>
              </div>

              <p className="text-sm text-gray-500 dark:text-text-dark-muted mb-6 transition-colors">
                Didn't receive the email? Check your spam folder or{' '}
                <button
                  onClick={() => {
                    setSuccess(false);
                    setEmail('');
                  }}
                  className="text-brand-blue hover:text-brand-blue-light underline transition-colors"
                >
                  try again
                </button>
              </p>

              <Link
                to="/login"
                className="inline-flex items-center gap-2 text-gray-600 dark:text-text-dark-secondary hover:text-gray-900 dark:hover:text-text-dark-primary transition-colors"
              >
                <ArrowLeft className="h-4 w-4" />
                Back to login
              </Link>
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
            alt="Page Innovation"
            className="h-12 sm:h-16 w-auto mx-auto mb-6"
          />
          <h2 className="text-3xl font-bold text-gray-900 dark:text-text-dark-primary mb-2 transition-colors">
            Forgot Password?
          </h2>
          <p className="text-gray-600 dark:text-text-dark-secondary transition-colors">
            No worries! Enter your email and we'll send you reset instructions.
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

            {/* Email Input */}
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-text-dark-primary mb-2 transition-colors">
                Email Address
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Mail className="h-5 w-5 text-gray-400 dark:text-text-dark-muted transition-colors" />
                </div>
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="block w-full pl-10 pr-3 py-3 bg-white dark:bg-dark-700 border border-gray-300 dark:border-dark-600 rounded-lg text-gray-900 dark:text-text-dark-primary placeholder-gray-400 dark:placeholder-text-dark-muted focus:outline-none focus:border-brand-blue focus:ring-2 focus:ring-brand-blue transition-all"
                  placeholder="you@example.com"
                />
              </div>
              <p className="mt-2 text-xs text-gray-500 dark:text-text-dark-muted transition-colors">
                Enter the email address associated with your account
              </p>
            </div>

            {/* Submit Button */}
            <Button
              type="submit"
              variant="primary"
              size="lg"
              fullWidth
              disabled={loading}
              loading={loading}
              leftIcon={!loading && <Send className="h-5 w-5" />}
            >
              {loading ? 'Sending...' : 'Send Reset Link'}
            </Button>
          </form>

          {/* Back to Login */}
          <div className="mt-6 text-center">
            <Link
              to="/login"
              className="inline-flex items-center gap-2 text-gray-600 dark:text-text-dark-secondary hover:text-gray-900 dark:hover:text-text-dark-primary transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to login
            </Link>
          </div>
        </div>

        {/* Additional Help */}
        <div className="mt-6 text-center">
          <p className="text-sm text-gray-500 dark:text-text-dark-muted transition-colors">
            Don't have an account?{' '}
            <Link to="/signup" className="text-brand-blue hover:text-brand-blue-light font-medium transition-colors">
              Sign up
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
