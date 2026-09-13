import { Router } from 'express';
import { AuthController } from '../controllers/auth.controller';
import { authMiddleware } from '../middleware/auth';

const router = Router();

/**
 * Auth Routes
 * Base path: /api/auth
 */

// Public routes
router.post('/login', AuthController.login);
router.post('/register', AuthController.register);
router.post('/refresh', AuthController.refresh);

// Protected routes (require authentication)
router.post('/logout', authMiddleware, AuthController.logout);
router.get('/me', authMiddleware, AuthController.me);

export default router;
