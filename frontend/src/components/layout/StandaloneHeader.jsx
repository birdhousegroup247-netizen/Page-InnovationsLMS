import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import Logo from '../ui/Logo';

/**
 * Top bar for pages that render outside AppLayout (checkout, players,
 * anything full-screen). Mirrors the CoursePlayer header so every
 * standalone page reads the same: icon back button, logo, divider,
 * title + subtitle on the left; free-form slot on the right.
 *
 * @param {string}  [backTo]   path for the back button; omit to use history back
 * @param {string}  title      page name, always visible
 * @param {string}  [subtitle] one-line context under the title (course name, step)
 * @param {node}    [right]    right-aligned content (badge, button)
 */
export default function StandaloneHeader({ backTo, title, subtitle, right }) {
  const navigate = useNavigate();

  const backButtonClass =
    'p-2 rounded-lg text-gray-600 dark:text-text-dark-secondary hover:bg-gray-100 dark:hover:bg-dark-700 transition-colors flex-shrink-0';

  return (
    <header className="bg-white dark:bg-dark-800 border-b border-gray-200 dark:border-border-dark sticky top-0 z-50 transition-colors">
      <div className="flex items-center justify-between gap-3 px-4 py-3">
        <div className="flex items-center gap-3 min-w-0">
          {backTo ? (
            <Link to={backTo} className={backButtonClass} title="Back" aria-label="Back">
              <ArrowLeft className="h-5 w-5" />
            </Link>
          ) : (
            <button onClick={() => navigate(-1)} className={backButtonClass} title="Back" aria-label="Back">
              <ArrowLeft className="h-5 w-5" />
            </button>
          )}
          <Link to="/dashboard" className="hidden sm:flex items-center flex-shrink-0">
            <Logo className="h-8 w-auto" />
          </Link>
          <div className="hidden sm:block w-px h-8 bg-gray-200 dark:bg-border-dark flex-shrink-0" />
          <div className="min-w-0">
            <h1 className="text-sm sm:text-base font-semibold text-gray-900 dark:text-text-dark-primary truncate transition-colors">
              {title}
            </h1>
            {subtitle && (
              <p className="text-xs text-gray-500 dark:text-text-dark-muted truncate transition-colors">
                {subtitle}
              </p>
            )}
          </div>
        </div>

        {right && <div className="flex-shrink-0">{right}</div>}
      </div>
    </header>
  );
}
