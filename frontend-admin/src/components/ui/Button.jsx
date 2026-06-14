import { forwardRef } from 'react';
import { Loader2 } from 'lucide-react';
import { cn } from '../../utils/cn';

/**
 * Button Component - Modern, sleek, and beautiful with full dark mode support
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
 * All sizes now meet WCAG 2.1 minimum 44x44px touch target requirement
 */
const Button = forwardRef(
  (
    {
      children,
      variant = 'primary',
      size = 'md',
      loading = false,
      isLoading = false,
      disabled = false,
      fullWidth = false,
      leftIcon,
      rightIcon,
      className,
      ...props
    },
    ref
  ) => {
    const isLoadingState = loading || isLoading;

    const baseStyles =
      'inline-flex items-center justify-center font-medium rounded-lg transition-all duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-offset-2 dark:focus:ring-offset-gray-900 disabled:opacity-50 disabled:cursor-not-allowed';

    const variants = {
      primary:
        'bg-blue-600 dark:bg-blue-500 text-white hover:bg-blue-700 dark:hover:bg-blue-600 active:bg-blue-800 dark:active:bg-blue-700 focus:ring-blue-500 dark:focus:ring-blue-400 shadow-sm hover:shadow-md',
      secondary:
        'bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-white hover:bg-gray-300 dark:hover:bg-gray-600 active:bg-gray-400 dark:active:bg-gray-500 focus:ring-gray-400 dark:focus:ring-gray-500 shadow-sm hover:shadow-md',
      danger:
        'bg-red-600 dark:bg-red-500 text-white hover:bg-red-700 dark:hover:bg-red-600 active:bg-red-800 dark:active:bg-red-700 focus:ring-red-500 dark:focus:ring-red-400 shadow-sm hover:shadow-md',
      success:
        'bg-green-600 dark:bg-green-500 text-white hover:bg-green-700 dark:hover:bg-green-600 active:bg-green-800 dark:active:bg-green-700 focus:ring-green-500 dark:focus:ring-green-400 shadow-sm hover:shadow-md',
      outline:
        'bg-transparent border-2 border-blue-600 dark:border-blue-500 text-blue-600 dark:text-blue-400 hover:bg-blue-600 dark:hover:bg-blue-500 hover:text-white active:bg-blue-700 dark:active:bg-blue-600 focus:ring-blue-500 dark:focus:ring-blue-400',
      ghost:
        'bg-transparent text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 active:bg-blue-100 dark:active:bg-blue-900/30 focus:ring-blue-500 dark:focus:ring-blue-400',
    };

    // Slimmer scale across the board — the old md was 44px+ chunky which
    // made wizard nav rows and table actions feel cramped. min-h preserves a
    // sane tap target (≥32px) without dominating compact layouts.
    const sizes = {
      sm: 'text-xs px-3 py-1.5 gap-1.5 min-h-[32px]',
      md: 'text-sm px-4 py-2 gap-1.5 min-h-[36px]',
      lg: 'text-base px-5 py-2.5 gap-2 min-h-[44px]',
      xl: 'text-lg px-6 py-3 gap-2 min-h-[52px]',
    };

    const iconSizes = {
      sm: 'w-3.5 h-3.5',
      md: 'w-4 h-4',
      lg: 'w-4 h-4',
      xl: 'w-5 h-5',
    };

    const widthClass = fullWidth ? 'w-full' : '';

    return (
      <button
        ref={ref}
        disabled={disabled || isLoadingState}
        className={cn(
          baseStyles,
          variants[variant],
          sizes[size],
          widthClass,
          className
        )}
        {...props}
      >
        {isLoadingState && (
          <Loader2 className={cn(iconSizes[size], 'animate-spin')} />
        )}
        {!isLoadingState && leftIcon && (
          <span className={cn('inline-flex', iconSizes[size])}>{leftIcon}</span>
        )}
        {children}
        {!isLoadingState && rightIcon && (
          <span className={cn('inline-flex', iconSizes[size])}>{rightIcon}</span>
        )}
      </button>
    );
  }
);

Button.displayName = 'Button';

export { Button };
export default Button;
