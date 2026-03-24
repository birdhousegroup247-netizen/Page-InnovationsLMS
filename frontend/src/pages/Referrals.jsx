import { useState, useEffect } from 'react';
import { Gift, Copy, Check, Users, Award, Clock } from 'lucide-react';
import api from '../lib/api';
import { Container } from '../components/layout';
import { Spinner } from '../components/ui';

export default function Referrals() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    api.get('/api/referrals/my-stats')
      .then((res) => setData(res.data.data))
      .catch(() => setError('Failed to load referral info'))
      .finally(() => setLoading(false));
  }, []);

  const handleCopy = () => {
    if (!data?.referral_link) return;
    navigator.clipboard.writeText(data.referral_link).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    });
  };

  if (loading) {
    return (
      <Container className="py-20 flex justify-center">
        <Spinner size="lg" />
      </Container>
    );
  }

  return (
    <Container className="py-8 max-w-2xl">
      {/* Header */}
      <div className="text-center mb-8">
        <div className="inline-flex items-center justify-center w-16 h-16 bg-brand-blue/10 dark:bg-brand-blue/20 rounded-2xl mb-4">
          <Gift className="h-8 w-8 text-brand-blue" />
        </div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-text-dark-primary">
          Refer & Earn
        </h1>
        <p className="text-gray-500 dark:text-text-dark-muted text-sm mt-2 max-w-md mx-auto">
          Share your unique link. When a friend signs up and enrolls in a course, you earn 1 referral credit.
        </p>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl text-red-700 dark:text-red-300 text-sm">
          {error}
        </div>
      )}

      {data && (
        <>
          {/* Referral Link Box */}
          <div className="bg-white dark:bg-dark-800 rounded-2xl shadow-sm border border-gray-100 dark:border-dark-700 p-6 mb-6">
            <p className="text-sm font-medium text-gray-700 dark:text-text-dark-primary mb-3">
              Your Referral Link
            </p>
            <div className="flex items-center gap-2">
              <div className="flex-1 bg-gray-50 dark:bg-dark-700 border border-gray-200 dark:border-dark-600 rounded-lg px-4 py-2.5 text-sm text-gray-600 dark:text-text-dark-secondary truncate font-mono">
                {data.referral_link}
              </div>
              <button
                onClick={handleCopy}
                className="flex items-center gap-2 px-4 py-2.5 bg-brand-blue text-white rounded-lg text-sm font-medium hover:bg-brand-blue/90 transition-colors flex-shrink-0"
              >
                {copied ? (
                  <>
                    <Check className="h-4 w-4" />
                    Copied!
                  </>
                ) : (
                  <>
                    <Copy className="h-4 w-4" />
                    Copy
                  </>
                )}
              </button>
            </div>
            <p className="text-xs text-gray-400 dark:text-text-dark-muted mt-2">
              Share this link via WhatsApp, email, or social media
            </p>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-4 mb-6">
            <div className="bg-white dark:bg-dark-800 rounded-xl border border-gray-100 dark:border-dark-700 p-4 text-center">
              <Users className="h-5 w-5 text-brand-blue mx-auto mb-2" />
              <p className="text-2xl font-bold text-gray-900 dark:text-text-dark-primary">
                {data.stats.total_invited}
              </p>
              <p className="text-xs text-gray-400 mt-0.5">Invited</p>
            </div>
            <div className="bg-white dark:bg-dark-800 rounded-xl border border-gray-100 dark:border-dark-700 p-4 text-center">
              <Award className="h-5 w-5 text-green-500 mx-auto mb-2" />
              <p className="text-2xl font-bold text-gray-900 dark:text-text-dark-primary">
                {data.stats.enrolled}
              </p>
              <p className="text-xs text-gray-400 mt-0.5">Enrolled</p>
            </div>
            <div className="bg-white dark:bg-dark-800 rounded-xl border border-gray-100 dark:border-dark-700 p-4 text-center">
              <Gift className="h-5 w-5 text-brand-purple mx-auto mb-2" />
              <p className="text-2xl font-bold text-gray-900 dark:text-text-dark-primary">
                {data.stats.credits_earned}
              </p>
              <p className="text-xs text-gray-400 mt-0.5">Credits</p>
            </div>
          </div>

          {/* How it works */}
          <div className="bg-gradient-to-br from-brand-blue/5 to-brand-purple/5 dark:from-brand-blue/10 dark:to-brand-purple/10 rounded-2xl p-6 border border-brand-blue/10 dark:border-brand-blue/20">
            <h3 className="font-semibold text-gray-900 dark:text-text-dark-primary mb-4">
              How it works
            </h3>
            <div className="space-y-3">
              {[
                { step: '1', text: 'Copy your unique referral link above' },
                { step: '2', text: 'Share it with friends, family, or colleagues' },
                { step: '3', text: 'They sign up using your link' },
                { step: '4', text: 'When they enroll in a course, you earn 1 credit' },
              ].map(({ step, text }) => (
                <div key={step} className="flex items-center gap-3">
                  <span className="w-7 h-7 rounded-full bg-brand-blue text-white text-xs font-bold flex items-center justify-center flex-shrink-0">
                    {step}
                  </span>
                  <p className="text-sm text-gray-600 dark:text-text-dark-secondary">{text}</p>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </Container>
  );
}
