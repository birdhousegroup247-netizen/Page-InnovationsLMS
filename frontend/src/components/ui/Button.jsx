import { forwardRef } from 'react';
import { Loader2 } from 'lucide-react';
import { cn } from '../../utils/cn';

/**
 * Button Component - Modern, sleek, and beautiful
 *
 * Variants:
 * - primary: Main brand color (blue)
 * - secondary: Secondary actions (gray)
 * - danger: Destructive actions (red)
 * - success: Success actions (green)
 * - outline: Outlined button
 * - ghost: Minimal button
 *
 * Sizes: sm, md, lg, xl
 */
const Button = forwardRef(
  (
    {
      children,
      variant = 'primary',
      size = 'md',
      loading = false,
      disabled = false,
      fullWidth = false,
      leftIcon,
      rightIcon,
      className,
      ...props
    },
    ref
  ) => {
    const baseStyles =
      'inline-flex items-center justify-center font-medium rounded-lg transition-all duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed';

    const variants = {
      primary:
        'bg-brand-blue text-white hover:bg-brand-blue-600 active:bg-brand-blue-700 focus:ring-brand-blue-500 shadow-sm hover:shadow-md',
      secondary:
        'bg-gray-200 text-text-primary hover:bg-gray-300 active:bg-gray-400 focus:ring-gray-400 shadow-sm hover:shadow-md',
      danger:
        'bg-brand-red text-white hover:bg-brand-red-600 active:bg-brand-red-700 focus:ring-brand-red-500 shadow-sm hover:shadow-md',
      success:
        'bg-success text-white hover:bg-success-dark active:bg-success-dark focus:ring-success shadow-sm hover:shadow-md',
      outline:
        'bg-transparent border-2 border-brand-blue text-brand-blue hover:bg-brand-blue hover:text-white active:bg-brand-blue-700 focus:ring-brand-blue-500',
      ghost:
        'bg-transparent text-brand-blue hover:bg-brand-blue-50 active:bg-brand-blue-100 focus:ring-brand-blue-500',
    };

    // Slimmer scale to match the admin Button — see admin/components/ui/Button.jsx.
    const sizes = {
      sm: 'text-xs px-3 py-1.5 gap-1.5',
      md: 'text-sm px-4 py-2 gap-1.5',
      lg: 'text-base px-5 py-2.5 gap-2',
      xl: 'text-lg px-6 py-3 gap-2',
    };

    const widthClass = fullWidth ? 'w-full' : '';

    return (
      <button
        ref={ref}
        disabled={disabled || loading}
        className={cn(
          baseStyles,
          variants[variant],
          sizes[size],
          widthClass,
          className
        )}
        {...props}
      >
        {loading && (
          <Loader2 className="w-4 h-4 animate-spin" />
        )}
        {!loading && leftIcon && leftIcon}
        {children}
        {!loading && rightIcon && rightIcon}
      </button>
    );
  }
);

Button.displayName = 'Button';

export default Button;
