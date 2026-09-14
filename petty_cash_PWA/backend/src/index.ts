import './config/env';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { logger } from './utils/logger';
import { authMiddleware as authenticate } from './middleware/auth';
import { ApiResponse } from './types';
import authController from './controllers/authController';
import requestController from './controllers/requestController';
import expenseController from './controllers/expenseController';
import advanceController from './controllers/advanceController';
import dashboardController from './controllers/dashboardController';

const app = express();
const PORT = process.env.PORT || 4001;

// Middleware
app.use(helmet());
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Request logging middleware
app.use((req, res, next) => {
  logger.info(`${req.method} ${req.path}`);
  next();
});

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
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
