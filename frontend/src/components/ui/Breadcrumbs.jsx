import { ChevronRight, Home } from 'lucide-react';
import { Link } from 'react-router-dom';
import { cn } from '../../utils/cn';

/**
 * Breadcrumbs Component - Navigation breadcrumbs
 *
 * Usage:
 * <Breadcrumbs>
 *   <Breadcrumbs.Item href="/">Home</Breadcrumbs.Item>
 *   <Breadcrumbs.Item href="/courses">Courses</Breadcrumbs.Item>
 *   <Breadcrumbs.Item current>React Course</Breadcrumbs.Item>
 * </Breadcrumbs>
 */
const Breadcrumbs = ({ children, separator, className }) => {
  const Separator = separator || <ChevronRight className="w-4 h-4 text-text-muted dark:text-text-dark-muted" />;

  const childrenArray = Array.isArray(children) ? children : [children];

  return (
    <nav aria-label="Breadcrumb" className={cn('flex items-center', className)}>
      <ol className="flex items-center gap-2">
        {childrenArray.map((child, index) => (
          <li key={index} className="flex items-center gap-2">
            {child}
            {index < childrenArray.length - 1 && (
              <span className="flex items-center">{Separator}</span>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
};

// Breadcrumb Item
Breadcrumbs.Item = ({ children, href, current, icon: Icon, className }) => {
  const content = (
    <span
      className={cn(
        'flex items-center gap-1.5 text-sm font-medium transition-colors',
        current
          ? 'text-text-primary dark:text-text-dark-primary cursor-default'
          : 'text-text-muted dark:text-text-dark-muted hover:text-text-primary dark:text-text-dark-primary',
        className
      )}
    >
      {Icon && <Icon className="w-4 h-4" />}
      {children}
    </span>
  );

  if (current || !href) {
    return content;
  }

  return (
    <Link to={href} className="hover:underline">
      {content}
    </Link>
  );
};

// Home Breadcrumb Item (shortcut)
Breadcrumbs.Home = ({ href = '/', className }) => {
  return (
    <Breadcrumbs.Item href={href} icon={Home} className={className}>
      Home
    </Breadcrumbs.Item>
  );
};

export default Breadcrumbs;
