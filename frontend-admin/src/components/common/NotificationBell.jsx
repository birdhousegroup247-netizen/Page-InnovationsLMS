import { Link } from 'react-router-dom';
import { Bell } from 'lucide-react';

/**
 * NotificationBell - Presentational component for notification icon
 * NOTE: This component accepts unreadCount as a prop to avoid duplicate API polling
 * The parent component (e.g., AppLayout) should handle fetching notification count
 */
export default function NotificationBell({ unreadCount = 0 }) {
  return (
    <Link
      to="/notifications"
      className="relative btn-ghost flex items-center gap-2"
      title="Notifications"
    >
      <Bell className="h-5 w-5" />
      {unreadCount > 0 && (
        <span className="absolute -top-1 -right-1 bg-brand-red text-white text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center">
          {unreadCount > 9 ? '9+' : unreadCount}
        </span>
      )}
    </Link>
  );
}
