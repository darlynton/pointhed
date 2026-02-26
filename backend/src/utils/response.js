// Standardized API Response Helpers
// Ensures consistent response format across all endpoints

/**
 * Success response
 * @param {object} res - Express response object
 * @param {object} data - Response data
 * @param {number} status - HTTP status code (default: 200)
 */
export function success(res, data, status = 200) {
  return res.status(status).json({
    success: true,
    data
  });
}

/**
 * Success response with pagination
 * @param {object} res - Express response object
 * @param {array} data - Array of items
 * @param {object} pagination - Pagination info { total, page, limit, pages }
 */
export function paginated(res, data, pagination) {
  return res.status(200).json({
    success: true,
    data,
    pagination
  });
}

/**
 * Created response (201)
 * @param {object} res - Express response object
 * @param {object} data - Created resource data
 */
export function created(res, data) {
  return success(res, data, 201);
}

/**
 * No content response (204)
 * @param {object} res - Express response object
 */
export function noContent(res) {
  return res.status(204).send();
}

/**
 * Error response
 * @param {object} res - Express response object
 * @param {string} message - Error message
 * @param {number} status - HTTP status code (default: 400)
 * @param {object} details - Additional error details (optional)
 */
export function error(res, message, status = 400, details = null) {
  const response = {
    success: false,
    error: message
  };
  
  if (details && process.env.NODE_ENV !== 'production') {
    response.details = details;
  }
  
  return res.status(status).json(response);
}

/**
 * Not found error (404)
 * @param {object} res - Express response object
 * @param {string} resource - Resource name (e.g., "Customer")
 */
export function notFound(res, resource = 'Resource') {
  return error(res, `${resource} not found`, 404);
}

/**
 * Validation error (400)
 * @param {object} res - Express response object
 * @param {string} message - Validation error message
 * @param {object} fields - Field-specific errors
 */
export function validationError(res, message = 'Validation failed', fields = null) {
  return error(res, message, 400, fields);
}

/**
 * Unauthorized error (401)
 * @param {object} res - Express response object
 * @param {string} message - Error message
 */
export function unauthorized(res, message = 'Unauthorized') {
  return error(res, message, 401);
}

/**
 * Forbidden error (403)
 * @param {object} res - Express response object
 * @param {string} message - Error message
 */
export function forbidden(res, message = 'Forbidden') {
  return error(res, message, 403);
}

/**
 * Conflict error (409)
 * @param {object} res - Express response object
 * @param {string} message - Error message
 */
export function conflict(res, message = 'Resource already exists') {
  return error(res, message, 409);
}

/**
 * Internal server error (500)
 * @param {object} res - Express response object
 * @param {string} message - Error message (sanitized for production)
 */
export function serverError(res, message = 'Internal server error') {
  // In production, always use generic message
  const safeMessage = process.env.NODE_ENV === 'production' 
    ? 'Internal server error' 
    : message;
  return error(res, safeMessage, 500);
}

export default {
  success,
  paginated,
  created,
  noContent,
  error,
  notFound,
  validationError,
  unauthorized,
  forbidden,
  conflict,
  serverError
};
