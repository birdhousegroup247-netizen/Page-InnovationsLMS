import { Loader2 } from 'lucide-react';
import { cn } from '../../utils/cn';

/**
 * Spinner Component - Loading indicator with full dark mode support
 *
 * Sizes: sm, md, lg, xl
 *
 * Features:
 * - Full dark mode support
 * - Multiple size variants
 * - Accessible with aria-label
 * - Smooth animation
 */
const Spinner = ({ size = 'md', className, label = 'Loading...', ...props }) => {
  const sizes = {
    sm: 'w-4 h-4',
    md: 'w-6 h-6',
    lg: 'w-8 h-8',
    xl: 'w-12 h-12',
  };

  return (
    <Loader2
      className={cn('animate-spin text-blue-600 dark:text-blue-400', sizes[size], className)}
      aria-label={label}
      role="status"
      {...props}
    />
  );
};

export default Spinner;
