/**
 * src/utils/responseHandler.js
 * Utility helper functions for consistent API response structures.
 */

/**
 * Sends a successful JSON response.
 * @param {Object} res - Express response object.
 * @param {string} message - Human-readable success message.
 * @param {Object|Array} data - Payload data.
 * @param {number} [statusCode=200] - HTTP status code.
 */
export const sendSuccess = (res, message, data = {}, statusCode = 200) => {
  return res.status(statusCode).json({
    success: true,
    message,
    data
  });
};

/**
 * Sends an error JSON response.
 * @param {Object} res - Express response object.
 * @param {string} message - Human-readable error message.
 * @param {number} [statusCode=500] - HTTP status code.
 * @param {Object|Array|null} [errors=null] - Detailed error parameters (if validation failed).
 */
export const sendError = (res, message, statusCode = 500, errors = null) => {
  return res.status(statusCode).json({
    success: false,
    message,
    errors
  });
};
