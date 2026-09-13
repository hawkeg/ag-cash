import { logger } from '../utils/logger';
import {
  signIn,
  signUp,
  signOut,
  getCurrentUser,
  refreshAccessToken,
} from './supabase';
import { ApiResponse, SignInCredentials, SignUpCredentials, AuthUser, AuthSession } from '../types';

/**
 * Authentication Service
 * Provides high-level authentication operations with consistent error handling
 */
export class AuthService {
  /**
   * Authenticate a user with email and password
   */
  static async login(credentials: SignInCredentials): Promise<ApiResponse<{ user: AuthUser; session: AuthSession }>> {
    try {
      logger.info(`Login attempt for email: ${credentials.email}`);
      
      const result = await signIn(credentials);

      if (!result.success) {
        return {
          success: false,
          error: {
            message: result.error?.message || 'Authentication failed',
            code: result.error?.code || 'AUTH_FAILED',
          },
          timestamp: new Date(),
        };
      }

      if (!result.user || !result.session) {
        return {
          success: false,
          error: {
            message: 'Invalid authentication response',
            code: 'INVALID_RESPONSE',
          },
          timestamp: new Date(),
        };
      }

      logger.info(`Login successful for user: ${result.user.id}`);

      return {
        success: true,
        data: {
          user: result.user,
          session: result.session,
        },
        timestamp: new Date(),
      };
    } catch (error) {
      logger.error('Login service error:', error);
      return {
        success: false,
        error: {
          message: error instanceof Error ? error.message : 'An unexpected error occurred during login',
          code: 'LOGIN_ERROR',
        },
        timestamp: new Date(),
      };
    }
  }

  /**
   * Register a new user
   */
  static async register(credentials: SignUpCredentials): Promise<ApiResponse<{ user: AuthUser; session?: AuthSession }>> {
    try {
      logger.info(`Registration attempt for email: ${credentials.email}`);
      
      const result = await signUp(credentials);

      if (!result.success) {
        return {
          success: false,
          error: {
            message: result.error?.message || 'Registration failed',
            code: result.error?.code || 'REGISTRATION_FAILED',
          },
          timestamp: new Date(),
        };
      }

      if (!result.user) {
        return {
          success: false,
          error: {
            message: 'Invalid registration response',
            code: 'INVALID_RESPONSE',
          },
          timestamp: new Date(),
        };
      }

      logger.info(`Registration successful for user: ${result.user.id}`);

      return {
        success: true,
        data: {
          user: result.user,
          session: result.session,
        },
        timestamp: new Date(),
      };
    } catch (error) {
      logger.error('Registration service error:', error);
      return {
        success: false,
        error: {
          message: error instanceof Error ? error.message : 'An unexpected error occurred during registration',
          code: 'REGISTRATION_ERROR',
        },
        timestamp: new Date(),
      };
    }
  }

  /**
   * Logout a user
   */
  static async logout(accessToken: string): Promise<ApiResponse<void>> {
    try {
      logger.info('Logout attempt');
      
      const result = await signOut(accessToken);

      if (!result.success) {
        return {
          success: false,
          error: {
            message: result.error || 'Logout failed',
            code: 'LOGOUT_FAILED',
          },
          timestamp: new Date(),
        };
      }

      logger.info('Logout successful');

      return {
        success: true,
        timestamp: new Date(),
      };
    } catch (error) {
      logger.error('Logout service error:', error);
      return {
        success: false,
        error: {
          message: error instanceof Error ? error.message : 'An unexpected error occurred during logout',
          code: 'LOGOUT_ERROR',
        },
        timestamp: new Date(),
      };
    }
  }

  /**
   * Get the current authenticated user
   */
  static async getAuthenticatedUser(accessToken: string): Promise<ApiResponse<AuthUser>> {
    try {
      const result = await getCurrentUser(accessToken);

      if (!result.success) {
        return {
          success: false,
          error: {
            message: result.error?.message || 'Failed to get user',
            code: result.error?.code || 'GET_USER_FAILED',
          },
          timestamp: new Date(),
        };
      }

      if (!result.user) {
        return {
          success: false,
          error: {
            message: 'No user found',
            code: 'USER_NOT_FOUND',
          },
          timestamp: new Date(),
        };
      }

      return {
        success: true,
        data: result.user,
        timestamp: new Date(),
      };
    } catch (error) {
      logger.error('Get authenticated user service error:', error);
      return {
        success: false,
        error: {
          message: error instanceof Error ? error.message : 'An unexpected error occurred while getting user',
          code: 'GET_USER_ERROR',
        },
        timestamp: new Date(),
      };
    }
  }

  /**
   * Refresh an access token
   */
  static async refreshToken(refreshToken: string): Promise<ApiResponse<AuthSession>> {
    try {
      logger.info('Token refresh attempt');
      
      const result = await refreshAccessToken(refreshToken);

      if (!result.success) {
        return {
          success: false,
          error: {
            message: result.error?.message || 'Token refresh failed',
            code: result.error?.code || 'REFRESH_FAILED',
          },
          timestamp: new Date(),
        };
      }

      if (!result.session) {
        return {
          success: false,
          error: {
            message: 'Invalid refresh response',
            code: 'INVALID_RESPONSE',
          },
          timestamp: new Date(),
        };
      }

      logger.info('Token refresh successful');

      return {
        success: true,
        data: result.session,
        timestamp: new Date(),
      };
    } catch (error) {
      logger.error('Refresh token service error:', error);
      return {
        success: false,
        error: {
          message: error instanceof Error ? error.message : 'An unexpected error occurred during token refresh',
          code: 'REFRESH_ERROR',
        },
        timestamp: new Date(),
      };
    }
  }

  /**
   * Validate if a user has a specific role
   */
  static hasRole(user: AuthUser, role: string): boolean {
    return user.userMetadata?.role === role;
  }

  /**
   * Validate if a user has any of the specified roles
   */
  static hasAnyRole(user: AuthUser, roles: string[]): boolean {
    const userRole = user.userMetadata?.role;
    return userRole ? roles.includes(userRole) : false;
  }

  /**
   * Check if a user's email is verified
   */
  static isEmailVerified(user: AuthUser): boolean {
    return user.emailConfirmed === true;
  }
}
