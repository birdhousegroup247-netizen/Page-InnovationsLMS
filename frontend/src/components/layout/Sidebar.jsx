import { Link, useLocation } from 'react-router-dom';
import { cn } from '../../utils/cn';
import logo from '../../assets/logo.png';

/**
 * Sidebar Component - Modern navigation sidebar
 * Based on FUSELearn design - clean, minimal, elegant
 * Responsive: Hidden on mobile, visible on desktop
 */
const Sidebar = ({ items = [], className, isOpen = false, onClose }) => {
  const location = useLocation();

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
          'fixed left-0 top-0 h-screen w-[220px] bg-white dark:bg-dark-800 border-r border-gray-200 dark:border-border-dark flex flex-col shadow-sm transition-all duration-300 z-50',
          // Mobile: slide in/out
          'lg:translate-x-0',
          isOpen ? 'translate-x-0' : '-translate-x-full',
          className
        )}
      >
        {/* Logo */}
        <div className="px-6 py-6">
          <Link to="/" className="flex items-center">
            <img src={logo} alt="TekyPro" className="h-8 w-auto" />
          </Link>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto px-4 pt-2">
          <ul className="space-y-0.5">
            {items.map((item) => {
              const isActive = location.pathname === item.path;

              return (
                <li key={item.path}>
                  <Link
                    to={item.path}
                    className={cn(
                      'flex items-center gap-3 px-4 py-3 rounded-xl text-[15px] font-medium transition-all duration-200',
                      isActive
                        ? 'bg-brand-blue text-white'
                        : 'text-gray-700 dark:text-text-dark-secondary hover:bg-gray-50 dark:hover:bg-dark-700'
                    )}
                  >
                    {item.icon && (
                      <span className={cn('flex-shrink-0 w-5 h-5', isActive ? 'text-white' : 'text-gray-600 dark:text-text-dark-muted')}>
                        {item.icon}
                      </span>
                    )}
                    <span className="flex-1">{item.label}</span>
                    {item.badge && (
                      <span
                        className={cn(
                          'ml-auto px-2.5 py-0.5 text-[11px] font-bold rounded-full uppercase tracking-wide',
                          'bg-brand-blue text-white'
                        )}
                      >
                        {item.badge}
                      </span>
                    )}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
      </aside>
    </>
  );
};

export default Sidebar;
