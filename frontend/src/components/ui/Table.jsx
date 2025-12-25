import { ChevronUp, ChevronDown, ChevronsUpDown } from 'lucide-react';
import { cn } from '../../utils/cn';

/**
 * Table Component - Data table with sorting
 *
 * Usage:
 * <Table>
 *   <Table.Header>
 *     <Table.Row>
 *       <Table.Head>Name</Table.Head>
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
    <div className="w-full overflow-x-auto">
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
      className={cn('bg-gray-50 border-b border-border', className)}
      {...props}
    >
      {children}
    </thead>
  );
};

// Table Body
Table.Body = ({ children, className, ...props }) => {
  return (
    <tbody className={cn('divide-y divide-border', className)} {...props}>
      {children}
    </tbody>
  );
};

// Table Footer
Table.Footer = ({ children, className, ...props }) => {
  return (
    <tfoot
      className={cn('bg-gray-50 border-t border-border font-medium', className)}
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
        'border-b border-border transition-colors',
        clickable && 'hover:bg-gray-50 cursor-pointer',
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
  return (
    <th
      className={cn(
        'px-6 py-3 text-left text-xs font-semibold text-text-secondary uppercase tracking-wider',
        sortable && 'cursor-pointer select-none hover:bg-gray-100',
        className
      )}
      onClick={sortable ? onSort : undefined}
      {...props}
    >
      <div className="flex items-center gap-2">
        {children}
        {sortable && (
          <span className="text-text-muted">
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
        'px-6 py-4 text-sm text-text-primary whitespace-nowrap',
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
        className={cn('px-6 py-12 text-center text-text-muted', className)}
      >
        {children || 'No data available'}
      </td>
    </tr>
  );
};

export default Table;
