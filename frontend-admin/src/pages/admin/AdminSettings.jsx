import { useState } from 'react';
import { Lock, Eye, EyeOff, Shield, Save } from 'lucide-react';
import { profileAPI } from '../../lib/api';
import { Container, PageHeader } from '../../components/layout';
import { Button, Alert } from '../../components/ui';

// Admin Settings — account-level controls (password today, room to
// grow into notification prefs / sessions / API tokens). Sits next
// to Admin Profile so the topbar dropdown lands somewhere real.
export default function AdminSettings() {
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [saving, setSaving] = useState(false);
  const [show, setShow] = useState({ current: false, next: false, confirm: false });
  const [form, setForm] = useState({ current_password: '', new_password: '', confirm_password: '' });

  const update = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const onSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    if (!form.current_password || !form.new_password) {
      setError('Both current and new password are required.');
      return;
    }
    if (form.new_password.length < 8) {
      setError('New password must be at least 8 characters.');
      return;
    }
    if (form.new_password !== form.confirm_password) {
      setError('New password and confirmation do not match.');
      return;
    }
    setSaving(true);
    try {
      await profileAPI.changePassword({
        current_password: form.current_password,
        new_password: form.new_password,
      });
      setSuccess('Password updated.');
      setForm({ current_password: '', new_password: '', confirm_password: '' });
      setTimeout(() => setSuccess(''), 4000);
    } catch (e2) {
      setError(e2?.response?.data?.message || 'Could not update password');
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <PageHeader
        icon={Shield}
        title="Settings"
        subtitle="Account security and admin preferences"
      />

      <Container className="py-8 space-y-6 max-w-2xl">
        {error && <Alert variant="danger" onClose={() => setError('')}>{error}</Alert>}
        {success && <Alert variant="success" onClose={() => setSuccess('')}>{success}</Alert>}

        {/* Change password */}
        <form onSubmit={onSubmit} className="bg-white dark:bg-dark-800 rounded-xl border border-gray-200 dark:border-border-dark p-6 space-y-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-brand-blue/10 flex items-center justify-center">
              <Lock className="w-5 h-5 text-brand-blue" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Change password</h2>
              <p className="text-xs text-gray-500 dark:text-text-dark-muted">Pick something strong — admins are a high-value target.</p>
            </div>
          </div>

          <PasswordField
            label="Current password"
            value={form.current_password}
            onChange={(v) => update('current_password', v)}
            show={show.current}
            onToggle={() => setShow((s) => ({ ...s, current: !s.current }))}
            autoComplete="current-password"
          />
          <PasswordField
            label="New password"
            value={form.new_password}
            onChange={(v) => update('new_password', v)}
            show={show.next}
            onToggle={() => setShow((s) => ({ ...s, next: !s.next }))}
            autoComplete="new-password"
          />
          <PasswordField
            label="Confirm new password"
            value={form.confirm_password}
            onChange={(v) => update('confirm_password', v)}
            show={show.confirm}
            onToggle={() => setShow((s) => ({ ...s, confirm: !s.confirm }))}
            autoComplete="new-password"
          />

          <div className="flex justify-end pt-2 border-t border-gray-200 dark:border-border-dark">
            <Button type="submit" disabled={saving} leftIcon={!saving && <Save className="w-4 h-4" />}>
              {saving ? 'Saving…' : 'Update password'}
            </Button>
          </div>
        </form>

        {/* Placeholder card — keeps room for upcoming controls
            (notification prefs, active sessions, API tokens) so the
            page has presence even before those exist. */}
        <div className="bg-gray-50 dark:bg-dark-700 rounded-xl border border-dashed border-gray-300 dark:border-border-dark p-5 text-sm text-gray-600 dark:text-text-dark-muted">
          <p className="font-medium text-gray-700 dark:text-text-dark-secondary mb-1">More controls coming</p>
          <p>Notification preferences, active sessions, and API tokens will land here as they ship.</p>
        </div>
      </Container>
    </>
  );
}

function PasswordField({ label, value, onChange, show, onToggle, autoComplete }) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 dark:text-text-dark-secondary mb-2">{label}</label>
      <div className="relative">
        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
        <input
          type={show ? 'text' : 'password'}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          autoComplete={autoComplete}
          className="w-full pl-10 pr-11 py-2.5 bg-white dark:bg-dark-700 border border-gray-300 dark:border-border-dark rounded-lg text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-blue"
        />
        <button
          type="button"
          aria-label={show ? 'Hide password' : 'Show password'}
          onClick={onToggle}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
        >
          {show ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
        </button>
      </div>
    </div>
  );
}
