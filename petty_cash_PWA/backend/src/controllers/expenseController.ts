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
import { ApiResponse, Expense, PaginatedResponse } from '../types';

const router = Router();

const LINE_MODEL = 'ems.petty.expense.line';
const CATEGORY_MODEL = 'ems.petty.expense.category';
const PARTNER_MODEL = 'res.partner';
const LINE_FIELDS = [
  'id', 'request_id', 'holder_id', 'name', 'amount', 'amount_total',
  'category_id', 'partner_id', 'invoice_date', 'vendor_vat', 'vendor_cr',
  'notes', 'create_date', 'write_date',
];

const getHolderId = (req: Request): number | null =>
  req.user?.userMetadata?.odooHolderId ?? null;

const mapLine = (l: any): Expense => ({
  id: String(l.id),
  requestId: String(Array.isArray(l.request_id) ? l.request_id[0] : l.request_id),
  categoryId: Array.isArray(l.category_id) ? l.category_id[0] : undefined,
  vendorId: Array.isArray(l.partner_id) ? l.partner_id[0] : undefined,
  amount: l.amount_total ?? l.amount,
  description: l.name,
  createdAt: l.create_date ? new Date(l.create_date) : new Date(),
  updatedAt: l.write_date ? new Date(l.write_date) : new Date(),
});

const errorResponse = (res: Response, status: number, message: string, code: string) =>
  res.status(status).json({
    success: false,
    error: { message, code },
    timestamp: new Date(),
  } as ApiResponse<null>);

const createExpenseSchema = Joi.object({
  requestId: Joi.string().required(),
  categoryId: Joi.number().optional(),
  vendorId: Joi.number().optional(),
  amount: Joi.number().positive().required(),
  description: Joi.string().min(3).max(500).required(),
  invoiceDate: Joi.string().optional(),
  vendorVat: Joi.string().optional(),
  vendorCr: Joi.string().optional(),
  notes: Joi.string().optional(),
  receiptUrl: Joi.string().optional()
});

const updateExpenseSchema = Joi.object({
  categoryId: Joi.number().optional(),
  vendorId: Joi.number().optional(),
  amount: Joi.number().positive().optional(),
  description: Joi.string().min(3).max(500).optional(),
  invoiceDate: Joi.string().optional(),
  vendorVat: Joi.string().optional(),
  vendorCr: Joi.string().optional(),
  notes: Joi.string().optional(),
  receiptUrl: Joi.string().optional()
});

// Expense categories (lookup for forms) - must be before /:id
router.get('/categories', asyncHandler(async (_req: Request, res: Response) => {
  const auth = await odooAuthenticate();
  const rows = await search_read(auth, {
    model: CATEGORY_MODEL,
    domain: [['active', '=', true]],
    fields: ['id', 'name'],
    order: 'name',
    limit: 200,
  });
  const response: ApiResponse<any[]> = {
    success: true,
    data: rows.map((c: any) => ({ id: c.id, odooCategoryId: c.id, name: c.name, isActive: true })),
    timestamp: new Date(),
  };
  res.json(response);
}));

// Vendors (lookup for forms)
router.get('/vendors', asyncHandler(async (req: Request, res: Response) => {
  const search = (req.query.search as string | undefined)?.trim();
  const domain: any[] = [];
  if (search) domain.push(['name', 'ilike', search]);

  const auth = await odooAuthenticate();
  const rows = await search_read(auth, {
    model: PARTNER_MODEL,
    domain,
    fields: ['id', 'name', 'vat', 'l10n_sa_edi_additional_identification_number'],
    order: 'name',
    limit: 50,
  });
  const response: ApiResponse<any[]> = {
    success: true,
    data: rows.map((p: any) => ({
      id: p.id,
      odooVendorId: p.id,
      name: p.name,
      vat: p.vat || undefined,
    })),
    timestamp: new Date(),
  };
  res.json(response);
}));

