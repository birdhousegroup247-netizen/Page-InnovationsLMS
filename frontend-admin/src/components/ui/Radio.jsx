import { cn } from '../../utils/cn';

/**
 * Radio Component - Custom styled radio button with full dark mode and accessibility support
 *
 * @param {string} label - Label text for the radio
 * @param {string} description - Optional description text below label
 * @param {string} error - Error message to display
 * @param {boolean} disabled - Whether radio is disabled
 * @param {boolean} checked - Checked state (for controlled components)
 * @param {function} onChange - Change handler
 * @param {string} id - Optional ID for the radio (auto-generated if not provided)
 *
 * Features:
 * - WCAG 2.1 compliant with larger touch targets (20x20px)
 * - Clickable labels for better UX
 * - Full dark mode support
 * - Accessible with proper label association
 */
const Radio = ({
  label,
  description,
  error,
  disabled,
  checked,
  onChange,
  className,
  id,
  ...props
}) => {
  // Generate a unique ID if not provided
  const radioId = id || `radio-${Math.random().toString(36).substr(2, 9)}`;

  return (
    <div className={cn('flex items-start', className)}>
      {/* Radio Container */}
      <div className="flex items-center h-6">
        <input
          id={radioId}
          type="radio"
          checked={checked}
          onChange={onChange}
          disabled={disabled}
          className={cn(
            // Size - increased for better touch targets (20x20px)
            'w-5 h-5',
            // Colors - with full dark mode support
            'border-gray-300 dark:border-gray-600',
            'bg-white dark:bg-gray-700',
            'text-blue-600 dark:text-blue-500',
            // States
            'hover:border-blue-500 dark:hover:border-blue-400',
            'focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:ring-offset-1 dark:focus:ring-offset-gray-900',
            'checked:border-blue-600 dark:checked:border-blue-500',
            // Transitions
            'transition-all cursor-pointer',
            // Disabled
            'disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-gray-100 dark:disabled:bg-gray-800',
            // Error state
            error && 'border-red-500 dark:border-red-400 focus:ring-red-500 dark:focus:ring-red-400'
          )}
          {...props}
        />
      </div>

      {/* Label and Description - Wrapped in label for clickability */}
      {(label || description) && (
        <label
          htmlFor={radioId}
          className={cn(
            'ml-3 text-sm flex-1',
            !disabled && 'cursor-pointer'
          )}
        >
          {label && (
            <span
              className={cn(
                'font-medium text-gray-900 dark:text-white block',
                disabled && 'opacity-50'
              )}
            >
              {label}
            </span>
          )}
          {description && (
            <span className={cn('text-gray-600 dark:text-gray-400 mt-0.5 block', disabled && 'opacity-50')}>
              {description}
            </span>
          )}
          {error && (
            <span className="text-red-600 dark:text-red-400 text-xs mt-1 block">
              {error}
            </span>
          )}
        </label>
      )}
    </div>
  );
};

/**
 * RadioGroup Component - Container for radio buttons with full dark mode support
 */
export const RadioGroup = ({
  label,
  error,
  helperText,
  required,
  children,
  className,
}) => {
  return (
    <div className={cn('w-full', className)}>
      {/* Label */}
      {label && (
        <label className="block text-sm font-medium text-gray-900 dark:text-white mb-3">
          {label}
          {required && <span className="text-red-600 dark:text-red-400 ml-1">*</span>}
        </label>
      )}

      {/* Radio Options */}
      <div className="space-y-3">{children}</div>

      {/* Error or Helper Text */}
      {error && <p className="text-red-600 dark:text-red-400 text-xs mt-2">{error}</p>}
      {!error && helperText && (
        <p className="text-gray-600 dark:text-gray-400 text-xs mt-2">{helperText}</p>
      )}
    </div>
  );
};

export default Radio;
