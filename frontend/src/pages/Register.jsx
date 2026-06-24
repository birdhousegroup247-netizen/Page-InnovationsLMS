import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { Mail, Lock, User, Eye, EyeOff, Sun, Moon, Phone, Globe, ChevronDown, BarChart3, Sparkles, CheckCircle2, ArrowRight, ArrowLeft } from 'lucide-react';
import logo from '../assets/logo.png';
import {
  inputClass as fInput,
  inputClassWithRightAction as fInputAction,
  selectClass as fSelect,
  labelClass as fLabel,
  primaryButtonClass,
  secondaryButtonClass,
  formCardClass,
} from '../utils/authForm';
import TurnstileWidget from '../components/auth/TurnstileWidget';
import CloudinaryUpload from '../components/common/CloudinaryUpload';

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
    profile_picture: '',
    date_of_birth: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [validationErrors, setValidationErrors] = useState({});
  const [successMessage, setSuccessMessage] = useState('');
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [showOptional, setShowOptional] = useState(false);
  const [turnstileToken, setTurnstileToken] = useState('');

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
        turnstile_token: turnstileToken || undefined,
        phone: formData.phone || undefined,
        country: formData.country || undefined,
        experience_level: formData.experience_level || undefined,
        referral_source: formData.referral_source || undefined,
        profile_picture: formData.profile_picture || undefined,
        date_of_birth: formData.date_of_birth || undefined,
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

  // Use shared form tokens — single source of truth across all auth flows.
  const inputClass = fInput;
  const selectClass = fSelect;
  const labelClass = fLabel;

  // Live password-strength score 0-4 (length, lowercase, uppercase, digit, symbol).
  const pwd = formData.password;
  const pwdScore = (() => {
    if (!pwd) return 0;
    let s = 0;
    if (pwd.length >= 8) s++;
    if (/[a-z]/.test(pwd) && /[A-Z]/.test(pwd)) s++;
    if (/\d/.test(pwd)) s++;
    if (/[^A-Za-z0-9]/.test(pwd)) s++;
    return s;
  })();
  const pwdLabel = ['', 'Weak', 'Fair', 'Good', 'Strong'][pwdScore] || '';
  const pwdColor = ['bg-gray-200 dark:bg-dark-600', 'bg-red-400', 'bg-yellow-400', 'bg-blue-400', 'bg-green-500'][pwdScore];

  return (
    <div className="min-h-screen flex bg-gray-50 dark:bg-dark-900 transition-colors">
      {/* Back to role selection — sits in the right column on desktop so it
          doesn't overlap the editorial logo on the left panel. */}
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

      {/* Left editorial panel — always branded (matches the Login page
          treatment: real photo + brand gradient overlay). White text on
          coloured background gives a clear half-and-half split in both
          light and dark themes. */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden sticky top-0 h-screen">
        <img
          src="https://images.unsplash.com/photo-1522202176988-66273c2fd55f?q=80&w=2071&auto=format&fit=crop"
          alt=""
          className="absolute inset-0 w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-br from-brand-blue/90 via-brand-purple/85 to-brand-blue/90" />
        {/* Subtle accent glows over the gradient */}
        <div className="absolute -top-32 -left-32 w-[28rem] h-[28rem] rounded-full bg-cyan-400/20 blur-[120px]" />
        <div className="absolute bottom-0 right-0 w-[24rem] h-[24rem] rounded-full bg-fuchsia-400/15 blur-[120px]" />

        <div className="relative z-10 flex flex-col justify-between p-12 w-full text-white">
          <div className="flex items-center gap-3">
            <img src={logo} alt="TekyPro" className="h-9 w-auto filter brightness-0 invert" />
            <span className="text-xs uppercase tracking-[0.18em] text-white/50 font-semibold">
              · Learn. Build. Ship.
            </span>
          </div>

          <div className="max-w-md">
            <span className="inline-block text-xs uppercase tracking-[0.18em] text-cyan-200 font-semibold mb-4">
              For ambitious learners
            </span>
            <h1 className="text-4xl xl:text-5xl font-bold leading-[1.05] tracking-tight mb-5 text-white">
              Real skills.<br />
              Real instructors.<br />
              <span className="text-cyan-300">Real careers.</span>
            </h1>
            <p className="text-base text-white/80 leading-relaxed mb-10 max-w-sm">
              Sign up free, preview every course, and pay only when you're ready to enroll.
            </p>

            <div className="relative rounded-2xl border border-white/15 bg-white/[0.08] backdrop-blur-md p-5">
              <div className="absolute -top-2.5 left-5 text-cyan-300 text-3xl leading-none font-serif">"</div>
              <p className="text-sm text-white/90 leading-relaxed pt-1">
                I went from junior to senior DBA in 8 months. The hands-on labs and live sessions made the difference.
              </p>
              <div className="mt-4 flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-gradient-to-br from-cyan-400 to-brand-blue flex items-center justify-center font-bold text-sm text-white ring-2 ring-white/20">
                  AO
                </div>
                <div>
                  <p className="text-sm font-semibold text-white">Adeola O.</p>
                  <p className="text-xs text-white/60">Senior DBA · Lagos</p>
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-6 pt-6 border-t border-white/15">
            {[
              { value: '10k+', label: 'Learners' },
              { value: '200+', label: 'Courses' },
              { value: '4.9★', label: 'Rating' },
            ].map((s) => (
              <div key={s.label}>
                <p className="text-2xl font-bold text-white tracking-tight">{s.value}</p>
                <p className="text-[11px] uppercase tracking-wider text-white/60 font-semibold mt-0.5">{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right side — form. lg:items-center vertically centers on tall
          desktop viewports so the card doesn't jam against the top edge.
          max-w-xl matches Login + InstructorApply for visual consistency. */}
      <div className="w-full lg:w-1/2 flex items-start lg:items-center justify-center px-4 sm:px-8 pt-20 pb-10 lg:py-12 overflow-y-auto">
        <div className="w-full max-w-xl">
          {/* Mobile-only logo */}
          <div className="lg:hidden text-center mb-5 animate-fade-in">
            <img src={logo} alt="TekyPro" className="h-9 w-auto mx-auto" />
          </div>

          <div className={formCardClass}>
            {/* Header */}
            <div className="mb-6">
              <h1 className="text-[1.5rem] sm:text-3xl font-bold text-gray-900 dark:text-white tracking-tight leading-tight">
                Create your account
              </h1>
              <p className="text-gray-500 dark:text-gray-400 text-sm mt-1.5">
                Just the essentials — extras are optional.
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
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Profile Picture (Optional) — compact avatar tile.
                  Keeps the signup funnel light: students who want to
                  personalize from day one can; everyone else can skip
                  and add one later from Profile Settings. */}
              <div>
                <label className={labelClass}>
                  Profile Picture <span className="text-gray-400 dark:text-text-dark-muted text-xs font-normal">(optional)</span>
                </label>
                <div className="flex items-center gap-4">
                  <div className="relative shrink-0">
                    {formData.profile_picture ? (
                      <img
                        src={formData.profile_picture}
                        alt="Avatar preview"
                        className="w-16 h-16 rounded-full object-cover border border-gray-200 dark:border-border-dark"
                      />
                    ) : (
                      <div className="w-16 h-16 rounded-full bg-gradient-to-br from-brand-blue to-brand-purple flex items-center justify-center">
                        <span className="text-white font-semibold text-xl">
                          {formData.full_name?.charAt(0)?.toUpperCase() || '?'}
                        </span>
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    {formData.profile_picture ? (
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setFormData({ ...formData, profile_picture: '' })}
                          className="px-3 py-1.5 text-xs font-medium text-gray-700 dark:text-text-dark-secondary bg-white dark:bg-dark-700 border border-gray-300 dark:border-border-dark rounded-lg hover:bg-gray-50 dark:hover:bg-dark-600 transition-colors"
                        >
                          Remove
                        </button>
                        <p className="text-xs text-gray-500 dark:text-text-dark-muted">
                          Looks good — finish the rest of the form.
                        </p>
                      </div>
                    ) : (
                      <CloudinaryUpload
                        onUploadSuccess={(url) => {
                          if (url) setFormData((prev) => ({ ...prev, profile_picture: url }));
                        }}
                        onUploadError={(err) => setError(err || 'Upload failed')}
                        acceptedTypes="image"
                        maxSizeMB={3}
                        currentFile={null}
                        uploadEndpoint="/api/upload/signup-avatar"
                        folder="tekyprolms/signup-avatars"
                      />
                    )}
                  </div>
                </div>
              </div>

              {/* Full Name */}
              <div>
                <label htmlFor="full_name" className={labelClass}>
                  Full Name <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                    <User className="h-4 w-4 text-gray-400 dark:text-text-dark-muted transition-colors" />
                  </div>
                  <input
                    id="full_name"
                    type="text"
                    name="full_name"
                    placeholder="John Doe"
                    value={formData.full_name}
                    onChange={handleChange}
                    required
                    autoComplete="name"
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
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                    <Mail className="h-4 w-4 text-gray-400 dark:text-text-dark-muted transition-colors" />
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
                    className={inputClass}
                  />
                </div>
                {validationErrors.email && (
                  <p className="text-red-600 dark:text-red-400 text-xs mt-1">{validationErrors.email}</p>
                )}
              </div>

              {/* Password */}
              <div>
                <label htmlFor="password" className={labelClass}>
                  Password <span className="text-red-500 normal-case">*</span>
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                    <Lock className="h-4 w-4 text-gray-400 dark:text-text-dark-muted transition-colors" />
                  </div>
                  <input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    name="password"
                    placeholder="Enter a strong password"
                    value={formData.password}
                    onChange={handleChange}
                    required
                    autoComplete="new-password"
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
                {/* Strength meter */}
                {pwd && (
                  <div className="mt-2 flex items-center gap-2">
                    <div className="flex-1 grid grid-cols-4 gap-1">
                      {[1, 2, 3, 4].map((i) => (
                        <div
                          key={i}
                          className={`h-1 rounded-full transition-colors ${i <= pwdScore ? pwdColor : 'bg-gray-200 dark:bg-dark-600'}`}
                        />
                      ))}
                    </div>
                    <span className={`text-[11px] font-semibold w-12 text-right ${
                      pwdScore <= 1 ? 'text-red-500'
                      : pwdScore === 2 ? 'text-yellow-500'
                      : pwdScore === 3 ? 'text-blue-500'
                      : 'text-green-500'
                    }`}>{pwdLabel}</span>
                  </div>
                )}
                {validationErrors.password ? (
                  <p className="text-red-600 dark:text-red-400 text-xs mt-1.5">{validationErrors.password}</p>
                ) : (
                  <p className="text-gray-500 dark:text-text-dark-muted text-[11px] mt-1.5">
                    Minimum 8 characters — include uppercase, lowercase, and a number.
                  </p>
                )}
              </div>

              {/* Confirm Password */}
              <div>
                <label htmlFor="confirmPassword" className={labelClass}>
                  Confirm password <span className="text-red-500 normal-case">*</span>
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                    <Lock className="h-4 w-4 text-gray-400 dark:text-text-dark-muted transition-colors" />
                  </div>
                  <input
                    id="confirmPassword"
                    type={showConfirmPassword ? 'text' : 'password'}
                    name="confirmPassword"
                    placeholder="Re-enter your password"
                    value={formData.confirmPassword}
                    onChange={handleChange}
                    required
                    autoComplete="new-password"
                    className={fInputAction}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors"
                  >
                    {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                  {formData.confirmPassword && formData.password === formData.confirmPassword && (
                    <CheckCircle2 className="absolute inset-y-0 right-10 my-auto h-4 w-4 text-green-500" />
                  )}
                </div>
                {validationErrors.confirmPassword && (
                  <p className="text-red-600 dark:text-red-400 text-xs mt-1.5">{validationErrors.confirmPassword}</p>
                )}
              </div>

              {/* Optional details — collapsed by default so the required path
                  feels short. Tap to reveal phone/country/experience/referral. */}
              <div className="pt-1">
                <button
                  type="button"
                  onClick={() => setShowOptional((v) => !v)}
                  className="w-full flex items-center justify-between text-left py-2 group"
                >
                  <span className="text-xs font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-brand-blue" />
                    Tell us about you
                    <span className="text-gray-400 dark:text-gray-500 font-normal normal-case">(optional)</span>
                  </span>
                  <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${showOptional ? 'rotate-180' : ''}`} />
                </button>

                {showOptional && (
                  <div className="space-y-4 pt-3 animate-fade-in">
                    {/* Date of birth — drives the birthday celebration
                        modal + the system birthday wish notification. */}
                    <div>
                      <label htmlFor="date_of_birth" className={labelClass}>
                        Date of Birth <span className="text-gray-400 text-xs font-normal">(so we can celebrate with you)</span>
                      </label>
                      <input
                        id="date_of_birth"
                        type="date"
                        name="date_of_birth"
                        value={formData.date_of_birth}
                        onChange={handleChange}
                        className={inputClass}
                      />
                    </div>

                    {/* Phone */}
                    <div>
                      <label htmlFor="phone" className={labelClass}>Phone Number</label>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                          <Phone className="h-4 w-4 text-gray-400 dark:text-text-dark-muted" />
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

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label htmlFor="country" className={labelClass}>Country</label>
                        <div className="relative">
                          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                            <Globe className="h-4 w-4 text-gray-400 dark:text-text-dark-muted" />
                          </div>
                          <select id="country" name="country" value={formData.country} onChange={handleChange} className={selectClass}>
                            <option value="">Select...</option>
                            {COUNTRIES.map((c) => <option key={c} value={c}>{c}</option>)}
                          </select>
                          <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                            <ChevronDown className="h-4 w-4 text-gray-400" />
                          </div>
                        </div>
                      </div>
                      <div>
                        <label htmlFor="experience_level" className={labelClass}>Experience</label>
                        <div className="relative">
                          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                            <BarChart3 className="h-4 w-4 text-gray-400 dark:text-text-dark-muted" />
                          </div>
                          <select id="experience_level" name="experience_level" value={formData.experience_level} onChange={handleChange} className={selectClass}>
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

                    <div>
                      <label htmlFor="referral_source" className={labelClass}>How did you hear about us?</label>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                          <Sparkles className="h-4 w-4 text-gray-400 dark:text-text-dark-muted" />
                        </div>
                        <select id="referral_source" name="referral_source" value={formData.referral_source} onChange={handleChange} className={selectClass}>
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
                  </div>
                )}
              </div>

              {/* Bot check — renders only if VITE_TURNSTILE_SITE_KEY is set */}
              <TurnstileWidget onToken={setTurnstileToken} theme={theme === 'dark' ? 'dark' : 'light'} />

              {/* Terms & Conditions */}
              <div className="pt-2">
                <label className="flex items-start gap-2.5 cursor-pointer group">
                  <input
                    type="checkbox"
                    checked={agreedToTerms}
                    onChange={(e) => {
                      setAgreedToTerms(e.target.checked);
                      if (validationErrors.terms) {
                        setValidationErrors({ ...validationErrors, terms: '' });
                      }
                    }}
                    className="w-4 h-4 mt-0.5 rounded border-gray-300 dark:border-border-dark bg-white dark:bg-dark-700 text-brand-blue focus:ring-brand-blue focus:ring-offset-0 dark:focus:ring-offset-dark-800 transition-colors cursor-pointer"
                  />
                  <span className="text-xs text-gray-600 dark:text-gray-400 leading-relaxed">
                    I agree to TekyPro's{' '}
                    <Link to="/terms" className="text-brand-blue hover:underline font-medium">Terms of Service</Link>{' '}
                    and{' '}
                    <Link to="/privacy" className="text-brand-blue hover:underline font-medium">Privacy Policy</Link>.
                  </span>
                </label>
                {validationErrors.terms && (
                  <p className="text-red-600 dark:text-red-400 text-xs mt-1.5">{validationErrors.terms}</p>
                )}
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
                    Creating account…
                  </>
                ) : (
                  <>
                    Create free account
                    <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                  </>
                )}
              </button>
            </form>

            {/* Divider */}
            <div className="relative my-5">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-200 dark:border-border-dark transition-colors" />
              </div>
              <div className="relative flex justify-center text-xs">
                <span className="px-3 bg-white dark:bg-dark-800 text-gray-400 dark:text-gray-500 uppercase tracking-wider font-semibold">
                  or
                </span>
              </div>
            </div>

            {/* Google Sign Up */}
            <button
              type="button"
              onClick={() => { window.location.href = `${import.meta.env.VITE_API_URL}/api/auth/google`; }}
              className={secondaryButtonClass}
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
            <p className="text-center text-sm text-gray-500 dark:text-gray-400 mt-5">
              Already have an account?{' '}
              <Link to="/login" className="text-brand-blue dark:text-cyan-400 hover:underline font-semibold">
                Sign in
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
