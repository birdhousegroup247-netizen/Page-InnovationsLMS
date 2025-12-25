import { ChevronDown } from 'lucide-react';
import { cn } from '../../utils/cn';

/**
 * Select Component - Custom styled select dropdown
 *
 * @param {string} label - Label text for the select
 * @param {string} placeholder - Placeholder text
 * @param {string} error - Error message to display
 * @param {string} helperText - Helper text below the select
 * @param {boolean} required - Whether the field is required
 * @param {boolean} fullWidth - Whether select takes full width
 * @param {boolean} disabled - Whether select is disabled
 * @param {object} leftIcon - Icon component to display on the left
 * @param {array} options - Array of {value, label} objects
 */
const Select = ({
  label,
  placeholder,
  error,
  helperText,
  required,
  fullWidth,
  disabled,
  leftIcon,
  options = [],
  className,
  ...props
}) => {
  return (
    <div className={cn('w-full', !fullWidth && 'max-w-sm')}>
      {/* Label */}
      {label && (
        <label className="block text-sm font-medium text-text-primary mb-2">
          {label}
          {required && <span className="text-error ml-1">*</span>}
        </label>
      )}

      {/* Select Wrapper */}
      <div className="relative">
        {/* Left Icon */}
        {leftIcon && (
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-text-muted">
            {leftIcon}
          </div>
        )}

        {/* Select Element */}
        <select
          disabled={disabled}
          className={cn(
            'w-full appearance-none px-4 py-2.5 bg-white border rounded-lg text-text-primary',
            'focus:outline-none focus:ring-2 focus:border-transparent transition-all',
            'disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-gray-50',
            leftIcon && 'pl-10',
            'pr-10', // Space for chevron icon
            error
              ? 'border-error focus:ring-error/20'
              : 'border-border focus:ring-brand-blue focus:border-brand-blue',
            className
          )}
          {...props}
        >
          {placeholder && (
            <option value="" disabled>
              {placeholder}
            </option>
          )}
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>

        {/* Chevron Icon */}
        <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none text-text-muted">
          <ChevronDown className="w-5 h-5" />
        </div>
      </div>

      {/* Error or Helper Text */}
      {error && <p className="text-error text-xs mt-1.5">{error}</p>}
      {!error && helperText && (
        <p className="text-text-muted text-xs mt-1.5">{helperText}</p>
      )}
    </div>
  );
};

export default Select;
