/**
 * Skeleton Loading Components
 * Provides better perceived performance than spinners
 */

const Skeleton = ({ className = '', variant = 'rectangular', width, height, animation = 'pulse' }) => {
  const baseClasses = 'bg-gray-200 dark:bg-gray-700';
  const animationClasses = {
    pulse: 'animate-pulse',
    wave: 'animate-shimmer',
    none: '',
  };

  const variantClasses = {
    rectangular: 'rounded',
    circular: 'rounded-full',
    text: 'rounded h-4',
  };

  return (
    <div
      className={`${baseClasses} ${animationClasses[animation]} ${variantClasses[variant]} ${className}`}
      style={{
        width: width || '100%',
        height: height || (variant === 'text' ? '1rem' : '100%'),
      }}
    />
  );
};

// Course Card Skeleton
export const CourseCardSkeleton = () => (
  <div className="bg-white dark:bg-dark-800 rounded-lg overflow-hidden shadow-md">
    <Skeleton variant="rectangular" className="aspect-video" />
    <div className="p-6 space-y-3">
      <Skeleton variant="text" width="60%" />
      <Skeleton variant="text" width="100%" />
      <Skeleton variant="text" width="80%" />
      <div className="flex items-center justify-between mt-4">
        <Skeleton variant="text" width="30%" />
        <Skeleton variant="text" width="25%" />
      </div>
    </div>
  </div>
);

// Course List Skeleton (horizontal)
export const CourseListSkeleton = () => (
  <div className="bg-white dark:bg-dark-800 rounded-lg overflow-hidden shadow-md flex flex-col sm:flex-row">
    <Skeleton variant="rectangular" className="sm:w-64 aspect-video sm:aspect-auto" height="200px" />
    <div className="p-6 flex-1 space-y-3">
      <Skeleton variant="text" width="70%" />
      <Skeleton variant="text" width="100%" />
      <Skeleton variant="text" width="90%" />
      <div className="flex items-center gap-4 mt-4">
        <Skeleton variant="text" width="80px" />
        <Skeleton variant="text" width="100px" />
        <Skeleton variant="text" width="120px" />
      </div>
    </div>
  </div>
);

// Stats Card Skeleton
export const StatsCardSkeleton = () => (
  <div className="bg-white dark:bg-dark-800 rounded-lg p-6">
    <div className="flex items-center justify-between">
      <div className="space-y-2 flex-1">
        <Skeleton variant="text" width="40%" />
        <Skeleton variant="text" width="60%" height="2rem" />
        <Skeleton variant="text" width="50%" />
      </div>
      <Skeleton variant="circular" width="48px" height="48px" />
    </div>
  </div>
);

// Table Row Skeleton
export const TableRowSkeleton = ({ columns = 5 }) => (
  <tr className="border-b border-gray-200 dark:border-gray-700">
    {Array.from({ length: columns }).map((_, i) => (
      <td key={i} className="px-6 py-4">
        <Skeleton variant="text" width="80%" />
      </td>
    ))}
  </tr>
);

// User Avatar Skeleton
export const AvatarSkeleton = ({ size = 'md' }) => {
  const sizes = {
    sm: 'w-8 h-8',
    md: 'w-10 h-10',
    lg: 'w-12 h-12',
    xl: 'w-16 h-16',
  };

  return <Skeleton variant="circular" className={sizes[size]} />;
};

// Dashboard Skeleton
export const DashboardSkeleton = () => (
  <div className="space-y-6">
    {/* Stats Grid */}
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {[1, 2, 3, 4].map((i) => (
        <StatsCardSkeleton key={i} />
      ))}
    </div>

    {/* Main Content */}
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div className="lg:col-span-2 space-y-4">
        <Skeleton variant="text" width="200px" height="2rem" />
        {[1, 2, 3].map((i) => (
          <CourseListSkeleton key={i} />
        ))}
      </div>
      <div className="space-y-4">
        <Skeleton variant="text" width="150px" height="2rem" />
        <div className="bg-white dark:bg-dark-800 rounded-lg p-6 space-y-3">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="flex items-center space-x-3">
              <AvatarSkeleton size="sm" />
              <div className="flex-1 space-y-2">
                <Skeleton variant="text" width="70%" />
                <Skeleton variant="text" width="50%" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  </div>
);

// Course Grid Skeleton
export const CourseGridSkeleton = ({ count = 6 }) => (
  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
    {Array.from({ length: count }).map((_, i) => (
      <CourseCardSkeleton key={i} />
    ))}
  </div>
);

// List Skeleton
export const ListSkeleton = ({ count = 5 }) => (
  <div className="space-y-4">
    {Array.from({ length: count }).map((_, i) => (
      <CourseListSkeleton key={i} />
    ))}
  </div>
);

// Form Skeleton
export const FormSkeleton = () => (
  <div className="space-y-4">
    {[1, 2, 3, 4].map((i) => (
      <div key={i} className="space-y-2">
        <Skeleton variant="text" width="100px" />
        <Skeleton variant="rectangular" height="40px" />
      </div>
    ))}
    <Skeleton variant="rectangular" width="120px" height="40px" className="mt-6" />
  </div>
);

// Text Block Skeleton
export const TextSkeleton = ({ lines = 3 }) => (
  <div className="space-y-2">
    {Array.from({ length: lines }).map((_, i) => (
      <Skeleton
        key={i}
        variant="text"
        width={i === lines - 1 ? '60%' : '100%'}
      />
    ))}
  </div>
);

export default Skeleton;
