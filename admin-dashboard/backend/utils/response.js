/**
 * Standard API Response Handlers
 */

class ApiResponse {
  /**
   * Success response
   * @param {Object} res - Express response object
   * @param {Object} data - Response data
   * @param {String} message - Success message
   * @param {Number} statusCode - HTTP status code
   */
  static success(res, data = null, message = 'Success', statusCode = 200) {
    return res.status(statusCode).json({
      success: true,
      message,
      data,
    });
  }

  /**
   * Error response
   * @param {Object} res - Express response object
   * @param {String} message - Error message
   * @param {Number} statusCode - HTTP status code
   * @param {Object} errors - Validation errors
   */
  static error(res, message = 'Error occurred', statusCode = 500, errors = null) {
    const response = {
      success: false,
      message,
    };

    if (errors) {
      response.errors = errors;
    }

    return res.status(statusCode).json(response);
  }

  /**
   * Created response
   */
  static created(res, data = null, message = 'Resource created successfully') {
    return this.success(res, data, message, 201);
  }

  /**
   * No content response
   */
  static noContent(res) {
    return res.status(204).send();
  }

  /**
   * Bad request response
   */
  static badRequest(res, message = 'Bad request', errors = null) {
    return this.error(res, message, 400, errors);
  }

  /**
   * Unauthorized response
   */
  static unauthorized(res, message = 'Unauthorized access') {
    return this.error(res, message, 401);
  }

  /**
   * Forbidden response
   */
  static forbidden(res, message = 'Forbidden') {
    return this.error(res, message, 403);
  }

  /**
   * Not found response
   */
  static notFound(res, message = 'Resource not found') {
    return this.error(res, message, 404);
  }

  /**
   * Validation error response
   */
  static validationError(res, errors, message = 'Validation failed') {
    return this.error(res, message, 422, errors);
  }

  /**
   * Server error response
   */
  static serverError(res, message = 'Internal server error') {
    return this.error(res, message, 500);
  }
}

module.exports = ApiResponse;
