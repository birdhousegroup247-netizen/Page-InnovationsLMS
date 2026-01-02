import { cn } from '../../utils/cn';

/**
 * Switch Component - Toggle switch (iOS-style) with full dark mode support
 *
 * @param {string} label - Label text for the switch
 * @param {string} description - Optional description text below label
 * @param {boolean} disabled - Whether switch is disabled
 * @param {boolean} checked - Checked state (for controlled components)
 * @param {function} onChange - Change handler
 * @param {string} size - Size variant: 'sm', 'md', 'lg'
 *
 * Features:
 * - WCAG 2.1 compliant with proper ARIA attributes
 * - Full dark mode support
 * - Smooth animations
 * - Three size variants
 */
const Switch = ({
  label,
  description,
  disabled,
  checked,
  onChange,
  size = 'md',
  className,
  ...props
}) => {
  const sizes = {
    sm: {
      switch: 'w-9 h-5',
      toggle: 'w-3.5 h-3.5',
      translate: checked ? 'translate-x-4' : 'translate-x-0.5',
    },
    md: {
      switch: 'w-11 h-6',
      toggle: 'w-4 h-4',
      translate: checked ? 'translate-x-5' : 'translate-x-1',
    },
    lg: {
      switch: 'w-14 h-7',
      toggle: 'w-5 h-5',
      translate: checked ? 'translate-x-7' : 'translate-x-1',
    },
  };

  return (
    <div className={cn('flex items-center justify-between', className)}>
      {/* Label and Description */}
      {(label || description) && (
        <div className="flex-1 mr-4">
          {label && (
            <label
              className={cn(
                'block text-sm font-medium text-gray-900 dark:text-white',
                disabled && 'opacity-50',
                !disabled && 'cursor-pointer'
              )}
            >
              {label}
            </label>
          )}
          {description && (
            <p className={cn('text-xs text-gray-600 dark:text-gray-400 mt-0.5', disabled && 'opacity-50')}>
              {description}
            </p>
          )}
        </div>
      )}

      {/* Switch */}
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={label || 'Toggle switch'}
        onClick={() => !disabled && onChange && onChange({ target: { checked: !checked } })}
        disabled={disabled}
        className={cn(
          'relative inline-flex flex-shrink-0 rounded-full transition-colors duration-200 ease-in-out',
          'focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:ring-offset-2 dark:focus:ring-offset-gray-900',
          'disabled:opacity-50 disabled:cursor-not-allowed',
          sizes[size].switch,
          checked
            ? 'bg-blue-600 dark:bg-blue-500'
            : 'bg-gray-300 dark:bg-gray-600'
        )}
        {...props}
      >
        <span
          className={cn(
            'inline-block rounded-full bg-white shadow-sm transform transition-transform duration-200 ease-in-out',
            sizes[size].toggle,
            sizes[size].translate
          )}
        />
      </button>
    </div>
  );
};

export default Switch;
