import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';
import { cn } from '../../utils/cn';

/**
 * Pagination Component - Navigate through pages with full dark mode and accessibility
 *
 * @param {number} currentPage - Current active page (1-indexed)
 * @param {number} totalPages - Total number of pages
 * @param {function} onPageChange - Callback when page changes
 * @param {number} siblingCount - Number of page buttons to show on each side of current page
 * @param {boolean} showFirstLast - Whether to show first/last page buttons
 * @param {string} size - Size variant: 'sm', 'md', 'lg'
 *
 * Features:
 * - Full dark mode support
 * - Keyboard navigation
 * - ARIA labels and aria-current
 * - Responsive button sizing
 * - Accessible disabled states
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
    sm: 'h-8 w-8 min-w-[32px] text-xs',
    md: 'h-10 w-10 min-w-[40px] text-sm',
    lg: 'h-12 w-12 min-w-[48px] text-base',
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
    <nav
      className={cn('flex flex-wrap items-center justify-center gap-1', className)}
      role="navigation"
      aria-label="Pagination"
    >
      {/* First Page — hidden on narrow screens to keep the strip from
          overflowing; Prev/Next still reachable below. */}
      {showFirstLast && (
        <button
          onClick={() => handlePageChange(1)}
          disabled={currentPage === 1}
          className={cn(
            'hidden sm:inline-flex items-center justify-center rounded-lg border border-gray-200 dark:border-gray-700',
            'text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-800',
            'transition-colors hover:bg-gray-100 dark:hover:bg-gray-700',
            'focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400',
            'disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-white dark:disabled:hover:bg-gray-800',
            sizes[size]
          )}
          aria-label="Go to first page"
        >
          <ChevronsLeft className="w-4 h-4" />
        </button>
      )}

      {/* Previous Page */}
      <button
        onClick={() => handlePageChange(currentPage - 1)}
        disabled={currentPage === 1}
        className={cn(
          'inline-flex items-center justify-center rounded-lg border border-gray-200 dark:border-gray-700',
          'text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-800',
          'transition-colors hover:bg-gray-100 dark:hover:bg-gray-700',
          'focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400',
          'disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-white dark:disabled:hover:bg-gray-800',
          sizes[size]
        )}
        aria-label="Go to previous page"
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
                'inline-flex items-center justify-center text-gray-500 dark:text-gray-400',
                sizes[size]
              )}
              aria-hidden="true"
            >
              …
            </span>
          );
        }

        return (
          <button
            key={page}
            onClick={() => handlePageChange(page)}
            className={cn(
              'inline-flex items-center justify-center rounded-lg border transition-colors font-medium',
              'focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400',
              sizes[size],
              currentPage === page
                ? 'bg-blue-600 dark:bg-blue-500 text-white border-blue-600 dark:border-blue-500 hover:bg-blue-700 dark:hover:bg-blue-600'
                : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-900 dark:text-gray-100'
            )}
            aria-label={`Go to page ${page}`}
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
          'inline-flex items-center justify-center rounded-lg border border-gray-200 dark:border-gray-700',
          'text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-800',
          'transition-colors hover:bg-gray-100 dark:hover:bg-gray-700',
          'focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400',
          'disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-white dark:disabled:hover:bg-gray-800',
          sizes[size]
        )}
        aria-label="Go to next page"
      >
        <ChevronRight className="w-4 h-4" />
      </button>

      {/* Last Page — hidden on narrow screens, same reasoning as First Page. */}
      {showFirstLast && (
        <button
          onClick={() => handlePageChange(totalPages)}
          disabled={currentPage === totalPages}
          className={cn(
            'hidden sm:inline-flex items-center justify-center rounded-lg border border-gray-200 dark:border-gray-700',
            'text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-800',
            'transition-colors hover:bg-gray-100 dark:hover:bg-gray-700',
            'focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400',
            'disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-white dark:disabled:hover:bg-gray-800',
            sizes[size]
          )}
          aria-label="Go to last page"
        >
          <ChevronsRight className="w-4 h-4" />
        </button>
      )}
    </nav>
  );
};

/**
 * SimplePagination - Simplified pagination with just prev/next and page indicator
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
          'inline-flex items-center gap-2 rounded-lg border border-gray-200 dark:border-gray-700 font-medium',
          'text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-800',
          'transition-colors hover:bg-gray-100 dark:hover:bg-gray-700',
          'focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400',
          'disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-white dark:disabled:hover:bg-gray-800',
          sizes[size]
        )}
        aria-label="Go to previous page"
      >
        <ChevronLeft className="w-4 h-4" />
        Previous
      </button>

      <span className="text-sm text-gray-600 dark:text-gray-400">
        Page {currentPage} of {totalPages}
      </span>

      <button
        onClick={() => onPageChange(currentPage + 1)}
        disabled={currentPage === totalPages}
        className={cn(
          'inline-flex items-center gap-2 rounded-lg border border-gray-200 dark:border-gray-700 font-medium',
          'text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-800',
          'transition-colors hover:bg-gray-100 dark:hover:bg-gray-700',
          'focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400',
          'disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-white dark:disabled:hover:bg-gray-800',
          sizes[size]
        )}
        aria-label="Go to next page"
      >
        Next
        <ChevronRight className="w-4 h-4" />
      </button>
    </div>
  );
};

export default Pagination;
