import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';
import { cn } from '../../utils/cn';

/**
 * Pagination Component - Navigate through pages
 *
 * @param {number} currentPage - Current active page (1-indexed)
 * @param {number} totalPages - Total number of pages
 * @param {function} onPageChange - Callback when page changes
 * @param {number} siblingCount - Number of page buttons to show on each side of current page
 * @param {boolean} showFirstLast - Whether to show first/last page buttons
 * @param {string} size - Size variant: 'sm', 'md', 'lg'
 */
const Pagination = ({
  currentPage = 1,
  totalPages = 1,
  onPageChange,
  siblingCount = 1,
  showFirstLast = true,
  size = 'md',
  className,
}) => {
  const sizes = {
    sm: 'h-8 w-8 text-xs',
    md: 'h-10 w-10 text-sm',
    lg: 'h-12 w-12 text-base',
  };

  // Generate page numbers to display
  const getPageNumbers = () => {
    const pages = [];
    const leftSibling = Math.max(currentPage - siblingCount, 1);
    const rightSibling = Math.min(currentPage + siblingCount, totalPages);

    // Show first page
    if (leftSibling > 1) {
      pages.push(1);
      if (leftSibling > 2) {
        pages.push('...');
      }
    }

    // Show pages around current page
    for (let i = leftSibling; i <= rightSibling; i++) {
      pages.push(i);
    }

    // Show last page
    if (rightSibling < totalPages) {
      if (rightSibling < totalPages - 1) {
        pages.push('...');
      }
      pages.push(totalPages);
    }

    return pages;
  };

  const pages = getPageNumbers();

  const handlePageChange = (page) => {
    if (page >= 1 && page <= totalPages && page !== currentPage) {
      onPageChange(page);
    }
  };

  return (
    <nav className={cn('flex items-center justify-center gap-1', className)}>
      {/* First Page */}
      {showFirstLast && (
        <button
          onClick={() => handlePageChange(1)}
          disabled={currentPage === 1}
          className={cn(
            'inline-flex items-center justify-center rounded-lg border border-border',
            'transition-colors hover:bg-gray-100',
            'disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-transparent',
            sizes[size]
          )}
          aria-label="First page"
        >
          <ChevronsLeft className="w-4 h-4" />
        </button>
      )}

      {/* Previous Page */}
      <button
        onClick={() => handlePageChange(currentPage - 1)}
        disabled={currentPage === 1}
        className={cn(
          'inline-flex items-center justify-center rounded-lg border border-border',
          'transition-colors hover:bg-gray-100',
          'disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-transparent',
          sizes[size]
        )}
        aria-label="Previous page"
      >
        <ChevronLeft className="w-4 h-4" />
      </button>

      {/* Page Numbers */}
      {pages.map((page, index) => {
        if (page === '...') {
          return (
            <span
              key={`ellipsis-${index}`}
              className={cn(
                'inline-flex items-center justify-center text-text-muted dark:text-text-dark-muted',
                sizes[size]
              )}
            >
              ...
            </span>
          );
        }

        return (
          <button
            key={page}
            onClick={() => handlePageChange(page)}
            className={cn(
              'inline-flex items-center justify-center rounded-lg border transition-colors font-medium',
              sizes[size],
              currentPage === page
                ? 'bg-brand-blue text-white border-brand-blue hover:bg-brand-blue-600'
                : 'border-border hover:bg-gray-100 text-text-primary dark:text-text-dark-primary'
            )}
            aria-label={`Page ${page}`}
            aria-current={currentPage === page ? 'page' : undefined}
          >
            {page}
          </button>
        );
      })}

      {/* Next Page */}
      <button
        onClick={() => handlePageChange(currentPage + 1)}
        disabled={currentPage === totalPages}
        className={cn(
          'inline-flex items-center justify-center rounded-lg border border-border',
          'transition-colors hover:bg-gray-100',
          'disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-transparent',
          sizes[size]
        )}
        aria-label="Next page"
      >
        <ChevronRight className="w-4 h-4" />
      </button>

      {/* Last Page */}
      {showFirstLast && (
        <button
          onClick={() => handlePageChange(totalPages)}
          disabled={currentPage === totalPages}
          className={cn(
            'inline-flex items-center justify-center rounded-lg border border-border',
            'transition-colors hover:bg-gray-100',
            'disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-transparent',
            sizes[size]
          )}
          aria-label="Last page"
        >
          <ChevronsRight className="w-4 h-4" />
        </button>
      )}
    </nav>
  );
};

/**
 * SimplePagination - Simplified pagination with just prev/next
 */
export const SimplePagination = ({
  currentPage = 1,
  totalPages = 1,
  onPageChange,
  size = 'md',
  className,
}) => {
  const sizes = {
    sm: 'px-3 py-1.5 text-xs',
    md: 'px-4 py-2 text-sm',
    lg: 'px-6 py-3 text-base',
  };

  return (
    <div className={cn('flex items-center justify-between', className)}>
      <button
        onClick={() => onPageChange(currentPage - 1)}
        disabled={currentPage === 1}
        className={cn(
          'inline-flex items-center gap-2 rounded-lg border border-border font-medium',
          'transition-colors hover:bg-gray-100',
          'disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-transparent',
          sizes[size]
        )}
      >
        <ChevronLeft className="w-4 h-4" />
        Previous
      </button>

      <span className="text-sm text-text-secondary dark:text-text-dark-secondary">
        Page {currentPage} of {totalPages}
      </span>

      <button
        onClick={() => onPageChange(currentPage + 1)}
        disabled={currentPage === totalPages}
        className={cn(
          'inline-flex items-center gap-2 rounded-lg border border-border font-medium',
          'transition-colors hover:bg-gray-100',
          'disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-transparent',
          sizes[size]
        )}
      >
        Next
        <ChevronRight className="w-4 h-4" />
      </button>
    </div>
  );
};

export default Pagination;
