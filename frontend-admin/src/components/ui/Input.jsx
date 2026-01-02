import { forwardRef, useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { cn } from '../../utils/cn';

/**
 * Input Component - Modern, sleek text input with full dark mode support
 *
 * Types: text, email, password, number, tel, url, search
 *
 * Features:
 * - Full dark mode support with proper contrast ratios
 * - Password visibility toggle
 * - Left and right icon support
 * - Error states with animations
 * - Helper text
 * - WCAG 2.1 compliant
 */
const Input = forwardRef(
  (
    {
      type = 'text',
      label,
      error,
      helperText,
      leftIcon,
      rightIcon,
      fullWidth = false,
      className,
      containerClassName,
      disabled,
      required,
      ...props
    },
    ref
  ) => {
    const [showPassword, setShowPassword] = useState(false);
    const isPassword = type === 'password';
    const inputType = isPassword && showPassword ? 'text' : type;

    const baseStyles =
      'block w-full px-4 py-2.5 text-base text-gray-900 dark:text-white bg-white dark:bg-dark-800 border rounded-lg transition-all duration-200 placeholder:text-gray-500 dark:placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:border-transparent disabled:cursor-not-allowed';

    const errorStyles = error
      ? 'border-red-500 dark:border-red-400 focus:ring-red-500 dark:focus:ring-red-400'
      : 'border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500 focus:ring-blue-500 dark:focus:ring-blue-400';

    const disabledStyles = disabled
      ? 'bg-gray-100 dark:bg-gray-800 opacity-60'
      : '';

    const iconPadding = leftIcon ? 'pl-11' : rightIcon || isPassword ? 'pr-11' : '';

    return (
      <div className={cn('relative', fullWidth ? 'w-full' : '', containerClassName)}>
        {label && (
          <label className="block text-sm font-medium text-gray-900 dark:text-white mb-2">
            {label}
            {required && <span className="text-red-600 dark:text-red-400 ml-1">*</span>}
          </label>
        )}

        <div className="relative">
          {/* Left Icon */}
          {leftIcon && (
            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 dark:text-gray-400 pointer-events-none">
              {leftIcon}
            </div>
          )}

          {/* Input Field */}
          <input
            ref={ref}
            type={inputType}
            disabled={disabled}
            required={required}
            className={cn(baseStyles, errorStyles, disabledStyles, iconPadding, className)}
            {...props}
          />

          {/* Right Icon or Password Toggle */}
          {isPassword ? (
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 rounded"
              tabIndex={-1}
              aria-label={showPassword ? 'Hide password' : 'Show password'}
            >
              {showPassword ? (
                <EyeOff className="w-5 h-5" />
              ) : (
                <Eye className="w-5 h-5" />
              )}
            </button>
          ) : (
            rightIcon && (
              <div className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 dark:text-gray-400 pointer-events-none">
                {rightIcon}
              </div>
            )
          )}
        </div>

        {/* Error Message */}
        {error && (
          <p className="mt-2 text-sm text-red-600 dark:text-red-400 animate-slide-down">{error}</p>
        )}

        {/* Helper Text */}
        {helperText && !error && (
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">{helperText}</p>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';

export default Input;
