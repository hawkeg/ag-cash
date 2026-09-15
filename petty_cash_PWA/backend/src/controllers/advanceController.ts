import { Router, Request, Response } from 'express';
import Joi from 'joi';
import { logger } from '../utils/logger';
import { validate, asyncHandler } from '../middleware/validation';
import {
  authenticate as odooAuthenticate,
  search_read,
  create as odooCreate,
  write as odooWrite,
  unlink as odooUnlink,
  execute_kw,
} from '../services/odoo';
import { ApiResponse, Advance, AdvanceStatus, PaginatedResponse } from '../types';

const router = Router();

const ODOO_MODEL = 'ems.petty.dedicated.request';
const FIELDS = [
  'id', 'name', 'holder_id', 'date', 'amount', 'reason', 'state',
  'analytic_account_id', 'payment_journal_id', 'rejection_reason',
  'settlement_request_id', 'create_date', 'write_date',
];

// Odoo state -> shared AdvanceStatus
const odooToStatus: Record<string, AdvanceStatus> = {
  draft: AdvanceStatus.PENDING,
  submitted: AdvanceStatus.PENDING,
  manager_approved: AdvanceStatus.APPROVED,
  disbursed: AdvanceStatus.DISBURSED,
  settled: AdvanceStatus.SETTLED,
  rejected: AdvanceStatus.CANCELLED,
  cancelled: AdvanceStatus.CANCELLED,
};

const statusToOdoo: Record<AdvanceStatus, string[]> = {
  [AdvanceStatus.PENDING]: ['draft', 'submitted'],
  [AdvanceStatus.APPROVED]: ['manager_approved'],
  [AdvanceStatus.DISBURSED]: ['disbursed'],
  [AdvanceStatus.SETTLED]: ['settled'],
  [AdvanceStatus.CANCELLED]: ['rejected', 'cancelled'],
};

const statusToAction: Partial<Record<AdvanceStatus, string>> = {
  [AdvanceStatus.PENDING]: 'action_submit',
  [AdvanceStatus.SETTLED]: 'action_settle',
  [AdvanceStatus.CANCELLED]: 'action_cancel',
};

const getHolderId = (req: Request): number | null =>
  req.user?.userMetadata?.odooHolderId ?? null;

const mapAdvance = (r: any): Advance => ({
  id: String(r.id),
  userId: `holder_${Array.isArray(r.holder_id) ? r.holder_id[0] : r.holder_id}`,
  odooAdvanceId: r.id,
  amount: r.amount || 0,
  purpose: r.reason || r.name,
  status: odooToStatus[r.state] || AdvanceStatus.PENDING,
  createdAt: r.create_date ? new Date(r.create_date) : new Date(),
  updatedAt: r.write_date ? new Date(r.write_date) : new Date(),
});

const errorResponse = (res: Response, status: number, message: string, code: string) =>
  res.status(status).json({
    success: false,
    error: { message, code },
    timestamp: new Date(),
  } as ApiResponse<null>);

const createAdvanceSchema = Joi.object({
  amount: Joi.number().positive().required(),
  purpose: Joi.string().min(3).max(500).required(),
  expectedReturnDate: Joi.date().optional(),
  submit: Joi.boolean().optional(),
});

const updateAdvanceSchema = Joi.object({
  amount: Joi.number().positive().optional(),
  purpose: Joi.string().min(3).max(500).optional(),
  expectedReturnDate: Joi.date().optional()
});

const updateStatusSchema = Joi.object({
  status: Joi.string().valid(...Object.values(AdvanceStatus)).required(),
  rejectionReason: Joi.string().max(500).optional()
});

// Get all advances with pagination
router.get('/', asyncHandler(async (req: Request, res: Response) => {
  const holderId = getHolderId(req);
  if (!holderId) return errorResponse(res, 403, 'No Odoo holder linked to this user', 'NO_HOLDER');

  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 10;
  const sortOrder = (req.query.sortOrder as string) === 'asc' ? 'asc' : 'desc';

  const domain: any[] = [['holder_id', '=', holderId]];
  if (req.query.status && statusToOdoo[req.query.status as AdvanceStatus]) {
    domain.push(['state', 'in', statusToOdoo[req.query.status as AdvanceStatus]]);
  }

  const auth = await odooAuthenticate();
  const total = await execute_kw(auth, ODOO_MODEL, 'search_count', [domain]);
  const rows = await search_read(auth, {
    model: ODOO_MODEL,
    domain,
    fields: FIELDS,
    offset: (page - 1) * limit,
    limit,
    order: `id ${sortOrder}`,
  });

  const response: ApiResponse<PaginatedResponse<Advance>> = {
    success: true,
    data: {
      data: rows.map(mapAdvance),
      total: total || 0,
      page,
      limit,
      totalPages: Math.ceil((total || 0) / limit),
    },
    timestamp: new Date()
  };
  res.status(200).json(response);
}));

