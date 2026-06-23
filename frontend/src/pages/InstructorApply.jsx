import { useState, useRef, useMemo } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';
import { authAPI } from '../lib/api';
import {
  Sun, Moon, ArrowLeft, ArrowRight, Upload, FileText, X, CheckCircle2,
  AlertCircle, GraduationCap, Briefcase, FilePlus2, ClipboardCheck,
} from 'lucide-react';
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

const STEPS_ANON = [
  { key: 'account', label: 'Account', icon: GraduationCap },
  { key: 'expertise', label: 'Expertise', icon: Briefcase },
  { key: 'documents', label: 'Documents', icon: FilePlus2 },
  { key: 'review', label: 'Review', icon: ClipboardCheck },
];

// For logged-in users we drop the Account step since they already have one.
const STEPS_LOGGED_IN = [
  { key: 'expertise', label: 'Expertise', icon: Briefcase },
  { key: 'documents', label: 'Documents', icon: FilePlus2 },
  { key: 'review', label: 'Review', icon: ClipboardCheck },
];

// Direct unsigned Cloudinary upload — works without auth (the applicant isn't
// logged in yet during the wizard). Falls back to "raw" resource type for PDFs.
async function uploadToCloudinary(file) {
  const cloudName = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;
  const uploadPreset = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET;
  if (!cloudName || !uploadPreset) {
    throw new Error('Upload is not configured. Please contact support.');
  }
  const form = new FormData();
  form.append('file', file);
  form.append('upload_preset', uploadPreset);
  const isImage = file.type.startsWith('image/');
  const resourceType = isImage ? 'image' : 'auto';
  const url = `https://api.cloudinary.com/v1_1/${cloudName}/${resourceType}/upload`;
  const res = await fetch(url, { method: 'POST', body: form });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error?.message || `Upload failed (${res.status})`);
  }
  const data = await res.json();
  return data.secure_url;
}

