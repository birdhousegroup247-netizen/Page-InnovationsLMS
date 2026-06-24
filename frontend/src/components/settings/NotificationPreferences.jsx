import { useEffect, useState } from 'react';
import { Bell, Mail } from 'lucide-react';
import { profileAPI } from '../../lib/api';
import { Spinner, Alert } from '../ui';
import { NOTIF_TYPES, ADMIN_NOTIF_TYPES, isOn } from '../../utils/notificationPrefs';

// One card. One row per notification type. Two toggles per row:
// in-app (enforced today by NotificationsController._isAllowed) and
// email (stored now, applied as we wire each email path). Saves
// per-toggle with optimistic UI so it feels instant.
export default function NotificationPreferences({ types = NOTIF_TYPES, headline = 'Notification preferences', subline = 'Choose what you want to be told about, and how.' }) {
  const [prefs, setPrefs] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    (async () => {
      try {
        const res = await profileAPI.getProfile();
        const u = res?.data?.data?.user || res?.data?.data;
        setPrefs(u?.notification_preferences || {});
      } catch (e) {
        setError(e?.response?.data?.message || 'Failed to load preferences');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const toggle = async (key, column) => {
    const next = {
      ...prefs,
      [key]: {
        ...(prefs[key] || {}),
        [column]: !isOn(prefs, key, column),
      },
    };
    setPrefs(next); // optimistic
    try {
      // Send just the diff so other prefs don't get clobbered by
      // an out-of-date local state.
      await profileAPI.updateProfile({
        notification_preferences: { [key]: next[key] },
      });
    } catch (e) {
      // Revert if the save failed.
      setPrefs(prefs);
      setError(e?.response?.data?.message || 'Could not save');
    }
  };

  return (
    <div className="bg-white dark:bg-dark-800 rounded-xl border border-gray-200 dark:border-border-dark p-6">
      <div className="flex items-start justify-between mb-5">
        <div>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">{headline}</h2>
          <p className="text-sm text-gray-500 dark:text-text-dark-muted mt-1">{subline}</p>
        </div>
        <div className="hidden sm:flex items-center gap-6 text-xs uppercase tracking-wider text-gray-400 dark:text-text-dark-muted pt-1">
          <span className="flex items-center gap-1"><Bell className="w-3 h-3" />In-app</span>
          <span className="flex items-center gap-1"><Mail className="w-3 h-3" />Email</span>
        </div>
      </div>

      {error && <Alert variant="danger" onClose={() => setError('')} className="mb-4">{error}</Alert>}

      {loading ? (
        <div className="flex justify-center py-8"><Spinner /></div>
      ) : (
        <div className="divide-y divide-gray-100 dark:divide-border-dark">
          {types.map((t) => (
            <div key={t.key} className="flex items-start sm:items-center justify-between gap-4 py-3">
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-gray-900 dark:text-white">{t.label}</p>
                <p className="text-xs text-gray-500 dark:text-text-dark-muted">{t.description}</p>
              </div>
              <div className="flex items-center gap-3 shrink-0">
                <ToggleSwitch
                  checked={isOn(prefs, t.key, 'in_app')}
                  onChange={() => toggle(t.key, 'in_app')}
                  ariaLabel={`${t.label} in-app`}
                />
                <ToggleSwitch
                  checked={isOn(prefs, t.key, 'email')}
                  onChange={() => toggle(t.key, 'email')}
                  ariaLabel={`${t.label} email`}
                />
              </div>
            </div>
          ))}
        </div>
      )}

      <p className="mt-4 text-[11px] text-gray-400 dark:text-text-dark-muted">
        In-app toggles take effect immediately. Email toggles are saved now and apply as each
        email path is wired up. A few critical types (security, account suspension, payment
        receipts) can't be muted.
      </p>
    </div>
  );
}

// Tiny accessible toggle. Avoids pulling in an extra component.
function ToggleSwitch({ checked, onChange, ariaLabel }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={ariaLabel}
      onClick={onChange}
      className={
        'relative inline-flex h-5 w-9 items-center rounded-full transition-colors ' +
        (checked ? 'bg-brand-blue' : 'bg-gray-300 dark:bg-dark-600')
      }
    >
      <span
        className={
          'inline-block h-4 w-4 transform rounded-full bg-white transition-transform ' +
          (checked ? 'translate-x-4' : 'translate-x-0.5')
        }
      />
    </button>
  );
}

export const NotificationPreferencesAdmin = (props) => (
  <NotificationPreferences
    types={ADMIN_NOTIF_TYPES}
    headline="Admin notification preferences"
    subline="What pings you for admin-only events. Critical alerts always come through."
    {...props}
  />
);
