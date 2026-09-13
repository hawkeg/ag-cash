import { Router, Request as ExpressRequest, Response } from 'express';
import Joi from 'joi';
import { logger } from '../utils/logger';
import { validate, asyncHandler } from '../middleware/validation';
import { ApiResponse, Request, RequestType, RequestStatus, CreateRequestDto, UpdateRequestDto, PaginatedResponse, PaginationParams } from '../types';

const router = Router();

// Validation schemas
const createRequestSchema = Joi.object({
  type: Joi.string().valid(...Object.values(RequestType)).required(),
  amount: Joi.number().positive().required(),
  description: Joi.string().min(5).max(500).required(),
  expenses: Joi.array().items(
    Joi.object({
      categoryId: Joi.number().optional(),
      vendorId: Joi.number().optional(),
      amount: Joi.number().positive().required(),
      description: Joi.string().min(5).max(500).required(),
      receiptUrl: Joi.string().uri().optional()
    })
  ).optional()
});

const updateRequestSchema = Joi.object({
  amount: Joi.number().positive().optional(),
  description: Joi.string().min(5).max(500).optional(),
  expenses: Joi.array().items(
    Joi.object({
      categoryId: Joi.number().optional(),
      vendorId: Joi.number().optional(),
      amount: Joi.number().positive().required(),
      description: Joi.string().min(5).max(500).required(),
      receiptUrl: Joi.string().uri().optional()
    })
  ).optional()
});

const updateStatusSchema = Joi.object({
  status: Joi.string().valid(...Object.values(RequestStatus)).required(),
  rejectionReason: Joi.string().max(500).optional()
});

// Mock request storage (replace with actual database/Supabase)
const requests: Map<string, Request> = new Map();

// Helper function to generate request ID
const generateRequestId = (): string => `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

// Helper function to generate expense ID
const generateExpenseId = (): string => `exp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