// Get expenses by request ID - must be before /:id
router.get('/request/:requestId', asyncHandler(async (req: Request, res: Response) => {
  const holderId = getHolderId(req);
  if (!holderId) return errorResponse(res, 403, 'No Odoo holder linked to this user', 'NO_HOLDER');

  const requestId = parseInt(req.params.requestId, 10);
  if (isNaN(requestId)) return errorResponse(res, 400, 'Invalid request ID', 'INVALID_ID');

  const auth = await odooAuthenticate();
  const lines = await search_read(auth, {
    model: LINE_MODEL,
    domain: [['request_id', '=', requestId], ['holder_id', '=', holderId]],
    fields: LINE_FIELDS,
    order: 'sequence, id',
  });

  const response: ApiResponse<Expense[]> = {
    success: true,
    data: lines.map(mapLine),
    timestamp: new Date()
  };
  res.status(200).json(response);
}));

// Get all expense lines for the holder with pagination
router.get('/', asyncHandler(async (req: Request, res: Response) => {
  const holderId = getHolderId(req);
  if (!holderId) return errorResponse(res, 403, 'No Odoo holder linked to this user', 'NO_HOLDER');

  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 10;
  const sortOrder = (req.query.sortOrder as string) === 'asc' ? 'asc' : 'desc';

  const domain: any[] = [['holder_id', '=', holderId]];
  if (req.query.requestId) {
    const rid = parseInt(req.query.requestId as string, 10);
    if (!isNaN(rid)) domain.push(['request_id', '=', rid]);
  }
  if (req.query.categoryId) {
    const cid = parseInt(req.query.categoryId as string, 10);
    if (!isNaN(cid)) domain.push(['category_id', '=', cid]);
  }
  if (req.query.vendorId) {
    const vid = parseInt(req.query.vendorId as string, 10);
    if (!isNaN(vid)) domain.push(['partner_id', '=', vid]);
  }

  const auth = await odooAuthenticate();
  const total = await execute_kw(auth, LINE_MODEL, 'search_count', [domain]);
  const rows = await search_read(auth, {
    model: LINE_MODEL,
    domain,
    fields: LINE_FIELDS,
    offset: (page - 1) * limit,
    limit,
    order: `id ${sortOrder}`,
  });

  const response: ApiResponse<PaginatedResponse<Expense>> = {
    success: true,
    data: {
      data: rows.map(mapLine),
      total: total || 0,
      page,
      limit,
      totalPages: Math.ceil((total || 0) / limit),
    },
    timestamp: new Date()
  };
  res.status(200).json(response);
}));

// Get expense line by ID
router.get('/:id', asyncHandler(async (req: Request, res: Response) => {
  const holderId = getHolderId(req);
  if (!holderId) return errorResponse(res, 403, 'No Odoo holder linked to this user', 'NO_HOLDER');

  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) return errorResponse(res, 400, 'Invalid expense ID', 'INVALID_ID');

  const auth = await odooAuthenticate();
  const rows = await search_read(auth, {
    model: LINE_MODEL,
    domain: [['id', '=', id], ['holder_id', '=', holderId]],
    fields: LINE_FIELDS,
    limit: 1,
  });
  if (!rows.length) return errorResponse(res, 404, 'Expense not found', 'EXPENSE_NOT_FOUND');

  const response: ApiResponse<Expense> = { success: true, data: mapLine(rows[0]), timestamp: new Date() };
  res.status(200).json(response);
}));

// Create expense line on an existing draft request
router.post('/', validate(createExpenseSchema), asyncHandler(async (req: Request, res: Response) => {
  const holderId = getHolderId(req);
  if (!holderId) return errorResponse(res, 403, 'No Odoo holder linked to this user', 'NO_HOLDER');

  const { requestId, categoryId, vendorId, amount, description, invoiceDate, vendorVat, vendorCr, notes } = req.body;
  const rid = parseInt(requestId, 10);
  if (isNaN(rid)) return errorResponse(res, 400, 'Invalid request ID', 'INVALID_ID');

  const auth = await odooAuthenticate();
  const reqs = await search_read(auth, {
    model: 'ems.petty.request',
    domain: [['id', '=', rid], ['holder_id', '=', holderId]],
    fields: ['id', 'state'],
    limit: 1,
  });
  if (!reqs.length) return errorResponse(res, 404, 'Request not found', 'REQUEST_NOT_FOUND');
  if (reqs[0].state !== 'draft') {
    return errorResponse(res, 400, 'Can only add expenses to draft requests', 'INVALID_STATUS');
  }

  try {
    const newId = await odooCreate(auth, {
      model: LINE_MODEL,
      data: {
        request_id: rid,
        name: description,
        amount,
        category_id: categoryId || false,
        partner_id: vendorId || false,
        invoice_date: invoiceDate || false,
        vendor_vat: vendorVat || false,
        vendor_cr: vendorCr || false,
        notes: notes || false,
      },
    });

    const rows = await search_read(auth, {
      model: LINE_MODEL,
      domain: [['id', '=', newId]],
      fields: LINE_FIELDS,
      limit: 1,
    });

    const response: ApiResponse<Expense> = { success: true, data: mapLine(rows[0]), timestamp: new Date() };
    res.status(201).json(response);
  } catch (e: any) {
    logger.error('Odoo create expense line failed:', e);
    return errorResponse(res, 502, `Odoo create failed: ${e.message}`, 'ODOO_ERROR');
  }
}));

