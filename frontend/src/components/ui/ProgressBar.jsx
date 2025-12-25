import { cn } from '../../utils/cn';

/**
 * ProgressBar Component - Progress indicator
 *
 * @param {number} value - Progress value (0-100)
 * @param {string} label - Optional label text
 * @param {boolean} showPercentage - Whether to show percentage
 * @param {string} variant - Color variant: 'primary', 'success', 'warning', 'danger'
 * @param {string} size - Size variant: 'sm', 'md', 'lg'
 * @param {boolean} animated - Whether to show animated stripes
 * @param {boolean} indeterminate - Indeterminate progress (loading without specific progress)
 */
const ProgressBar = ({
  value = 0,
  label,
  showPercentage = false,
  variant = 'primary',
  size = 'md',
  animated = false,
  indeterminate = false,
  className,
}) => {
  // Ensure value is between 0 and 100
  const normalizedValue = Math.min(Math.max(value, 0), 100);

  const variants = {
    primary: 'bg-brand-blue',
    success: 'bg-green-500',
    warning: 'bg-yellow-500',
    danger: 'bg-red-500',
  };

  const sizes = {
    sm: 'h-1',
    md: 'h-2',
    lg: 'h-3',
  };

  return (
    <div className={cn('w-full', className)}>
      {/* Label and Percentage */}
      {(label || showPercentage) && (
        <div className="flex items-center justify-between mb-2">
          {label && <span className="text-sm font-medium text-text-primary">{label}</span>}
          {showPercentage && !indeterminate && (
            <span className="text-sm font-medium text-text-secondary">{normalizedValue}%</span>
          )}
        </div>
      )}

      {/* Progress Track */}
      <div
        className={cn(
          'w-full bg-gray-200 rounded-full overflow-hidden',
          sizes[size]
        )}
      >
        {/* Progress Bar */}
        <div
          className={cn(
            'h-full rounded-full transition-all duration-300 ease-in-out',
            variants[variant],
            animated && !indeterminate && 'bg-gradient-to-r from-transparent via-white/30 to-transparent bg-[length:200%_100%] animate-shimmer',
            indeterminate && 'animate-indeterminate'
          )}
          style={{
            width: indeterminate ? '40%' : `${normalizedValue}%`,
          }}
        />
      </div>
    </div>
  );
};

/**
 * CircularProgress Component - Circular progress indicator
 *
 * @param {number} value - Progress value (0-100)
 * @param {number} size - Circle size in pixels
 * @param {number} strokeWidth - Stroke width
 * @param {string} variant - Color variant
 * @param {boolean} showPercentage - Whether to show percentage in center
 */
export const CircularProgress = ({
  value = 0,
  size = 120,
  strokeWidth = 8,
  variant = 'primary',
  showPercentage = true,
  className,
}) => {
  const normalizedValue = Math.min(Math.max(value, 0), 100);
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - (normalizedValue / 100) * circumference;

  const variants = {
    primary: 'text-brand-blue',
    success: 'text-green-500',
    warning: 'text-yellow-500',
    danger: 'text-red-500',
  };

  return (
    <div className={cn('relative inline-flex items-center justify-center', className)}>
      <svg width={size} height={size} className="transform -rotate-90">
        {/* Background Circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="currentColor"
          strokeWidth={strokeWidth}
          fill="none"
          className="text-gray-200"
        />
        {/* Progress Circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="currentColor"
          strokeWidth={strokeWidth}
          fill="none"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          className={cn('transition-all duration-300 ease-in-out', variants[variant])}
        />
      </svg>
      {/* Percentage Text */}
      {showPercentage && (
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-lg font-semibold text-text-primary">
            {Math.round(normalizedValue)}%
          </span>
        </div>
      )}
    </div>
  );
};

export default ProgressBar;