export default function InstructorApply() {
  const navigate = useNavigate();
  const { theme, toggleTheme } = useTheme();
  const { isAuthenticated, user } = useAuth();

  const STEPS = useMemo(() => (isAuthenticated ? STEPS_LOGGED_IN : STEPS_ANON), [isAuthenticated]);

  const [step, setStep] = useState(0);
  const [formData, setFormData] = useState({
    full_name: user?.full_name || '',
    email: user?.email || '',
    password: '', confirmPassword: '',
    phone: user?.phone || '', country: '',
    bio: '', qualifications: '', teaching_experience: '',
    subject_expertise: '', portfolio_url: '',
    cv_url: '', credential_urls: [],
    agreed: false,
  });
  const [uploadingCv, setUploadingCv] = useState(false);
  const [uploadingCred, setUploadingCred] = useState(false);
  const [error, setError] = useState('');
  const [stepError, setStepError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const cvInputRef = useRef(null);
  const credInputRef = useRef(null);

  const update = (key, value) => {
    setFormData((prev) => ({ ...prev, [key]: value }));
    setStepError('');
  };

  const validateStep = () => {
    // Resolve which step the user is on by key, so the logic is the same
    // whether the Account step exists or not.
    const key = STEPS[step]?.key;
    if (key === 'account') {
      if (!formData.full_name || formData.full_name.length < 2) return 'Please enter your full name.';
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) return 'Please enter a valid email.';
      if (formData.password.length < 8) return 'Password must be at least 8 characters.';
      if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(formData.password)) return 'Password must contain uppercase, lowercase, and a number.';
      if (formData.password !== formData.confirmPassword) return 'Passwords do not match.';
    }
    if (key === 'expertise') {
      if (formData.bio.length < 20) return 'Bio must be at least 20 characters.';
      if (formData.qualifications.length < 10) return 'Please describe your qualifications (at least 10 characters).';
      if (formData.teaching_experience.length < 10) return 'Please describe your teaching experience.';
      if (formData.subject_expertise.length < 5) return 'Please list your subject expertise.';
      if (formData.portfolio_url && !/^https?:\/\//.test(formData.portfolio_url)) return 'Portfolio URL must start with http:// or https://';
    }
    if (key === 'documents') {
      if (!formData.cv_url) return 'Please upload your CV / resume.';
    }
    if (key === 'review') {
      if (!formData.agreed) return 'Please agree to the Terms of Service and Privacy Policy.';
    }
    return null;
  };

  const next = () => {
    const err = validateStep();
    if (err) { setStepError(err); return; }
    setStepError('');
    setStep((s) => Math.min(s + 1, STEPS.length - 1));
  };
  const back = () => setStep((s) => Math.max(s - 1, 0));

  const handleCvFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) { setStepError('CV must be under 10 MB.'); return; }
    setUploadingCv(true); setStepError('');
    try {
      const url = await uploadToCloudinary(file);
      update('cv_url', url);
    } catch (err) {
      setStepError(err.message || 'CV upload failed.');
    } finally {
      setUploadingCv(false);
    }
  };

  const handleCredFiles = async (e) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    if (formData.credential_urls.length + files.length > 10) {
      setStepError('Up to 10 credential documents.');
      return;
    }
    setUploadingCred(true); setStepError('');
    try {
      const urls = [];
      for (const file of files) {
        if (file.size > 10 * 1024 * 1024) throw new Error(`${file.name} is larger than 10 MB.`);
        const url = await uploadToCloudinary(file);
        urls.push(url);
      }
      update('credential_urls', [...formData.credential_urls, ...urls]);
    } catch (err) {
      setStepError(err.message || 'Credential upload failed.');
    } finally {
      setUploadingCred(false);
      if (credInputRef.current) credInputRef.current.value = '';
    }
  };

  const removeCredential = (idx) => {
    update('credential_urls', formData.credential_urls.filter((_, i) => i !== idx));
  };

  const handleSubmit = async () => {
    const err = validateStep();
    if (err) { setStepError(err); return; }
    setSubmitting(true); setError('');
    try {
      if (isAuthenticated) {
        // Logged-in path: we already have an account, post the application only.
        await authAPI.applyToTeach({
          bio: formData.bio,
          qualifications: formData.qualifications,
          teaching_experience: formData.teaching_experience,
          subject_expertise: formData.subject_expertise,
          portfolio_url: formData.portfolio_url || undefined,
          cv_url: formData.cv_url,
          credential_urls: formData.credential_urls,
        });
        setSubmitted(true);
        return;
      }
      await authAPI.instructorApply({
        full_name: formData.full_name,
        email: formData.email,
        password: formData.password,
        phone: formData.phone || undefined,
        country: formData.country || undefined,
        bio: formData.bio,
        qualifications: formData.qualifications,
        teaching_experience: formData.teaching_experience,
        subject_expertise: formData.subject_expertise,
        portfolio_url: formData.portfolio_url || undefined,
        cv_url: formData.cv_url,
        credential_urls: formData.credential_urls,
      });
      setSubmitted(true);
    } catch (err) {
      const msg = err.response?.data?.message
        || err.response?.data?.errors?.[0]?.message
        || 'Submission failed. Please review your details and try again.';
      setError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const inputClass = 'w-full px-4 py-2.5 bg-white dark:bg-dark-700 border border-gray-300 dark:border-border-dark rounded-lg text-gray-900 dark:text-text-dark-primary placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-blue';
  const labelClass = 'block text-sm font-medium text-gray-700 dark:text-text-dark-primary mb-2';
  const textareaClass = inputClass + ' min-h-[110px] resize-y';

  if (submitted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-dark-900 p-4">
        <div className="w-full max-w-lg bg-white dark:bg-dark-800 rounded-2xl shadow-lg p-8 text-center">
          <img src={logo} alt="TekyPro" className="h-12 mx-auto mb-6" />
          <div className="w-16 h-16 mx-auto rounded-full bg-green-100 dark:bg-green-500/10 flex items-center justify-center mb-4">
            <CheckCircle2 className="w-8 h-8 text-green-600 dark:text-green-400" />
          </div>
          <h1 className="text-2xl font-semibold text-gray-900 dark:text-text-dark-primary mb-2">
            Application Submitted
          </h1>
          {isAuthenticated ? (
            <>
              <p className="text-gray-600 dark:text-text-dark-secondary mb-6">
                Thanks for applying to teach on TekyPro. Our team reviews instructor
                applications within 2–3 business days. You'll get an email once a
                decision is made, and you can keep using TekyPro as a student in
                the meantime.
              </p>
              <div className="flex gap-3">
                <Link
                  to="/dashboard"
                  className="flex-1 py-3 px-4 bg-brand-blue hover:bg-brand-blue-600 text-white font-medium rounded-lg text-center"
                >
                  Back to Dashboard
                </Link>
              </div>
            </>
          ) : (
            <>
              <p className="text-gray-600 dark:text-text-dark-secondary mb-6">
                Thanks for applying to teach on TekyPro. Two things to do now:
              </p>
              <div className="text-left bg-blue-50 dark:bg-blue-500/10 border border-blue-200 dark:border-blue-500/30 rounded-lg p-4 mb-6">
                <p className="text-sm text-blue-900 dark:text-blue-300 mb-2"><strong>1. Verify your email</strong></p>
                <p className="text-sm text-blue-900 dark:text-blue-300 mb-3">We sent a verification link and 6-digit code to <strong>{formData.email}</strong>. You'll need to verify before you can sign in.</p>
                <p className="text-sm text-blue-900 dark:text-blue-300 mb-2"><strong>2. Wait for admin review</strong></p>
                <p className="text-sm text-blue-900 dark:text-blue-300">Our team reviews instructor applications within 2–3 business days. You'll get an email once a decision is made.</p>
              </div>
              <div className="flex gap-3">
                <Link
                  to={`/verify-email?email=${encodeURIComponent(formData.email)}`}
                  className="flex-1 py-3 px-4 bg-brand-blue hover:bg-brand-blue-600 text-white font-medium rounded-lg text-center"
                >
                  Verify Email
                </Link>
                <Link
                  to="/login"
                  className="flex-1 py-3 px-4 bg-gray-100 dark:bg-dark-700 hover:bg-gray-200 dark:hover:bg-dark-600 text-gray-900 dark:text-text-dark-primary font-medium rounded-lg text-center"
                >
                  Back to Sign In
                </Link>
              </div>
            </>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex bg-gray-50 dark:bg-dark-900 transition-colors">
      {/* Back to role selection — purple accent on hover to match this flow */}
      <Link
        to="/"
        className="group fixed top-4 left-4 inline-flex items-center gap-2 pl-2.5 pr-3.5 py-2 rounded-full bg-white dark:bg-dark-800 border border-gray-200 dark:border-gray-700 shadow-md hover:shadow-lg hover:border-brand-purple/40 transition-all z-50"
        aria-label="Back to role selection"
      >
        <span className="w-7 h-7 rounded-full bg-gray-100 dark:bg-dark-700 group-hover:bg-brand-purple group-hover:text-white flex items-center justify-center transition-colors">
          <ArrowLeft className="w-3.5 h-3.5" />
        </span>
        <span className="hidden sm:inline text-sm font-medium text-gray-700 dark:text-gray-200 group-hover:text-gray-900 dark:group-hover:text-white">
          Choose role
        </span>
      </Link>

      <button
        onClick={toggleTheme}
        className="fixed top-4 right-4 p-3 rounded-lg bg-white dark:bg-dark-800 shadow-md z-50"
        aria-label="Toggle theme"
      >
        {theme === 'dark' ? <Sun className="w-5 h-5 text-yellow-500" /> : <Moon className="w-5 h-5 text-gray-700" />}
      </button>

      {/* Left editorial panel — instructor-flavored, brand-purple/fuchsia accent. */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden sticky top-0 h-screen bg-[#0B1220]">
        <div className="absolute -top-32 -left-32 w-[28rem] h-[28rem] rounded-full bg-brand-purple/20 blur-[120px]" />
        <div className="absolute bottom-0 right-0 w-[24rem] h-[24rem] rounded-full bg-fuchsia-500/10 blur-[120px]" />
        <div
          className="absolute inset-0 opacity-[0.04]"
          style={{
            backgroundImage:
              'linear-gradient(rgba(255,255,255,0.6) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.6) 1px, transparent 1px)',
            backgroundSize: '40px 40px',
          }}
        />

        <div className="relative z-10 flex flex-col justify-between p-12 w-full text-white">
          <div className="flex items-center gap-3">
            <img src={logo} alt="TekyPro" className="h-9 w-auto filter brightness-0 invert" />
            <span className="text-xs uppercase tracking-[0.18em] text-white/40 font-semibold">
              · Teach. Earn. Inspire.
            </span>
          </div>

          <div className="max-w-md">
            <span className="inline-block text-xs uppercase tracking-[0.18em] text-fuchsia-300/80 font-semibold mb-4">
              For expert practitioners
            </span>
            <h1 className="text-4xl xl:text-5xl font-bold leading-[1.05] tracking-tight mb-5">
              Share what<br />
              you know.<br />
              <span className="text-fuchsia-400">Earn doing it.</span>
            </h1>
            <p className="text-base text-white/60 leading-relaxed mb-10 max-w-sm">
              Turn your expertise into a real income stream. Reach global learners with our pro instructor tools.
            </p>

            <div className="relative rounded-2xl border border-white/10 bg-white/[0.03] backdrop-blur-sm p-5">
              <div className="absolute -top-2.5 left-5 text-fuchsia-400 text-3xl leading-none font-serif">"</div>
              <p className="text-sm text-white/80 leading-relaxed pt-1">
                I made $14k in my first six months teaching Oracle on TekyPro. The drip tools and live sessions make it easy to scale.
              </p>
              <div className="mt-4 flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-gradient-to-br from-fuchsia-500 to-brand-purple flex items-center justify-center font-bold text-sm">
                  CN
                </div>
                <div>
                  <p className="text-sm font-semibold text-white">Chinedu N.</p>
                  <p className="text-xs text-white/50">Oracle Specialist · Abuja</p>
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-6 pt-6 border-t border-white/[0.08]">
            {[
              { value: '70%', label: 'Revenue Share' },
              { value: '1k+', label: 'Instructors' },
              { value: '$2k+', label: 'Avg/Month' },
            ].map((s) => (
              <div key={s.label}>
                <p className="text-2xl font-bold text-white tracking-tight">{s.value}</p>
                <p className="text-[11px] uppercase tracking-wider text-white/40 font-semibold mt-0.5">{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right side — wizard */}
      <div className="w-full lg:w-1/2 flex items-start justify-center px-4 sm:px-8 pt-6 pb-10 lg:py-12 overflow-y-auto">
        <div className="w-full max-w-xl">
          {/* Mobile-only logo + title */}
          <div className="lg:hidden text-center mb-5">
            <img src={logo} alt="TekyPro" className="h-9 mx-auto mb-3" />
          </div>

          <div className="mb-6 text-center lg:text-left">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-brand-purple/10 text-brand-purple dark:text-purple-300 text-[11px] font-semibold mb-3">
              Instructor application
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-text-dark-primary tracking-tight">
              Apply to teach on TekyPro
            </h1>
            <p className="text-sm text-gray-600 dark:text-text-dark-secondary mt-1.5">
              Tell us about yourself — we review every application personally.
            </p>
          </div>

        {/* Stepper */}
        <div className="flex items-center justify-between mb-6 px-1">
          {STEPS.map((s, i) => {
            const Icon = s.icon;
            const active = i === step;
            const done = i < step;
            return (
              <div key={s.key} className="flex-1 flex items-center">
                <div className={`flex flex-col items-center text-center flex-1 ${i === 0 ? '' : ''}`}>
                  <div className={`w-9 h-9 rounded-full flex items-center justify-center transition-colors ${
                    done ? 'bg-green-500 text-white'
                    : active ? 'bg-brand-purple text-white shadow-lg shadow-brand-purple/30'
                    : 'bg-gray-200 dark:bg-dark-700 text-gray-500 dark:text-text-dark-muted'
                  }`}>
                    {done ? <CheckCircle2 className="w-5 h-5" /> : <Icon className="w-5 h-5" />}
                  </div>
                  <span className={`mt-1 text-xs ${active ? 'font-semibold text-brand-purple dark:text-purple-300' : 'text-gray-500 dark:text-text-dark-muted'}`}>
                    {s.label}
                  </span>
                </div>
                {i < STEPS.length - 1 && (
                  <div className={`flex-shrink-0 w-8 sm:w-12 h-0.5 mt-[-18px] ${done ? 'bg-green-500' : 'bg-gray-200 dark:bg-dark-700'}`} />
                )}
              </div>
            );
          })}
        </div>

        <div className="bg-white dark:bg-dark-800 rounded-2xl shadow-xl shadow-gray-200/40 dark:shadow-black/30 border border-gray-100 dark:border-gray-800 p-5 sm:p-7">
          {error && (
            <div className="mb-4 p-3 bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/30 rounded-lg flex items-start gap-2">
              <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
              <p className="text-red-800 dark:text-red-400 text-sm">{error}</p>
            </div>
          )}
          {stepError && (
            <div className="mb-4 p-3 bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/30 rounded-lg flex items-start gap-2">
              <AlertCircle className="w-5 h-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
              <p className="text-amber-800 dark:text-amber-400 text-sm">{stepError}</p>
            </div>
          )}

          {/* Step — Account */}
          {STEPS[step]?.key === 'account' && (
            <div className="space-y-5">
              <div>
                <label className={labelClass}>Full name <span className="text-red-500">*</span></label>
                <input type="text" value={formData.full_name} onChange={(e) => update('full_name', e.target.value)} className={inputClass} placeholder="Jane Doe" />
              </div>
              <div>
                <label className={labelClass}>Email <span className="text-red-500">*</span></label>
                <input type="email" value={formData.email} onChange={(e) => update('email', e.target.value)} className={inputClass} placeholder="jane@example.com" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelClass}>Phone</label>
                  <input type="tel" value={formData.phone} onChange={(e) => update('phone', e.target.value)} className={inputClass} placeholder="+1 555 000 0000" />
                </div>
                <div>
                  <label className={labelClass}>Country</label>
                  <select value={formData.country} onChange={(e) => update('country', e.target.value)} className={inputClass}>
                    <option value="">Select...</option>
                    {COUNTRIES.map((c) => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className={labelClass}>Password <span className="text-red-500">*</span></label>
                <input type="password" value={formData.password} onChange={(e) => update('password', e.target.value)} className={inputClass} placeholder="At least 8 characters" />
                <p className="text-xs text-gray-500 mt-1">Must include uppercase, lowercase, and a number.</p>
              </div>
              <div>
                <label className={labelClass}>Confirm password <span className="text-red-500">*</span></label>
                <input type="password" value={formData.confirmPassword} onChange={(e) => update('confirmPassword', e.target.value)} className={inputClass} />
              </div>
            </div>
          )}

          {/* Step 1 — Expertise */}
          {STEPS[step]?.key === 'expertise' && (
            <div className="space-y-5">
              <div>
                <label className={labelClass}>About you <span className="text-red-500">*</span></label>
                <textarea value={formData.bio} onChange={(e) => update('bio', e.target.value)} className={textareaClass}
                  placeholder="Briefly introduce yourself and why you want to teach on TekyPro." />
                <p className="text-xs text-gray-500 mt-1">{formData.bio.length}/5000 characters (min 20)</p>
              </div>
              <div>
                <label className={labelClass}>Qualifications <span className="text-red-500">*</span></label>
                <textarea value={formData.qualifications} onChange={(e) => update('qualifications', e.target.value)} className={textareaClass}
                  placeholder="Degrees, certifications, professional credentials." />
              </div>
              <div>
                <label className={labelClass}>Teaching experience <span className="text-red-500">*</span></label>
                <textarea value={formData.teaching_experience} onChange={(e) => update('teaching_experience', e.target.value)} className={textareaClass}
                  placeholder="Where have you taught before? Courses, workshops, mentoring, content creation, etc." />
              </div>
              <div>
                <label className={labelClass}>Subjects you want to teach <span className="text-red-500">*</span></label>
                <textarea value={formData.subject_expertise} onChange={(e) => update('subject_expertise', e.target.value)} className={inputClass + ' min-h-[80px] resize-y'}
                  placeholder="E.g. PostgreSQL administration, Oracle performance tuning, MongoDB sharding..." />
              </div>
              <div>
                <label className={labelClass}>Portfolio URL <span className="text-gray-400 text-xs">(optional)</span></label>
                <input type="url" value={formData.portfolio_url} onChange={(e) => update('portfolio_url', e.target.value)} className={inputClass}
                  placeholder="https://yourwebsite.com" />
              </div>
            </div>
          )}

          {/* Step 2 — Documents */}
          {STEPS[step]?.key === 'documents' && (
            <div className="space-y-6">
              <div>
                <label className={labelClass}>CV / Resume <span className="text-red-500">*</span></label>
                <p className="text-xs text-gray-500 mb-3">PDF, DOC, or DOCX up to 10 MB. Required.</p>
                {formData.cv_url ? (
                  <div className="flex items-center justify-between p-4 bg-green-50 dark:bg-green-500/10 border border-green-200 dark:border-green-500/30 rounded-lg">
                    <div className="flex items-center gap-3 min-w-0">
                      <FileText className="w-5 h-5 text-green-600 flex-shrink-0" />
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-gray-900 dark:text-text-dark-primary">CV uploaded</p>
                        <a href={formData.cv_url} target="_blank" rel="noopener noreferrer" className="text-xs text-brand-blue truncate block">{formData.cv_url}</a>
                      </div>
                    </div>
                    <button type="button" onClick={() => update('cv_url', '')} className="p-2 hover:bg-white/50 rounded">
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => cvInputRef.current?.click()}
                    disabled={uploadingCv}
                    className="w-full p-6 border-2 border-dashed border-gray-300 dark:border-border-dark hover:border-brand-blue rounded-lg flex flex-col items-center gap-2 transition-colors disabled:opacity-50"
                  >
                    <Upload className="w-8 h-8 text-brand-blue" />
                    <span className="text-sm font-medium text-gray-700 dark:text-text-dark-primary">
                      {uploadingCv ? 'Uploading...' : 'Click to upload your CV'}
                    </span>
                    <span className="text-xs text-gray-500">PDF / DOC / DOCX, up to 10 MB</span>
                  </button>
                )}
                <input
                  ref={cvInputRef}
                  type="file"
                  accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                  onChange={handleCvFile}
                  className="hidden"
                />
              </div>

              <div>
                <label className={labelClass}>Credentials / Certificates <span className="text-gray-400 text-xs">(optional, up to 10)</span></label>
                <p className="text-xs text-gray-500 mb-3">Certifications, training certificates, awards. PDF / image, up to 10 MB each.</p>
                {formData.credential_urls.length > 0 && (
                  <ul className="space-y-2 mb-3">
                    {formData.credential_urls.map((url, i) => (
                      <li key={url} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-dark-700 rounded-lg">
                        <div className="flex items-center gap-2 min-w-0">
                          <FileText className="w-4 h-4 text-gray-500 flex-shrink-0" />
                          <a href={url} target="_blank" rel="noopener noreferrer" className="text-xs text-brand-blue truncate">
                            Credential {i + 1}
                          </a>
                        </div>
                        <button type="button" onClick={() => removeCredential(i)} className="p-1 hover:bg-gray-200 dark:hover:bg-dark-600 rounded">
                          <X className="w-4 h-4" />
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
                {formData.credential_urls.length < 10 && (
                  <button
                    type="button"
                    onClick={() => credInputRef.current?.click()}
                    disabled={uploadingCred}
                    className="w-full p-4 border border-dashed border-gray-300 dark:border-border-dark hover:border-brand-blue rounded-lg text-sm text-gray-700 dark:text-text-dark-primary disabled:opacity-50"
                  >
                    {uploadingCred ? 'Uploading...' : `+ Add credential document (${formData.credential_urls.length}/10)`}
                  </button>
                )}
                <input
                  ref={credInputRef}
                  type="file"
                  multiple
                  accept=".pdf,.doc,.docx,image/*"
                  onChange={handleCredFiles}
                  className="hidden"
                />
              </div>
            </div>
          )}

          {/* Step 3 — Review */}
          {STEPS[step]?.key === 'review' && (
            <div className="space-y-5 text-sm">
              <div>
                <h3 className="font-semibold text-gray-900 dark:text-text-dark-primary mb-2">Account</h3>
                <div className="bg-gray-50 dark:bg-dark-700 rounded-lg p-3 space-y-1">
                  <p><strong>Name:</strong> {formData.full_name}</p>
                  <p><strong>Email:</strong> {formData.email}</p>
                  {formData.phone && <p><strong>Phone:</strong> {formData.phone}</p>}
                  {formData.country && <p><strong>Country:</strong> {formData.country}</p>}
                </div>
              </div>
              <div>
                <h3 className="font-semibold text-gray-900 dark:text-text-dark-primary mb-2">Expertise</h3>
                <div className="bg-gray-50 dark:bg-dark-700 rounded-lg p-3 space-y-2">
                  <p><strong>Bio:</strong> {formData.bio}</p>
                  <p><strong>Qualifications:</strong> {formData.qualifications}</p>
                  <p><strong>Teaching experience:</strong> {formData.teaching_experience}</p>
                  <p><strong>Subjects:</strong> {formData.subject_expertise}</p>
                  {formData.portfolio_url && <p><strong>Portfolio:</strong> <a href={formData.portfolio_url} className="text-brand-blue" target="_blank" rel="noreferrer">{formData.portfolio_url}</a></p>}
                </div>
              </div>
              <div>
                <h3 className="font-semibold text-gray-900 dark:text-text-dark-primary mb-2">Documents</h3>
                <div className="bg-gray-50 dark:bg-dark-700 rounded-lg p-3 space-y-1">
                  <p><strong>CV:</strong> <a href={formData.cv_url} className="text-brand-blue" target="_blank" rel="noreferrer">View uploaded CV</a></p>
                  <p><strong>Credentials:</strong> {formData.credential_urls.length} document{formData.credential_urls.length === 1 ? '' : 's'}</p>
                </div>
              </div>

              <label className="flex items-start gap-2 cursor-pointer pt-2">
                <input
                  type="checkbox"
                  checked={formData.agreed}
                  onChange={(e) => update('agreed', e.target.checked)}
                  className="w-4 h-4 mt-0.5 rounded border-gray-300 text-brand-blue focus:ring-brand-blue"
                />
                <span className="text-sm text-gray-600 dark:text-text-dark-secondary">
                  I confirm the information above is accurate and I agree to the{' '}
                  <Link to="/terms" className="text-brand-blue underline">Terms of Service</Link> and{' '}
                  <Link to="/privacy" className="text-brand-blue underline">Privacy Policy</Link>.
                </span>
              </label>
            </div>
          )}

          {/* Footer nav */}
          <div className="mt-8 flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={back}
              disabled={step === 0}
              className="px-4 py-2.5 inline-flex items-center gap-2 text-gray-700 dark:text-text-dark-primary hover:bg-gray-100 dark:hover:bg-dark-700 rounded-lg disabled:opacity-40"
            >
              <ArrowLeft className="w-4 h-4" /> Back
            </button>

            {step < STEPS.length - 1 ? (
              <button
                type="button"
                onClick={next}
                className="px-5 py-2.5 inline-flex items-center gap-2 bg-brand-purple hover:bg-brand-purple/90 text-white font-semibold rounded-lg shadow-lg shadow-brand-purple/20 transition-all"
              >
                Continue <ArrowRight className="w-4 h-4" />
              </button>
            ) : (
              <button
                type="button"
                onClick={handleSubmit}
                disabled={submitting}
                className="px-5 py-2.5 inline-flex items-center gap-2 bg-brand-purple hover:bg-brand-purple/90 text-white font-semibold rounded-lg shadow-lg shadow-brand-purple/20 disabled:opacity-50 transition-all"
              >
                {submitting ? 'Submitting...' : 'Submit Application'}
              </button>
            )}
          </div>
        </div>
        </div>
      </div>
    </div>
  );
}
