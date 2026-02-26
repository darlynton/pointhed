import logger from '../utils/logger.js';

export const errorHandler = (err, req, res, next) => {
  // Log error with context
  logger.error(err.message || 'Unhandled error', {
    reqId: req.id,
    path: req.path,
    method: req.method,
    code: err.code,
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
  });

  // Prisma errors
  if (err.code === 'P2002') {
    return res.status(409).json({
      success: false,
      error: 'Duplicate entry',
      ...(process.env.NODE_ENV !== 'production' && { details: err.meta?.target })
    });
  }

  if (err.code === 'P2025') {
    return res.status(404).json({
      success: false,
      error: 'Record not found'
    });
  }

  // Validation errors (Zod)
  if (err.name === 'ZodError') {
    return res.status(400).json({
      success: false,
      error: 'Validation failed',
      ...(process.env.NODE_ENV !== 'production' && { details: err.errors })
    });
  }

  // Body parser errors
  if (err.type === 'entity.too.large') {
    return res.status(413).json({
      success: false,
      error: 'Request body too large'
    });
  }

  // Default error - sanitize in production
  const statusCode = err.status || err.statusCode || 500;
  const message = statusCode === 500 && process.env.NODE_ENV === 'production'
    ? 'Internal server error'
    : err.message || 'Internal server error';

  res.status(statusCode).json({
    success: false,
    error: message,
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
};
