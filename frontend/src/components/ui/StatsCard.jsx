import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { cn } from '../../utils/cn';

/**
 * StatsCard Component - Display statistics and metrics
 *
 * @param {string} title - Card title
 * @param {string|number} value - Main value to display
 * @param {string} description - Optional description
 * @param {object} icon - Icon component
 * @param {string} iconColor - Icon background color
 * @param {object} trend - Trend object {value: number, label: string, direction: 'up'|'down'|'neutral'}
 * @param {string} variant - Color variant
 */
const StatsCard = ({
  title,
  value,
  description,
  icon: Icon,
  iconColor = 'bg-brand-blue',
  trend,
  variant = 'default',
  className,
  ...props
}) => {
  const variants = {
    default: 'bg-white border-border',
    primary: 'bg-gradient-to-br from-brand-blue to-brand-blue-600 text-white',
    success: 'bg-gradient-to-br from-green-500 to-green-600 text-white',
    warning: 'bg-gradient-to-br from-yellow-500 to-yellow-600 text-white',
    danger: 'bg-gradient-to-br from-red-500 to-red-600 text-white',
  };

  const isGradient = variant !== 'default';

  const getTrendIcon = () => {
    if (!trend) return null;

    const icons = {
      up: TrendingUp,
      down: TrendingDown,
      neutral: Minus,
    };

    const TrendIcon = icons[trend.direction] || Minus;

    const colors = {
      up: 'text-green-600',
      down: 'text-red-600',
      neutral: 'text-gray-600',
    };

    return (
      <div className="flex items-center gap-1 text-xs font-medium">
        <TrendIcon className={cn('w-4 h-4', isGradient ? 'text-white/80' : colors[trend.direction])} />
        <span className={isGradient ? 'text-white/90' : colors[trend.direction]}>
          {trend.value}
        </span>
        {trend.label && (
          <span className={isGradient ? 'text-white/70' : 'text-text-muted'}>
            {trend.label}
          </span>
        )}
      </div>
    );
  };

  return (
    <div
      className={cn(
        'rounded-xl border p-6 transition-all hover:shadow-md',
        variants[variant],
        className
      )}
      {...props}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1">
          {/* Title */}
          <p
            className={cn(
              'text-sm font-medium mb-2',
              isGradient ? 'text-white/80' : 'text-text-secondary'
            )}
          >
            {title}
          </p>

          {/* Value */}
          <h3
            className={cn(
              'text-3xl font-bold mb-1',
              isGradient ? 'text-white' : 'text-text-primary'
            )}
          >
            {value}
          </h3>

          {/* Trend */}
          {trend && <div className="mt-2">{getTrendIcon()}</div>}

          {/* Description */}
          {description && (
            <p
              className={cn(
                'text-xs mt-2',
                isGradient ? 'text-white/70' : 'text-text-muted'
              )}
            >
              {description}
            </p>
          )}
        </div>

        {/* Icon */}
        {Icon && (
          <div
            className={cn(
              'rounded-lg p-3',
              isGradient ? 'bg-white/20' : iconColor
            )}
          >
            <Icon className={cn('w-6 h-6', isGradient ? 'text-white' : 'text-white')} />
          </div>
        )}
      </div>
    </div>
  );
};

/**
 * SimpleStatsCard - Simplified stats card without icon
 */
export const SimpleStatsCard = ({
  label,
  value,
  change,
  className,
  ...props
}) => {
  return (
    <div
      className={cn(
        'rounded-lg bg-white border border-border p-4 hover:shadow-sm transition-all',
        className
      )}
      {...props}
    >
      <p className="text-sm font-medium text-text-secondary mb-1">{label}</p>
      <div className="flex items-baseline gap-2">
        <h4 className="text-2xl font-bold text-text-primary">{value}</h4>
        {change && (
          <span
            className={cn(
              'text-xs font-medium',
              change > 0 ? 'text-green-600' : change < 0 ? 'text-red-600' : 'text-gray-600'
            )}
          >
            {change > 0 ? '+' : ''}{change}%
          </span>
        )}
      </div>
    </div>
  );
};

/**
 * StatsGrid - Grid container for stats cards
 */
export const StatsGrid = ({ children, columns = 4, className }) => {
  const columnClasses = {
    1: 'grid-cols-1',
    2: 'grid-cols-1 md:grid-cols-2',
    3: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3',
    4: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-4',
  };

  return (
    <div className={cn('grid gap-6', columnClasses[columns], className)}>
      {children}
    </div>
  );
};

export default StatsCard;
