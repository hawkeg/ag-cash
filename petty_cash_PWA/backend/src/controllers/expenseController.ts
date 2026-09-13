import { Router, Request, Response } from 'express';
import Joi from 'joi';
import { logger } from '../utils/logger';
import { validate, asyncHandler } from '../middleware/validation';
import { ApiResponse, Expense, PaginatedResponse } from '../types';

const router = Router();

// Validation schemas
const createExpenseSchema = Joi.object({
  requestId: Joi.string().required(),
  categoryId: Joi.number().optional(),
  vendorId: Joi.number().optional(),
  amount: Joi.number().positive().required(),
  description: Joi.string().min(5).max(500).required(),
  receiptUrl: Joi.string().uri().optional()
});

const updateExpenseSchema = Joi.object({
  categoryId: Joi.number().optional(),
  vendorId: Joi.number().optional(),
  amount: Joi.number().positive().optional(),
  description: Joi.string().min(5).max(500).optional(),
  receiptUrl: Joi.string().uri().optional()
});

// Mock expense storage (replace with actual database/Supabase)
const expenses: Map<string, Expense> = new Map();

// Helper function to generate expense ID
const generateExpenseId = (): string => `exp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

// Get all expenses with pagination
router.get('/', asyncHandler(async (req: Request, res: Response) => {
  // Parse pagination parameters
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 10;
  const sortBy = (req.query.sortBy as string) || 'createdAt';
  const sortOrder = (req.query.sortOrder as string) === 'asc' ? 'asc' : 'desc';

  // Filter by request ID if provided
  let filteredExpenses = Array.from(expenses.values());
  if (req.query.requestId) {
    filteredExpenses = filteredExpenses.filter(exp => exp.requestId === req.query.requestId);
  }

  // Filter by category ID if provided
  if (req.query.categoryId) {
    filteredExpenses = filteredExpenses.filter(exp => exp.categoryId === parseInt(req.query.categoryId as string));
  }

  // Filter by vendor ID if provided
  if (req.query.vendorId) {
    filteredExpenses = filteredExpenses.filter(exp => exp.vendorId === parseInt(req.query.vendorId as string));
  }

  // Sort
  filteredExpenses.sort((a, b) => {
    const aValue = a[sortBy as keyof Expense] as any;
    const bValue = b[sortBy as keyof Expense] as any;
    
    if (sortOrder === 'asc') {
      return aValue > bValue ? 1 : -1;
    } else {
      return aValue < bValue ? 1 : -1;
    }
  });

  // Paginate
  const total = filteredExpenses.length;
  const totalPages = Math.ceil(total / limit);
  const startIndex = (page - 1) * limit;
  const endIndex = startIndex + limit;
  const data = filteredExpenses.slice(startIndex, endIndex);

  const response: ApiResponse<PaginatedResponse<Expense>> = {
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

// Get expense by ID
router.get('/:id', asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const expense = expenses.get(id);

  if (!expense) {
    const response: ApiResponse<null> = {
      success: false,
      error: {
        message: 'Expense not found',
        code: 'EXPENSE_NOT_FOUND'
      },
      timestamp: new Date()
    };
    return res.status(404).json(response);
  }

  const response: ApiResponse<Expense> = {
    success: true,
    data: expense,
    timestamp: new Date()
  };

  res.status(200).json(response);
}));

// Create new expense
router.post('/', validate(createExpenseSchema), asyncHandler(async (req: Request, res: Response) => {
  const { requestId, categoryId, vendorId, amount, description, receiptUrl } = req.body;

  // Create expense
  const expenseId = generateExpenseId();
  const now = new Date();

  const newExpense: Expense = {
    id: expenseId,
    requestId,
    categoryId,
    vendorId,
    amount,
    description,
    receiptUrl,
    createdAt: now,
    updatedAt: now
  };

  expenses.set(expenseId, newExpense);

  logger.info(`Expense created: ${expenseId} for request ${requestId}`);

  const response: ApiResponse<Expense> = {
    success: true,
    data: newExpense,
    timestamp: new Date()
  };

  res.status(201).json(response);
}));

// Update expense
router.put('/:id', validate(updateExpenseSchema), asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const expense = expenses.get(id);

  if (!expense) {
    const response: ApiResponse<null> = {
      success: false,
      error: {
        message: 'Expense not found',
        code: 'EXPENSE_NOT_FOUND'
      },
      timestamp: new Date()
    };
    return res.status(404).json(response);
  }

  const { categoryId, vendorId, amount, description, receiptUrl } = req.body;

  // Update expense
  if (categoryId !== undefined) expense.categoryId = categoryId;
  if (vendorId !== undefined) expense.vendorId = vendorId;
  if (amount !== undefined) expense.amount = amount;
  if (description !== undefined) expense.description = description;
  if (receiptUrl !== undefined) expense.receiptUrl = receiptUrl;
  expense.updatedAt = new Date();

  logger.info(`Expense updated: ${id}`);

  const response: ApiResponse<Expense> = {
    success: true,
    data: expense,
    timestamp: new Date()
  };

  res.status(200).json(response);
}));

// Delete expense
router.delete('/:id', asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const expense = expenses.get(id);

  if (!expense) {
    const response: ApiResponse<null> = {
      success: false,
      error: {
        message: 'Expense not found',
        code: 'EXPENSE_NOT_FOUND'
      },
      timestamp: new Date()
    };
    return res.status(404).json(response);
  }

  expenses.delete(id);

  logger.info(`Expense deleted: ${id}`);

  const response: ApiResponse<{ message: string }> = {
    success: true,
    data: {
      message: 'Expense deleted successfully'
    },
    timestamp: new Date()
  };

  res.status(200).json(response);
}));

// Get expenses by request ID
router.get('/request/:requestId', asyncHandler(async (req: Request, res: Response) => {
  const { requestId } = req.params;
  
  const requestExpenses = Array.from(expenses.values()).filter(
    exp => exp.requestId === requestId
  );

  const response: ApiResponse<Expense[]> = {
    success: true,
    data: requestExpenses,
    timestamp: new Date()
  };

  res.status(200).json(response);
}));

export default router;
