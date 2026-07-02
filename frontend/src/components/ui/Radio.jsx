import { cn } from '../../utils/cn';

/**
 * Radio Component - Custom styled radio button
 *
 * @param {string} label - Label text for the radio
 * @param {string} description - Optional description text below label
 * @param {string} error - Error message to display
 * @param {boolean} disabled - Whether radio is disabled
 * @param {boolean} checked - Checked state (for controlled components)
 * @param {function} onChange - Change handler
 */
const Radio = ({
  label,
  description,
  error,
  disabled,
  checked,
  onChange,
  className,
  ...props
}) => {
  return (
    <div className={cn('flex items-start', className)}>
      {/* Radio Container */}
      <div className="flex items-center h-5">
        <input
          type="radio"
          checked={checked}
          onChange={onChange}
          disabled={disabled}
          className={cn(
            'w-4 h-4 border-gray-300 transition-all cursor-pointer',
            'text-brand-blue focus:ring-brand-blue focus:ring-2 focus:ring-offset-1',
            'disabled:opacity-50 disabled:cursor-not-allowed',
            error && 'border-error focus:ring-error'
          )}
          {...props}
        />
      </div>

      {/* Label and Description */}
      {(label || description) && (
        <div className="ml-3 text-sm">
          {label && (
            <label
              className={cn(
                'font-medium text-text-primary dark:text-text-dark-primary',
                disabled && 'opacity-50',
                !disabled && 'cursor-pointer'
              )}
            >
              {label}
            </label>
          )}
          {description && (
            <p className={cn('text-text-muted dark:text-text-dark-muted mt-0.5', disabled && 'opacity-50')}>
              {description}
            </p>
          )}
          {error && <p className="text-error text-xs mt-1">{error}</p>}
        </div>
      )}
    </div>
  );
};

/**
 * RadioGroup Component - Container for radio buttons
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
        <label className="block text-sm font-medium text-text-primary dark:text-text-dark-primary mb-3">
          {label}
          {required && <span className="text-error ml-1">*</span>}
        </label>
      )}

      {/* Radio Options */}
      <div className="space-y-3">{children}</div>

      {/* Error or Helper Text */}
      {error && <p className="text-error text-xs mt-2">{error}</p>}
      {!error && helperText && (
        <p className="text-text-muted dark:text-text-dark-muted text-xs mt-2">{helperText}</p>
      )}
    </div>
  );
};

export default Radio;
