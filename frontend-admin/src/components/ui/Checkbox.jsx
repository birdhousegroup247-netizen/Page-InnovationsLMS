import { Check } from 'lucide-react';
import { cn } from '../../utils/cn';

/**
 * Checkbox Component - Custom styled checkbox
 *
 * @param {string} label - Label text for the checkbox
 * @param {string} description - Optional description text below label
 * @param {string} error - Error message to display
 * @param {boolean} disabled - Whether checkbox is disabled
 * @param {boolean} checked - Checked state (for controlled components)
 * @param {function} onChange - Change handler
 */
const Checkbox = ({
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
      {/* Checkbox Container */}
      <div className="flex items-center h-5">
        <input
          type="checkbox"
          checked={checked}
          onChange={onChange}
          disabled={disabled}
          className={cn(
            'w-4 h-4 rounded border-gray-300 transition-all cursor-pointer',
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
                'font-medium text-text-primary',
                disabled && 'opacity-50',
                !disabled && 'cursor-pointer'
              )}
            >
              {label}
            </label>
          )}
          {description && (
            <p className={cn('text-text-muted mt-0.5', disabled && 'opacity-50')}>
              {description}
            </p>
          )}
          {error && <p className="text-error text-xs mt-1">{error}</p>}
        </div>
      )}
    </div>
  );
};

export default Checkbox;
