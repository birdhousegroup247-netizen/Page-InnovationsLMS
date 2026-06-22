import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { Mail, Lock, User, Eye, EyeOff, Sun, Moon, Phone, Globe, ChevronDown } from 'lucide-react';
import logo from '../assets/logo.png';

const COUNTRIES = [
  'United States', 'United Kingdom', 'Canada', 'Australia', 'Nigeria',
  'Ghana', 'Kenya', 'South Africa', 'Uganda', 'Tanzania', 'Zimbabwe',
  'Zambia', 'Cameroon', 'Senegal', 'Ethiopia', 'Egypt', 'Morocco',
  'India', 'Pakistan', 'Bangladesh', 'Philippines', 'Indonesia', 'Malaysia',
  'Singapore', 'Germany', 'France', 'Netherlands', 'Sweden', 'Italy', 'Spain',
  'Brazil', 'Mexico', 'Colombia', 'Argentina', 'Saudi Arabia', 'UAE',
  'Turkey', 'China', 'Japan', 'South Korea', 'New Zealand', 'Ireland', 'Other',
];

export default function Register() {
  const navigate = useNavigate();
  const { register } = useAuth();
  const { theme, toggleTheme } = useTheme();

  const [formData, setFormData] = useState({
    full_name: '',
    email: '',
    phone: '',
    country: '',
    experience_level: '',
    referral_source: '',
    password: '',
    confirmPassword: '',
    role: 'student',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [validationErrors, setValidationErrors] = useState({});
  const [successMessage, setSuccessMessage] = useState('');
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    setError('');
    if (validationErrors[e.target.name]) {
      setValidationErrors({ ...validationErrors, [e.target.name]: '' });
    }
  };

  const validateForm = () => {
    const errors = {};

    if (!formData.full_name.trim()) {
      errors.full_name = 'Full name is required';
    } else if (formData.full_name.trim().length < 2) {
      errors.full_name = 'Name must be at least 2 characters';
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!formData.email) {
      errors.email = 'Email is required';
    } else if (!emailRegex.test(formData.email)) {
      errors.email = 'Please enter a valid email address';
    }

    if (!formData.password) {
      errors.password = 'Password is required';
    } else if (formData.password.length < 8) {
      errors.password = 'Password must be at least 8 characters';
    } else if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(formData.password)) {
      errors.password = 'Password must contain uppercase, lowercase, and number';
    }

    if (!formData.confirmPassword) {
      errors.confirmPassword = 'Please confirm your password';
    } else if (formData.password !== formData.confirmPassword) {
      errors.confirmPassword = 'Passwords do not match';
    }

    if (!agreedToTerms) {
      errors.terms = 'You must agree to the Terms of Service and Privacy Policy';
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccessMessage('');

    if (!validateForm()) return;

    setLoading(true);

    try {
      const result = await register({
        full_name: formData.full_name,
        email: formData.email,
        password: formData.password,
        role: formData.role,
        phone: formData.phone || undefined,
        country: formData.country || undefined,
        experience_level: formData.experience_level || undefined,
        referral_source: formData.referral_source || undefined,
      });

      if (result.success) {
        // New flow: register issues a verification email and does not log in.
        if (result.verificationRequired) {
          navigate(`/verify-email?email=${encodeURIComponent(result.email || formData.email)}`);
          return;
        }
        // Legacy fallback if auto-login ever happens
        const role = result.user?.role;
        if (role === 'admin') navigate('/admin/dashboard');
        else if (role === 'instructor') navigate('/instructor/dashboard');
        else navigate('/dashboard');
      } else {
        setError(result.error);
      }
    } catch (err) {
      setError('An unexpected error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const selectClass = 'w-full pl-10 pr-4 py-2.5 bg-white dark:bg-dark-700 border border-gray-300 dark:border-border-dark rounded-lg text-gray-900 dark:text-text-dark-primary focus:outline-none focus:ring-2 focus:ring-brand-blue focus:border-transparent transition-all appearance-none';
  const inputClass = 'w-full pl-10 pr-4 py-2.5 bg-white dark:bg-dark-700 border border-gray-300 dark:border-border-dark rounded-lg text-gray-900 dark:text-text-dark-primary placeholder-gray-400 dark:placeholder-text-dark-muted focus:outline-none focus:ring-2 focus:ring-brand-blue focus:border-transparent transition-all';
  const labelClass = 'block text-sm font-medium text-gray-700 dark:text-text-dark-primary mb-2 transition-colors';

  return (
    <div className="min-h-screen flex bg-gray-50 dark:bg-dark-900 transition-colors">
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
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden sticky top-0 h-screen">
        <img
          src="https://images.unsplash.com/photo-1522202176988-66273c2fd55f?q=80&w=2071&auto=format&fit=crop"
          alt="Learning Background"
          className="absolute inset-0 w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-br from-brand-purple/90 via-brand-blue/90 to-brand-purple/90 dark:from-brand-purple/95 dark:via-brand-blue/95 dark:to-brand-purple/95 transition-colors"></div>

        <div className="relative z-10 flex flex-col justify-center items-center text-white p-12 w-full">
          <img src={logo} alt="TekyPro" className="h-20 w-auto mb-8 filter brightness-0 invert" />

          <div className="text-center max-w-md">
            <h1 className="text-4xl font-bold mb-4 animate-fade-in">
              Start Your Learning Journey
            </h1>
            <p className="text-xl text-white/90 mb-8 animate-slide-up">
              Register free and explore — pay only when you're ready to enroll
            </p>

            <div className="space-y-4 text-left">
              {[
                {
                  title: 'Free Preview Mode',
                  desc: 'Browse all courses and preview Lesson 1 of every course — no credit card needed',
                },
                {
                  title: 'Flexible Payment Plans',
                  desc: 'Pay in full or choose our 60/40 installment plan to spread the cost',
                },
                {
                  title: 'Earn Certificates',
                  desc: 'Complete courses and showcase your achievements to employers',
                },
              ].map((item, i) => (
                <div key={item.title} className="flex items-start gap-3 animate-slide-up" style={{ animationDelay: `${i * 0.1}s` }}>
                  <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center flex-shrink-0 mt-1">
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="font-semibold text-lg">{item.title}</h3>
                    <p className="text-white/80 text-sm">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="absolute top-10 left-10 w-32 h-32 bg-white/10 rounded-full blur-3xl animate-float"></div>
          <div className="absolute bottom-10 right-10 w-40 h-40 bg-white/10 rounded-full blur-3xl animate-float" style={{ animationDelay: '2s' }}></div>
        </div>
      </div>

      {/* Right Side - Registration Form */}
      <div className="w-full lg:w-1/2 flex items-start justify-center p-4 sm:p-8 py-8 overflow-y-auto">
        <div className="w-full max-w-md">
          {/* Mobile Logo */}
          <div className="lg:hidden text-center mb-8 animate-fade-in">
            <img src={logo} alt="TekyPro" className="h-12 w-auto mx-auto" />
          </div>

          {/* Form Card */}
          <div className="bg-white dark:bg-dark-800 rounded-2xl shadow-lg dark:shadow-elevated p-8 animate-scale-in transition-colors">
            {/* Header */}
            <div className="text-center mb-8">
              <h1 className="text-2xl font-semibold text-gray-900 dark:text-text-dark-primary mb-2 transition-colors">
                Create Account
              </h1>
              <p className="text-gray-600 dark:text-text-dark-secondary text-sm transition-colors">
                Join TekyPro free — preview courses instantly
              </p>
            </div>

            {/* Error Alert */}
            {error && (
              <div className="mb-6 p-4 bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/30 rounded-lg transition-colors">
                <p className="text-red-800 dark:text-red-400 text-sm transition-colors">{error}</p>
              </div>
            )}

            {/* Success Message */}
            {successMessage && (
              <div className="mb-6 p-4 bg-blue-50 dark:bg-blue-500/10 border border-blue-200 dark:border-blue-500/30 rounded-lg transition-colors">
                <p className="text-blue-800 dark:text-blue-400 text-sm transition-colors">{successMessage}</p>
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Full Name */}
              <div>
                <label htmlFor="full_name" className={labelClass}>
                  Full Name <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <User className="h-5 w-5 text-gray-400 dark:text-text-dark-muted transition-colors" />
                  </div>
                  <input
                    id="full_name"
                    type="text"
                    name="full_name"
                    placeholder="John Doe"
                    value={formData.full_name}
                    onChange={handleChange}
                    required
                    className={inputClass}
                  />
                </div>
                {validationErrors.full_name && (
                  <p className="text-red-600 dark:text-red-400 text-xs mt-1">{validationErrors.full_name}</p>
                )}
              </div>

              {/* Email */}
              <div>
                <label htmlFor="email" className={labelClass}>
                  Email Address <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Mail className="h-5 w-5 text-gray-400 dark:text-text-dark-muted transition-colors" />
                  </div>
                  <input
                    id="email"
                    type="email"
                    name="email"
                    placeholder="john@example.com"
                    value={formData.email}
                    onChange={handleChange}
                    required
                    className={inputClass}
                  />
                </div>
                {validationErrors.email && (
                  <p className="text-red-600 dark:text-red-400 text-xs mt-1">{validationErrors.email}</p>
                )}
              </div>

              {/* Phone */}
              <div>
                <label htmlFor="phone" className={labelClass}>
                  Phone Number <span className="text-gray-400 dark:text-text-dark-muted text-xs font-normal">(optional)</span>
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Phone className="h-5 w-5 text-gray-400 dark:text-text-dark-muted transition-colors" />
                  </div>
                  <input
                    id="phone"
                    type="tel"
                    name="phone"
                    placeholder="+1 (555) 000-0000"
                    value={formData.phone}
                    onChange={handleChange}
                    className={inputClass}
                  />
                </div>
              </div>

              {/* Country + Experience Level side by side */}
              <div className="grid grid-cols-2 gap-3">
                {/* Country */}
                <div>
                  <label htmlFor="country" className={labelClass}>
                    Country
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Globe className="h-4 w-4 text-gray-400 dark:text-text-dark-muted transition-colors" />
                    </div>
                    <select
                      id="country"
                      name="country"
                      value={formData.country}
                      onChange={handleChange}
                      className={selectClass}
                    >
                      <option value="">Select...</option>
                      {COUNTRIES.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                    <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                      <ChevronDown className="h-4 w-4 text-gray-400" />
                    </div>
                  </div>
                </div>

                {/* Experience Level */}
                <div>
                  <label htmlFor="experience_level" className={labelClass}>
                    Experience
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <svg className="h-4 w-4 text-gray-400 dark:text-text-dark-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                      </svg>
                    </div>
                    <select
                      id="experience_level"
                      name="experience_level"
                      value={formData.experience_level}
                      onChange={handleChange}
                      className={selectClass}
                    >
                      <option value="">Select...</option>
                      <option value="beginner">Beginner</option>
                      <option value="intermediate">Intermediate</option>
                      <option value="advanced">Advanced</option>
                    </select>
                    <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                      <ChevronDown className="h-4 w-4 text-gray-400" />
                    </div>
                  </div>
                </div>
              </div>

              {/* Referral Source */}
              <div>
                <label htmlFor="referral_source" className={labelClass}>
                  How did you hear about us?
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <svg className="h-5 w-5 text-gray-400 dark:text-text-dark-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <select
                    id="referral_source"
                    name="referral_source"
                    value={formData.referral_source}
                    onChange={handleChange}
                    className={selectClass}
                  >
                    <option value="">Select...</option>
                    <option value="google">Google Search</option>
                    <option value="youtube">YouTube</option>
                    <option value="social_media">Social Media</option>
                    <option value="friend">Friend / Colleague</option>
                    <option value="whatsapp">WhatsApp Group</option>
                    <option value="other">Other</option>
                  </select>
                  <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                    <ChevronDown className="h-4 w-4 text-gray-400" />
                  </div>
                </div>
              </div>

              {/* Password */}
              <div>
                <label htmlFor="password" className={labelClass}>
                  Password <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Lock className="h-5 w-5 text-gray-400 dark:text-text-dark-muted transition-colors" />
                  </div>
                  <input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    name="password"
                    placeholder="••••••••"
                    value={formData.password}
                    onChange={handleChange}
                    required
                    className="w-full pl-10 pr-12 py-2.5 bg-white dark:bg-dark-700 border border-gray-300 dark:border-border-dark rounded-lg text-gray-900 dark:text-text-dark-primary placeholder-gray-400 dark:placeholder-text-dark-muted focus:outline-none focus:ring-2 focus:ring-brand-blue focus:border-transparent transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 dark:text-text-dark-muted hover:text-gray-600 dark:hover:text-text-dark-secondary transition-colors"
                  >
                    {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                  </button>
                </div>
                {validationErrors.password ? (
                  <p className="text-red-600 dark:text-red-400 text-xs mt-1">{validationErrors.password}</p>
                ) : (
                  <p className="text-gray-500 dark:text-text-dark-muted text-xs mt-1">
                    At least 8 characters with uppercase, lowercase, and number
                  </p>
                )}
              </div>

              {/* Confirm Password */}
              <div>
                <label htmlFor="confirmPassword" className={labelClass}>
                  Confirm Password <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Lock className="h-5 w-5 text-gray-400 dark:text-text-dark-muted transition-colors" />
                  </div>
                  <input
                    id="confirmPassword"
                    type={showConfirmPassword ? 'text' : 'password'}
                    name="confirmPassword"
                    placeholder="••••••••"
                    value={formData.confirmPassword}
                    onChange={handleChange}
                    required
                    className="w-full pl-10 pr-12 py-2.5 bg-white dark:bg-dark-700 border border-gray-300 dark:border-border-dark rounded-lg text-gray-900 dark:text-text-dark-primary placeholder-gray-400 dark:placeholder-text-dark-muted focus:outline-none focus:ring-2 focus:ring-brand-blue focus:border-transparent transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 dark:text-text-dark-muted hover:text-gray-600 dark:hover:text-text-dark-secondary transition-colors"
                  >
                    {showConfirmPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                  </button>
                </div>
                {validationErrors.confirmPassword && (
                  <p className="text-red-600 dark:text-red-400 text-xs mt-1">{validationErrors.confirmPassword}</p>
                )}
              </div>

              {/* Terms & Conditions */}
              <div>
                <label className="flex items-start gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={agreedToTerms}
                    onChange={(e) => {
                      setAgreedToTerms(e.target.checked);
                      if (validationErrors.terms) {
                        setValidationErrors({ ...validationErrors, terms: '' });
                      }
                    }}
                    className="w-4 h-4 mt-0.5 rounded border-gray-300 dark:border-border-dark bg-white dark:bg-dark-700 text-brand-blue focus:ring-brand-blue focus:ring-offset-0 dark:focus:ring-offset-dark-800 transition-colors"
                  />
                  <span className="text-sm text-gray-600 dark:text-text-dark-secondary transition-colors">
                    I agree to the{' '}
                    <Link to="/terms" className="text-brand-blue hover:text-brand-blue-light font-medium transition-colors">Terms of Service</Link>{' '}
                    and{' '}
                    <Link to="/privacy" className="text-brand-blue hover:text-brand-blue-light font-medium transition-colors">Privacy Policy</Link>
                  </span>
                </label>
                {validationErrors.terms && (
                  <p className="text-red-600 dark:text-red-400 text-xs mt-1">{validationErrors.terms}</p>
                )}
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 px-4 bg-brand-blue hover:bg-brand-blue-600 text-white font-medium rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-brand-blue focus:ring-offset-2 dark:focus:ring-offset-dark-800 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Creating account...' : 'Create Free Account'}
              </button>
            </form>

            {/* Divider */}
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

            {/* Google Sign Up */}
            <button
              type="button"
              onClick={() => { window.location.href = `${import.meta.env.VITE_API_URL}/api/auth/google`; }}
              className="w-full py-3 px-4 bg-white dark:bg-dark-700 border border-gray-300 dark:border-border-dark hover:bg-gray-50 dark:hover:bg-dark-600 text-gray-700 dark:text-text-dark-primary font-medium rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-brand-blue focus:ring-offset-2 dark:focus:ring-offset-dark-800 flex items-center justify-center gap-3"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
              </svg>
              Sign up with Google
            </button>

            {/* Sign In Link */}
            <p className="text-center text-sm text-gray-600 dark:text-text-dark-secondary mt-6 transition-colors">
              Already have an account?{' '}
              <Link to="/login" className="text-brand-blue hover:text-brand-blue-light font-semibold transition-colors">
                Sign in here
              </Link>
            </p>
          </div>

          {/* Footer */}
          <p className="text-center text-sm text-gray-500 dark:text-text-dark-muted mt-8 transition-colors">
            © 2025 TekyPro. All rights reserved.
          </p>
        </div>
      </div>
    </div>
  );
}
