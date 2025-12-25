import { cn } from '../../utils/cn';

/**
 * Container Component - Content wrapper
 * Provides consistent spacing and max-width
 */
const Container = ({ children, size = 'default', className, ...props }) => {
  const sizes = {
    sm: 'max-w-3xl',
    default: 'max-w-7xl',
    lg: 'max-w-[1400px]',
    full: 'max-w-full',
  };

  return (
    <div
      className={cn('mx-auto px-6 py-8', sizes[size], className)}
      {...props}
    >
      {children}
    </div>
  );
};

export default Container;
