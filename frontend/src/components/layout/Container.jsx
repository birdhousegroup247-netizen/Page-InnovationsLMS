import { cn } from '../../utils/cn';

/**
 * Container Component - Content wrapper
 * Provides consistent spacing and max-width
 */
const Container = ({ children, size = 'default', className, ...props }) => {
  const sizes = {
    sm: 'max-w-3xl',
    default: 'max-w-[1600px]',
    lg: 'max-w-[1800px]',
    xl: 'max-w-[2000px]',
    full: 'max-w-full',
  };

  return (
    <div
      className={cn('mx-auto px-4 py-8', sizes[size], className)}
      {...props}
    >
      {children}
    </div>
  );
};

export default Container;
