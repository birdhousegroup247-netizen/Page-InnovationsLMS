import { X, CheckCircle, AlertCircle, Info, AlertTriangle } from 'lucide-react';
import { cn } from '../../utils/cn';

/**
 * Alert Component - Beautiful notification messages
 *
 * Variants: success, error, warning, info
 */
const Alert = ({
  children,
  variant = 'info',
  title,
  onClose,
  className,
  ...props
}) => {
  const baseStyles =
    'relative px-4 py-3 rounded-lg border flex items-start gap-3 animate-slide-down';

  const variants = {
    success: 'bg-green-50 border-green-200 text-green-800',
    error: 'bg-red-50 border-red-200 text-red-800',
    warning: 'bg-yellow-50 border-yellow-200 text-yellow-800',
    info: 'bg-blue-50 border-blue-200 text-blue-800',
  };

  const icons = {
    success: <CheckCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />,
    error: <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />,
    warning: <AlertTriangle className="w-5 h-5 flex-shrink-0 mt-0.5" />,
    info: <Info className="w-5 h-5 flex-shrink-0 mt-0.5" />,
  };

  return (
    <div
      className={cn(baseStyles, variants[variant], className)}
      role="alert"
      {...props}
    >
      {icons[variant]}

      <div className="flex-1">
        {title && <p className="font-semibold mb-1">{title}</p>}
        <div className="text-sm">{children}</div>
      </div>

      {onClose && (
        <button
          onClick={onClose}
          className="flex-shrink-0 ml-auto -mr-1 -mt-1 p-1 rounded hover:bg-black/5 transition-colors"
          aria-label="Close"
        >
          <X className="w-4 h-4" />
        </button>
      )}
    </div>
  );
};

export default Alert;
