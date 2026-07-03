import { useMemo, useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ChevronDown } from 'lucide-react';
import { cn } from '../../utils/cn';
import logo from '../../assets/logo.png';
import { isFeatureOn } from '../../config/featureFlags';

/**
 * Sidebar
 *
 * Renders a hybrid navigation: flat items at the top level (one-click
 * access to daily-used pages) and collapsible groups for less-frequent
 * sections.
 *
 * Items in `items` come in two shapes:
 *   - { type: 'item', label, path, icon, feature? }
 *   - { type: 'group', label, icon, children: [item, item, ...] }
 *
 * Backwards-compat: items without a `type` are treated as flat items, so
 * pages that happen to pass through a plain { path, label, icon } still
 * render correctly.
 *
 * Feature flag gating:
 *   - Items whose `feature` flag is off are filtered out.
 *   - Groups whose every child is filtered out disappear too — the sidebar
 *     never shows an empty section header.
 *
 * Group behavior:
 *   - Click label or chevron to expand / collapse.
 *   - State persists per-group in localStorage (key namespaced
 *     `frontend.sidebar.openGroups.v1` so it doesn't collide with admin).
 *   - The group whose child matches the current route is auto-expanded
 *     on load.
 */

const LS_KEY = 'frontend.sidebar.openGroups.v1';

function loadOpenGroups() {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return typeof parsed === 'object' && parsed ? parsed : {};
  } catch {
    return {};
  }
}

function saveOpenGroups(map) {
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(map));
  } catch { /* localStorage can be unavailable; non-fatal */ }
}

// Strip hidden items + drop fully-empty groups.
function filterNavigation(items) {
  const out = [];
  for (const entry of items) {
    const type = entry.type || 'item';
    if (type === 'item') {
      if (isFeatureOn(entry.feature)) out.push({ ...entry, type: 'item' });
    } else if (type === 'group') {
      const visibleChildren = (entry.children || []).filter((c) => isFeatureOn(c.feature));
      if (visibleChildren.length > 0) {
        out.push({ ...entry, children: visibleChildren });
      }
    }
  }
  return out;
}

const Sidebar = ({ items = [], className, isOpen = false, onClose }) => {
  const location = useLocation();

  const navigation = useMemo(() => filterNavigation(items), [items]);

  const [openGroups, setOpenGroups] = useState(loadOpenGroups);

  useEffect(() => {
    for (const entry of navigation) {
      if (entry.type !== 'group') continue;
      const hasActive = entry.children.some((c) => c.path === location.pathname);
      if (hasActive && !openGroups[entry.label]) {
        setOpenGroups((prev) => {
          const next = { ...prev, [entry.label]: true };
          saveOpenGroups(next);
          return next;
        });
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.pathname, navigation]);

  const toggleGroup = (label) => {
    setOpenGroups((prev) => {
      const next = { ...prev, [label]: !prev[label] };
      saveOpenGroups(next);
      return next;
    });
  };

  const renderItem = (item, opts = {}) => {
    const { nested = false } = opts;
    const isActive = location.pathname === item.path;
    return (
      <li key={item.path}>
        <Link
          to={item.path}
          onClick={() => {
            // Auto-close mobile drawer when navigating
            if (onClose && window.innerWidth < 1024) onClose();
          }}
          className={cn(
            'flex items-center gap-3 rounded-xl font-medium transition-all duration-200',
            nested ? 'pl-8 pr-4 py-2 text-sm' : 'px-4 py-3 text-[15px]',
            isActive
              ? 'bg-brand-blue text-white'
              : 'text-gray-700 dark:text-text-dark-secondary hover:bg-gray-50 dark:hover:bg-dark-700'
          )}
        >
          {item.icon && (
            <span
              className={cn(
                'flex-shrink-0 flex items-center justify-center',
                nested ? 'w-4 h-4' : 'w-5 h-5',
                isActive ? 'text-white' : 'text-gray-600 dark:text-text-dark-muted'
              )}
            >
              {item.icon}
            </span>
          )}
          <span className="flex-1">{item.label}</span>
          {item.badge && (
            <span className="ml-auto px-2.5 py-0.5 text-[11px] font-bold rounded-full uppercase tracking-wide bg-brand-blue text-white">
              {item.badge}
            </span>
          )}
        </Link>
      </li>
    );
  };

  const renderGroup = (group) => {
    const groupOpen = !!openGroups[group.label];
    const hasActiveChild = group.children.some((c) => c.path === location.pathname);
    return (
      <li key={`group:${group.label}`}>
        <button
          type="button"
          onClick={() => toggleGroup(group.label)}
          className={cn(
            'w-full flex items-center gap-3 px-4 py-3 rounded-xl text-[15px] font-medium transition-all duration-200',
            hasActiveChild && !groupOpen
              ? 'bg-gray-100 dark:bg-dark-700 text-gray-900 dark:text-white'
              : 'text-gray-700 dark:text-text-dark-secondary hover:bg-gray-50 dark:hover:bg-dark-700'
          )}
          aria-expanded={groupOpen}
        >
          {group.icon && (
            <span className="flex-shrink-0 w-5 h-5 text-gray-600 dark:text-text-dark-muted">
              {group.icon}
            </span>
          )}
          <span className="flex-1 text-left">{group.label}</span>
          <ChevronDown
            className={cn(
              'w-4 h-4 text-gray-500 dark:text-text-dark-muted transition-transform duration-200',
              groupOpen ? 'rotate-0' : '-rotate-90'
            )}
          />
        </button>
        {groupOpen && (
          <ul className="mt-0.5 mb-1 space-y-0.5">
            {group.children.map((child) => renderItem(child, { nested: true }))}
          </ul>
        )}
      </li>
    );
  };

  return (
    <>
      {/* Mobile Overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          'fixed left-0 top-0 h-screen w-[240px] bg-white dark:bg-dark-800 border-r border-gray-200 dark:border-border-dark flex flex-col shadow-sm transition-all duration-300 z-50',
          // Mobile: slide in/out
          'lg:translate-x-0',
          isOpen ? 'translate-x-0' : '-translate-x-full',
          className
        )}
      >
        {/* Logo */}
        <div className="px-6 py-6">
          <Link to="/" className="flex items-center">
            <img src={logo} alt="Page Innovation" className="h-8 w-auto" />
          </Link>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto px-3 pt-2 pb-4">
          <ul className="space-y-0.5">
            {navigation.map((entry) =>
              entry.type === 'group' ? renderGroup(entry) : renderItem(entry)
            )}
          </ul>
        </nav>
      </aside>
    </>
  );
};

export default Sidebar;
