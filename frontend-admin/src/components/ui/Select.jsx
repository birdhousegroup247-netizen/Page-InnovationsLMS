import { forwardRef } from 'react';
import { ChevronDown } from 'lucide-react';
import { cn } from '../../utils/cn';

/**
 * Select Component - Modern dropdown select with full dark mode support
 *
 * Features:
 * - Full dark mode support with proper contrast ratios
 * - Custom chevron icon
 * - Error states
 * - Disabled states
 * - WCAG 2.1 compliant
 * - Consistent with Input component styling
 */
const Select = forwardRef(
  (
    {
      label,
      error,
      helperText,
      options = [],
      placeholder = 'Select an option',
      fullWidth = false,
      className,
      containerClassName,
      disabled,
      required,
      ...props
    },
    ref
  ) => {
    const baseStyles =
      'block w-full px-4 py-2.5 pr-10 text-base text-gray-900 dark:text-white bg-white dark:bg-dark-800 border rounded-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:border-transparent disabled:cursor-not-allowed appearance-none cursor-pointer';

    const errorStyles = error
      ? 'border-red-500 dark:border-red-400 focus:ring-red-500 dark:focus:ring-red-400'
      : 'border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500 focus:ring-blue-500 dark:focus:ring-blue-400';

    const disabledStyles = disabled
      ? 'bg-gray-100 dark:bg-gray-800 opacity-60'
      : '';

    // If the caller already provides an option with value="" (e.g. "All types"),
    // showing a disabled "Select an option" placeholder would clash — the browser
    // picks the first matching option (the disabled placeholder), so the real
    // selected label never renders. Suppress the placeholder in that case.
    const hasEmptyOption = options.some((o) => o.value === '' || o.value == null);
    const showPlaceholder = placeholder && !hasEmptyOption;

    return (
      <div className={cn('relative', fullWidth ? 'w-full' : '', containerClassName)}>
        {label && (
          <label className="block text-sm font-medium text-gray-900 dark:text-white mb-2">
            {label}
            {required && <span className="text-red-600 dark:text-red-400 ml-1">*</span>}
          </label>
        )}

        <div className="relative">
          <select
            ref={ref}
            disabled={disabled}
            required={required}
            className={cn(baseStyles, errorStyles, disabledStyles, className)}
            {...props}
          >
            {showPlaceholder && (
              <option value="" disabled>
                {placeholder}
              </option>
            )}
            {options.map((option) => (
              <option
                key={option.value}
                value={option.value}
                disabled={option.disabled}
              >
                {option.label}
              </option>
            ))}
          </select>

          {/* Chevron Icon */}
          <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-gray-500 dark:text-gray-400">
            <ChevronDown className="w-5 h-5" />
          </div>
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

Select.displayName = 'Select';

export default Select;
