/**
 * Pagination utility to safely handle and cap pagination parameters
 */

const MAX_LIMIT = 100; // Maximum items per page
const DEFAULT_LIMIT = 20; // Default items per page if not specified
const DEFAULT_PAGE = 1; // Default page number

/**
 * Get safe pagination parameters with enforced maximum limits
 * @param {Object} query - The request query parameters
 * @param {number} query.page - Page number
 * @param {number} query.limit - Items per page
 * @param {number} defaultLimit - Custom default limit (optional, defaults to 20)
 * @param {number} maxLimit - Custom maximum limit (optional, defaults to 100)
 * @returns {Object} Safe pagination parameters { page, limit, offset }
 */
function getPaginationParams(query, defaultLimit = DEFAULT_LIMIT, maxLimit = MAX_LIMIT) {
  // Parse and validate page number
  let page = parseInt(query.page) || DEFAULT_PAGE;
  page = Math.max(1, page); // Ensure page is at least 1

  // Parse and validate limit
  let limit = parseInt(query.limit) || defaultLimit;
  limit = Math.max(1, Math.min(limit, maxLimit)); // Cap between 1 and maxLimit

  // Calculate offset
  const offset = (page - 1) * limit;

  return {
    page,
    limit,
    offset,
  };
}

/**
 * Create pagination metadata for API responses
 * @param {number} page - Current page number
 * @param {number} limit - Items per page
 * @param {number} total - Total number of items
 * @returns {Object} Pagination metadata
 */
function getPaginationMeta(page, limit, total) {
  const totalPages = Math.ceil(total / limit);

  return {
    currentPage: page,
    itemsPerPage: limit,
    totalItems: total,
    totalPages,
    hasNextPage: page < totalPages,
    hasPreviousPage: page > 1,
  };
}

module.exports = {
  getPaginationParams,
  getPaginationMeta,
  MAX_LIMIT,
  DEFAULT_LIMIT,
};
