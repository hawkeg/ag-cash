import { Router, Request, Response } from 'express';
import Joi from 'joi';
import jwt from 'jsonwebtoken';
import { logger } from '../utils/logger';
import { validate, asyncHandler } from '../middleware/validation';
import { authMiddleware } from '../middleware/auth';
import { authenticate as odooAuthenticate, search_read, OdooError } from '../services/odoo';
import { getJwtSecret } from '../config/env';
import { hasPin, setPin, verifyPin, validPinFormat } from '../services/pinStore';
import { ApiResponse } from '../types';

const router = Router();

const JWT_SECRET = getJwtSecret();
const JWT_EXPIRES_IN = '12h';

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
      data: rows.map(h => ({ ...mapHolder(h), hasPin: hasPin(h.id) })),
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
  pin: Joi.string().pattern(/^\d{4,6}$/).optional(),
});

const pinSetupSchema = Joi.object({
  holderId: Joi.number().integer().positive().required(),
  pin: Joi.string().pattern(/^\d{4,6}$/).required(),
});

const issueToken = (holder: ReturnType<typeof mapHolder>) => {
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
  return {
    token,
    user: { id: userId, name: holder.employeeName, holder },
  };
};

const fetchHolder = async (holderId: number): Promise<HolderRow | undefined> => {
  const auth = await odooAuthenticate();
  const rows = await search_read(auth, {
    model: 'ems.petty.holder',
    domain: [['id', '=', holderId]],
    fields: HOLDER_FIELDS,
    limit: 1,
  });
  return rows[0] as HolderRow | undefined;
};

// Login by selecting an Odoo petty cash holder + PIN
router.post('/login', validate(loginSchema), asyncHandler(async (req: Request, res: Response) => {
  const { holderId, pin } = req.body;

  try {
    const row = await fetchHolder(holderId);
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

    if (!hasPin(holderId)) {
      const response: ApiResponse<null> = {
        success: false,
        error: { message: 'PIN setup required', code: 'PIN_SETUP_REQUIRED' },
        timestamp: new Date(),
      };
      return res.status(428).json(response);
    }

    if (!validPinFormat(pin)) {
      const response: ApiResponse<null> = {
        success: false,
        error: { message: 'PIN is required', code: 'PIN_REQUIRED' },
        timestamp: new Date(),
      };
      return res.status(401).json(response);
    }

    const check = verifyPin(holderId, pin);
    if (!check.ok) {
      const locked = check.lockedUntil;
      const response: ApiResponse<null> = {
        success: false,
        error: {
          message: locked ? 'Too many attempts — try again in 15 minutes' : 'Incorrect PIN',
          code: locked ? 'PIN_LOCKED' : 'PIN_INCORRECT',
        },
        timestamp: new Date(),
      };
      return res.status(locked ? 429 : 401).json(response);
    }

    const holder = mapHolder(row);
    logger.info(`User logged in as holder: ${holder.employeeName} (holder ${holder.id})`);

    const response: ApiResponse<any> = {
      success: true,
      data: issueToken(holder),
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

// First-time PIN setup — only allowed while the holder has no PIN yet
router.post('/setup-pin', validate(pinSetupSchema), asyncHandler(async (req: Request, res: Response) => {
  const { holderId, pin } = req.body;

  try {
    if (hasPin(holderId)) {
      const response: ApiResponse<null> = {
        success: false,
        error: { message: 'PIN already set — log in normally', code: 'PIN_ALREADY_SET' },
        timestamp: new Date(),
      };
      return res.status(409).json(response);
    }

    const row = await fetchHolder(holderId);
    if (!row || row.state !== 'active') {
      const response: ApiResponse<null> = {
        success: false,
        error: { message: 'Holder not found or inactive', code: 'HOLDER_INVALID' },
        timestamp: new Date(),
      };
      return res.status(404).json(response);
    }

    setPin(holderId, pin);
    const holder = mapHolder(row);
    logger.info(`PIN set for holder ${holder.id} (${holder.employeeName})`);

    const response: ApiResponse<any> = {
      success: true,
      data: issueToken(holder),
      timestamp: new Date(),
    };
    res.json(response);
  } catch (error) {
    logger.error('PIN setup failed:', error);
    const response: ApiResponse<null> = {
      success: false,
      error: { message: 'PIN setup failed', code: 'PIN_SETUP_ERROR' },
      timestamp: new Date(),
    };
    res.status(502).json(response);
  }
}));

// Change PIN — requires current PIN
router.post('/change-pin', validate(Joi.object({
  holderId: Joi.number().integer().positive().required(),
  currentPin: Joi.string().pattern(/^\d{4,6}$/).required(),
  pin: Joi.string().pattern(/^\d{4,6}$/).required(),
})), asyncHandler(async (req: Request, res: Response) => {
  const { holderId, currentPin, pin } = req.body;

  const check = verifyPin(holderId, currentPin);
  if (!check.ok) {
    const response: ApiResponse<null> = {
      success: false,
      error: {
        message: check.lockedUntil ? 'Too many attempts — try again in 15 minutes' : 'Current PIN is incorrect',
        code: check.lockedUntil ? 'PIN_LOCKED' : 'PIN_INCORRECT',
      },
      timestamp: new Date(),
    };
    return res.status(check.lockedUntil ? 429 : 401).json(response);
  }

  setPin(holderId, pin);
  logger.info(`PIN changed for holder ${holderId}`);

  const response: ApiResponse<{ message: string }> = {
    success: true,
    data: { message: 'PIN updated' },
    timestamp: new Date(),
  };
  res.json(response);
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
