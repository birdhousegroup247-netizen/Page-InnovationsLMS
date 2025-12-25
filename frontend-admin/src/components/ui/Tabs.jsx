import { useState, createContext, useContext } from 'react';
import { cn } from '../../utils/cn';

/**
 * Tabs Component - Tab navigation
 *
 * Usage:
 * <Tabs defaultValue="tab1">
 *   <Tabs.List>
 *     <Tabs.Trigger value="tab1">Tab 1</Tabs.Trigger>
 *     <Tabs.Trigger value="tab2">Tab 2</Tabs.Trigger>
 *   </Tabs.List>
 *   <Tabs.Content value="tab1">Content 1</Tabs.Content>
 *   <Tabs.Content value="tab2">Content 2</Tabs.Content>
 * </Tabs>
 */

const TabsContext = createContext();

const Tabs = ({ children, defaultValue, value, onChange, className }) => {
  const [activeTab, setActiveTab] = useState(defaultValue);
  const currentValue = value !== undefined ? value : activeTab;

  const handleChange = (newValue) => {
    if (value === undefined) {
      setActiveTab(newValue);
    }
    onChange?.(newValue);
  };

  return (
    <TabsContext.Provider value={{ activeTab: currentValue, setActiveTab: handleChange }}>
      <div className={cn('w-full', className)}>{children}</div>
    </TabsContext.Provider>
  );
};

// Tabs List (Container for triggers)
Tabs.List = ({ children, className }) => {
  return (
    <div
      className={cn(
        'inline-flex h-10 items-center justify-center rounded-lg bg-gray-100 p-1 text-text-muted',
        className
      )}
    >
      {children}
    </div>
  );
};

// Tabs Trigger (Individual tab button)
Tabs.Trigger = ({ children, value, className, disabled }) => {
  const { activeTab, setActiveTab } = useContext(TabsContext);
  const isActive = activeTab === value;

  return (
    <button
      type="button"
      onClick={() => !disabled && setActiveTab(value)}
      disabled={disabled}
      className={cn(
        'inline-flex items-center justify-center whitespace-nowrap rounded-md px-3 py-1.5',
        'text-sm font-medium transition-all focus-visible:outline-none focus-visible:ring-2',
        'focus-visible:ring-brand-blue focus-visible:ring-offset-2',
        'disabled:pointer-events-none disabled:opacity-50',
        isActive
          ? 'bg-white text-text-primary shadow-sm'
          : 'text-text-muted hover:text-text-primary',
        className
      )}
    >
      {children}
    </button>
  );
};

// Tabs Content (Content for each tab)
Tabs.Content = ({ children, value, className }) => {
  const { activeTab } = useContext(TabsContext);

  if (activeTab !== value) return null;

  return (
    <div
      className={cn(
        'mt-6 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-blue',
        'animate-fade-in',
        className
      )}
    >
      {children}
    </div>
  );
};

export default Tabs;
