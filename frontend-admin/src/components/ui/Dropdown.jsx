import { useState, useRef, useEffect } from 'react';
import { ChevronDown } from 'lucide-react';
import { cn } from '../../utils/cn';

/**
 * Dropdown Component - Dropdown menu
 *
 * Usage:
 * <Dropdown>
 *   <Dropdown.Trigger>
 *     <Button>Options</Button>
 *   </Dropdown.Trigger>
 *   <Dropdown.Menu>
 *     <Dropdown.Item onClick={() => {}}>Edit</Dropdown.Item>
 *     <Dropdown.Item onClick={() => {}}>Delete</Dropdown.Item>
 *   </Dropdown.Menu>
 * </Dropdown>
 */
const Dropdown = ({ children, className }) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    const handleEscape = (event) => {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleEscape);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isOpen]);

  return (
    <div ref={dropdownRef} className={cn('relative inline-block', className)}>
      {typeof children === 'function'
        ? children({ isOpen, setIsOpen })
        : children}
    </div>
  );
};

// Dropdown Trigger
Dropdown.Trigger = ({ children, asChild, className }) => {
  return (
    <div className={className}>
      {children}
    </div>
  );
};

// Dropdown Menu
Dropdown.Menu = ({ children, align = 'left', className }) => {
  const alignments = {
    left: 'left-0',
    right: 'right-0',
    center: 'left-1/2 -translate-x-1/2',
  };

  return (
    <div
      className={cn(
        'absolute z-50 mt-2 min-w-[12rem] overflow-hidden rounded-lg',
        'bg-white dark:bg-dark-800 border border-gray-200 dark:border-border-dark shadow-lg',
        'animate-slide-down',
        alignments[align],
        className
      )}
    >
      <div className="py-1">{children}</div>
    </div>
  );
};

// Dropdown Item
Dropdown.Item = ({
  children,
  onClick,
  icon: Icon,
  danger,
  disabled,
  className,
}) => {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={cn(
        'w-full flex items-center gap-3 px-4 py-2 text-sm text-left',
        'transition-colors focus:outline-none',
        danger
          ? 'text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20'
          : 'text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-dark-700',
        disabled && 'opacity-50 cursor-not-allowed hover:bg-transparent',
        className
      )}
    >
      {Icon && <Icon className="w-4 h-4" />}
      {children}
    </button>
  );
};

// Dropdown Separator
Dropdown.Separator = ({ className }) => {
  return <div className={cn('my-1 h-px bg-border', className)} />;
};

// Dropdown Label
Dropdown.Label = ({ children, className }) => {
  return (
    <div
      className={cn(
        'px-4 py-2 text-xs font-semibold text-text-muted uppercase tracking-wider',
        className
      )}
    >
      {children}
    </div>
  );
};

/**
 * DropdownButton - Pre-built dropdown button
 */
export const DropdownButton = ({
  children,
  label,
  variant = 'outline',
  align = 'left',
  className,
}) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <Dropdown className={className}>
      {({ isOpen, setIsOpen }) => (
        <>
          <button
            onClick={() => setIsOpen(!isOpen)}
            className={cn(
              'inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium',
              'transition-colors focus:outline-none focus:ring-2 focus:ring-brand-blue',
              variant === 'outline'
                ? 'border border-border hover:bg-gray-100'
                : 'bg-brand-blue text-white hover:bg-brand-blue-600'
            )}
          >
            {label}
            <ChevronDown
              className={cn(
                'w-4 h-4 transition-transform',
                isOpen && 'rotate-180'
              )}
            />
          </button>
          {isOpen && (
            <Dropdown.Menu align={align}>{children}</Dropdown.Menu>
          )}
        </>
      )}
    </Dropdown>
  );
};

export default Dropdown;
