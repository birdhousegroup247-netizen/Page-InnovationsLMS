import { Check } from 'lucide-react';
import { cn } from '../../utils/cn';

/**
 * Checkbox Component - Custom styled checkbox with full dark mode and accessibility support
 *
 * @param {string} label - Label text for the checkbox
 * @param {string} description - Optional description text below label
 * @param {string} error - Error message to display
 * @param {boolean} disabled - Whether checkbox is disabled
 * @param {boolean} checked - Checked state (for controlled components)
 * @param {function} onChange - Change handler
 * @param {string} id - Optional ID for the checkbox (auto-generated if not provided)
 *
 * Features:
 * - WCAG 2.1 compliant with larger touch targets (20x20px)
 * - Clickable labels for better UX
 * - Full dark mode support
 * - Accessible with proper label association
 */
const Checkbox = ({
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
  const checkboxId = id || `checkbox-${Math.random().toString(36).substr(2, 9)}`;

  return (
    <div className={cn('flex items-start', className)}>
      {/* Checkbox Container */}
      <div className="flex items-center h-6">
        <input
          id={checkboxId}
          type="checkbox"
          checked={checked}
          onChange={onChange}
          disabled={disabled}
          className={cn(
            // Size - increased for better touch targets (20x20px)
            'w-5 h-5 rounded',
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
          htmlFor={checkboxId}
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

export default Checkbox;
