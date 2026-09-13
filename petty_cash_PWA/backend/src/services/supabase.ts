import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { logger } from '../utils/logger';
import { AuthUser, SignInCredentials, SignUpCredentials, AuthResponse, AuthSession } from '../types';

// Environment variables
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

// Validate environment variables
if (!SUPABASE_URL || !SUPABASE_ANON_KEY || !SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error('Missing required Supabase environment variables: SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY');
}

// Initialize Supabase client with anon key (for client-side operations)
export const supabase: SupabaseClient = createClient(
  SUPABASE_URL,
  SUPABASE_ANON_KEY,
  {
    auth: {
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: true,
    },
  }
);

// Initialize Supabase admin client with service role key (for server-side operations)
export const supabaseAdmin: SupabaseClient = createClient(
  SUPABASE_URL,
  SUPABASE_SERVICE_ROLE_KEY,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }
);

/**
 * Sign in a user with email and password
 */
export async function signIn(credentials: SignInCredentials): Promise<AuthResponse> {
  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email: credentials.email,
      password: credentials.password,
    });

    if (error) {
      logger.error('Sign in error:', error.message);
      return {
        success: false,
        error: {
          message: error.message,
          code: error.status?.toString(),
        },
      };
    }

    if (!data.user || !data.session) {
      return {
        success: false,
        error: {
          message: 'No user or session returned',
        },
      };
    }

    return {
      success: true,
      user: {
        id: data.user.id,
        email: data.user.email || '',
        emailConfirmed: data.user.email_confirmed_at !== null,
        userMetadata: data.user.user_metadata,
        createdAt: data.user.created_at,
        updatedAt: data.user.updated_at,
      },
      session: {
        accessToken: data.session.access_token,
        refreshToken: data.session.refresh_token,
        expiresIn: data.session.expires_in || 3600,
      } as AuthSession,
    };
  } catch (error) {
    logger.error('Sign in exception:', error);
    return {
      success: false,
      error: {
        message: error instanceof Error ? error.message : 'An unexpected error occurred',
      },
    };
  }
}

/**
 * Sign up a new user
 */
export async function signUp(credentials: SignUpCredentials): Promise<AuthResponse> {
  try {
    const { data, error } = await supabase.auth.signUp({
      email: credentials.email,
      password: credentials.password,
      options: {
        data: credentials.metadata || {},
      },
    });

    if (error) {
      logger.error('Sign up error:', error.message);
      return {
        success: false,
        error: {
          message: error.message,
          code: error.status?.toString(),
        },
      };
    }

    if (!data.user) {
      return {
        success: false,
        error: {
          message: 'No user returned',
        },
      };
    }

    return {
      success: true,
      user: {
        id: data.user.id,
        email: data.user.email || '',
        emailConfirmed: data.user.email_confirmed_at !== null,
        userMetadata: data.user.user_metadata,
        createdAt: data.user.created_at,
        updatedAt: data.user.updated_at,
      },
      session: data.session
        ? {
            accessToken: data.session.access_token,
            refreshToken: data.session.refresh_token,
            expiresIn: data.session.expires_in || 3600,
          } as AuthSession
        : undefined,
    };
  } catch (error) {
    logger.error('Sign up exception:', error);
    return {
      success: false,
      error: {
        message: error instanceof Error ? error.message : 'An unexpected error occurred',
      },
    };
  }
}

/**
 * Sign out a user
 */
export async function signOut(_accessToken: string): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabase.auth.signOut();

    if (error) {
      logger.error('Sign out error:', error.message);
      return {
        success: false,
        error: error.message,
      };
    }

    return { success: true };
  } catch (error) {
    logger.error('Sign out exception:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'An unexpected error occurred',
    };
  }
}

/**
 * Get the current user from a JWT token
 */
export async function getCurrentUser(accessToken: string): Promise<AuthResponse> {
  try {
    const { data, error } = await supabase.auth.getUser(accessToken);

    if (error) {
      logger.error('Get user error:', error.message);
      return {
        success: false,
        error: {
          message: error.message,
          code: error.status?.toString(),
        },
      };
    }

    if (!data.user) {
      return {
        success: false,
        error: {
          message: 'No user found',
        },
      };
    }

    return {
      success: true,
      user: {
        id: data.user.id,
        email: data.user.email || '',
        emailConfirmed: data.user.email_confirmed_at !== null,
        userMetadata: data.user.user_metadata,
        createdAt: data.user.created_at,
        updatedAt: data.user.updated_at,
      },
    };
  } catch (error) {
    logger.error('Get user exception:', error);
    return {
      success: false,
      error: {
        message: error instanceof Error ? error.message : 'An unexpected error occurred',
      },
    };
  }
}

/**
 * Refresh an access token
 */
export async function refreshAccessToken(refreshToken: string): Promise<AuthResponse> {
  try {
    const { data, error } = await supabase.auth.refreshSession({
      refresh_token: refreshToken,
    });

    if (error) {
      logger.error('Refresh token error:', error.message);
      return {
        success: false,
        error: {
          message: error.message,
          code: error.status?.toString(),
        },
      };
    }

    if (!data.session) {
      return {
        success: false,
        error: {
          message: 'No session returned',
        },
      };
    }

    return {
      success: true,
      session: {
        accessToken: data.session.access_token,
        refreshToken: data.session.refresh_token,
        expiresIn: data.session.expires_in || 3600,
      } as AuthSession,
    };
  } catch (error) {
    logger.error('Refresh token exception:', error);
    return {
      success: false,
      error: {
        message: error instanceof Error ? error.message : 'An unexpected error occurred',
      },
    };
  }
}

/**
 * Verify a JWT token and return the user
 */
export async function verifyToken(accessToken: string): Promise<AuthUser | null> {
  const response = await getCurrentUser(accessToken);
  if (response.success && response.user) {
    return response.user;
  }
  return null;
}
