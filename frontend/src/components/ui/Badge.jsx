import { cn } from '../../utils/cn';

/**
 * Badge Component - Small status indicators
 *
 * Variants: primary, secondary, success, warning, danger, info
 * Sizes: sm, md, lg
 */
const Badge = ({
  children,
  variant = 'primary',
  size = 'md',
  className,
  ...props
}) => {
  const baseStyles =
    'inline-flex items-center justify-center font-medium rounded-full whitespace-nowrap';

  const variants = {
    primary: 'bg-brand-blue-100 text-brand-blue-700',
    secondary: 'bg-gray-200 text-gray-700',
    success: 'bg-green-100 text-green-700',
    warning: 'bg-yellow-100 text-yellow-700',
    danger: 'bg-red-100 text-red-700',
    info: 'bg-blue-100 text-blue-700',
  };

  const sizes = {
    sm: 'text-xs px-2 py-0.5',
    md: 'text-sm px-2.5 py-1',
    lg: 'text-base px-3 py-1.5',
  };

  return (
    <span
      className={cn(baseStyles, variants[variant], sizes[size], className)}
      {...props}
    >
      {children}
    </span>
  );
};

export default Badge;
