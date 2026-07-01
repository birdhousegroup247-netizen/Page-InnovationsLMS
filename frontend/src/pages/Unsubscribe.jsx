import { useEffect, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import api from '../lib/api';
import { CheckCircle, Mail, XCircle, Loader } from 'lucide-react';
import logo from '../assets/logo.png';

/**
 * Public unsubscribe page. The link in every non-transactional email
 * footer points here with type + id + token in the query string. We
 * verify the token first so the page can say "unsubscribe alex@…?"
 * before flipping the flag; the user has to click Confirm.
 */
export default function Unsubscribe() {
  const [searchParams] = useSearchParams();
  const type = searchParams.get('type');
  const id = searchParams.get('id');
  const token = searchParams.get('token');

  const [state, setState] = useState('checking'); // checking | ready | done | error | already
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!type || !id || !token) {
      setState('error');
      setError('This unsubscribe link is missing information. Please open the link from your email again.');
      return;
    }
    api
      .get('/api/email/unsubscribe/verify', { params: { type, id, token } })
      .then((res) => {
        setEmail(res.data.data.email);
        if (res.data.data.already) setState('already');
        else setState('ready');
      })
      .catch((e) => {
        setState('error');
        setError(e.response?.data?.message || 'This unsubscribe link is invalid or has expired.');
      });
  }, [type, id, token]);

  const handleConfirm = async () => {
    setSubmitting(true);
    try {
      await api.post('/api/email/unsubscribe', { type, id, token });
      setState('done');
    } catch (e) {
      setError(e.response?.data?.message || 'Failed to unsubscribe. Please try again.');
      setState('error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-dark-900 flex items-center justify-center px-4">
      <div className="max-w-md w-full bg-white dark:bg-dark-800 rounded-2xl shadow-lg p-8 border border-gray-200 dark:border-border-dark">
        <div className="flex items-center justify-center mb-6">
          <img src={logo} alt="TekyPro" className="h-10 w-auto" />
        </div>

        {state === 'checking' && (
          <div className="text-center">
            <Loader className="w-8 h-8 mx-auto text-brand-blue animate-spin mb-3" />
            <p className="text-sm text-gray-600 dark:text-gray-400">Checking your unsubscribe link…</p>
          </div>
        )}

        {state === 'ready' && (
          <>
            <div className="text-center mb-6">
              <div className="mx-auto w-14 h-14 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center mb-4">
                <Mail className="w-7 h-7 text-red-600 dark:text-red-400" />
              </div>
              <h1 className="text-xl font-bold text-gray-900 dark:text-white mb-1">Unsubscribe from emails?</h1>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                We'll stop sending marketing, drip, and reminder emails to <strong className="text-gray-900 dark:text-white">{email}</strong>.
              </p>
            </div>

            <div className="text-xs text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-dark-700 rounded-lg p-3 mb-6">
              You will still receive transactional emails (verification, password reset, payment receipts, refund confirmations, installment reminders, and instructor status changes) — these are required for the platform to work.
            </div>

            <div className="flex gap-3">
              <Link
                to="/"
                className="flex-1 py-2.5 text-center text-sm font-medium text-gray-700 dark:text-gray-200 bg-gray-100 dark:bg-dark-700 hover:bg-gray-200 dark:hover:bg-dark-600 rounded-lg transition-colors"
              >
                Keep receiving
              </Link>
              <button
                onClick={handleConfirm}
                disabled={submitting}
                className="flex-1 py-2.5 text-sm font-medium text-white bg-red-600 hover:bg-red-700 disabled:opacity-60 rounded-lg transition-colors"
              >
                {submitting ? 'Unsubscribing…' : 'Confirm unsubscribe'}
              </button>
            </div>
          </>
        )}

        {state === 'already' && (
          <div className="text-center">
            <div className="mx-auto w-14 h-14 rounded-full bg-gray-100 dark:bg-dark-700 flex items-center justify-center mb-4">
              <CheckCircle className="w-7 h-7 text-gray-500 dark:text-gray-400" />
            </div>
            <h1 className="text-xl font-bold text-gray-900 dark:text-white mb-1">You're already unsubscribed</h1>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
              <strong>{email}</strong> is not receiving marketing emails. If you'd like to re-subscribe, log in and update your email preferences.
            </p>
            <Link to="/" className="inline-block px-6 py-2.5 text-sm font-medium text-white bg-brand-blue hover:bg-brand-blue-600 rounded-lg transition-colors">
              Back to TekyPro
            </Link>
          </div>
        )}

        {state === 'done' && (
          <div className="text-center">
            <div className="mx-auto w-14 h-14 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center mb-4">
              <CheckCircle className="w-7 h-7 text-green-600 dark:text-green-400" />
            </div>
            <h1 className="text-xl font-bold text-gray-900 dark:text-white mb-1">You've been unsubscribed</h1>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
              <strong>{email}</strong> will no longer receive marketing, drip, or reminder emails from TekyPro. Sorry to see you go.
            </p>
            <Link to="/" className="inline-block px-6 py-2.5 text-sm font-medium text-white bg-brand-blue hover:bg-brand-blue-600 rounded-lg transition-colors">
              Back to TekyPro
            </Link>
          </div>
        )}

        {state === 'error' && (
          <div className="text-center">
            <div className="mx-auto w-14 h-14 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center mb-4">
              <XCircle className="w-7 h-7 text-red-600 dark:text-red-400" />
            </div>
            <h1 className="text-xl font-bold text-gray-900 dark:text-white mb-1">Something went wrong</h1>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">{error}</p>
            <Link to="/" className="inline-block px-6 py-2.5 text-sm font-medium text-white bg-brand-blue hover:bg-brand-blue-600 rounded-lg transition-colors">
              Back to TekyPro
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
