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

    // Page Innovations = black / white / red. No literal blue-* here.
    const variants = {
      // Light: ink (black) button. Dark: brand red (ink vanishes on the
      // neutral-dark surfaces; red is the signature CTA).
      primary:
        'bg-brand-blue text-white hover:bg-brand-blue-600 active:bg-brand-blue-700 focus:ring-brand-blue-500 shadow-sm hover:shadow-md dark:bg-brand-red dark:hover:bg-brand-red-600 dark:active:bg-brand-red-700 dark:focus:ring-brand-red-500',
      secondary:
        'bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-white hover:bg-gray-300 dark:hover:bg-gray-600 active:bg-gray-400 dark:active:bg-gray-500 focus:ring-gray-400 dark:focus:ring-gray-500 shadow-sm hover:shadow-md',
      danger:
        'bg-brand-red text-white hover:bg-brand-red-600 active:bg-brand-red-700 focus:ring-brand-red-500 shadow-sm hover:shadow-md',
      success:
        'bg-green-600 dark:bg-green-500 text-white hover:bg-green-700 dark:hover:bg-green-600 active:bg-green-800 dark:active:bg-green-700 focus:ring-green-500 dark:focus:ring-green-400 shadow-sm hover:shadow-md',
      // Ink outline in light; white glassmorphism in dark (navy/blue would
      // vanish on the near-black surfaces).
      outline:
        'bg-transparent border-2 border-brand-blue text-brand-blue hover:bg-brand-blue hover:text-white active:bg-brand-blue-700 focus:ring-brand-blue-500 dark:border-white/30 dark:text-white dark:hover:bg-white/10 dark:hover:border-white/40',
      ghost:
        'bg-transparent text-brand-blue hover:bg-gray-100 active:bg-gray-200 focus:ring-brand-blue-500 dark:text-white dark:hover:bg-white/10',
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
