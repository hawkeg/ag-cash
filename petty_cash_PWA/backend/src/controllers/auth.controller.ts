import { Request, Response } from 'express';
import { logger } from '../utils/logger';
import { AuthService } from '../services/auth.service';
import { SignInCredentials, SignUpCredentials } from '../types';

/**
 * Auth Controller
 * Handles HTTP requests for authentication operations
 */
export class AuthController {
  /**
   * Handle user login
   * POST /api/auth/login
   */
  static async login(req: Request, res: Response) {
    try {
      const credentials: SignInCredentials = req.body;

      // Validate input
      if (!credentials.email || !credentials.password) {
        return res.status(400).json({
          success: false,
          error: {
            message: 'Email and password are required',
            code: 'MISSING_CREDENTIALS',
          },
          timestamp: new Date(),
        });
      }

      const result = await AuthService.login(credentials);

      if (!result.success) {
        return res.status(401).json(result);
      }

      return res.status(200).json(result);
    } catch (error) {
      logger.error('Login controller error:', error);
      return res.status(500).json({
        success: false,
        error: {
          message: 'An unexpected error occurred',
          code: 'CONTROLLER_ERROR',
        },
        timestamp: new Date(),
      });
    }
  }

  /**
   * Handle user registration
   * POST /api/auth/register
   */
  static async register(req: Request, res: Response) {
    try {
      const credentials: SignUpCredentials = req.body;

      // Validate input
      if (!credentials.email || !credentials.password) {
        return res.status(400).json({
          success: false,
          error: {
            message: 'Email and password are required',
            code: 'MISSING_CREDENTIALS',
          },
          timestamp: new Date(),
        });
      }

      // Validate password strength
      if (credentials.password.length < 6) {
        return res.status(400).json({
          success: false,
          error: {
            message: 'Password must be at least 6 characters long',
            code: 'WEAK_PASSWORD',
          },
          timestamp: new Date(),
        });
      }

      const result = await AuthService.register(credentials);

      if (!result.success) {
        return res.status(400).json(result);
      }

      return res.status(201).json(result);
    } catch (error) {
      logger.error('Register controller error:', error);
      return res.status(500).json({
        success: false,
        error: {
          message: 'An unexpected error occurred',
          code: 'CONTROLLER_ERROR',
        },
        timestamp: new Date(),
      });
    }
  }

  /**
   * Handle user logout
   * POST /api/auth/logout
   */
  static async logout(req: Request, res: Response) {
    try {
      const authHeader = req.headers.authorization;

      if (!authHeader) {
        return res.status(400).json({
          success: false,
          error: {
            message: 'Authorization header is required',
            code: 'NO_AUTH_HEADER',
          },
          timestamp: new Date(),
        });
      }

      const token = authHeader.replace('Bearer ', '');

      const result = await AuthService.logout(token);

      if (!result.success) {
        return res.status(400).json(result);
      }

      return res.status(200).json(result);
    } catch (error) {
      logger.error('Logout controller error:', error);
      return res.status(500).json({
        success: false,
        error: {
          message: 'An unexpected error occurred',
          code: 'CONTROLLER_ERROR',
        },
        timestamp: new Date(),
      });
    }
  }

  /**
   * Get current authenticated user
   * GET /api/auth/me
   */
  static async me(req: Request, res: Response) {
    try {
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

      return res.status(200).json({
        success: true,
        data: req.user,
        timestamp: new Date(),
      });
    } catch (error) {
      logger.error('Get user controller error:', error);
      return res.status(500).json({
        success: false,
        error: {
          message: 'An unexpected error occurred',
          code: 'CONTROLLER_ERROR',
        },
        timestamp: new Date(),
      });
    }
  }

  /**
   * Refresh access token
   * POST /api/auth/refresh
   */
  static async refresh(req: Request, res: Response) {
    try {
      const { refreshToken } = req.body;

      if (!refreshToken) {
        return res.status(400).json({
          success: false,
          error: {
            message: 'Refresh token is required',
            code: 'MISSING_REFRESH_TOKEN',
          },
          timestamp: new Date(),
        });
      }

      const result = await AuthService.refreshToken(refreshToken);

      if (!result.success) {
        return res.status(401).json(result);
      }

      return res.status(200).json(result);
    } catch (error) {
      logger.error('Refresh token controller error:', error);
      return res.status(500).json({
        success: false,
        error: {
          message: 'An unexpected error occurred',
          code: 'CONTROLLER_ERROR',
        },
        timestamp: new Date(),
      });
    }
  }
}