// Get all requests with pagination
router.get('/', asyncHandler(async (req: ExpressRequest, res: Response) => {
  const userId = req.headers['x-user-id'] as string;

  // Parse pagination parameters
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 10;
  const sortBy = (req.query.sortBy as string) || 'createdAt';
  const sortOrder = (req.query.sortOrder as string) === 'asc' ? 'asc' : 'desc';

  // Filter by user ID if provided
  let filteredRequests = Array.from(requests.values());
  if (userId) {
    filteredRequests = filteredRequests.filter(req => req.userId === userId);
  }

  // Filter by status if provided
  if (req.query.status) {
    filteredRequests = filteredRequests.filter(r => r.status === req.query.status);
  }

  // Filter by type if provided
  if (req.query.type) {
    filteredRequests = filteredRequests.filter(r => r.type === req.query.type);
  }

  // Sort
  filteredRequests.sort((a, b) => {
    const aValue = a[sortBy as keyof Request] as any;
    const bValue = b[sortBy as keyof Request] as any;
    
    if (sortOrder === 'asc') {
      return aValue > bValue ? 1 : -1;
    } else {
      return aValue < bValue ? 1 : -1;
    }
  });

  // Paginate
  const total = filteredRequests.length;
  const totalPages = Math.ceil(total / limit);
  const startIndex = (page - 1) * limit;
  const endIndex = startIndex + limit;
  const data = filteredRequests.slice(startIndex, endIndex);

  const response: ApiResponse<PaginatedResponse<Request>> = {
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

// Get request by ID
router.get('/:id', asyncHandler(async (req: ExpressRequest, res: Response) => {
  const { id } = req.params;
  const request = requests.get(id);

  if (!request) {
    const response: ApiResponse<null> = {
      success: false,
      error: {
        message: 'Request not found',
        code: 'REQUEST_NOT_FOUND'
      },
      timestamp: new Date()
    };
    return res.status(404).json(response);
  }

  const response: ApiResponse<Request> = {
    success: true,
    data: request,
    timestamp: new Date()
  };

  res.status(200).json(response);
}));

// Create new request
router.post('/', validate(createRequestSchema), asyncHandler(async (req: ExpressRequest, res: Response) => {
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

  const { type, amount, description, expenses } = req.body;

  // Create request
  const requestId = generateRequestId();
  const now = new Date();

  const newRequest: Request = {
    id: requestId,
    userId,
    type,
    amount,
    description,
    status: RequestStatus.DRAFT,
    createdAt: now,
    updatedAt: now,
    expenses: expenses?.map((exp: any) => ({
      id: generateExpenseId(),
      requestId,
      categoryId: exp.categoryId,
      vendorId: exp.vendorId,
      amount: exp.amount,
      description: exp.description,
      receiptUrl: exp.receiptUrl,
      createdAt: now,
      updatedAt: now
    }))
  };

  requests.set(requestId, newRequest);

  logger.info(`Request created: ${requestId} by user ${userId}`);

  const response: ApiResponse<Request> = {
    success: true,
    data: newRequest,
    timestamp: new Date()
  };

  res.status(201).json(response);
}));

// Update request
router.put('/:id', validate(updateRequestSchema), asyncHandler(async (req: ExpressRequest, res: Response) => {
  const { id } = req.params;
  const request = requests.get(id);

  if (!request) {
    const response: ApiResponse<null> = {
      success: false,
      error: {
        message: 'Request not found',
        code: 'REQUEST_NOT_FOUND'
      },
      timestamp: new Date()
    };
    return res.status(404).json(response);
  }

  const userId = req.headers['x-user-id'] as string;
  if (request.userId !== userId) {
    const response: ApiResponse<null> = {
      success: false,
      error: {
        message: 'Not authorized to update this request',
        code: 'FORBIDDEN'
      },
      timestamp: new Date()
    };
    return res.status(403).json(response);
  }

  // Can only update draft requests
  if (request.status !== RequestStatus.DRAFT) {
    const response: ApiResponse<null> = {
      success: false,
      error: {
        message: 'Can only update requests in DRAFT status',
        code: 'INVALID_STATUS'
      },
      timestamp: new Date()
    };
    return res.status(400).json(response);
  }

  const { amount, description, expenses } = req.body;

  // Update request
  if (amount !== undefined) request.amount = amount;
  if (description !== undefined) request.description = description;
  if (expenses !== undefined) {
    const now = new Date();
    request.expenses = expenses.map((exp: any) => ({
      id: generateExpenseId(),
      requestId: id,
      categoryId: exp.categoryId,
      vendorId: exp.vendorId,
      amount: exp.amount,
      description: exp.description,
      receiptUrl: exp.receiptUrl,
      createdAt: now,
      updatedAt: now
    }));
  }
  request.updatedAt = new Date();

  logger.info(`Request updated: ${id}`);

  const response: ApiResponse<Request> = {
    success: true,
    data: request,
    timestamp: new Date()
  };

  res.status(200).json(response);
}));

// Update request status
router.patch('/:id/status', validate(updateStatusSchema), asyncHandler(async (req: ExpressRequest, res: Response) => {
  const { id } = req.params;
  const request = requests.get(id);

  if (!request) {
    const response: ApiResponse<null> = {
      success: false,
      error: {
        message: 'Request not found',
        code: 'REQUEST_NOT_FOUND'
      },
      timestamp: new Date()
    };
    return res.status(404).json(response);
  }

  const { status, rejectionReason } = req.body;
  const userId = req.headers['x-user-id'] as string;

  // Update status
  request.status = status;
  request.updatedAt = new Date();

  if (status === RequestStatus.SUBMITTED) {
    request.submittedAt = new Date();
  } else if (status === RequestStatus.APPROVED) {
    request.approvedAt = new Date();
    request.approvedBy = userId;
  } else if (status === RequestStatus.REJECTED) {
    request.rejectedAt = new Date();
    request.rejectedBy = userId;
    request.rejectionReason = rejectionReason;
  }

  logger.info(`Request status updated: ${id} to ${status}`);

  const response: ApiResponse<Request> = {
    success: true,
    data: request,
    timestamp: new Date()
  };

  res.status(200).json(response);
}));

// Delete request
router.delete('/:id', asyncHandler(async (req: ExpressRequest, res: Response) => {
  const { id } = req.params;
  const request = requests.get(id);

  if (!request) {
    const response: ApiResponse<null> = {
      success: false,
      error: {
        message: 'Request not found',
        code: 'REQUEST_NOT_FOUND'
      },
      timestamp: new Date()
    };
    return res.status(404).json(response);
  }

  const userId = req.headers['x-user-id'] as string;
  if (request.userId !== userId) {
    const response: ApiResponse<null> = {
      success: false,
      error: {
        message: 'Not authorized to delete this request',
        code: 'FORBIDDEN'
      },
      timestamp: new Date()
    };
    return res.status(403).json(response);
  }

  // Can only delete draft requests
  if (request.status !== RequestStatus.DRAFT) {
    const response: ApiResponse<null> = {
      success: false,
      error: {
        message: 'Can only delete requests in DRAFT status',
        code: 'INVALID_STATUS'
      },
      timestamp: new Date()
    };
    return res.status(400).json(response);
  }

  requests.delete(id);

  logger.info(`Request deleted: ${id}`);

  const response: ApiResponse<{ message: string }> = {
    success: true,
    data: {
      message: 'Request deleted successfully'
    },
    timestamp: new Date()
  };

  res.status(200).json(response);
}));

export default router;
