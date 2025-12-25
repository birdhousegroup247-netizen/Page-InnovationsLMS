import { cn } from '../../utils/cn';

/**
 * Card Component - Beautiful container for content
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
  const baseStyles = 'bg-white rounded-lg transition-all duration-200';

  const variants = {
    default: 'shadow-md',
    bordered: 'border border-border',
    elevated: 'shadow-lg',
  };

  const hoverStyles = hover
    ? 'hover:shadow-xl hover:-translate-y-0.5 cursor-pointer'
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
  <h3 className={cn('text-xl font-semibold text-text-primary', className)} {...props}>
    {children}
  </h3>
);

Card.Description = ({ children, className, ...props }) => (
  <p className={cn('text-sm text-text-secondary mt-1', className)} {...props}>
    {children}
  </p>
);

Card.Body = ({ children, className, ...props }) => (
  <div className={cn('', className)} {...props}>
    {children}
  </div>
);

Card.Footer = ({ children, className, ...props}) => (
  <div className={cn('mt-4 pt-4 border-t border-border', className)} {...props}>
    {children}
  </div>
);

export default Card;
