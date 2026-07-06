import { useState, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';
import { authAPI } from '../lib/api';
import { tokenStorage } from '../utils/tokenStorage';
import { Sun, Moon, Mail, CheckCircle2, AlertCircle } from 'lucide-react';
import Logo from '../components/ui/Logo';

export default function VerifyEmail() {
  const navigate = useNavigate();
  const { theme, toggleTheme } = useTheme();
  const { checkAuth } = useAuth();
  const [params] = useSearchParams();

  const emailFromUrl = params.get('email') || '';
  const verified = params.get('verified') === '1';
  const errorParam = params.get('error');

  const [email, setEmail] = useState(emailFromUrl);
  const [code, setCode] = useState(['', '', '', '', '', '']);
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  const inputs = useRef([]);

  useEffect(() => {
    if (verified) {
      // Link-based verify already marked the account verified on the server.
      // We don't have a session here (link flow doesn't auto-login),
      // so route them to login with a success banner.
      setInfo('Email verified! You can now log in.');
      const t = setTimeout(() => navigate('/login?verified=1'), 1500);
      return () => clearTimeout(t);
    }
    if (errorParam) {
      const map = {
        missing_token: 'The verification link was incomplete.',
        invalid_or_expired: 'That verification link has expired or already been used.',
        user_not_found: 'We could not find that account.',
        server_error: 'Something went wrong on our end. Please try again.',
      };
      setError(map[errorParam] || 'Verification failed. Please try again.');
    }
  }, [verified, errorParam, navigate]);

  const handleDigit = (idx, value) => {
    if (!/^\d?$/.test(value)) return;
    const next = [...code];
    next[idx] = value;
    setCode(next);
    if (value && idx < 5) inputs.current[idx + 1]?.focus();
  };

  const handleKeyDown = (idx, e) => {
    if (e.key === 'Backspace' && !code[idx] && idx > 0) {
      inputs.current[idx - 1]?.focus();
    }
  };

  const handlePaste = (e) => {
    const text = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (text.length === 6) {
      e.preventDefault();
      setCode(text.split(''));
      inputs.current[5]?.focus();
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setInfo('');
    const codeStr = code.join('');
    if (codeStr.length !== 6) {
      setError('Please enter the 6-digit code from your email.');
      return;
    }
    if (!email) {
      setError('Please enter your email.');
      return;
    }
    setLoading(true);
    try {
      const res = await authAPI.verifyEmailCode(email, codeStr);
      if (res.data?.data?.already_verified) {
        setInfo('Already verified. Redirecting to login...');
        setTimeout(() => navigate('/login'), 1200);
        return;
      }
      // Server auto-logs us in on successful code verification.
      // First-login is not "Remember me" by default — user can tick it
      // on Login next time. Tokens land per-tab via sessionStorage.
      const { accessToken, refreshToken } = res.data.data;
      tokenStorage.setTokens({ accessToken, refreshToken }, { rememberMe: false });
      await checkAuth();
      navigate('/dashboard');
    } catch (err) {
      setError(err.response?.data?.message || 'Verification failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    setError('');
    setInfo('');
    if (!email) {
      setError('Please enter your email to receive a new code.');
      return;
    }
    setResending(true);
    try {
      const res = await authAPI.resendVerification(email);
      setInfo(res.data?.message || 'A new verification email has been sent.');
      setCode(['', '', '', '', '', '']);
    } catch (err) {
      setError(err.response?.data?.message || 'Could not resend email. Please try again in a moment.');
    } finally {
      setResending(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-dark-900 p-4 transition-colors">
      <button
        onClick={toggleTheme}
        className="fixed top-4 right-4 p-3 rounded-lg bg-white dark:bg-dark-800 shadow-md hover:shadow-lg transition-all z-50"
        aria-label="Toggle theme"
      >
        {theme === 'dark' ? <Sun className="w-5 h-5 text-yellow-500" /> : <Moon className="w-5 h-5 text-gray-700" />}
      </button>

      <div className="w-full max-w-md">
        <div className="text-center mb-6">
          <Logo className="h-12 w-auto mx-auto mb-4" />
        </div>

        <div className="bg-white dark:bg-dark-800 rounded-2xl shadow-lg p-8">
          <div className="flex flex-col items-center text-center mb-6">
            <div className="w-16 h-16 rounded-full bg-brand-blue/10 flex items-center justify-center mb-4">
              <Mail className="w-8 h-8 text-brand-blue" />
            </div>
            <h1 className="text-2xl font-semibold text-gray-900 dark:text-text-dark-primary">Verify Your Email</h1>
            <p className="text-sm text-gray-600 dark:text-text-dark-secondary mt-2">
              We sent a 6-digit code and a verification link to your email. Enter the code below, or click the link in the email.
            </p>
          </div>

          {info && (
            <div className="mb-4 p-3 bg-green-50 dark:bg-green-500/10 border border-green-200 dark:border-green-500/30 rounded-lg flex items-start gap-2">
              <CheckCircle2 className="w-5 h-5 text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5" />
              <p className="text-green-800 dark:text-green-400 text-sm">{info}</p>
            </div>
          )}
          {error && (
            <div className="mb-4 p-3 bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/30 rounded-lg flex items-start gap-2">
              <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
              <p className="text-red-800 dark:text-red-400 text-sm">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-text-dark-primary mb-2">
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                required
                className="w-full px-4 py-2.5 bg-white dark:bg-dark-700 border border-gray-300 dark:border-border-dark rounded-lg text-gray-900 dark:text-text-dark-primary focus:outline-none focus:ring-2 focus:ring-brand-blue"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-text-dark-primary mb-2">
                6-digit code
              </label>
              <div className="flex gap-2 justify-between" onPaste={handlePaste}>
                {code.map((digit, idx) => (
                  <input
                    key={idx}
                    ref={(el) => (inputs.current[idx] = el)}
                    type="text"
                    inputMode="numeric"
                    maxLength={1}
                    value={digit}
                    onChange={(e) => handleDigit(idx, e.target.value)}
                    onKeyDown={(e) => handleKeyDown(idx, e)}
                    className="w-12 h-14 text-center text-2xl font-bold bg-white dark:bg-dark-700 border border-gray-300 dark:border-border-dark rounded-lg text-gray-900 dark:text-text-dark-primary focus:outline-none focus:ring-2 focus:ring-brand-blue"
                  />
                ))}
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 px-4 bg-brand-blue hover:bg-brand-blue-600 text-white font-medium rounded-lg transition-colors disabled:opacity-50"
            >
              {loading ? 'Verifying...' : 'Verify Email'}
            </button>
          </form>

          <div className="mt-6 text-center text-sm text-gray-600 dark:text-text-dark-secondary">
            Didn't get the code?{' '}
            <button
              type="button"
              onClick={handleResend}
              disabled={resending}
              className="text-brand-blue hover:text-brand-blue-light font-medium disabled:opacity-50"
            >
              {resending ? 'Sending...' : 'Resend email'}
            </button>
          </div>

          <p className="mt-6 text-center text-sm text-gray-600 dark:text-text-dark-secondary">
            Already verified?{' '}
            <Link to="/login" className="text-brand-blue hover:text-brand-blue-light font-semibold">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
