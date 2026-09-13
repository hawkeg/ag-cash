import { Router, Request, Response } from 'express';
import Joi from 'joi';
import { logger } from '../utils/logger';
import { validate, asyncHandler } from '../middleware/validation';
import { ApiResponse, Advance, AdvanceStatus, CreateAdvanceDto, PaginatedResponse } from '../types';

const router = Router();

// Validation schemas
const createAdvanceSchema = Joi.object({
  amount: Joi.number().positive().required(),
  purpose: Joi.string().min(5).max(500).required(),
  expectedReturnDate: Joi.date().optional()
});

const updateAdvanceSchema = Joi.object({
  amount: Joi.number().positive().optional(),
  purpose: Joi.string().min(5).max(500).optional(),
  expectedReturnDate: Joi.date().optional()
});

const updateStatusSchema = Joi.object({
  status: Joi.string().valid(...Object.values(AdvanceStatus)).required(),
  rejectionReason: Joi.string().max(500).optional()
});

// Mock advance storage (replace with actual database/Supabase)
const advances: Map<string, Advance> = new Map();

// Helper function to generate advance ID
const generateAdvanceId = (): string => `adv_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

// Get all advances with pagination
router.get('/', asyncHandler(async (req: Request, res: Response) => {
  const userId = req.headers['x-user-id'] as string;

  // Parse pagination parameters
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 10;
  const sortBy = (req.query.sortBy as string) || 'createdAt';
  const sortOrder = (req.query.sortOrder as string) === 'asc' ? 'asc' : 'desc';

  // Filter by user ID if provided
  let filteredAdvances = Array.from(advances.values());
  if (userId) {
    filteredAdvances = filteredAdvances.filter(adv => adv.userId === userId);
  }

  // Filter by status if provided
  if (req.query.status) {
    filteredAdvances = filteredAdvances.filter(adv => adv.status === req.query.status);
  }

  // Sort
  filteredAdvances.sort((a, b) => {
    const aValue = a[sortBy as keyof Advance] as any;
    const bValue = b[sortBy as keyof Advance] as any;
    
    if (sortOrder === 'asc') {
      return aValue > bValue ? 1 : -1;
    } else {
      return aValue < bValue ? 1 : -1;
    }
  });

  // Paginate
  const total = filteredAdvances.length;
  const totalPages = Math.ceil(total / limit);
  const startIndex = (page - 1) * limit;
  const endIndex = startIndex + limit;
  const data = filteredAdvances.slice(startIndex, endIndex);

  const response: ApiResponse<PaginatedResponse<Advance>> = {
    success: true,
    data: {
      data,
      total,
      page,
      limit,
      totalPages
    },
    timestamp: new Date()
  };

  res.status(200).json(response);
}));

// Get advance by ID
router.get('/:id', asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const advance = advances.get(id);

  if (!advance) {
    const response: ApiResponse<null> = {
      success: false,
      error: {
        message: 'Advance not found',
        code: 'ADVANCE_NOT_FOUND'
      },
      timestamp: new Date()
    };
    return res.status(404).json(response);
  }

  const response: ApiResponse<Advance> = {
    success: true,
    data: advance,
    timestamp: new Date()
  };

  res.status(200).json(response);
}));

// Create new advance
router.post('/', validate(createAdvanceSchema), asyncHandler(async (req: Request, res: Response) => {
  const userId = req.headers['x-user-id'] as string;
  if (!userId) {
    const response: ApiResponse<null> = {
      success: false,
      error: {
        message: 'User ID required',
        code: 'UNAUTHORIZED'
      },
      timestamp: new Date()
    };
    return res.status(401).json(response);
  }

  const { amount, purpose, expectedReturnDate } = req.body;

  // Create advance
  const advanceId = generateAdvanceId();
  const now = new Date();

  const newAdvance: Advance = {
    id: advanceId,
    userId,
    amount,
    purpose,
    expectedReturnDate,
    status: AdvanceStatus.PENDING,
    createdAt: now,
    updatedAt: now
  };

  advances.set(advanceId, newAdvance);

  logger.info(`Advance created: ${advanceId} by user ${userId}`);

  const response: ApiResponse<Advance> = {
    success: true,
    data: newAdvance,
    timestamp: new Date()
  };

  res.status(201).json(response);
}));

// Update advance
router.put('/:id', validate(updateAdvanceSchema), asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const advance = advances.get(id);

  if (!advance) {
    const response: ApiResponse<null> = {
      success: false,
      error: {
        message: 'Advance not found',
        code: 'ADVANCE_NOT_FOUND'
      },
      timestamp: new Date()
    };
    return res.status(404).json(response);
  }

  const userId = req.headers['x-user-id'] as string;
  if (advance.userId !== userId) {
    const response: ApiResponse<null> = {
      success: false,
      error: {
        message: 'Not authorized to update this advance',
        code: 'FORBIDDEN'
      },
      timestamp: new Date()
    };
    return res.status(403).json(response);
  }

  // Can only update pending advances
  if (advance.status !== AdvanceStatus.PENDING) {
    const response: ApiResponse<null> = {
      success: false,
      error: {
        message: 'Can only update advances in PENDING status',
        code: 'INVALID_STATUS'
      },
      timestamp: new Date()
    };
    return res.status(400).json(response);
  }

  const { amount, purpose, expectedReturnDate } = req.body;

  // Update advance
  if (amount !== undefined) advance.amount = amount;
  if (purpose !== undefined) advance.purpose = purpose;
  if (expectedReturnDate !== undefined) advance.expectedReturnDate = expectedReturnDate;
  advance.updatedAt = new Date();

  logger.info(`Advance updated: ${id}`);

  const response: ApiResponse<Advance> = {
    success: true,
    data: advance,
    timestamp: new Date()
  };

  res.status(200).json(response);
}));

// Update advance status
router.patch('/:id/status', validate(updateStatusSchema), asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const advance = advances.get(id);

  if (!advance) {
    const response: ApiResponse<null> = {
      success: false,
      error: {
        message: 'Advance not found',
        code: 'ADVANCE_NOT_FOUND'
      },
      timestamp: new Date()
    };
    return res.status(404).json(response);
  }

  const { status } = req.body;
  const userId = req.headers['x-user-id'] as string;

  // Update status
  advance.status = status;
  advance.updatedAt = new Date();

  if (status === AdvanceStatus.DISBURSED) {
    advance.disbursementDate = new Date();
  } else if (status === AdvanceStatus.SETTLED) {
    advance.settlementDate = new Date();
  }

  logger.info(`Advance status updated: ${id} to ${status}`);

  const response: ApiResponse<Advance> = {
    success: true,
    data: advance,
    timestamp: new Date()
  };

  res.status(200).json(response);
}));

// Delete advance
router.delete('/:id', asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const advance = advances.get(id);

  if (!advance) {
    const response: ApiResponse<null> = {
      success: false,
      error: {
        message: 'Advance not found',
        code: 'ADVANCE_NOT_FOUND'
      },
      timestamp: new Date()
    };
    return res.status(404).json(response);
  }

  const userId = req.headers['x-user-id'] as string;
  if (advance.userId !== userId) {
    const response: ApiResponse<null> = {
      success: false,
      error: {
        message: 'Not authorized to delete this advance',
        code: 'FORBIDDEN'
      },
      timestamp: new Date()
    };
    return res.status(403).json(response);
  }

  // Can only delete pending advances
  if (advance.status !== AdvanceStatus.PENDING) {
    const response: ApiResponse<null> = {
      success: false,
      error: {
        message: 'Can only delete advances in PENDING status',
        code: 'INVALID_STATUS'
      },
      timestamp: new Date()
    };
    return res.status(400).json(response);
  }

  advances.delete(id);

  logger.info(`Advance deleted: ${id}`);

  const response: ApiResponse<{ message: string }> = {
    success: true,
    data: {
      message: 'Advance deleted successfully'
    },
    timestamp: new Date()
  };

  res.status(200).json(response);
}));

export default router;
