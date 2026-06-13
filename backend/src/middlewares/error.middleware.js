/**
 * src/middlewares/error.middleware.js
 * Centralized error handler and 404 route fallback middleware.
 */

/**
 * Middleware to catch 404 errors (route not found) and pass them to the error handler.
 */
export const notFoundHandler = (req, res, next) => {
  const error = new Error(`Resource not found - ${req.originalUrl}`);
  res.status(404);
  next(error);
};

/**
 * Global Error Handler Middleware.
 * Captures all standard and operational errors, formatting them into consistent JSON responses.
 */
export const errorHandler = (err, req, res, next) => {
  // If headers are already sent, delegate to default Express error handler
  if (res.headersSent) {
    return next(err);
  }

  let statusCode = res.statusCode === 200 ? 500 : res.statusCode;
  let message = err.message || 'Internal Server Error';

  // Handle Mongoose Bad ObjectId (CastError)
  if (err.name === 'CastError') {
    message = `Resource not found with id of ${err.value}`;
    statusCode = 404;
  }

  // Handle Mongoose validation errors
  if (err.name === 'ValidationError') {
    message = Object.values(err.errors).map((val) => val.message).join(', ');
    statusCode = 400;
  }

  // Handle Mongoose duplicate key error
  if (err.code === 11000) {
    message = `Duplicate field value entered: ${Object.keys(err.keyValue).join(', ')}`;
    statusCode = 400;
  }

  // Handle Multer upload errors
  if (err instanceof Error && err.name === 'MulterError') {
    message = `File upload error: ${err.message}`;
    statusCode = 400;
  }

  // Print stack trace for debugging
  console.error(`[Express Error Handler]`, err);

  res.status(statusCode).json({
    success: false,
    message,
    stack: process.env.NODE_ENV === 'production' ? undefined : err.stack
  });
};
