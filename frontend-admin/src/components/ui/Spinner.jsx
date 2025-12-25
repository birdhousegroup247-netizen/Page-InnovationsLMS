import { Loader2 } from 'lucide-react';
import { cn } from '../../utils/cn';

/**
 * Spinner Component - Loading indicator
 *
 * Sizes: sm, md, lg, xl
 */
const Spinner = ({ size = 'md', className, ...props }) => {
  const sizes = {
    sm: 'w-4 h-4',
    md: 'w-6 h-6',
    lg: 'w-8 h-8',
    xl: 'w-12 h-12',
  };

  return (
    <Loader2
      className={cn('animate-spin text-brand-blue', sizes[size], className)}
      {...props}
    />
  );
};

export default Spinner;
