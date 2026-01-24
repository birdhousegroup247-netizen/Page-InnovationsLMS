import React from 'react';

const EmptyState = ({
  image,
  title,
  description,
  action,
  icon,
  className = "",
  compact = false
}) => {
  return (
    <div className={`flex flex-col items-center justify-center ${compact ? 'p-6' : 'p-10'} text-center bg-white dark:bg-dark-800 rounded-xl border border-gray-200 dark:border-border-dark ${className}`}>
      {image ? (
        <div className={`${compact ? 'mb-4 w-32 h-32' : 'mb-6 w-40 h-40'} flex items-center justify-center`}>
          <img
            src={image}
            alt={title || "Empty state"}
            className="w-full h-full object-contain"
          />
        </div>
      ) : icon ? (
        <div className={`${compact ? 'mb-4' : 'mb-6'} w-16 h-16 flex items-center justify-center text-brand-blue bg-brand-blue/10 dark:bg-brand-blue/20 rounded-2xl`}>
          {React.cloneElement(icon, { className: 'w-8 h-8' })}
        </div>
      ) : null}

      {title && (
        <h3 className={`${compact ? 'text-lg' : 'text-xl'} font-semibold text-gray-900 dark:text-white mb-2`}>
          {title}
        </h3>
      )}

      {description && (
        <p className={`text-gray-500 dark:text-gray-400 max-w-sm ${action ? 'mb-5' : ''} leading-relaxed ${compact ? 'text-sm' : ''}`}>
          {description}
        </p>
      )}

      {action && (
        <div>
          {action}
        </div>
      )}
    </div>
  );
};

export default EmptyState;
