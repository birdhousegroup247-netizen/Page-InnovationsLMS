import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { Mail, Lock, Eye, EyeOff, Sun, Moon, ArrowLeft, ArrowRight, KeyRound } from 'lucide-react';
import logo from '../assets/logo.png';
import {
  inputClass as fInput,
  inputClassWithRightAction as fInputAction,
  labelClass as fLabel,
  primaryButtonClass,
  secondaryButtonClass,
  formCardClass,
} from '../utils/authForm';

export default function Login() {
  const navigate = useNavigate();
  const { login, logout, verify2FA } = useAuth();
  const { theme, toggleTheme } = useTheme();

  const [formData, setFormData] = useState({ email: '', password: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  // 2FA step 2 — set after email+password succeeded but backend requires
  // a TOTP code before issuing tokens. Null means we're on step 1.
  const [twoFactor, setTwoFactor] = useState(null); // { userId, rememberMe }
  const [otpCode, setOtpCode] = useState('');

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
    setError('');
  };

  // Shared post-auth routing — used by both the plain-login path and
  // the 2FA-verified path. Keeps the role gating rules in one place.
  const routeAuthedUser = async (user) => {
    const selectedRole = localStorage.getItem('selectedRole');

    // redirect:false — logout()'s default hard reload would wipe the error
    // message before the user ever saw it.
    if (user.role === 'admin' || user.role === 'super_admin') {
      await logout({ redirect: false });
      setError('Administrators should use the admin portal.');
      return;
    }

    if (selectedRole === 'student') {
      if (user.role !== 'student') {
        await logout({ redirect: false });
        setError('This login is for students only. If you are an instructor, please go back and select "I\'m an Instructor".');
        return;
      }
      navigate('/dashboard');
    } else if (selectedRole === 'instructor') {
      if (user.role !== 'instructor') {
        await logout({ redirect: false });
        setError('This login is for instructors only. If you are a student, please go back and select "I\'m a Student".');
        return;
      }
      navigate('/instructor/dashboard');
    } else if (user.role === 'instructor') {
      localStorage.setItem('selectedRole', 'instructor');
      navigate('/instructor/dashboard');
    } else {
      localStorage.setItem('selectedRole', 'student');
      navigate('/dashboard');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const result = await login(formData.email, formData.password, rememberMe);

      // Email not verified — send them to the verify page
      if (!result.success && result.emailNotVerified) {
        navigate(`/verify-email?email=${encodeURIComponent(result.email || formData.email)}`);
        return;
      }

      // 2FA required — flip to the OTP step. Password already accepted
      // by the backend but no tokens issued yet.
      if (!result.success && result.requires2FA) {
        setTwoFactor({ userId: result.userId, rememberMe: !!result.rememberMe });
        setOtpCode('');
        return;
      }

      if (result.success) {
        await routeAuthedUser(result.user);
      } else {
        setError(result.error);
      }
    } catch (err) {
      setError('An unexpected error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    setError('');
    if (!otpCode.trim() || !/^\d{6}$/.test(otpCode.trim())) {
      setError('Enter the 6-digit code from your authenticator app.');
      return;
    }
    setLoading(true);
    try {
      const result = await verify2FA(twoFactor.userId, otpCode.trim(), twoFactor.rememberMe);
      if (result.success) {
        await routeAuthedUser(result.user);
      } else {
        setError(result.error);
      }
    } catch (_) {
      setError('An unexpected error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleCancel2FA = () => {
    setTwoFactor(null);
    setOtpCode('');
    setError('');
  };

  return (
    <div className="min-h-screen flex bg-gray-50 dark:bg-dark-900 transition-colors">
      {/* Back to role selection — on desktop sits inside the right form
          column so it doesn't overlap the editorial logo on the left. */}
      <Link
        to="/"
        className="group fixed top-4 left-4 lg:left-[calc(50%+1rem)] inline-flex items-center gap-2 pl-2.5 pr-3.5 py-2 rounded-full bg-white dark:bg-dark-800 border border-gray-200 dark:border-gray-700 shadow-md hover:shadow-lg hover:border-brand-blue/40 transition-all z-50"
        aria-label="Back to role selection"
      >
        <span className="w-7 h-7 rounded-full bg-gray-100 dark:bg-dark-700 group-hover:bg-brand-blue group-hover:text-white flex items-center justify-center transition-colors">
          <ArrowLeft className="w-3.5 h-3.5" />
        </span>
        <span className="hidden sm:inline text-sm font-medium text-gray-700 dark:text-gray-200 group-hover:text-gray-900 dark:group-hover:text-white">
          Choose role
        </span>
      </Link>

      {/* Theme Toggle */}
      <button
        onClick={toggleTheme}
        className="fixed top-4 right-4 p-3 rounded-lg bg-white dark:bg-dark-800 shadow-md hover:shadow-lg transition-all z-50"
        aria-label="Toggle theme"
      >
        {theme === 'dark' ? (
          <Sun className="w-5 h-5 text-yellow-500" />
        ) : (
          <Moon className="w-5 h-5 text-gray-700 dark:text-text-dark-secondary" />
        )}
      </button>

      {/* Left Side - Image/Illustration */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden">
        {/* Background Image */}
        <img
          src="https://images.unsplash.com/photo-1516321318423-f06f85e504b3?q=80&w=2070&auto=format&fit=crop"
          alt="Learning Background"
          className="absolute inset-0 w-full h-full object-cover"
        />
        {/* Overlay */}
        <div className="absolute inset-0 bg-gradient-to-br from-brand-blue/90 via-brand-purple/90 to-brand-blue/90 dark:from-brand-blue/95 dark:via-brand-purple/95 dark:to-brand-blue/95 transition-colors"></div>

        <div className="relative z-10 flex flex-col justify-center items-center text-white p-12 w-full">
          {/* Logo */}
          <img src={logo} alt="Page Innovations" className="h-20 w-auto mb-8 filter brightness-0 invert" />

          {/* Illustration/Content */}
          <div className="text-center max-w-md">
            <h1 className="text-4xl font-bold mb-4 animate-fade-in">
              Welcome to Page Innovations
            </h1>
            <p className="text-xl text-white/90 mb-8 animate-slide-up">
              The Leading Remote DBA Service Provider
            </p>

            {/* Feature Points */}
            <div className="space-y-4 text-left">
              <div className="flex items-start gap-3 animate-slide-up" style={{ animationDelay: '0.1s' }}>
                <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center flex-shrink-0 mt-1">
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                </div>
                <div>
                  <h3 className="font-semibold text-lg">Expert-Led Courses</h3>
                  <p className="text-white/80 text-sm">Learn from industry professionals</p>
                </div>
              </div>

              <div className="flex items-start gap-3 animate-slide-up" style={{ animationDelay: '0.2s' }}>
                <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center flex-shrink-0 mt-1">
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                </div>
                <div>
                  <h3 className="font-semibold text-lg">Hands-On Practice</h3>
                  <p className="text-white/80 text-sm">Real-world projects and exercises</p>
                </div>
              </div>

              <div className="flex items-start gap-3 animate-slide-up" style={{ animationDelay: '0.3s' }}>
                <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center flex-shrink-0 mt-1">
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                </div>
                <div>
                  <h3 className="font-semibold text-lg">Certifications</h3>
                  <p className="text-white/80 text-sm">Get recognized for your achievements</p>
                </div>
              </div>
            </div>
          </div>

          {/* Decorative Elements */}
          <div className="absolute top-10 left-10 w-32 h-32 bg-white/10 rounded-full blur-3xl animate-float"></div>
          <div className="absolute bottom-10 right-10 w-40 h-40 bg-white/10 rounded-full blur-3xl animate-float" style={{ animationDelay: '2s' }}></div>
        </div>
      </div>

      {/* Right Side - Login Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-4 sm:p-8">
        <div className="w-full max-w-xl">
          {/* Mobile Logo */}
          <div className="lg:hidden text-center mb-8 animate-fade-in">
            <img src={logo} alt="Page Innovations" className="h-12 w-auto mx-auto" />
          </div>

          {/* Form Card */}
          <div className={formCardClass}>
            {/* Header */}
            <div className="mb-7">
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white tracking-tight">
                {twoFactor ? 'Two-factor code' : 'Welcome back'}
              </h1>
              <p className="text-gray-500 dark:text-gray-400 text-sm mt-1.5">
                {twoFactor
                  ? 'Open your authenticator app and enter the 6-digit code for Page Innovations.'
                  : 'Sign in to continue to your account.'}
              </p>
            </div>

            {/* Error Alert */}
            {error && (
              <div className="mb-6 p-4 bg-red-50 dark:bg-red-500/10 rounded-lg transition-colors animate-fade-in">
                <p className="text-red-800 dark:text-red-400 text-sm transition-colors">{error}</p>
                {(error.includes('students only') || error.includes('instructors only')) && (
                  <a href="/" className="mt-2 inline-block text-sm text-red-700 dark:text-red-400 underline hover:no-underline">
                    ← Go back to select the right role
                  </a>
                )}
              </div>
            )}

            {/* 2FA step 2 — TOTP entry */}
            {twoFactor ? (
              <form onSubmit={handleVerifyOtp} className="space-y-5">
                <div>
                  <label htmlFor="otp" className={fLabel}>
                    Authenticator code <span className="text-red-500 normal-case">*</span>
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                      <KeyRound className="h-4 w-4 text-gray-400 dark:text-text-dark-muted" />
                    </div>
                    <input
                      id="otp"
                      type="text"
                      inputMode="numeric"
                      pattern="\d{6}"
                      maxLength={6}
                      placeholder="123456"
                      value={otpCode}
                      onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ''))}
                      required
                      autoComplete="one-time-code"
                      autoFocus
                      className={fInput + ' font-mono tracking-widest text-center text-lg'}
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading || otpCode.length !== 6}
                  className={primaryButtonClass}
                >
                  {loading ? (
                    <>
                      <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                      Verifying…
                    </>
                  ) : (
                    <>
                      Verify and sign in
                      <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={handleCancel2FA}
                  className="w-full text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors"
                >
                  Cancel and go back
                </button>
              </form>
            ) : (
            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Email */}
              <div>
                <label htmlFor="email" className={fLabel}>
                  Email address <span className="text-red-500 normal-case">*</span>
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                    <Mail className="h-4 w-4 text-gray-400 dark:text-text-dark-muted" />
                  </div>
                  <input
                    id="email"
                    type="email"
                    name="email"
                    placeholder="john@example.com"
                    value={formData.email}
                    onChange={handleChange}
                    required
                    autoComplete="email"
                    className={fInput}
                  />
                </div>
              </div>

              {/* Password */}
              <div>
                <label htmlFor="password" className={fLabel}>
                  Password <span className="text-red-500 normal-case">*</span>
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                    <Lock className="h-4 w-4 text-gray-400 dark:text-text-dark-muted" />
                  </div>
                  <input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    name="password"
                    placeholder="Your password"
                    value={formData.password}
                    onChange={handleChange}
                    required
                    autoComplete="current-password"
                    className={fInputAction}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              {/* Remember Me & Forgot Password */}
              <div className="flex items-center justify-between">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="w-4 h-4 rounded border-gray-300 dark:border-border-dark bg-white dark:bg-dark-700 text-brand-blue focus:ring-brand-blue focus:ring-offset-0 dark:focus:ring-offset-dark-800 transition-colors"
                  />
                  <span className="text-sm text-gray-600 dark:text-text-dark-secondary transition-colors">
                    Remember me
                  </span>
                </label>
                <Link
                  to="/forgot-password"
                  className="text-sm text-brand-blue hover:text-brand-blue-light dark:hover:text-brand-blue-light font-medium transition-colors"
                >
                  Forgot Password?
                </Link>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={loading}
                className={primaryButtonClass}
              >
                {loading ? (
                  <>
                    <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                    Signing in…
                  </>
                ) : (
                  <>
                    Sign in
                    <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                  </>
                )}
              </button>
            </form>
            )}

            {/* Divider — hidden during 2FA step so the user focuses on
                the code entry, not alternative sign-in options. */}
            {!twoFactor && (
            <>
            <div className="relative my-6">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-200 dark:border-border-dark transition-colors" />
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-4 bg-white dark:bg-dark-800 text-gray-500 dark:text-text-dark-muted transition-colors">
                  Or continue with
                </span>
              </div>
            </div>

            {/* Google Sign In */}
            <button
              type="button"
              onClick={() => { window.location.href = `${import.meta.env.VITE_API_URL}/api/auth/google`; }}
              className={secondaryButtonClass}
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                />
              </svg>
              Sign in with Google
            </button>

            {/* Sign Up / Apply Link — role-aware. Instructors apply (with
                documents), students sign up directly. */}
            <p className="text-center text-sm text-gray-600 dark:text-text-dark-secondary mt-6">
              {(typeof window !== 'undefined' && localStorage.getItem('selectedRole') === 'instructor') ? (
                <>
                  New to teaching on Page Innovations?{' '}
                  <Link to="/instructor-apply" className="text-brand-purple dark:text-purple-300 hover:underline font-semibold">
                    Apply to teach
                  </Link>
                </>
              ) : (
                <>
                  Don't have an account?{' '}
                  <Link to="/signup" className="text-brand-blue dark:text-cyan-400 hover:underline font-semibold">
                    Sign up
                  </Link>
                </>
              )}
            </p>
            </>
            )}
          </div>

          {/* Footer */}
          <p className="text-center text-sm text-gray-500 dark:text-text-dark-muted mt-8 transition-colors">
            © 2025 Page Innovations. All rights reserved.
          </p>
        </div>
      </div>
    </div>
  );
}