// Update expense line (draft requests only)
router.put('/:id', validate(updateExpenseSchema), asyncHandler(async (req: Request, res: Response) => {
  const holderId = getHolderId(req);
  if (!holderId) return errorResponse(res, 403, 'No Odoo holder linked to this user', 'NO_HOLDER');

  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) return errorResponse(res, 400, 'Invalid expense ID', 'INVALID_ID');

  const auth = await odooAuthenticate();
  const rows = await search_read(auth, {
    model: LINE_MODEL,
    domain: [['id', '=', id], ['holder_id', '=', holderId]],
    fields: ['id', 'request_id'],
    limit: 1,
  });
  if (!rows.length) return errorResponse(res, 404, 'Expense not found', 'EXPENSE_NOT_FOUND');

  const { categoryId, vendorId, amount, description, invoiceDate, vendorVat, vendorCr, notes } = req.body;
  const data: Record<string, any> = {};
  if (categoryId !== undefined) data.category_id = categoryId || false;
  if (vendorId !== undefined) data.partner_id = vendorId || false;
  if (amount !== undefined) data.amount = amount;
  if (description !== undefined) data.name = description;
  if (invoiceDate !== undefined) data.invoice_date = invoiceDate || false;
  if (vendorVat !== undefined) data.vendor_vat = vendorVat || false;
  if (vendorCr !== undefined) data.vendor_cr = vendorCr || false;
  if (notes !== undefined) data.notes = notes || false;

  try {
    if (Object.keys(data).length) await odooWrite(auth, { model: LINE_MODEL, ids: [id], data });
  } catch (e: any) {
    logger.error(`Odoo update expense ${id} failed:`, e);
    return errorResponse(res, 502, `Odoo update failed: ${e.message}`, 'ODOO_ERROR');
  }

  const updated = await search_read(auth, {
    model: LINE_MODEL, domain: [['id', '=', id]], fields: LINE_FIELDS, limit: 1,
  });
  const response: ApiResponse<Expense> = { success: true, data: mapLine(updated[0]), timestamp: new Date() };
  res.status(200).json(response);
}));

// Delete expense line
router.delete('/:id', asyncHandler(async (req: Request, res: Response) => {
  const holderId = getHolderId(req);
  if (!holderId) return errorResponse(res, 403, 'No Odoo holder linked to this user', 'NO_HOLDER');

  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) return errorResponse(res, 400, 'Invalid expense ID', 'INVALID_ID');

  const auth = await odooAuthenticate();
  const rows = await search_read(auth, {
    model: LINE_MODEL,
    domain: [['id', '=', id], ['holder_id', '=', holderId]],
    fields: ['id'],
    limit: 1,
  });
  if (!rows.length) return errorResponse(res, 404, 'Expense not found', 'EXPENSE_NOT_FOUND');

  try {
    await odooUnlink(auth, { model: LINE_MODEL, ids: [id] });
  } catch (e: any) {
    logger.error(`Odoo delete expense ${id} failed:`, e);
    return errorResponse(res, 502, `Odoo delete failed: ${e.message}`, 'ODOO_ERROR');
  }

  const response: ApiResponse<{ message: string }> = {
    success: true,
    data: { message: 'Expense deleted successfully' },
    timestamp: new Date()
  };
  res.status(200).json(response);
}));

export default router;
