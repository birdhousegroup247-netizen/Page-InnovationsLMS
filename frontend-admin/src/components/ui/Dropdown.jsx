import { useState, useRef, useEffect } from 'react';
import { ChevronDown } from 'lucide-react';
import { cn } from '../../utils/cn';

/**
 * Dropdown Component - Accessible dropdown menu with full keyboard navigation
 *
 * Features:
 * - Full keyboard navigation (Arrow keys, Enter, Space, Escape)
 * - ARIA compliant (role, aria-expanded, aria-haspopup)
 * - Click outside to close
 * - Focus management
 * - Full dark mode support
 * - Roving tabindex for menu items
 *
 * Usage:
 * <Dropdown>
 *   {({ isOpen, setIsOpen }) => (
 *     <>
 *       <Button onClick={() => setIsOpen(!isOpen)}>Options</Button>
 *       {isOpen && (
 *         <Dropdown.Menu>
 *           <Dropdown.Item onClick={() => {}}>Edit</Dropdown.Item>
 *           <Dropdown.Item onClick={() => {}}>Delete</Dropdown.Item>
 *         </Dropdown.Menu>
 *       )}
 *     </>
 *   )}
 * </Dropdown>
 */
const Dropdown = ({ children, className }) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);
  const menuRef = useRef(null);
  const [focusedIndex, setFocusedIndex] = useState(-1);

  // Click outside to close
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
        setFocusedIndex(-1);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  // Keyboard navigation
  useEffect(() => {
    if (!isOpen || !menuRef.current) return;

    const handleKeyDown = (event) => {
      const items = menuRef.current.querySelectorAll('[role="menuitem"]:not([disabled])');
      const itemCount = items.length;

      switch (event.key) {
        case 'Escape':
          setIsOpen(false);
          setFocusedIndex(-1);
          // Return focus to trigger
          dropdownRef.current?.querySelector('button')?.focus();
          event.preventDefault();
          break;

        case 'ArrowDown':
          event.preventDefault();
          setFocusedIndex((prev) => {
            const next = prev + 1 >= itemCount ? 0 : prev + 1;
            items[next]?.focus();
            return next;
          });
          break;

        case 'ArrowUp':
          event.preventDefault();
          setFocusedIndex((prev) => {
            const next = prev - 1 < 0 ? itemCount - 1 : prev - 1;
            items[next]?.focus();
            return next;
          });
          break;

        case 'Home':
          event.preventDefault();
          setFocusedIndex(0);
          items[0]?.focus();
          break;

        case 'End':
          event.preventDefault();
          setFocusedIndex(itemCount - 1);
          items[itemCount - 1]?.focus();
          break;

        case 'Tab':
          setIsOpen(false);
          setFocusedIndex(-1);
          break;
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  // Focus first item when menu opens
  useEffect(() => {
    if (isOpen && menuRef.current) {
      const firstItem = menuRef.current.querySelector('[role="menuitem"]:not([disabled])');
      if (firstItem) {
        firstItem.focus();
        setFocusedIndex(0);
      }
    }
  }, [isOpen]);

  return (
    <div ref={dropdownRef} className={cn('relative inline-block', className)}>
      {typeof children === 'function'
        ? children({ isOpen, setIsOpen, menuRef })
        : children}
    </div>
  );
};

// Dropdown Menu
Dropdown.Menu = ({ children, align = 'left', className, menuRef }) => {
  const alignments = {
    left: 'left-0',
    right: 'right-0',
    center: 'left-1/2 -translate-x-1/2',
  };

  return (
    <div
      ref={menuRef}
      role="menu"
      className={cn(
        'absolute z-50 mt-2 min-w-[12rem] overflow-hidden rounded-lg',
        'bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-lg dark:shadow-black/50',
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
  const handleClick = (e) => {
    if (!disabled && onClick) {
      onClick(e);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      handleClick(e);
    }
  };

  return (
    <button
      type="button"
      role="menuitem"
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      disabled={disabled}
      tabIndex={disabled ? -1 : 0}
      className={cn(
        'w-full flex items-center gap-3 px-4 py-2.5 text-sm text-left',
        'transition-colors focus:outline-none',
        danger
          ? 'text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 focus:bg-red-50 dark:focus:bg-red-900/20'
          : 'text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 focus:bg-gray-100 dark:focus:bg-gray-700',
        disabled && 'opacity-50 cursor-not-allowed hover:bg-transparent focus:bg-transparent',
        className
      )}
    >
      {Icon && <Icon className="w-4 h-4 flex-shrink-0" />}
      <span className="flex-1">{children}</span>
    </button>
  );
};

// Dropdown Separator
Dropdown.Separator = ({ className }) => {
  return <div className={cn('my-1 h-px bg-gray-200 dark:bg-gray-700', className)} />;
};

// Dropdown Label
Dropdown.Label = ({ children, className }) => {
  return (
    <div
      className={cn(
        'px-4 py-2 text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider',
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
  return (
    <Dropdown className={className}>
      {({ isOpen, setIsOpen, menuRef }) => (
        <>
          <button
            onClick={() => setIsOpen(!isOpen)}
            aria-haspopup="true"
            aria-expanded={isOpen}
            className={cn(
              'inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium',
              'transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400',
              variant === 'outline'
                ? 'border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700'
                : 'bg-blue-600 dark:bg-blue-500 text-white hover:bg-blue-700 dark:hover:bg-blue-600'
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
            <Dropdown.Menu align={align} menuRef={menuRef}>
              {children}
            </Dropdown.Menu>
          )}
        </>
      )}
    </Dropdown>
  );
};

export default Dropdown;