// Read-only list of the holder's replenishments (top-ups) — finance-created in Odoo
router.get('/replenishments', asyncHandler(async (req: Request, res: Response) => {
  const holderId = getHolderId(req);
  if (!holderId) return errorResponse(res, 403, 'No Odoo holder linked to this user', 'NO_HOLDER');

  const auth = await odooAuthenticate();
  const rows = await search_read(auth, {
    model: 'ems.petty.replenishment',
    domain: [['holder_id', '=', holderId]],
    fields: ['id', 'name', 'date', 'amount', 'state', 'journal_id', 'note', 'create_date'],
    limit: 50,
    order: 'id desc',
  });

  const data = rows.map((r: any) => ({
    id: String(r.id),
    name: r.name,
    date: r.date || r.create_date,
    amount: r.amount || 0,
    state: r.state,
    journal: Array.isArray(r.journal_id) ? r.journal_id[1] : undefined,
    note: r.note || undefined,
  }));

  res.status(200).json({ success: true, data, timestamp: new Date() } as ApiResponse<any[]>);
}));

// Get advance by ID
router.get('/:id', asyncHandler(async (req: Request, res: Response) => {
  const holderId = getHolderId(req);
  if (!holderId) return errorResponse(res, 403, 'No Odoo holder linked to this user', 'NO_HOLDER');

  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) return errorResponse(res, 400, 'Invalid advance ID', 'INVALID_ID');

  const auth = await odooAuthenticate();
  const rows = await search_read(auth, {
    model: ODOO_MODEL,
    domain: [['id', '=', id], ['holder_id', '=', holderId]],
    fields: FIELDS,
    limit: 1,
  });
  if (!rows.length) return errorResponse(res, 404, 'Advance not found', 'ADVANCE_NOT_FOUND');

  const response: ApiResponse<Advance> = { success: true, data: mapAdvance(rows[0]), timestamp: new Date() };
  res.status(200).json(response);
}));

// Create new advance in Odoo
router.post('/', validate(createAdvanceSchema), asyncHandler(async (req: Request, res: Response) => {
  const holderId = getHolderId(req);
  if (!holderId) return errorResponse(res, 403, 'No Odoo holder linked to this user', 'NO_HOLDER');

  const { amount, purpose, submit } = req.body;

  const auth = await odooAuthenticate();
  let newId: number;
  try {
    newId = await odooCreate(auth, {
      model: ODOO_MODEL,
      data: { holder_id: holderId, amount, reason: purpose },
    });
  } catch (e: any) {
    logger.error('Odoo create advance failed:', e);
    return errorResponse(res, 502, `Odoo create failed: ${e.message}`, 'ODOO_ERROR');
  }

  if (submit !== false) {
    try {
      await execute_kw(auth, ODOO_MODEL, 'action_submit', [[newId]]);
    } catch (e: any) {
      logger.warn(`Created advance ${newId} but submit failed:`, e);
    }
  }

  const rows = await search_read(auth, {
    model: ODOO_MODEL,
    domain: [['id', '=', newId]],
    fields: FIELDS,
    limit: 1,
  });

  logger.info(`Advance created in Odoo: ${newId} for holder ${holderId}`);

  const response: ApiResponse<Advance> = {
    success: true,
    data: mapAdvance(rows[0]),
    timestamp: new Date()
  };
  res.status(201).json(response);
}));

