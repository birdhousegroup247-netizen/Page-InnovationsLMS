import { useEffect } from 'react';
import { X } from 'lucide-react';
import { cn } from '../../utils/cn';

/**
 * Modal Component - Beautiful dialog/modal
 *
 * Sizes: sm, md, lg, xl, full
 */
const Modal = ({
  isOpen,
  onClose,
  children,
  title,
  size = 'md',
  className,
  showCloseButton = true,
  closeOnOverlayClick = true,
  ...props
}) => {
  // Close on Escape key
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  // Prevent body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }

    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const sizes = {
    sm: 'max-w-md',
    md: 'max-w-lg',
    lg: 'max-w-2xl',
    xl: 'max-w-4xl',
    full: 'max-w-7xl mx-4',
  };

  const handleOverlayClick = (e) => {
    if (closeOnOverlayClick && e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-fade-in"
      onClick={handleOverlayClick}
      {...props}
    >
      {/* Overlay */}
      <div className="absolute inset-0 bg-black/50 dark:bg-black/70 backdrop-blur-sm" />

      {/* Modal */}
      <div
        className={cn(
          'relative w-full bg-white dark:bg-dark-800 rounded-xl shadow-2xl dark:shadow-black/50 animate-slide-up overflow-hidden',
          sizes[size],
          className
        )}
      >
        {/* Header */}
        {(title || showCloseButton) && (
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-border-dark">
            {title && (
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">{title}</h2>
            )}
            {showCloseButton && (
              <button
                onClick={onClose}
                className="ml-auto p-1.5 rounded-lg text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-dark-700 hover:text-gray-900 dark:hover:text-white transition-colors"
                aria-label="Close modal"
              >
                <X className="w-5 h-5" />
              </button>
            )}
          </div>
        )}

        {/* Content — capped height + internal scroll so tall forms (e.g.
            the announcement composer) never push the action buttons off
            screen. Body scroll is locked while a modal is open, so
            without this the overflow was simply unreachable. */}
        <div className="px-6 py-4 max-h-[calc(100vh-200px)] overflow-y-auto">{children}</div>
      </div>
    </div>
  );
};

// Modal Sub-components
Modal.Body = ({ children, className }) => (
  <div className={cn('', className)}>{children}</div>
);

Modal.Footer = ({ children, className }) => (
  <div className={cn('flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-200 dark:border-border-dark bg-gray-50 dark:bg-dark-900/50 rounded-b-xl', className)}>
    {children}
  </div>
);

export default Modal;
