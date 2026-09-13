import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger';
import { verifyToken } from '../services/supabase';
import { AuthUser } from '../types';

// Extend Express Request to include user
declare global {
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}

/**
 * Authentication middleware to verify JWT tokens
 * Extracts the Bearer token from the Authorization header and validates it
 */
export async function authMiddleware(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    // Get the Authorization header
    const authHeader = req.headers.authorization;

    if (!authHeader) {
      logger.warn('Authentication failed: No authorization header provided');
      res.status(401).json({
        success: false,
        error: {
          message: 'Authorization header is required',
          code: 'NO_AUTH_HEADER',
        },
        timestamp: new Date(),
      });
      return;
    }

    // Extract the Bearer token
    const parts = authHeader.split(' ');
    if (parts.length !== 2 || parts[0] !== 'Bearer') {
      logger.warn('Authentication failed: Invalid authorization header format');
      res.status(401).json({
        success: false,
        error: {
          message: 'Invalid authorization header format. Expected: Bearer <token>',
          code: 'INVALID_AUTH_FORMAT',
        },
        timestamp: new Date(),
      });
      return;
    }

    const token = parts[1];

    if (!token) {
      logger.warn('Authentication failed: No token provided');
      res.status(401).json({
        success: false,
        error: {
          message: 'Token is required',
          code: 'NO_TOKEN',
        },
        timestamp: new Date(),
      });
      return;
    }

    // Verify the token and get the user
    const user = await verifyToken(token);

    if (!user) {
      logger.warn('Authentication failed: Invalid or expired token');
      res.status(401).json({
        success: false,
        error: {
          message: 'Invalid or expired token',
          code: 'INVALID_TOKEN',
        },
        timestamp: new Date(),
      });
      return;
    }

    // Attach the user to the request object
    req.user = user;
    logger.info(`User authenticated: ${user.id} (${user.email})`);

    return next();
  } catch (error) {
    logger.error('Authentication middleware error:', error);
    res.status(500).json({
      success: false,
      error: {
        message: 'An error occurred during authentication',
        code: 'AUTH_ERROR',
      },
      timestamp: new Date(),
    });
    return;
  }
}

/**
 * Optional authentication middleware
 * Attaches the user to the request if a valid token is provided,
 * but does not block the request if no token is provided
 */
export async function optionalAuthMiddleware(req: Request, _res: Response, next: NextFunction): Promise<void> {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader) {
      // No token provided, continue without user
      return next();
    }

    const parts = authHeader.split(' ');
    if (parts.length !== 2 || parts[0] !== 'Bearer') {
      // Invalid format, continue without user
      return next();
    }

    const token = parts[1];

    if (!token) {
      // No token, continue without user
      return next();
    }

    // Try to verify the token
    const user = await verifyToken(token);

    if (user) {
      // Valid token, attach user to request
      req.user = user;
      logger.info(`User authenticated (optional): ${user.id} (${user.email})`);
    }

    next();
  } catch (error) {
    logger.error('Optional authentication middleware error:', error);
    // Continue without user on error
    next();
  }
}

/**
 * Role-based authorization middleware factory
 * Creates a middleware that checks if the authenticated user has the required role
 */
export function requireRole(...allowedRoles: string[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: {
          message: 'Authentication required',
          code: 'AUTH_REQUIRED',
        },
        timestamp: new Date(),
      });
    }

    const userRole = req.user.userMetadata?.role;

    if (!userRole || !allowedRoles.includes(userRole)) {
      logger.warn(`Authorization failed: User ${req.user.id} does not have required role. Required: ${allowedRoles.join(', ')}, User role: ${userRole}`);
      return res.status(403).json({
        success: false,
        error: {
          message: 'Insufficient permissions',
          code: 'INSUFFICIENT_PERMISSIONS',
        },
        timestamp: new Date(),
      });
    }

    return next();
  };
}

/**
 * Email verification middleware
 * Checks if the user's email has been verified
 */
export function requireEmailVerification(req: Request, res: Response, next: NextFunction) {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      error: {
        message: 'Authentication required',
        code: 'AUTH_REQUIRED',
      },
      timestamp: new Date(),
    });
  }

  if (!req.user.emailConfirmed) {
    logger.warn(`Authorization failed: User ${req.user.id} has not verified email`);
    return res.status(403).json({
      success: false,
      error: {
        message: 'Email verification required',
        code: 'EMAIL_NOT_VERIFIED',
      },
      timestamp: new Date(),
    });
  }

  return next();
}

// Legacy middleware names for backward compatibility
export const authenticate = authMiddleware;
export const optionalAuth = optionalAuthMiddleware;
