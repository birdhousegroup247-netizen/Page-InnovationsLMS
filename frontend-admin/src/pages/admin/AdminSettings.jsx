import { useState, useEffect } from 'react';
import { Lock, Eye, EyeOff, Shield, Save, Home, Bell, KeyRound } from 'lucide-react';
import { profileAPI } from '../../lib/api';
import { Container, PageHeader } from '../../components/layout';
import { Button, Alert, Spinner } from '../../components/ui';
import { NotificationPreferencesAdmin } from '../../components/settings/NotificationPreferences';

// Admin Settings — matches the Profile page layout (full-width
// Container, headered cards in a stacked column with the same
// outer rhythm). Two-column grid on wide screens for inputs so
// passwords sit alongside their confirmation without the form
// stretching across half the page.
export default function AdminSettings() {
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [show, setShow] = useState({ current: false, next: false, confirm: false });
  const [form, setForm] = useState({ current_password: '', new_password: '', confirm_password: '' });
  const [defaultLanding, setDefaultLanding] = useState('/dashboard');
  const [landingSaving, setLandingSaving] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const res = await profileAPI.getProfile();
        const u = res?.data?.data?.user || res?.data?.data;
        const v = u?.admin_preferences?.default_landing;
        if (v) setDefaultLanding(v);
      } catch { /* not fatal */ }
      finally { setLoading(false); }
    })();
  }, []);

  const saveLanding = async (v) => {
    setDefaultLanding(v);
    setLandingSaving(true);
    try {
      await profileAPI.updateProfile({ admin_preferences: { default_landing: v } });
      setSuccess('Default landing page saved.');
      setTimeout(() => setSuccess(''), 3000);
    } catch (e) {
      setError(e?.response?.data?.message || 'Could not save default landing page');
    } finally {
      setLandingSaving(false);
    }
  };

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

      <Container className="py-8 space-y-6">
        {error && <Alert variant="danger" onClose={() => setError('')}>{error}</Alert>}
        {success && <Alert variant="success" onClose={() => setSuccess('')}>{success}</Alert>}

        {loading ? (
          <div className="flex justify-center py-20"><Spinner size="lg" /></div>
        ) : (
          <>
            {/* SECURITY — change password */}
            <SettingsCard
              icon={KeyRound}
              tint="brand-blue"
              title="Change password"
              subtitle="Pick something strong — admins are a high-value target. Minimum 8 characters."
            >
              <form onSubmit={onSubmit} className="space-y-5">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <PasswordField
                    label="Current password"
                    value={form.current_password}
                    onChange={(v) => update('current_password', v)}
                    show={show.current}
                    onToggle={() => setShow((s) => ({ ...s, current: !s.current }))}
                    autoComplete="current-password"
                    className="md:col-span-2"
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
                </div>

                <div className="flex justify-end pt-4 border-t border-gray-200 dark:border-border-dark">
                  <Button type="submit" disabled={saving} leftIcon={!saving && <Save className="w-4 h-4" />}>
                    {saving ? 'Saving…' : 'Update password'}
                  </Button>
                </div>
              </form>
            </SettingsCard>

            {/* NOTIFICATIONS — admin event toggles */}
            <NotificationPreferencesAdmin />

            {/* DEFAULT LANDING PAGE */}
            <SettingsCard
              icon={Home}
              tint="brand-purple"
              title="Default landing page"
              subtitle="Where the admin app opens after you log in. Useful if you start your day on a specific queue."
            >
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-text-dark-secondary mb-2">
                    Land me on
                  </label>
                  <select
                    value={defaultLanding}
                    onChange={(e) => saveLanding(e.target.value)}
                    disabled={landingSaving}
                    className="w-full px-3 py-2.5 bg-white dark:bg-dark-700 border border-gray-300 dark:border-border-dark rounded-lg text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-blue"
                  >
                    <option value="/dashboard">Dashboard</option>
                    <option value="/users">Users</option>
                    <option value="/courses">Courses</option>
                    <option value="/payments">Payments</option>
                    <option value="/analytics">Analytics</option>
                    <option value="/announcements">Announcements</option>
                    <option value="/chat-moderation">Chat Moderation</option>
                  </select>
                </div>
                <div className="rounded-lg bg-gray-50 dark:bg-dark-700/50 border border-gray-200 dark:border-border-dark p-4 text-sm text-gray-600 dark:text-text-dark-muted">
                  <p className="font-medium text-gray-700 dark:text-text-dark-secondary mb-1">Saves on change</p>
                  <p>The root URL <code className="text-xs px-1 py-0.5 rounded bg-white dark:bg-dark-600">/</code> and any unmatched route will send you here automatically.</p>
                </div>
              </div>
            </SettingsCard>

            {/* MORE COMING — clean ghost card so the page has presence */}
            <div className="bg-white dark:bg-dark-800 rounded-xl border border-dashed border-gray-300 dark:border-border-dark p-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-gray-100 dark:bg-dark-700 flex items-center justify-center">
                  <Bell className="w-5 h-5 text-gray-400" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-gray-700 dark:text-text-dark-secondary">More controls coming</h3>
                  <p className="text-xs text-gray-500 dark:text-text-dark-muted">Active sessions, API tokens, and audit log will land here as they ship.</p>
                </div>
              </div>
            </div>
          </>
        )}
      </Container>
    </>
  );
}

// Shared card chrome so every settings section reads the same — same
// icon-tint header, same outer card border, same internal rhythm.
function SettingsCard({ icon: Icon, tint, title, subtitle, children }) {
  const tintBg = {
    'brand-blue':   'bg-brand-blue/10 text-brand-blue',
    'brand-purple': 'bg-brand-purple/10 text-brand-purple',
    'brand-green':  'bg-green-500/10 text-green-500',
  }[tint] || 'bg-brand-blue/10 text-brand-blue';
  return (
    <div className="bg-white dark:bg-dark-800 rounded-xl border border-gray-200 dark:border-border-dark p-6 sm:p-7">
      <div className="flex items-start gap-4 mb-6 pb-5 border-b border-gray-100 dark:border-border-dark">
        <div className={`w-11 h-11 rounded-xl flex items-center justify-center ${tintBg}`}>
          {Icon && <Icon className="w-5 h-5" />}
        </div>
        <div className="flex-1 min-w-0">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">{title}</h2>
          {subtitle && <p className="text-sm text-gray-500 dark:text-text-dark-muted mt-1">{subtitle}</p>}
        </div>
      </div>
      {children}
    </div>
  );
}

function PasswordField({ label, value, onChange, show, onToggle, autoComplete, className }) {
  return (
    <div className={className}>
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
