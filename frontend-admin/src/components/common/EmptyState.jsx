
import React from 'react';

const EmptyState = ({ 
  image, 
  title, 
  description, 
  action,
  icon,
  className = "" 
}) => {
  return (
    <div className={`flex flex-col items-center justify-center p-12 text-center bg-white/50 rounded-xl border border-dashed border-gray-200/60 ${className}`}>
      {image ? (
        <div className="mb-6 w-40 h-40 flex items-center justify-center">
          <img 
            src={image} 
            alt={title || "Empty state"} 
            className="w-full h-full object-contain opacity-85 hover:opacity-100 transition-opacity duration-300"
          />
        </div>
      ) : icon ? (
        <div className="mb-6 w-20 h-20 flex items-center justify-center text-gray-400 bg-gray-50 rounded-full border border-gray-100">
          {React.cloneElement(icon, { className: `w-10 h-10 ${icon.props.className || ''}` })}
        </div>
      ) : null}
      
      {title && (
        <h3 className="text-lg font-semibold text-gray-900 mb-2">
          {title}
        </h3>
      )}
      
      {description && (
        <p className="text-gray-500 max-w-sm mb-6 text-sm leading-relaxed">
          {description}
        </p>
      )}
      
      {action && (
        <div className="mt-2">
          {action}
        </div>
      )}
    </div>
  );
};

export default EmptyState;
