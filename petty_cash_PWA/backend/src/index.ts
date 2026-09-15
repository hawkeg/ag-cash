import './config/env';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { logger } from './utils/logger';
import { authMiddleware as authenticate } from './middleware/auth';
import { ApiResponse } from './types';
import authController from './controllers/authController';
import requestController from './controllers/requestController';
import expenseController from './controllers/expenseController';
import advanceController from './controllers/advanceController';
import dashboardController from './controllers/dashboardController';
import notificationController from './controllers/notificationController';

const app = express();
const PORT = process.env.PORT || 4001;

// Middleware
app.use(helmet());
app.use(cors({
  origin: (process.env.CORS_ORIGIN || 'http://localhost:5173').split(',').map(o => o.trim()),
  credentials: true
}));
app.use(express.json({ limit: '15mb' }));
app.use(express.urlencoded({ extended: true }));

// Rate limiting: general API + stricter on auth endpoints
const apiLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 300,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { success: false, error: { message: 'Too many requests, slow down', code: 'RATE_LIMITED' }, timestamp: new Date() },
});
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 30,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { success: false, error: { message: 'Too many auth attempts, try again later', code: 'RATE_LIMITED' }, timestamp: new Date() },
});
app.use('/api', apiLimiter);
app.use('/api/auth/login', authLimiter);
app.use('/api/auth/register', authLimiter);

// Request logging middleware
app.use((req, res, next) => {
  logger.info(`${req.method} ${req.path}`);
  next();
});

// Health check (liveness — is the process up)
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Readiness — is the app actually able to serve (Odoo reachable)
app.get('/health/ready', async (req, res) => {
  try {
    const { authenticate } = await import('./services/odoo');
    await authenticate();
    res.json({ status: 'ready', odoo: 'connected', timestamp: new Date().toISOString() });
  } catch (err: any) {
    res.status(503).json({ status: 'not_ready', odoo: err?.message || 'unreachable', timestamp: new Date().toISOString() });
  }
});

// Basic runtime metrics
app.get('/metrics', (req, res) => {
  const mem = process.memoryUsage();
  res.json({
    uptimeSeconds: Math.round(process.uptime()),
    memoryRssMB: Math.round(mem.rss / 1048576),
    memoryHeapMB: Math.round(mem.heapUsed / 1048576),
    node: process.version,
    timestamp: new Date().toISOString(),
  });
});

// API routes
app.get('/api', (req, res) => {
  res.json({ message: 'AG-Cash API v1.0' });
});

// Register controllers with authentication middleware
// Auth routes: login and register don't require auth, others do
app.use('/api/auth', authController);

// Protected routes requiring authentication
app.use('/api/requests', authenticate, requestController);
app.use('/api/expenses', authenticate, expenseController);
app.use('/api/advances', authenticate, advanceController);
app.use('/api/dashboard', authenticate, dashboardController);
app.use('/api/notifications', authenticate, notificationController);

// Error handling
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  logger.error(err.stack);
  const response: ApiResponse<null> = {
    success: false,
    error: {
      message: err.message || 'Internal Server Error',
      code: err.code || 'INTERNAL_ERROR'
    },
    timestamp: new Date()
  };
  res.status(err.status || 500).json(response);
});

// Start server
app.listen(PORT, () => {
  logger.info(`AG-Cash Backend API running on port ${PORT}`);
  logger.info(`Environment: ${process.env.NODE_ENV}`);
});

export default app;
