import { Router, Request, Response } from 'express';
import Joi from 'joi';
import { logger } from '../utils/logger';
import { validate, asyncHandler } from '../middleware/validation';
import { ApiResponse } from '../types';

const router = Router();

// Validation schemas
const registerSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().min(8).required(),
  name: Joi.string().min(2).max(100).required(),
  employeeId: Joi.string().optional(),
});

const loginSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().required(),
});

// Mock user storage (replace with actual database/Supabase)
const users: Map<string, any> = new Map();

// Register endpoint
router.post('/register', validate(registerSchema), asyncHandler(async (req: Request, res: Response) => {
  const { email, password, name, employeeId } = req.body;

  // Check if user already exists
  if (users.has(email)) {
    const response: ApiResponse<null> = {
      success: false,
      error: {
        message: 'User with this email already exists',
        code: 'USER_EXISTS'
      },
      timestamp: new Date()
    };
    return res.status(409).json(response);
  }

  // Create user (in a real app, hash password before storing)
  const userId = `user_${Date.now()}`;
  const user = {
    id: userId,
    email,
    password, // In production: hash this!
    name,
    employeeId,
    createdAt: new Date(),
    updatedAt: new Date()
  };

  users.set(email, user);

  logger.info(`User registered: ${email}`);

  const response: ApiResponse<{ userId: string; email: string; name: string }> = {
    success: true,
    data: {
      userId: user.id,
      email: user.email,
      name: user.name
    },
    timestamp: new Date()
  };

  res.status(201).json(response);
}));

// Login endpoint
router.post('/login', validate(loginSchema), asyncHandler(async (req: Request, res: Response) => {
  const { email, password } = req.body;

  // Find user
  const user = users.get(email);
  if (!user) {
    const response: ApiResponse<null> = {
      success: false,
      error: {
        message: 'Invalid credentials',
        code: 'INVALID_CREDENTIALS'
      },
      timestamp: new Date()
    };
    return res.status(401).json(response);
  }

  // Verify password (in production: use bcrypt.compare)
  if (user.password !== password) {
    const response: ApiResponse<null> = {
      success: false,
      error: {
        message: 'Invalid credentials',
        code: 'INVALID_CREDENTIALS'
      },
      timestamp: new Date()
    };
    return res.status(401).json(response);
  }

  logger.info(`User logged in: ${email}`);

  // In production: generate JWT token here
  const response: ApiResponse<{ userId: string; email: string; name: string; token?: string }> = {
    success: true,
    data: {
      userId: user.id,
      email: user.email,
      name: user.name,
      token: 'mock_jwt_token' // Replace with actual JWT
    },
    timestamp: new Date()
  };

  res.status(200).json(response);
}));

// Logout endpoint
router.post('/logout', asyncHandler(async (req: Request, res: Response) => {
  // In production: invalidate JWT token or session
  const response: ApiResponse<{ message: string }> = {
    success: true,
    data: {
      message: 'Logged out successfully'
    },
    timestamp: new Date()
  };

  res.status(200).json(response);
}));

// Get current user endpoint
router.get('/me', asyncHandler(async (req: Request, res: Response) => {
  // In production: extract user from JWT token
  const userId = req.headers['x-user-id'] as string;

  if (!userId) {
    const response: ApiResponse<null> = {
      success: false,
      error: {
        message: 'Unauthorized',
        code: 'UNAUTHORIZED'
      },
      timestamp: new Date()
    };
    return res.status(401).json(response);
  }

  // Find user by ID (mock implementation)
  const user = Array.from(users.values()).find(u => u.id === userId);

  if (!user) {
    const response: ApiResponse<null> = {
      success: false,
      error: {
        message: 'User not found',
        code: 'USER_NOT_FOUND'
      },
      timestamp: new Date()
    };
    return res.status(404).json(response);
  }

  const response: ApiResponse<{ userId: string; email: string; name: string }> = {
    success: true,
    data: {
      userId: user.id,
      email: user.email,
      name: user.name
    },
    timestamp: new Date()
  };

  res.status(200).json(response);
}));

export default router;
