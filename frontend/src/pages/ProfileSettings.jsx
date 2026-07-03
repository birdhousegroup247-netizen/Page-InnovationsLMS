import { useState, useEffect } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import {
  User,
  Mail,
  Phone,
  MapPin,
  Globe,
  Linkedin,
  Github,
  Lock,
  Save,
  ArrowLeft,
  Camera,
  AlertCircle,
  CheckCircle,
} from 'lucide-react';
import { profileAPI, discordAPI } from '../lib/api';
import { Container } from '../components/layout';
import { Button, Spinner, Alert, Tabs } from '../components/ui';
import TwoFactorSettings from '../components/auth/TwoFactorSettings';
import CloudinaryUpload from '../components/common/CloudinaryUpload';
import NotificationPreferences from '../components/settings/NotificationPreferences';
import TimezoneSelect from '../components/settings/TimezoneSelect';
import { cn } from '../utils/cn';

export default function ProfileSettings() {
  const navigate = useNavigate();
  const { user, updateUser } = useAuth();
  const location = useLocation();
  // Route-driven mode. /profile → "Profile" view (personal info,
  // avatar, bio, DOB, social links). /settings → "Settings" view
  // (security, integrations, account preferences). Same component,
  // two distinct experiences, so the topbar menu items each land
  // somewhere meaningful instead of opening the same tabbed page.
  const isSettingsView = location.pathname.startsWith('/settings');

  // Keep the visible tab consistent with the route when the user
  // navigates between /profile and /settings without remounting
  // the page (e.g. via the topbar menu).
  useEffect(() => {
    setActiveTab(isSettingsView ? 'password' : 'personal');
  }, [isSettingsView]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [activeTab, setActiveTab] = useState(isSettingsView ? 'password' : 'personal');

  // Discord state
  const [discordStatus, setDiscordStatus] = useState(null);
  const [discordLoading, setDiscordLoading] = useState(false);

  // Profile form state
  const [profileForm, setProfileForm] = useState({
    full_name: '',
    email: '',
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
  const [privacy, setPrivacy] = useState({
    show_on_leaderboard: true,
    allow_birthday_wishes: true,
    profile_visibility: 'public',
  });
  const [privacySaving, setPrivacySaving] = useState(false);

  // Password form state
  const [passwordForm, setPasswordForm] = useState({
    current_password: '',
    new_password: '',
    confirm_password: '',
  });

  // Avatar state
  const [avatarUrl, setAvatarUrl] = useState('');
  const [avatarPreview, setAvatarPreview] = useState('');

  // Validation errors
  const [validationErrors, setValidationErrors] = useState({});

  useEffect(() => {
    fetchProfile();
    fetchDiscordStatus();

    // Handle Discord OAuth return
    const params = new URLSearchParams(window.location.search);
    const discordResult = params.get('discord');
    if (discordResult === 'connected') {
      setSuccess('Discord account connected successfully!');
      window.history.replaceState({}, '', window.location.pathname);
      setActiveTab('discord');
      fetchDiscordStatus();
    } else if (discordResult === 'error') {
      setError('Discord connection failed. Please try again.');
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, []);

  const fetchDiscordStatus = async () => {
    try {
      const res = await discordAPI.getStatus();
      setDiscordStatus(res.data.data);
    } catch {
      // Discord not configured or unavailable — silently ignore
    }
  };

  const handleDiscordConnect = () => {
    discordAPI.connect(); // redirects to Discord OAuth
  };

  const handleDiscordDisconnect = async () => {
    try {
      setDiscordLoading(true);
      await discordAPI.disconnect();
      setDiscordStatus({ connected: false, in_server: false, discord_user_id: null });
      setSuccess('Discord account disconnected.');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to disconnect Discord');
    } finally {
      setDiscordLoading(false);
    }
  };

  const fetchProfile = async () => {
    try {
      setLoading(true);
      const response = await profileAPI.getProfile();
      const userData = response.data.data.user;

      setProfileForm({
        full_name: userData.full_name || '',
        email: userData.email || '',
        phone: userData.phone || '',
        bio: userData.bio || '',
        location: userData.location || '',
        website: userData.website || '',
        linkedin_url: userData.linkedin_url || '',
        github_url: userData.github_url || '',
        // DATEONLY comes back as YYYY-MM-DD from the API; if Sequelize
        // hands us a Date object, slice the ISO so the date input
        // accepts it directly.
        date_of_birth: userData.date_of_birth
          ? (typeof userData.date_of_birth === 'string'
              ? userData.date_of_birth.slice(0, 10)
              : new Date(userData.date_of_birth).toISOString().slice(0, 10))
          : '',
        display_name: userData.display_name || '',
        timezone: userData.timezone || (Intl.DateTimeFormat().resolvedOptions().timeZone || ''),
      });
      setPrivacy({
        show_on_leaderboard: userData.privacy_settings?.show_on_leaderboard !== false,
        allow_birthday_wishes: userData.privacy_settings?.allow_birthday_wishes !== false,
        profile_visibility: userData.privacy_settings?.profile_visibility || 'public',
      });

      setAvatarPreview(userData.profile_picture || userData.avatar_url || '');
    } catch (err) {
      console.error('Error fetching profile:', err);
      setError('Failed to load profile');
    } finally {
      setLoading(false);
    }
  };

  const validateProfile = () => {
    const errors = {};

    if (!profileForm.full_name || profileForm.full_name.trim().length < 2) {
      errors.full_name = 'Name must be at least 2 characters';
    }

    if (profileForm.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(profileForm.email)) {
      errors.email = 'Invalid email address';
    }

    if (profileForm.website && !profileForm.website.match(/^https?:\/\/.+/)) {
      errors.website = 'Website must start with http:// or https://';
    }

    if (profileForm.linkedin_url && !profileForm.linkedin_url.match(/linkedin\.com/)) {
      errors.linkedin_url = 'Invalid LinkedIn URL';
    }

    if (profileForm.github_url && !profileForm.github_url.match(/github\.com/)) {
      errors.github_url = 'Invalid GitHub URL';
    }

    if (profileForm.phone && !/^\+?[\d\s\-().]{7,20}$/.test(profileForm.phone)) {
      errors.phone = 'Invalid phone number format';
    }

    return errors;
  };

  const handleProfileUpdate = async (e) => {
    e.preventDefault();

    const errors = validateProfile();
    if (Object.keys(errors).length > 0) {
      setValidationErrors(errors);
      return;
    }

    try {
      setSaving(true);
      setError('');
      setSuccess('');

      await profileAPI.updateProfile(profileForm);

      // Update user context
      updateUser({ ...user, full_name: profileForm.full_name });

      setSuccess('Profile updated successfully!');
      setTimeout(() => setSuccess(''), 5000);
    } catch (err) {
      console.error('Error updating profile:', err);
      setError(err.response?.data?.message || 'Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  const validatePassword = () => {
    const errors = {};

    if (!passwordForm.current_password) {
      errors.current_password = 'Current password is required';
    }

    if (!passwordForm.new_password) {
      errors.new_password = 'New password is required';
    } else if (passwordForm.new_password.length < 8) {
      errors.new_password = 'Password must be at least 8 characters';
    }

    if (passwordForm.new_password !== passwordForm.confirm_password) {
      errors.confirm_password = 'Passwords do not match';
    }

    return errors;
  };

  const handlePasswordChange = async (e) => {
    e.preventDefault();

    const errors = validatePassword();
    if (Object.keys(errors).length > 0) {
      setValidationErrors(errors);
      return;
    }

    try {
      setSaving(true);
      setError('');
      setSuccess('');

      await profileAPI.changePassword({
        current_password: passwordForm.current_password,
        new_password: passwordForm.new_password,
      });

      setSuccess('Password changed successfully!');
      setPasswordForm({
        current_password: '',
        new_password: '',
        confirm_password: '',
      });
      setTimeout(() => setSuccess(''), 5000);
    } catch (err) {
      console.error('Error changing password:', err);
      setError(err.response?.data?.message || 'Failed to change password');
    } finally {
      setSaving(false);
    }
  };

  const handleAvatarUpdate = async () => {
    if (!avatarUrl) {
      setError('Please enter an avatar URL');
      return;
    }

    try {
      setSaving(true);
      setError('');
      setSuccess('');

      await profileAPI.updateAvatar(avatarUrl);
      setAvatarPreview(avatarUrl);
      setAvatarUrl('');

      setSuccess('Avatar updated successfully!');
      setTimeout(() => setSuccess(''), 5000);
    } catch (err) {
      console.error('Error updating avatar:', err);
      setError(err.response?.data?.message || 'Failed to update avatar');
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      {/* Page Header */}
      <div className="bg-gradient-to-br from-brand-blue via-brand-purple to-brand-red relative overflow-hidden">
        {/* Animated background elements */}
        <div className="absolute -top-32 -right-32 w-96 h-96 bg-white/10 rounded-full blur-3xl animate-float" />
        <div className="absolute -bottom-32 -left-32 w-96 h-96 bg-white/10 rounded-full blur-3xl animate-float-delayed" />

        <div className="relative z-10 py-12 sm:py-16">
          <Container>
            <div className="flex items-center gap-4 mb-3">
              <div className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center">
                {isSettingsView ? <Lock className="h-6 w-6 text-white" /> : <User className="h-6 w-6 text-white" />}
              </div>
              <div>
                <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white animate-fade-in">
                  {isSettingsView ? 'Settings' : 'Profile'}
                </h1>
                <p className="text-lg text-white/90 animate-fade-in mt-1">
                  {isSettingsView
                    ? 'Password, integrations, and account preferences'
                    : 'Your personal details — name, picture, bio, and how to reach you'}
                </p>
              </div>
            </div>
          </Container>
        </div>
      </div>

      <Container className="py-8">
        {/* Loading State */}
        {loading && (
          <div className="flex flex-col items-center justify-center py-20">
            <Spinner size="lg" />
            <p className="mt-4 text-gray-600 dark:text-text-dark-secondary font-medium transition-colors">
              Loading profile...
            </p>
          </div>
        )}

        {!loading && (
          <>
            {/* Success/Error Messages */}
            {success && (
              <div className="mb-6 animate-slide-up">
                <Alert variant="success" onClose={() => setSuccess('')}>
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4" />
                    {success}
                  </div>
                </Alert>
              </div>
            )}

            {error && (
              <div className="mb-6 animate-slide-up">
                <Alert variant="danger" onClose={() => setError('')}>
                  {error}
                </Alert>
              </div>
            )}

            {/* Tabs — only show the ones that belong to the current
                view. /profile keeps a single Personal Information tab
                (no need for a chrome row at all); /settings shows
                Password + Discord. Keeps the two URLs feeling like
                genuinely different pages. */}
            {isSettingsView && (
              <div className="flex flex-wrap gap-4 mb-6 border-b border-gray-200 dark:border-border-dark transition-colors">
                {[
                  { id: 'password',      label: 'Security' },
                  { id: 'notifications', label: 'Notifications' },
                  { id: 'privacy',       label: 'Privacy' },
                  { id: 'discord',       label: 'Discord' },
                ].map((t) => (
                  <button
                    key={t.id}
                    onClick={() => {
                      setActiveTab(t.id);
                      if (t.id === 'discord') fetchDiscordStatus();
                    }}
                    className={cn(
                      'px-4 py-3 font-medium transition-colors border-b-2',
                      activeTab === t.id
                        ? (t.id === 'discord'
                            ? 'text-[#5865F2] border-[#5865F2]'
                            : 'text-brand-blue border-brand-blue')
                        : 'text-gray-600 dark:text-text-dark-muted border-transparent hover:text-gray-900 dark:hover:text-text-dark-primary'
                    )}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
            )}

            {/* Notifications tab */}
            {isSettingsView && activeTab === 'notifications' && (
              <NotificationPreferences />
            )}

            {/* Privacy tab */}
            {isSettingsView && activeTab === 'privacy' && (
              <div className="bg-white dark:bg-dark-800 rounded-xl border border-gray-200 dark:border-border-dark p-6 space-y-5">
                <div>
                  <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Privacy</h2>
                  <p className="text-sm text-gray-500 dark:text-text-dark-muted">
                    Control how visible you are and what others can do.
                  </p>
                </div>

                {[
                  { key: 'show_on_leaderboard',  label: 'Show me on leaderboards', desc: 'Hide your row from public ranking pages.' },
                  { key: 'allow_birthday_wishes', label: 'Allow birthday wishes from classmates', desc: 'When off, only the system note from Page Innovation is sent on your birthday.' },
                ].map((row) => (
                  <div key={row.key} className="flex items-start justify-between gap-4 py-2 border-t first:border-t-0 border-gray-100 dark:border-border-dark">
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-900 dark:text-white">{row.label}</p>
                      <p className="text-xs text-gray-500 dark:text-text-dark-muted">{row.desc}</p>
                    </div>
                    <button
                      type="button"
                      role="switch"
                      aria-checked={!!privacy[row.key]}
                      aria-label={row.label}
                      disabled={privacySaving}
                      onClick={async () => {
                        const next = { ...privacy, [row.key]: !privacy[row.key] };
                        setPrivacy(next);
                        setPrivacySaving(true);
                        try {
                          await profileAPI.updateProfile({ privacy_settings: { [row.key]: next[row.key] } });
                        } catch (e) {
                          setPrivacy(privacy);
                          setError(e?.response?.data?.message || 'Could not save');
                        } finally {
                          setPrivacySaving(false);
                        }
                      }}
                      className={cn(
                        'relative inline-flex h-5 w-9 items-center rounded-full transition-colors shrink-0 mt-1',
                        privacy[row.key] ? 'bg-brand-blue' : 'bg-gray-300 dark:bg-dark-600'
                      )}
                    >
                      <span className={cn('inline-block h-4 w-4 transform rounded-full bg-white transition-transform', privacy[row.key] ? 'translate-x-4' : 'translate-x-0.5')} />
                    </button>
                  </div>
                ))}

                <div className="pt-3 border-t border-gray-100 dark:border-border-dark">
                  <label className="block text-sm font-medium text-gray-900 dark:text-white mb-2">Profile visibility</label>
                  <select
                    value={privacy.profile_visibility}
                    onChange={async (e) => {
                      const v = e.target.value;
                      setPrivacy((p) => ({ ...p, profile_visibility: v }));
                      try {
                        await profileAPI.updateProfile({ privacy_settings: { profile_visibility: v } });
                      } catch (err) {
                        setError(err?.response?.data?.message || 'Could not save');
                      }
                    }}
                    className="w-full px-4 py-2.5 bg-white dark:bg-dark-700 border border-gray-300 dark:border-border-dark rounded-lg text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-blue"
                  >
                    <option value="public">Public — anyone can view my profile</option>
                    <option value="members">Members only — only signed-in Page Innovation users</option>
                    <option value="private">Private — only my instructors / classmates</option>
                  </select>
                </div>
              </div>
            )}

            {/* Personal Information Tab */}
            {activeTab === 'personal' && (
              <div className="space-y-6">
                {/* Avatar Section */}
                <div className="bg-white dark:bg-dark-800 rounded-xl p-6 border border-gray-200 dark:border-border-dark transition-colors">
                  <h2 className="text-lg font-semibold text-gray-900 dark:text-text-dark-primary mb-4 transition-colors">
                    Profile Picture
                  </h2>
                  <div className="flex items-center gap-6">
                    {/* Avatar Preview */}
                    <div className="relative">
                      {avatarPreview ? (
                        <img
                          src={avatarPreview}
                          alt="Profile"
                          className="w-24 h-24 rounded-full object-cover"
                        />
                      ) : (
                        <div className="w-24 h-24 rounded-full bg-gradient-to-br from-brand-blue to-brand-purple flex items-center justify-center">
                          <span className="text-white font-medium text-3xl">
                            {user?.full_name?.charAt(0).toUpperCase() || '?'}
                          </span>
                        </div>
                      )}
                      <div className="absolute bottom-0 right-0 bg-brand-blue rounded-full p-2">
                        <Camera className="w-4 h-4 text-white" />
                      </div>
                    </div>

                    {/* Profile Picture Upload */}
                    <div className="flex-1">
                      <CloudinaryUpload
                        onUploadSuccess={async (url) => {
                          if (!url) return;
                          try {
                            await profileAPI.updateAvatar(url);
                            setAvatarPreview(url);
                            setSuccess('Profile picture updated!');
                            setTimeout(() => setSuccess(''), 5000);
                          } catch {
                            setError('Failed to update profile picture');
                          }
                        }}
                        onUploadError={(err) => setError(err)}
                        acceptedTypes="image"
                        maxSizeMB={5}
                        currentFile={avatarPreview}
                        uploadEndpoint="/api/upload/profile-picture"
                        folder="pageinnovationlms/avatars"
                      />
                    </div>
                  </div>
                </div>

                {/* Profile Form */}
                <form onSubmit={handleProfileUpdate} className="bg-white dark:bg-dark-800 rounded-xl p-6 border border-gray-200 dark:border-border-dark transition-colors">
                  <h2 className="text-lg font-semibold text-gray-900 dark:text-text-dark-primary mb-4 transition-colors">
                    Basic Information
                  </h2>

                  <div className="space-y-4">
                    {/* Full Name */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-text-dark-secondary mb-2 transition-colors">
                        Full Name *
                      </label>
                      <div className="relative">
                        <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 dark:text-text-dark-muted transition-colors" />
                        <input
                          type="text"
                          value={profileForm.full_name}
                          onChange={(e) => {
                            setProfileForm({ ...profileForm, full_name: e.target.value });
                            setValidationErrors({ ...validationErrors, full_name: '' });
                          }}
                          className={cn(
                            'w-full pl-10 pr-4 py-2.5 bg-white dark:bg-dark-700 text-gray-900 dark:text-text-dark-primary border rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-blue focus:border-transparent transition-all',
                            validationErrors.full_name ? 'border-red-500' : 'border-gray-300 dark:border-border-dark'
                          )}
                          placeholder="John Doe"
                        />
                      </div>
                      {validationErrors.full_name && (
                        <p className="text-red-600 dark:text-red-400 text-sm mt-1 transition-colors">
                          {validationErrors.full_name}
                        </p>
                      )}
                    </div>

                    {/* Email (read-only) */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-text-dark-secondary mb-2 transition-colors">
                        Email
                      </label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 dark:text-text-dark-muted transition-colors" />
                        <input
                          type="email"
                          value={profileForm.email}
                          className="w-full pl-10 pr-4 py-2.5 bg-gray-100 dark:bg-dark-700 text-gray-900 dark:text-text-dark-primary border border-gray-300 dark:border-border-dark rounded-lg cursor-not-allowed transition-all"
                          disabled
                        />
                      </div>
                      <p className="text-gray-500 dark:text-text-dark-muted text-xs mt-1 transition-colors">
                        Email cannot be changed. Contact support if needed.
                      </p>
                    </div>

                    {/* Display name — what shows in chat / leaderboard. */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-text-dark-secondary mb-2 transition-colors">
                        Display Name <span className="text-gray-400 text-xs font-normal">(optional — defaults to your full name)</span>
                      </label>
                      <input
                        type="text"
                        value={profileForm.display_name}
                        onChange={(e) => setProfileForm({ ...profileForm, display_name: e.target.value })}
                        placeholder={profileForm.full_name || 'How you want to appear'}
                        className="w-full px-4 py-2.5 bg-white dark:bg-dark-700 text-gray-900 dark:text-text-dark-primary border border-gray-300 dark:border-border-dark rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-blue focus:border-transparent transition-all"
                      />
                    </div>

                    {/* Timezone — full IANA list with offsets +
                        one-click "use my current timezone" button. */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-text-dark-secondary mb-2 transition-colors">
                        Timezone
                      </label>
                      <TimezoneSelect
                        value={profileForm.timezone}
                        onChange={(v) => setProfileForm({ ...profileForm, timezone: v })}
                      />
                    </div>

                    {/* Date of birth — drives birthday wishes + the
                        in-app celebration modal. Optional. */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-text-dark-secondary mb-2 transition-colors">
                        Date of Birth <span className="text-gray-400 text-xs font-normal">(optional — so we can celebrate with you)</span>
                      </label>
                      <input
                        type="date"
                        value={profileForm.date_of_birth}
                        onChange={(e) => setProfileForm({ ...profileForm, date_of_birth: e.target.value })}
                        className="w-full px-4 py-2.5 bg-white dark:bg-dark-700 text-gray-900 dark:text-text-dark-primary border border-gray-300 dark:border-border-dark rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-blue focus:border-transparent transition-all"
                      />
                    </div>

                    {/* Phone */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-text-dark-secondary mb-2 transition-colors">
                        Phone Number
                      </label>
                      <div className="relative">
                        <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 dark:text-text-dark-muted transition-colors" />
                        <input
                          type="tel"
                          value={profileForm.phone}
                          onChange={(e) => setProfileForm({ ...profileForm, phone: e.target.value })}
                          className="w-full pl-10 pr-4 py-2.5 bg-white dark:bg-dark-700 text-gray-900 dark:text-text-dark-primary border border-gray-300 dark:border-border-dark rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-blue focus:border-transparent transition-all"
                          placeholder="+1 (555) 123-4567"
                        />
                      </div>
                      {validationErrors.phone && (
                        <p className="text-red-500 text-xs mt-1">{validationErrors.phone}</p>
                      )}
                    </div>

                    {/* Bio (for instructors) */}
                    {user?.role === 'instructor' && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-text-dark-secondary mb-2 transition-colors">
                          Bio
                        </label>
                        <textarea
                          value={profileForm.bio}
                          onChange={(e) => setProfileForm({ ...profileForm, bio: e.target.value })}
                          className="w-full px-4 py-2.5 bg-white dark:bg-dark-700 text-gray-900 dark:text-text-dark-primary border border-gray-300 dark:border-border-dark rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-brand-blue focus:border-transparent transition-all"
                          rows={4}
                          placeholder="Tell students about yourself..."
                        />
                      </div>
                    )}

                    {/* Location */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-text-dark-secondary mb-2 transition-colors">
                        Location
                      </label>
                      <div className="relative">
                        <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 dark:text-text-dark-muted transition-colors" />
                        <input
                          type="text"
                          value={profileForm.location}
                          onChange={(e) => setProfileForm({ ...profileForm, location: e.target.value })}
                          className="w-full pl-10 pr-4 py-2.5 bg-white dark:bg-dark-700 text-gray-900 dark:text-text-dark-primary border border-gray-300 dark:border-border-dark rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-blue focus:border-transparent transition-all"
                          placeholder="San Francisco, CA"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Social Links */}
                  <div className="mt-6 pt-6 border-t border-gray-200 dark:border-border-dark transition-colors">
                    <h3 className="text-md font-semibold text-gray-900 dark:text-text-dark-primary mb-4 transition-colors">
                      Social Links
                    </h3>

                    <div className="space-y-4">
                      {/* Website */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-text-dark-secondary mb-2 transition-colors">
                          Website
                        </label>
                        <div className="relative">
                          <Globe className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 dark:text-text-dark-muted transition-colors" />
                          <input
                            type="url"
                            value={profileForm.website}
                            onChange={(e) => {
                              setProfileForm({ ...profileForm, website: e.target.value });
                              setValidationErrors({ ...validationErrors, website: '' });
                            }}
                            className={cn(
                              'w-full pl-10 pr-4 py-2.5 bg-white dark:bg-dark-700 text-gray-900 dark:text-text-dark-primary border rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-blue focus:border-transparent transition-all',
                              validationErrors.website ? 'border-red-500' : 'border-gray-300 dark:border-border-dark'
                            )}
                            placeholder="https://yourwebsite.com"
                          />
                        </div>
                        {validationErrors.website && (
                          <p className="text-red-600 dark:text-red-400 text-sm mt-1 transition-colors">
                            {validationErrors.website}
                          </p>
                        )}
                      </div>

                      {/* LinkedIn */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-text-dark-secondary mb-2 transition-colors">
                          LinkedIn
                        </label>
                        <div className="relative">
                          <Linkedin className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 dark:text-text-dark-muted transition-colors" />
                          <input
                            type="url"
                            value={profileForm.linkedin_url}
                            onChange={(e) => {
                              setProfileForm({ ...profileForm, linkedin_url: e.target.value });
                              setValidationErrors({ ...validationErrors, linkedin_url: '' });
                            }}
                            className={cn(
                              'w-full pl-10 pr-4 py-2.5 bg-white dark:bg-dark-700 text-gray-900 dark:text-text-dark-primary border rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-blue focus:border-transparent transition-all',
                              validationErrors.linkedin_url ? 'border-red-500' : 'border-gray-300 dark:border-border-dark'
                            )}
                            placeholder="https://linkedin.com/in/username"
                          />
                        </div>
                        {validationErrors.linkedin_url && (
                          <p className="text-red-600 dark:text-red-400 text-sm mt-1 transition-colors">
                            {validationErrors.linkedin_url}
                          </p>
                        )}
                      </div>

                      {/* GitHub */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-text-dark-secondary mb-2 transition-colors">
                          GitHub
                        </label>
                        <div className="relative">
                          <Github className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 dark:text-text-dark-muted transition-colors" />
                          <input
                            type="url"
                            value={profileForm.github_url}
                            onChange={(e) => {
                              setProfileForm({ ...profileForm, github_url: e.target.value });
                              setValidationErrors({ ...validationErrors, github_url: '' });
                            }}
                            className={cn(
                              'w-full pl-10 pr-4 py-2.5 bg-white dark:bg-dark-700 text-gray-900 dark:text-text-dark-primary border rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-blue focus:border-transparent transition-all',
                              validationErrors.github_url ? 'border-red-500' : 'border-gray-300 dark:border-border-dark'
                            )}
                            placeholder="https://github.com/username"
                          />
                        </div>
                        {validationErrors.github_url && (
                          <p className="text-red-600 dark:text-red-400 text-sm mt-1 transition-colors">
                            {validationErrors.github_url}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Save Button */}
                  <div className="flex gap-3 mt-6">
                    <Button
                      type="submit"
                      variant="primary"
                      disabled={saving}
                      loading={saving}
                      leftIcon={<Save className="w-4 h-4" />}
                    >
                      {saving ? 'Saving...' : 'Save Changes'}
                    </Button>
                    <Button
                      type="button"
                      variant="secondary"
                      onClick={() => navigate('/dashboard')}
                    >
                      Cancel
                    </Button>
                  </div>
                </form>
              </div>
            )}

            {/* Discord Tab */}
            {activeTab === 'discord' && (
              <div className="bg-white dark:bg-dark-800 rounded-xl p-6 border border-gray-200 dark:border-border-dark transition-colors">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 rounded-full bg-[#5865F2] flex items-center justify-center flex-shrink-0">
                    <svg className="w-5 h-5 text-white" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057c.002.022.015.043.033.054a19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994a.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03z"/>
                    </svg>
                  </div>
                  <div>
                    <h2 className="text-lg font-semibold text-gray-900 dark:text-text-dark-primary">Discord Community</h2>
                    <p className="text-sm text-gray-500 dark:text-text-dark-muted">Connect your Discord account to join your course channels</p>
                  </div>
                </div>

                {discordStatus === null ? (
                  <div className="text-center py-6 text-gray-500 dark:text-text-dark-muted text-sm">
                    Loading Discord status...
                  </div>
                ) : (
                  <>
                    {discordStatus.connected ? (
                      <div className="space-y-4">
                        <div className="flex items-center gap-3 p-4 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
                          <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400 flex-shrink-0" />
                          <div>
                            <p className="text-green-800 dark:text-green-300 font-medium text-sm">Discord Connected</p>
                            <p className="text-green-700 dark:text-green-400 text-xs mt-0.5">
                              {discordStatus.in_server ? 'You are in the Page Innovation Discord server' : 'Account linked — join any course to get a channel invite'}
                            </p>
                          </div>
                        </div>

                        <div className="bg-[#5865F2]/10 rounded-lg p-4 text-sm text-gray-700 dark:text-text-dark-secondary">
                          <p className="font-medium mb-1">What happens next:</p>
                          <ul className="list-disc list-inside space-y-1 text-gray-600 dark:text-text-dark-muted">
                            <li>When you enroll in a course, you'll be auto-assigned to its Discord channel</li>
                            <li>Fully-paid students also get access to the Interview Prep channel</li>
                            <li>If you lose access to a course, you'll be removed from its Discord channel</li>
                          </ul>
                        </div>

                        <button
                          onClick={handleDiscordDisconnect}
                          disabled={discordLoading}
                          className="text-sm text-red-600 dark:text-red-400 hover:underline disabled:opacity-50"
                        >
                          {discordLoading ? 'Disconnecting...' : 'Disconnect Discord account'}
                        </button>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        <div className="bg-[#5865F2]/10 rounded-lg p-4 text-sm text-gray-700 dark:text-text-dark-secondary">
                          <p className="font-medium mb-2">Why connect Discord?</p>
                          <ul className="list-disc list-inside space-y-1 text-gray-600 dark:text-text-dark-muted">
                            <li>Get auto-invited to your course's private Discord channel on enrollment</li>
                            <li>Chat with classmates and your instructor in real-time</li>
                            <li>Access the Interview Prep room (fully-paid students)</li>
                            <li>Stay connected with your cohort</li>
                          </ul>
                        </div>

                        <button
                          onClick={handleDiscordConnect}
                          className="flex items-center gap-2 px-5 py-2.5 bg-[#5865F2] hover:bg-[#4752C4] text-white font-medium rounded-lg transition-colors text-sm"
                        >
                          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057c.002.022.015.043.033.054a19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994a.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03z"/>
                          </svg>
                          Connect Discord Account
                        </button>
                      </div>
                    )}
                  </>
                )}
              </div>
            )}

            {/* Password Tab */}
            {activeTab === 'password' && (
              <>
              <form onSubmit={handlePasswordChange} className="bg-white dark:bg-dark-800 rounded-xl p-6 border border-gray-200 dark:border-border-dark transition-colors">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-text-dark-primary mb-4 transition-colors">
                  Change Password
                </h2>

                <div className="space-y-4">
                  {/* Current Password */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-text-dark-secondary mb-2 transition-colors">
                      Current Password *
                    </label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 dark:text-text-dark-muted transition-colors" />
                      <input
                        type="password"
                        value={passwordForm.current_password}
                        onChange={(e) => {
                          setPasswordForm({ ...passwordForm, current_password: e.target.value });
                          setValidationErrors({ ...validationErrors, current_password: '' });
                        }}
                        className={cn(
                          'w-full pl-10 pr-4 py-2.5 bg-white dark:bg-dark-700 text-gray-900 dark:text-text-dark-primary border rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-blue focus:border-transparent transition-all',
                          validationErrors.current_password ? 'border-red-500' : 'border-gray-300 dark:border-border-dark'
                        )}
                        placeholder="Enter current password"
                      />
                    </div>
                    {validationErrors.current_password && (
                      <p className="text-red-600 dark:text-red-400 text-sm mt-1 transition-colors">
                        {validationErrors.current_password}
                      </p>
                    )}
                  </div>

                  {/* New Password */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-text-dark-secondary mb-2 transition-colors">
                      New Password *
                    </label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 dark:text-text-dark-muted transition-colors" />
                      <input
                        type="password"
                        value={passwordForm.new_password}
                        onChange={(e) => {
                          setPasswordForm({ ...passwordForm, new_password: e.target.value });
                          setValidationErrors({ ...validationErrors, new_password: '' });
                        }}
                        className={cn(
                          'w-full pl-10 pr-4 py-2.5 bg-white dark:bg-dark-700 text-gray-900 dark:text-text-dark-primary border rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-blue focus:border-transparent transition-all',
                          validationErrors.new_password ? 'border-red-500' : 'border-gray-300 dark:border-border-dark'
                        )}
                        placeholder="Enter new password"
                      />
                    </div>
                    {validationErrors.new_password && (
                      <p className="text-red-600 dark:text-red-400 text-sm mt-1 transition-colors">
                        {validationErrors.new_password}
                      </p>
                    )}
                  </div>

                  {/* Confirm Password */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-text-dark-secondary mb-2 transition-colors">
                      Confirm New Password *
                    </label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 dark:text-text-dark-muted transition-colors" />
                      <input
                        type="password"
                        value={passwordForm.confirm_password}
                        onChange={(e) => {
                          setPasswordForm({ ...passwordForm, confirm_password: e.target.value });
                          setValidationErrors({ ...validationErrors, confirm_password: '' });
                        }}
                        className={cn(
                          'w-full pl-10 pr-4 py-2.5 bg-white dark:bg-dark-700 text-gray-900 dark:text-text-dark-primary border rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-blue focus:border-transparent transition-all',
                          validationErrors.confirm_password ? 'border-red-500' : 'border-gray-300 dark:border-border-dark'
                        )}
                        placeholder="Confirm new password"
                      />
                    </div>
                    {validationErrors.confirm_password && (
                      <p className="text-red-600 dark:text-red-400 text-sm mt-1 transition-colors">
                        {validationErrors.confirm_password}
                      </p>
                    )}
                  </div>

                  {/* Info */}
                  <div className="bg-blue-50 dark:bg-brand-blue/10 rounded-lg p-4 transition-colors">
                    <div className="flex gap-3">
                      <AlertCircle className="w-5 h-5 text-blue-600 dark:text-brand-blue flex-shrink-0 mt-0.5 transition-colors" />
                      <div>
                        <p className="text-blue-800 dark:text-brand-blue font-medium text-sm transition-colors">
                          Password Requirements
                        </p>
                        <ul className="text-blue-700 dark:text-blue-300 text-sm mt-1 list-disc list-inside transition-colors">
                          <li>At least 6 characters long</li>
                          <li>Cannot be your email address</li>
                        </ul>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Save Button */}
                <div className="flex gap-3 mt-6">
                  <Button
                    type="submit"
                    variant="primary"
                    disabled={saving}
                    loading={saving}
                    leftIcon={<Save className="w-4 h-4" />}
                  >
                    {saving ? 'Changing...' : 'Change Password'}
                  </Button>
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => {
                      setPasswordForm({
                        current_password: '',
                        new_password: '',
                        confirm_password: '',
                      });
                      setValidationErrors({});
                    }}
                  >
                    Clear
                  </Button>
                </div>
              </form>

              {/* 2FA Section */}
              <div className="mt-6">
                <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-3">Account Security</h3>
                <TwoFactorSettings />
              </div>
              </>
            )}
          </>
        )}
      </Container>
    </>
  );
}
