import { forwardRef } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { cn } from '../../utils/cn';
import { useState } from 'react';

/**
 * Input Component - Modern, sleek text input
 *
 * Types: text, email, password, number, tel, url, search
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
      ...props
    },
    ref
  ) => {
    const [showPassword, setShowPassword] = useState(false);
    const isPassword = type === 'password';
    const inputType = isPassword && showPassword ? 'text' : type;

    const baseStyles =
      'block w-full px-4 py-2.5 text-base text-text-primary bg-white border rounded-lg transition-all duration-200 placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-brand-blue-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed';

    const errorStyles = error
      ? 'border-brand-red focus:ring-brand-red-500'
      : 'border-border hover:border-gray-300';

    const iconPadding = leftIcon ? 'pl-11' : rightIcon || isPassword ? 'pr-11' : '';

    return (
      <div className={cn('relative', fullWidth ? 'w-full' : '', containerClassName)}>
        {label && (
          <label className="block text-sm font-medium text-text-primary mb-1.5">
            {label}
            {props.required && <span className="text-brand-red ml-1">*</span>}
          </label>
        )}

        <div className="relative">
          {/* Left Icon */}
          {leftIcon && (
            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted">
              {leftIcon}
            </div>
          )}

          {/* Input Field */}
          <input
            ref={ref}
            type={inputType}
            className={cn(baseStyles, errorStyles, iconPadding, className)}
            {...props}
          />

          {/* Right Icon or Password Toggle */}
          {isPassword ? (
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-primary transition-colors"
              tabIndex={-1}
            >
              {showPassword ? (
                <EyeOff className="w-5 h-5" />
              ) : (
                <Eye className="w-5 h-5" />
              )}
            </button>
          ) : (
            rightIcon && (
              <div className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted">
                {rightIcon}
              </div>
            )
          )}
        </div>

        {/* Error Message */}
        {error && (
          <p className="mt-1.5 text-sm text-brand-red animate-slide-down">{error}</p>
        )}

        {/* Helper Text */}
        {helperText && !error && (
          <p className="mt-1.5 text-sm text-text-muted">{helperText}</p>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';

export default Input;
