import { cn } from '../../utils/cn';
import { User } from 'lucide-react';

/**
 * Avatar Component - User profile pictures with full dark mode support
 *
 * Sizes: xs, sm, md, lg, xl, 2xl
 *
 * Features:
 * - Full dark mode support
 * - Image loading with fallback
 * - Customizable fallback (initials or icon)
 * - Accessible with proper alt text
 */
const Avatar = ({
  src,
  alt = 'Avatar',
  fallback,
  size = 'md',
  className,
  ...props
}) => {
  const sizes = {
    xs: 'w-6 h-6 text-xs',
    sm: 'w-8 h-8 text-sm',
    md: 'w-10 h-10 text-base',
    lg: 'w-12 h-12 text-lg',
    xl: 'w-16 h-16 text-xl',
    '2xl': 'w-20 h-20 text-2xl',
  };

  const baseStyles =
    'inline-flex items-center justify-center rounded-full overflow-hidden';

  if (src) {
    return (
      <div
        className={cn(
          baseStyles,
          'bg-gray-200 dark:bg-gray-700',
          sizes[size],
          className
        )}
        {...props}
      >
        <img
          src={src}
          alt={alt}
          className="w-full h-full object-cover"
          loading="lazy"
        />
      </div>
    );
  }

  return (
    <div
      className={cn(
        baseStyles,
        sizes[size],
        'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 font-medium',
        className
      )}
      {...props}
    >
      {fallback ? (
        fallback
      ) : (
        <User className="w-1/2 h-1/2" />
      )}
    </div>
  );
};

export default Avatar;
