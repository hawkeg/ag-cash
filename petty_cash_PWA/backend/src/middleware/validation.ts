import { Request, Response, NextFunction } from 'express';
import Joi from 'joi';
import { logger } from '../utils/logger';

/**
 * Validation middleware factory
 * Creates middleware that validates request body against a Joi schema
 */
export const validate = (schema: Joi.ObjectSchema, property: 'body' | 'query' | 'params' = 'body') => {
  return (req: Request, res: Response, next: NextFunction) => {
    const { error, value } = schema.validate(req[property], {
      abortEarly: false,
      stripUnknown: true
    });

    if (error) {
      const errorMessage = error.details.map(detail => detail.message).join(', ');
      logger.warn(`Validation error: ${errorMessage}`);
      
      return res.status(400).json({
        success: false,
        error: {
          message: errorMessage,
          code: 'VALIDATION_ERROR',
          details: error.details.map(detail => ({
            field: detail.path.join('.'),
            message: detail.message
          }))
        },
        timestamp: new Date()
      });
    }

    // Replace the property with the validated and sanitized value
    req[property] = value;
    next();
  };
};

/**
 * Async handler wrapper to catch errors in async route handlers
 */
export const asyncHandler = (fn: (req: Request, res: Response, next: NextFunction) => Promise<any>) => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};
