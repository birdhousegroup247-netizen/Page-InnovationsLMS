import { cn } from '../../utils/cn';
import Button from '../ui/Button';

/**
 * EmptyState Component - Beautiful empty state display
 */
const EmptyState = ({
  icon,
  title,
  description,
  actionLabel,
  onAction,
  className,
  ...props
}) => {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center py-12 px-4 text-center',
        className
      )}
      {...props}
    >
      {icon && (
        <div className="w-16 h-16 rounded-full bg-gray-100 dark:bg-dark-700 flex items-center justify-center mb-4 text-text-muted dark:text-text-dark-muted">
          {icon}
        </div>
      )}

      {title && (
        <h3 className="text-lg font-semibold text-text-primary dark:text-text-dark-primary mb-2">{title}</h3>
      )}

      {description && (
        <p className="text-sm text-text-muted dark:text-text-dark-muted max-w-md mb-6">{description}</p>
      )}

      {actionLabel && onAction && (
        <Button onClick={onAction}>{actionLabel}</Button>
      )}
    </div>
  );
};

export default EmptyState;
