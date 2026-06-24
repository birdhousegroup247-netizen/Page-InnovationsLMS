import { useState, useEffect } from 'react';
import { User, Mail, Phone, MapPin, Globe, Linkedin, Github, Save, Camera } from 'lucide-react';
import { profileAPI } from '../../lib/api';
import { Container, PageHeader } from '../../components/layout';
import { Button, Spinner, Alert } from '../../components/ui';
import CloudinaryUpload from '../../components/common/CloudinaryUpload';
import TimezoneSelect from '../../components/settings/TimezoneSelect';

// Admin Profile — same backend as the student/instructor profile
// (everything lives on the User row) but presented in the admin app's
// PageHeader chrome so it sits naturally alongside Users / Categories
// / Coupons. Read-only fields (email, role) are surfaced for context.
export default function AdminProfile() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [me, setMe] = useState(null);
  const [avatarUrl, setAvatarUrl] = useState('');
  const [form, setForm] = useState({
    full_name: '',
    phone: '',
    bio: '',
    location: '',
    website: '',
    linkedin_url: '',
    github_url: '',
    date_of_birth: '',
    display_name: '',
    timezone: '',
  });

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const res = await profileAPI.getProfile();
        const u = res?.data?.data?.user || res?.data?.data;
        if (!alive || !u) return;
        setMe(u);
        setAvatarUrl(u.profile_picture || u.avatar_url || '');
        setForm({
          full_name: u.full_name || '',
          phone: u.phone || '',
          bio: u.bio || '',
          location: u.location || '',
          website: u.website || '',
          linkedin_url: u.linkedin_url || '',
          github_url: u.github_url || '',
          date_of_birth: u.date_of_birth
            ? (typeof u.date_of_birth === 'string'
                ? u.date_of_birth.slice(0, 10)
                : new Date(u.date_of_birth).toISOString().slice(0, 10))
            : '',
          display_name: u.display_name || '',
          timezone: u.timezone || (Intl.DateTimeFormat().resolvedOptions().timeZone || ''),
        });
      } catch (e) {
        setError(e?.response?.data?.message || 'Failed to load profile');
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, []);

  const update = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const onSave = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setSaving(true);
    try {
      await profileAPI.updateProfile(form);
      setSuccess('Profile updated.');
      setTimeout(() => setSuccess(''), 3500);
    } catch (e2) {
      setError(e2?.response?.data?.message || 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <PageHeader
        icon={User}
        title="My Profile"
        subtitle="Your personal details — name, picture, bio, and how to reach you"
      />

      <Container className="py-8 space-y-6">
        {error && <Alert variant="danger" onClose={() => setError('')}>{error}</Alert>}
        {success && <Alert variant="success" onClose={() => setSuccess('')}>{success}</Alert>}

        {loading ? (
          <div className="flex justify-center py-20"><Spinner size="lg" /></div>
        ) : (
          <>
            {/* Identity card — avatar + email + role badge */}
            <div className="bg-white dark:bg-dark-800 rounded-xl border border-gray-200 dark:border-border-dark p-6">
              <div className="flex flex-col sm:flex-row gap-6 items-start">
                <div className="relative shrink-0">
                  {avatarUrl ? (
                    <img src={avatarUrl} alt="" className="w-24 h-24 rounded-full object-cover border border-gray-200 dark:border-border-dark" />
                  ) : (
                    <div className="w-24 h-24 rounded-full bg-gradient-to-br from-brand-blue to-brand-purple flex items-center justify-center text-white text-3xl font-bold">
                      {(me?.full_name || me?.email || '?').charAt(0).toUpperCase()}
                    </div>
                  )}
                  <div className="absolute -bottom-1 -right-1 bg-brand-blue rounded-full p-1.5">
                    <Camera className="w-3.5 h-3.5 text-white" />
                  </div>
                </div>
                <div className="flex-1 w-full">
                  <p className="text-xs uppercase tracking-wider text-gray-500 dark:text-text-dark-muted mb-1">Signed in as</p>
                  <p className="text-lg font-semibold text-gray-900 dark:text-white">{me?.email}</p>
                  <p className="text-sm text-gray-500 dark:text-text-dark-muted mt-1 capitalize">
                    Role: {me?.role || 'admin'}
                  </p>
                  <div className="mt-4">
                    <p className="text-xs uppercase tracking-wider text-gray-500 dark:text-text-dark-muted mb-2">Update profile picture</p>
                    <CloudinaryUpload
                      onUploadSuccess={async (url) => {
                        if (!url) return;
                        try {
                          await profileAPI.updateAvatar(url);
                          setAvatarUrl(url);
                          setSuccess('Profile picture updated.');
                          setTimeout(() => setSuccess(''), 3500);
                        } catch (e2) {
                          setError(e2?.response?.data?.message || 'Failed to update picture');
                        }
                      }}
                      onUploadError={(err) => setError(err || 'Upload failed')}
                      acceptedTypes="image"
                      maxSizeMB={5}
                      currentFile={avatarUrl}
                      uploadEndpoint="/api/upload/profile-picture"
                      folder="tekyprolms/avatars"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Personal info form */}
            <form onSubmit={onSave} className="bg-white dark:bg-dark-800 rounded-xl border border-gray-200 dark:border-border-dark p-6 space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <Field label="Full Name *" icon={User}>
                  <input
                    type="text"
                    required
                    value={form.full_name}
                    onChange={(e) => update('full_name', e.target.value)}
                    className="w-full pl-10 pr-3 py-2.5 bg-white dark:bg-dark-700 border border-gray-300 dark:border-border-dark rounded-lg text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-blue"
                  />
                </Field>
                <Field label="Email (read-only)" icon={Mail}>
                  <input
                    type="email"
                    value={me?.email || ''}
                    disabled
                    className="w-full pl-10 pr-3 py-2.5 bg-gray-50 dark:bg-dark-600 border border-gray-300 dark:border-border-dark rounded-lg text-gray-600 dark:text-text-dark-muted cursor-not-allowed"
                  />
                </Field>
                <Field label="Display Name (optional)">
                  <input
                    type="text"
                    value={form.display_name}
                    onChange={(e) => update('display_name', e.target.value)}
                    placeholder={form.full_name || 'How you want to appear'}
                    className="w-full px-3 py-2.5 bg-white dark:bg-dark-700 border border-gray-300 dark:border-border-dark rounded-lg text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-blue"
                  />
                </Field>
                <Field label="Date of Birth (optional)">
                  <input
                    type="date"
                    value={form.date_of_birth}
                    onChange={(e) => update('date_of_birth', e.target.value)}
                    className="w-full px-3 py-2.5 bg-white dark:bg-dark-700 border border-gray-300 dark:border-border-dark rounded-lg text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-blue"
                  />
                </Field>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 dark:text-text-dark-secondary mb-2">Timezone</label>
                  <TimezoneSelect
                    value={form.timezone}
                    onChange={(v) => update('timezone', v)}
                  />
                </div>
                <Field label="Phone" icon={Phone}>
                  <input
                    type="tel"
                    value={form.phone}
                    onChange={(e) => update('phone', e.target.value)}
                    className="w-full pl-10 pr-3 py-2.5 bg-white dark:bg-dark-700 border border-gray-300 dark:border-border-dark rounded-lg text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-blue"
                  />
                </Field>
                <Field label="Location" icon={MapPin}>
                  <input
                    type="text"
                    value={form.location}
                    onChange={(e) => update('location', e.target.value)}
                    placeholder="City, Country"
                    className="w-full pl-10 pr-3 py-2.5 bg-white dark:bg-dark-700 border border-gray-300 dark:border-border-dark rounded-lg text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-blue"
                  />
                </Field>
                <Field label="Website" icon={Globe}>
                  <input
                    type="url"
                    value={form.website}
                    onChange={(e) => update('website', e.target.value)}
                    placeholder="https://..."
                    className="w-full pl-10 pr-3 py-2.5 bg-white dark:bg-dark-700 border border-gray-300 dark:border-border-dark rounded-lg text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-blue"
                  />
                </Field>
                <Field label="LinkedIn" icon={Linkedin}>
                  <input
                    type="url"
                    value={form.linkedin_url}
                    onChange={(e) => update('linkedin_url', e.target.value)}
                    placeholder="https://linkedin.com/in/..."
                    className="w-full pl-10 pr-3 py-2.5 bg-white dark:bg-dark-700 border border-gray-300 dark:border-border-dark rounded-lg text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-blue"
                  />
                </Field>
                <Field label="GitHub" icon={Github}>
                  <input
                    type="url"
                    value={form.github_url}
                    onChange={(e) => update('github_url', e.target.value)}
                    placeholder="https://github.com/..."
                    className="w-full pl-10 pr-3 py-2.5 bg-white dark:bg-dark-700 border border-gray-300 dark:border-border-dark rounded-lg text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-blue"
                  />
                </Field>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-text-dark-secondary mb-2">Bio</label>
                <textarea
                  rows={3}
                  value={form.bio}
                  onChange={(e) => update('bio', e.target.value)}
                  placeholder="A short bio that appears on internal admin views."
                  className="w-full px-3 py-2.5 bg-white dark:bg-dark-700 border border-gray-300 dark:border-border-dark rounded-lg text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-blue resize-none"
                />
              </div>

              <div className="flex justify-end pt-2 border-t border-gray-200 dark:border-border-dark">
                <Button type="submit" disabled={saving} leftIcon={!saving && <Save className="w-4 h-4" />}>
                  {saving ? 'Saving…' : 'Save Changes'}
                </Button>
              </div>
            </form>
          </>
        )}
      </Container>
    </>
  );
}

function Field({ label, icon: Icon, children }) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 dark:text-text-dark-secondary mb-2">{label}</label>
      <div className="relative">
        {Icon && <Icon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />}
        {children}
      </div>
    </div>
  );
}
