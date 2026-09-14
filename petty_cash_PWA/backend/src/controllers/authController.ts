import { Router, Request, Response } from 'express';
import Joi from 'joi';
import jwt from 'jsonwebtoken';
import { logger } from '../utils/logger';
import { validate, asyncHandler } from '../middleware/validation';
import { authMiddleware } from '../middleware/auth';
import { authenticate as odooAuthenticate, search_read, OdooError } from '../services/odoo';
import { ApiResponse } from '../types';

const router = Router();

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret';
const JWT_EXPIRES_IN = '7d';

interface HolderRow {
  id: number;
  name: string;
  employee_id: [number, string] | false;
  department_id: [number, string] | false;
  state: string;
  limit_amount: number;
  remaining_amount: number;
}

const HOLDER_FIELDS = [
  'id',
  'name',
  'employee_id',
  'department_id',
  'state',
  'limit_amount',
  'remaining_amount',
];

const mapHolder = (h: HolderRow) => ({
  id: h.id,
  name: h.name,
  employeeId: Array.isArray(h.employee_id) ? h.employee_id[0] : null,
  employeeName: Array.isArray(h.employee_id) ? h.employee_id[1] : h.name,
  department: Array.isArray(h.department_id) ? h.department_id[1] : '',
  state: h.state,
  limitAmount: h.limit_amount,
  remainingAmount: h.remaining_amount,
});

// List active petty cash holders from Odoo (used by the login screen)
router.get('/holders', asyncHandler(async (req: Request, res: Response) => {
  const search = (req.query.search as string | undefined)?.trim();

  const domain: any[] = [['state', '=', 'active']];
  if (search) {
    domain.unshift('|', ['employee_id', 'ilike', search], ['name', 'ilike', search]);
  }

  try {
    const auth = await odooAuthenticate();
    const rows = await search_read(auth, {
      model: 'ems.petty.holder',
      domain,
      fields: HOLDER_FIELDS,
      limit: 100,
      order: 'employee_id',
    });

    const response: ApiResponse<any[]> = {
      success: true,
      data: rows.map(mapHolder),
      timestamp: new Date(),
    };
    res.json(response);
  } catch (error) {
    logger.error('Failed to fetch holders from Odoo:', error);
    const response: ApiResponse<null> = {
      success: false,
      error: {
        message: 'Failed to fetch petty cash holders from Odoo',
        code: 'ODOO_ERROR',
      },
      timestamp: new Date(),
    };
    res.status(502).json(response);
  }
}));

const loginSchema = Joi.object({
  holderId: Joi.number().integer().positive().required(),
});

// Login by selecting an Odoo petty cash holder
router.post('/login', validate(loginSchema), asyncHandler(async (req: Request, res: Response) => {
  const { holderId } = req.body;

  try {
    const auth = await odooAuthenticate();
    const rows = await search_read(auth, {
      model: 'ems.petty.holder',
      domain: [['id', '=', holderId]],
      fields: HOLDER_FIELDS,
      limit: 1,
    });

    const row = rows[0] as HolderRow | undefined;
    if (!row) {
      const response: ApiResponse<null> = {
        success: false,
        error: { message: 'Holder not found', code: 'HOLDER_NOT_FOUND' },
        timestamp: new Date(),
      };
      return res.status(404).json(response);
    }

    if (row.state !== 'active') {
      const response: ApiResponse<null> = {
        success: false,
        error: { message: 'This petty cash holder is not active', code: 'HOLDER_INACTIVE' },
        timestamp: new Date(),
      };
      return res.status(403).json(response);
    }

    const holder = mapHolder(row);
    const userId = `holder_${holder.id}`;

    const token = jwt.sign(
      {
        sub: userId,
        odooHolderId: holder.id,
        odooEmployeeId: holder.employeeId,
        name: holder.employeeName,
      },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN }
    );

    logger.info(`User logged in as holder: ${holder.employeeName} (holder ${holder.id})`);

    const response: ApiResponse<any> = {
      success: true,
      data: {
        token,
        user: {
          id: userId,
          name: holder.employeeName,
          holder,
        },
      },
      timestamp: new Date(),
    };
    res.json(response);
  } catch (error) {
    logger.error('Login failed:', error);
    const response: ApiResponse<null> = {
      success: false,
      error: { message: 'Login failed', code: 'LOGIN_ERROR' },
      timestamp: new Date(),
    };
    res.status(502).json(response);
  }
}));

// Logout endpoint (stateless JWT - client discards the token)
router.post('/logout', asyncHandler(async (_req: Request, res: Response) => {
  const response: ApiResponse<{ message: string }> = {
    success: true,
    data: { message: 'Logged out successfully' },
    timestamp: new Date(),
  };
  res.json(response);
}));

// Get current user endpoint
router.get('/me', authMiddleware, asyncHandler(async (req: Request, res: Response) => {
  const response: ApiResponse<any> = {
    success: true,
    data: {
      userId: req.user!.id,
      email: req.user!.email,
      name: req.user!.userMetadata?.name,
      odooHolderId: req.user!.userMetadata?.odooHolderId,
      odooEmployeeId: req.user!.userMetadata?.odooEmployeeId,
    },
    timestamp: new Date(),
  };
  res.json(response);
}));

export default router;
