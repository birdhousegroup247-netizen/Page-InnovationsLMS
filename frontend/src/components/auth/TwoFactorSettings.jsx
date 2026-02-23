import { useState, useEffect } from 'react';
import { twoFactorAPI } from '../../lib/api';
import { Shield, ShieldCheck, ShieldOff, QrCode, KeyRound, AlertCircle } from 'lucide-react';
import { cn } from '../../utils/cn';

export default function TwoFactorSettings() {
  const [enabled, setEnabled]   = useState(false);
  const [loading, setLoading]   = useState(true);
  const [step, setStep]         = useState('idle'); // idle | setup | verify | disable
  const [qrCode, setQrCode]     = useState(null);
  const [token, setToken]       = useState('');
  const [error, setError]       = useState('');
  const [success, setSuccess]   = useState('');
  const [busy, setBusy]         = useState(false);

  useEffect(() => {
    twoFactorAPI.getStatus()
      .then((r) => setEnabled(r.data?.data?.enabled || false))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const startSetup = async () => {
    setError(''); setSuccess('');
    setBusy(true);
    try {
      const r = await twoFactorAPI.setup();
      setQrCode(r.data.data.qrCode);
      setStep('setup');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to start setup');
    } finally { setBusy(false); }
  };

  const confirmEnable = async () => {
    if (!token.trim()) return setError('Enter the 6-digit code');
    setError(''); setBusy(true);
    try {
      await twoFactorAPI.verify(token.trim());
      setEnabled(true);
      setStep('idle');
      setToken('');
      setSuccess('2FA enabled successfully!');
    } catch (err) {
      setError(err.response?.data?.message || 'Invalid code. Try again.');
    } finally { setBusy(false); }
  };

  const confirmDisable = async () => {
    if (!token.trim()) return setError('Enter the 6-digit code to confirm');
    setError(''); setBusy(true);
    try {
      await twoFactorAPI.disable(token.trim());
      setEnabled(false);
      setStep('idle');
      setToken('');
      setSuccess('2FA has been disabled.');
    } catch (err) {
      setError(err.response?.data?.message || 'Invalid code');
    } finally { setBusy(false); }
  };

  if (loading) return null;

  return (
    <div className="bg-white dark:bg-dark-800 rounded-xl border border-gray-200 dark:border-dark-700 p-6">
      <div className="flex items-start gap-3 mb-4">
        {enabled
          ? <ShieldCheck className="w-6 h-6 text-emerald-500 flex-shrink-0 mt-0.5" />
          : <Shield className="w-6 h-6 text-gray-400 flex-shrink-0 mt-0.5" />
        }
        <div>
          <h3 className="font-semibold text-gray-900 dark:text-white">Two-Factor Authentication (2FA)</h3>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
            {enabled
              ? 'Your account is protected with 2FA via an authenticator app.'
              : 'Add an extra layer of security by requiring a code at login.'}
          </p>
          <span className={cn(
            'inline-block mt-1.5 text-xs font-semibold px-2 py-0.5 rounded-full',
            enabled
              ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
              : 'bg-gray-100 text-gray-500 dark:bg-dark-700 dark:text-gray-400'
          )}>
            {enabled ? 'Enabled' : 'Disabled'}
          </span>
        </div>
      </div>

      {/* Messages */}
      {error && (
        <div className="flex items-center gap-2 text-red-600 bg-red-50 dark:bg-red-900/10 rounded-lg px-3 py-2 mb-4 text-sm">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />{error}
        </div>
      )}
      {success && (
        <div className="flex items-center gap-2 text-emerald-600 bg-emerald-50 dark:bg-emerald-900/10 rounded-lg px-3 py-2 mb-4 text-sm">
          <ShieldCheck className="w-4 h-4 flex-shrink-0" />{success}
        </div>
      )}

      {/* Idle state */}
      {step === 'idle' && (
        <button
          onClick={enabled ? () => { setStep('disable'); setError(''); setToken(''); } : startSetup}
          disabled={busy}
          className={cn(
            'text-sm font-medium px-4 py-2 rounded-lg transition-colors disabled:opacity-50',
            enabled
              ? 'bg-red-50 text-red-600 hover:bg-red-100 dark:bg-red-900/20 dark:text-red-400'
              : 'bg-brand-blue text-white hover:bg-brand-blue/90'
          )}
        >
          {enabled ? 'Disable 2FA' : 'Enable 2FA'}
        </button>
      )}

      {/* Setup: show QR code */}
      {step === 'setup' && qrCode && (
        <div>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
            Scan this QR code with <strong>Google Authenticator</strong>, <strong>Authy</strong>, or any TOTP app, then enter the 6-digit code below.
          </p>
          <div className="flex justify-center mb-4">
            <img src={qrCode} alt="2FA QR Code" className="w-44 h-44 rounded-lg border border-gray-200 dark:border-dark-600" />
          </div>
          <div className="flex gap-2">
            <input
              value={token}
              onChange={(e) => setToken(e.target.value.replace(/\D/g, '').slice(0, 6))}
              placeholder="Enter 6-digit code"
              maxLength={6}
              className="flex-1 px-3 py-2 rounded-lg border border-gray-200 dark:border-dark-600 bg-white dark:bg-dark-700 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue/30 tracking-widest text-center"
            />
            <button
              onClick={confirmEnable}
              disabled={busy || token.length !== 6}
              className="px-4 py-2 rounded-lg bg-brand-blue text-white text-sm font-medium hover:bg-brand-blue/90 disabled:opacity-50 transition-colors"
            >
              Verify & Enable
            </button>
            <button
              onClick={() => { setStep('idle'); setToken(''); setError(''); }}
              className="px-3 py-2 rounded-lg bg-gray-100 dark:bg-dark-700 text-gray-600 dark:text-gray-300 text-sm hover:bg-gray-200 transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Disable confirmation */}
      {step === 'disable' && (
        <div>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
            Enter the 6-digit code from your authenticator app to confirm disabling 2FA.
          </p>
          <div className="flex gap-2">
            <input
              value={token}
              onChange={(e) => setToken(e.target.value.replace(/\D/g, '').slice(0, 6))}
              placeholder="6-digit code"
              maxLength={6}
              className="flex-1 px-3 py-2 rounded-lg border border-gray-200 dark:border-dark-600 bg-white dark:bg-dark-700 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue/30 tracking-widest text-center"
            />
            <button
              onClick={confirmDisable}
              disabled={busy || token.length !== 6}
              className="px-4 py-2 rounded-lg bg-red-600 text-white text-sm font-medium hover:bg-red-700 disabled:opacity-50 transition-colors"
            >
              Confirm Disable
            </button>
            <button
              onClick={() => { setStep('idle'); setToken(''); setError(''); }}
              className="px-3 py-2 rounded-lg bg-gray-100 dark:bg-dark-700 text-gray-600 dark:text-gray-300 text-sm hover:bg-gray-200 transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
