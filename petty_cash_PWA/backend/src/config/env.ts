import dotenv from 'dotenv';

// Load environment variables first
dotenv.config();

// Export environment variables for convenience
export const env = {
  DATABASE_URL: process.env.DATABASE_URL!,
  NODE_ENV: process.env.NODE_ENV || 'development',
  PORT: parseInt(process.env.PORT || '4001'),
  SUPABASE_URL: process.env.SUPABASE_URL!,
  SUPABASE_ANON_KEY: process.env.SUPABASE_ANON_KEY!,
  SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY!,
  JWT_SECRET: process.env.JWT_SECRET || 'default-secret',
  ODOO_URL: process.env.ODOO_URL || 'http://localhost:8069',
  ODOO_DB: process.env.ODOO_DB || 'odoo',
  ODOO_USER: process.env.ODOO_USER || 'admin',
  ODOO_API_KEY: process.env.ODOO_API_KEY || '',
  REDIS_URL: process.env.REDIS_URL || 'redis://localhost:6379',
  CORS_ORIGIN: process.env.CORS_ORIGIN || 'http://localhost:5173',
  LOG_LEVEL: process.env.LOG_LEVEL || 'info',
};

// JWT secret must come from the environment in production — a baked-in
// fallback would let anyone forge tokens on a deployed instance.
export const getJwtSecret = (): string => {
  const secret = process.env.JWT_SECRET;
  if (!secret && process.env.NODE_ENV === 'production') {
    throw new Error('JWT_SECRET environment variable is required in production');
  }
  return secret || 'dev-secret';
};