// Update advance (draft only)
router.put('/:id', validate(updateAdvanceSchema), asyncHandler(async (req: Request, res: Response) => {
  const holderId = getHolderId(req);
  if (!holderId) return errorResponse(res, 403, 'No Odoo holder linked to this user', 'NO_HOLDER');

  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) return errorResponse(res, 400, 'Invalid advance ID', 'INVALID_ID');

  const auth = await odooAuthenticate();
  const rows = await search_read(auth, {
    model: ODOO_MODEL,
    domain: [['id', '=', id], ['holder_id', '=', holderId]],
    fields: FIELDS,
    limit: 1,
  });
  if (!rows.length) return errorResponse(res, 404, 'Advance not found', 'ADVANCE_NOT_FOUND');
  if (rows[0].state !== 'draft') {
    return errorResponse(res, 400, 'Can only update advances in draft status', 'INVALID_STATUS');
  }

  const { amount, purpose } = req.body;
  const data: Record<string, any> = {};
  if (amount !== undefined) data.amount = amount;
  if (purpose !== undefined) data.reason = purpose;

  try {
    if (Object.keys(data).length) await odooWrite(auth, { model: ODOO_MODEL, ids: [id], data });
  } catch (e: any) {
    logger.error(`Odoo update advance ${id} failed:`, e);
    return errorResponse(res, 502, `Odoo update failed: ${e.message}`, 'ODOO_ERROR');
  }

  const updated = await search_read(auth, {
    model: ODOO_MODEL, domain: [['id', '=', id]], fields: FIELDS, limit: 1,
  });
  const response: ApiResponse<Advance> = { success: true, data: mapAdvance(updated[0]), timestamp: new Date() };
  res.status(200).json(response);
}));

// Update advance status via Odoo workflow
router.patch('/:id/status', validate(updateStatusSchema), asyncHandler(async (req: Request, res: Response) => {
  const holderId = getHolderId(req);
  if (!holderId) return errorResponse(res, 403, 'No Odoo holder linked to this user', 'NO_HOLDER');

  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) return errorResponse(res, 400, 'Invalid advance ID', 'INVALID_ID');

  const { status } = req.body as { status: AdvanceStatus };
  const action = statusToAction[status];
  if (!action) {
    return errorResponse(res, 400, `Status transition to ${status} is not supported from the app`, 'INVALID_TRANSITION');
  }

  const auth = await odooAuthenticate();
  const rows = await search_read(auth, {
    model: ODOO_MODEL,
    domain: [['id', '=', id], ['holder_id', '=', holderId]],
    fields: FIELDS,
    limit: 1,
  });
  if (!rows.length) return errorResponse(res, 404, 'Advance not found', 'ADVANCE_NOT_FOUND');

  try {
    await execute_kw(auth, ODOO_MODEL, action, [[id]]);
  } catch (e: any) {
    logger.error(`Odoo ${action} on advance ${id} failed:`, e);
    return errorResponse(res, 502, `Odoo workflow failed: ${e.message}`, 'ODOO_ERROR');
  }

  const updated = await search_read(auth, {
    model: ODOO_MODEL, domain: [['id', '=', id]], fields: FIELDS, limit: 1,
  });
  const response: ApiResponse<Advance> = { success: true, data: mapAdvance(updated[0]), timestamp: new Date() };
  res.status(200).json(response);
}));

// Delete advance (draft only)
router.delete('/:id', asyncHandler(async (req: Request, res: Response) => {
  const holderId = getHolderId(req);
  if (!holderId) return errorResponse(res, 403, 'No Odoo holder linked to this user', 'NO_HOLDER');

  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) return errorResponse(res, 400, 'Invalid advance ID', 'INVALID_ID');

  const auth = await odooAuthenticate();
  const rows = await search_read(auth, {
    model: ODOO_MODEL,
    domain: [['id', '=', id], ['holder_id', '=', holderId]],
    fields: ['id', 'state'],
    limit: 1,
  });
  if (!rows.length) return errorResponse(res, 404, 'Advance not found', 'ADVANCE_NOT_FOUND');
  if (rows[0].state !== 'draft') {
    return errorResponse(res, 400, 'Can only delete draft advances', 'INVALID_STATUS');
  }

  try {
    await odooUnlink(auth, { model: ODOO_MODEL, ids: [id] });
  } catch (e: any) {
    logger.error(`Odoo delete advance ${id} failed:`, e);
    return errorResponse(res, 502, `Odoo delete failed: ${e.message}`, 'ODOO_ERROR');
  }

  logger.info(`Advance deleted in Odoo: ${id}`);
  const response: ApiResponse<{ message: string }> = {
    success: true,
    data: { message: 'Advance deleted successfully' },
    timestamp: new Date()
  };
  res.status(200).json(response);
}));

export default router;
