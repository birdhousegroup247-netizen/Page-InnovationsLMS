import { ChevronUp, ChevronDown, ChevronsUpDown } from 'lucide-react';
import { cn } from '../../utils/cn';

/**
 * Table Component - Data table with sorting and full dark mode support
 *
 * Features:
 * - Full dark mode support
 * - Sortable columns with keyboard accessibility
 * - Responsive with horizontal scroll
 * - Hover states
 * - Empty state component
 *
 * Usage:
 * <Table>
 *   <Table.Header>
 *     <Table.Row>
 *       <Table.Head sortable sortDirection="asc" onSort={handleSort}>Name</Table.Head>
 *       <Table.Head>Email</Table.Head>
 *     </Table.Row>
 *   </Table.Header>
 *   <Table.Body>
 *     <Table.Row>
 *       <Table.Cell>John Doe</Table.Cell>
 *       <Table.Cell>john@example.com</Table.Cell>
 *     </Table.Row>
 *   </Table.Body>
 * </Table>
 */

const Table = ({ children, className, ...props }) => {
  return (
    <div className="w-full overflow-x-auto scrollbar-thin">
      <table
        className={cn('w-full border-collapse text-sm', className)}
        {...props}
      >
        {children}
      </table>
    </div>
  );
};

// Table Header
Table.Header = ({ children, className, ...props }) => {
  return (
    <thead
      className={cn(
        'bg-gray-50 dark:bg-dark-700 border-b border-gray-200 dark:border-border-dark',
        className
      )}
      {...props}
    >
      {children}
    </thead>
  );
};

// Table Body
Table.Body = ({ children, className, ...props }) => {
  return (
    <tbody
      className={cn('divide-y divide-gray-200 dark:divide-border-dark', className)}
      {...props}
    >
      {children}
    </tbody>
  );
};

// Table Footer
Table.Footer = ({ children, className, ...props }) => {
  return (
    <tfoot
      className={cn(
        'bg-gray-50 dark:bg-dark-700 border-t border-gray-200 dark:border-border-dark font-medium',
        className
      )}
      {...props}
    >
      {children}
    </tfoot>
  );
};

// Table Row
Table.Row = ({ children, className, clickable, ...props }) => {
  return (
    <tr
      className={cn(
        'border-b border-gray-200 dark:border-border-dark transition-colors',
        clickable && 'hover:bg-gray-50 dark:hover:bg-dark-700/50 cursor-pointer',
        className
      )}
      {...props}
    >
      {children}
    </tr>
  );
};

// Table Head Cell
Table.Head = ({
  children,
  sortable,
  sortDirection,
  onSort,
  className,
  ...props
}) => {
  const handleKeyDown = (e) => {
    if (sortable && (e.key === 'Enter' || e.key === ' ')) {
      e.preventDefault();
      onSort?.();
    }
  };

  return (
    <th
      className={cn(
        'px-6 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider',
        sortable && 'cursor-pointer select-none hover:bg-gray-100 dark:hover:bg-dark-600 focus:outline-none focus:bg-gray-100 dark:focus:bg-dark-600',
        className
      )}
      onClick={sortable ? onSort : undefined}
      onKeyDown={sortable ? handleKeyDown : undefined}
      tabIndex={sortable ? 0 : undefined}
      role={sortable ? 'button' : undefined}
      aria-sort={
        sortable
          ? sortDirection === 'asc'
            ? 'ascending'
            : sortDirection === 'desc'
            ? 'descending'
            : 'none'
          : undefined
      }
      {...props}
    >
      <div className="flex items-center gap-2">
        {children}
        {sortable && (
          <span className="text-gray-500 dark:text-gray-400">
            {sortDirection === 'asc' ? (
              <ChevronUp className="w-4 h-4" />
            ) : sortDirection === 'desc' ? (
              <ChevronDown className="w-4 h-4" />
            ) : (
              <ChevronsUpDown className="w-4 h-4" />
            )}
          </span>
        )}
      </div>
    </th>
  );
};

// Table Data Cell
Table.Cell = ({ children, className, align = 'left', ...props }) => {
  const alignments = {
    left: 'text-left',
    center: 'text-center',
    right: 'text-right',
  };

  return (
    <td
      className={cn(
        'px-6 py-4 text-sm text-gray-900 dark:text-gray-100 whitespace-nowrap',
        alignments[align],
        className
      )}
      {...props}
    >
      {children}
    </td>
  );
};

// Empty State for Table
Table.Empty = ({ children, colSpan, className }) => {
  return (
    <tr>
      <td
        colSpan={colSpan || 100}
        className={cn('px-6 py-12 text-center text-gray-600 dark:text-gray-400', className)}
      >
        {children || 'No data available'}
      </td>
    </tr>
  );
};

export default Table;
