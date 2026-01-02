import { cn } from '../../utils/cn';

/**
 * Card Component - Beautiful container for content with full dark mode support
 *
 * Variants:
 * - default: Standard card with shadow
 * - bordered: Card with border instead of shadow
 * - elevated: Card with larger shadow
 */
const Card = ({
  children,
  variant = 'default',
  hover = false,
  padding = true,
  className,
  ...props
}) => {
  const baseStyles = 'bg-white dark:bg-dark-800 rounded-lg transition-all duration-200';

  const variants = {
    default: 'shadow-md dark:shadow-lg dark:shadow-black/20',
    bordered: 'border border-gray-200 dark:border-gray-700',
    elevated: 'shadow-lg dark:shadow-xl dark:shadow-black/30',
  };

  const hoverStyles = hover
    ? 'hover:shadow-xl dark:hover:shadow-2xl dark:hover:shadow-black/40 hover:-translate-y-0.5 cursor-pointer'
    : '';

  const paddingStyles = padding ? 'p-6' : '';

  return (
    <div
      className={cn(
        baseStyles,
        variants[variant],
        hoverStyles,
        paddingStyles,
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
};

// Card Sub-components
Card.Header = ({ children, className, ...props }) => (
  <div className={cn('mb-4', className)} {...props}>
    {children}
  </div>
);

Card.Title = ({ children, className, ...props }) => (
  <h3 className={cn('text-xl font-semibold text-gray-900 dark:text-white', className)} {...props}>
    {children}
  </h3>
);

Card.Description = ({ children, className, ...props }) => (
  <p className={cn('text-sm text-gray-600 dark:text-gray-400 mt-1', className)} {...props}>
    {children}
  </p>
);

Card.Body = ({ children, className, ...props }) => (
  <div className={cn('', className)} {...props}>
    {children}
  </div>
);

Card.Footer = ({ children, className, ...props}) => (
  <div className={cn('mt-4 pt-4 border-t border-gray-200 dark:border-gray-700', className)} {...props}>
    {children}
  </div>
);

export { Card };
export default Card;
