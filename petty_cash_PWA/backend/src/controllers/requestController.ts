import { Router, Request as ExpressRequest, Response } from 'express';
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
import { ApiResponse, Request, RequestType, RequestStatus, PaginatedResponse } from '../types';
import { sendPushToHolder } from './notificationController';

const router = Router();

const ODOO_MODEL = 'ems.petty.request';
const ODOO_LINE_MODEL = 'ems.petty.expense.line';
const REQUEST_FIELDS = [
  'id', 'name', 'holder_id', 'date', 'description', 'amount_total', 'state',
  'dedicated_request_id', 'rejection_reason', 'create_date', 'write_date', 'manager_id',
];

// Odoo state -> shared RequestStatus
const odooToStatus: Record<string, RequestStatus> = {
  draft: RequestStatus.DRAFT,
  submitted: RequestStatus.SUBMITTED,
  manager_approved: RequestStatus.APPROVED,
  finance_approved: RequestStatus.APPROVED,
  posted: RequestStatus.PAID,
  rejected: RequestStatus.REJECTED,
  cancelled: RequestStatus.CANCELLED,
};

// shared RequestStatus -> Odoo states (for filtering)
const statusToOdoo: Record<RequestStatus, string[]> = {
  [RequestStatus.DRAFT]: ['draft'],
  [RequestStatus.SUBMITTED]: ['submitted'],
  [RequestStatus.APPROVED]: ['manager_approved', 'finance_approved'],
  [RequestStatus.PAID]: ['posted'],
  [RequestStatus.REJECTED]: ['rejected'],
  [RequestStatus.CANCELLED]: ['cancelled'],
};

export const statusToAction: Partial<Record<RequestStatus, string>> = {
  [RequestStatus.SUBMITTED]: 'action_submit',
  [RequestStatus.CANCELLED]: 'action_cancel',
  [RequestStatus.DRAFT]: 'action_draft',
};

const getHolderId = (req: ExpressRequest): number | null =>
  req.user?.userMetadata?.odooHolderId ?? null;

const mapRequest = (r: any): Request => ({
  id: String(r.id),
  userId: `holder_${Array.isArray(r.holder_id) ? r.holder_id[0] : r.holder_id}`,
  odooRequestId: r.id,
  name: r.name || undefined,
  type: r.dedicated_request_id ? RequestType.ADVANCE : RequestType.EXPENSE,
  amount: r.amount_total || 0,
  description: r.description || r.name,
  status: odooToStatus[r.state] || RequestStatus.DRAFT,
  rejectionReason: r.rejection_reason || undefined,
  approvedBy: Array.isArray(r.manager_id) ? r.manager_id[1] : undefined,
  createdAt: r.create_date ? new Date(r.create_date) : new Date(),
  updatedAt: r.write_date ? new Date(r.write_date) : new Date(),
});

const errorResponse = (res: Response, status: number, message: string, code: string) =>
  res.status(status).json({
    success: false,
    error: { message, code },
    timestamp: new Date(),
  } as ApiResponse<null>);

// Validation schemas
const createRequestSchema = Joi.object({
  type: Joi.string().valid(...Object.values(RequestType)).optional(),
  amount: Joi.number().positive().optional(),
  description: Joi.string().min(3).max(500).required(),
  submit: Joi.boolean().optional(),
  dedicatedRequestId: Joi.number().integer().positive().optional(),
  expenses: Joi.array().items(
    Joi.object({
      categoryId: Joi.number().optional(),
      vendorId: Joi.number().optional(),
      amount: Joi.number().positive().required(),
      description: Joi.string().min(3).max(500).required(),
      invoiceDate: Joi.string().optional(),
      vendorVat: Joi.string().optional(),
      vendorCr: Joi.string().optional(),
      notes: Joi.string().optional(),
      receiptUrl: Joi.string().optional(),
      receiptFile: Joi.string().optional(),
      receiptFilename: Joi.string().optional(),
      withVat: Joi.boolean().optional(),
      ocrDocumentId: Joi.number().integer().optional()
    })
  ).optional()
});

const updateRequestSchema = Joi.object({
  description: Joi.string().min(3).max(500).optional(),
  submit: Joi.boolean().optional(),
  expenses: Joi.array().items(
    Joi.object({
      categoryId: Joi.number().optional(),
      vendorId: Joi.number().optional(),
      amount: Joi.number().positive().required(),
      description: Joi.string().min(3).max(500).required(),
      invoiceDate: Joi.string().optional(),
      vendorVat: Joi.string().optional(),
      vendorCr: Joi.string().optional(),
      notes: Joi.string().optional(),
      receiptUrl: Joi.string().optional(),
      receiptFile: Joi.string().optional(),
      receiptFilename: Joi.string().optional(),
      withVat: Joi.boolean().optional(),
      ocrDocumentId: Joi.number().integer().optional()
    })
  ).optional()
});

const updateStatusSchema = Joi.object({
  status: Joi.string().valid(...Object.values(RequestStatus)).required(),
  rejectionReason: Joi.string().max(500).optional()
});

// Get all requests with pagination
router.get('/', asyncHandler(async (req: ExpressRequest, res: Response) => {
  const holderId = getHolderId(req);
  if (!holderId) return errorResponse(res, 403, 'No Odoo holder linked to this user', 'NO_HOLDER');

  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 10;
  const sortOrder = (req.query.sortOrder as string) === 'asc' ? 'asc' : 'desc';

  const domain: any[] = [['holder_id', '=', holderId]];
  if (req.query.status && statusToOdoo[req.query.status as RequestStatus]) {
    domain.push(['state', 'in', statusToOdoo[req.query.status as RequestStatus]]);
  }

  const auth = await odooAuthenticate();
  const total = await execute_kw(auth, ODOO_MODEL, 'search_count', [domain]);
  const rows = await search_read(auth, {
    model: ODOO_MODEL,
    domain,
    fields: REQUEST_FIELDS,
    offset: (page - 1) * limit,
    limit,
    order: `id ${sortOrder}`,
  });

  const response: ApiResponse<PaginatedResponse<Request>> = {
    success: true,
    data: {
      data: rows.map(mapRequest),
      total: total || 0,
      page,
      limit,
      totalPages: Math.ceil((total || 0) / limit),
    },
    timestamp: new Date()
  };
  res.status(200).json(response);
}));

// Get request by ID (with expense lines)
router.get('/:id', asyncHandler(async (req: ExpressRequest, res: Response) => {
  const holderId = getHolderId(req);
  if (!holderId) return errorResponse(res, 403, 'No Odoo holder linked to this user', 'NO_HOLDER');

  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) return errorResponse(res, 400, 'Invalid request ID', 'INVALID_ID');

  const auth = await odooAuthenticate();
  const rows = await search_read(auth, {
    model: ODOO_MODEL,
    domain: [['id', '=', id], ['holder_id', '=', holderId]],
    fields: [...REQUEST_FIELDS, 'line_ids'],
    limit: 1,
  });

  if (!rows.length) return errorResponse(res, 404, 'Request not found', 'REQUEST_NOT_FOUND');

  const request = mapRequest(rows[0]);
  const lines = await search_read(auth, {
    model: ODOO_LINE_MODEL,
    domain: [['request_id', '=', id]],
    fields: ['id', 'name', 'amount', 'amount_total', 'category_id', 'partner_id', 'invoice_date', 'receipt_file', 'receipt_filename', 'create_date', 'write_date'],
    order: 'sequence, id',
  });

  request.expenses = lines.map((l: any) => ({
    id: String(l.id),
    requestId: String(id),
    categoryId: Array.isArray(l.category_id) ? l.category_id[0] : undefined,
    vendorId: Array.isArray(l.partner_id) ? l.partner_id[0] : undefined,
    amount: l.amount_total || l.amount,
    description: l.name,
    receiptUrl: l.receipt_file
      ? `data:image/${(l.receipt_filename || 'jpg').split('.').pop()};base64,${l.receipt_file}`
      : undefined,
    createdAt: l.create_date ? new Date(l.create_date) : new Date(),
    updatedAt: l.write_date ? new Date(l.write_date) : new Date(),
  }));

  const response: ApiResponse<Request> = { success: true, data: request, timestamp: new Date() };
  res.status(200).json(response);
}));

// Fetch category tax_ids so VAT lines get proper taxes (onchange doesn't
// fire over XML-RPC — we must set tax_ids explicitly)
const getCategoryTaxMap = async (auth: any, categoryIds: number[]) => {
  const map = new Map<number, number[]>();
  const ids = [...new Set(categoryIds.filter(Boolean))];
  if (!ids.length) return map;
  try {
    const rows = await search_read(auth, {
      model: 'ems.petty.expense.category',
      domain: [['id', 'in', ids]],
      fields: ['id', 'tax_ids'],
    });
    rows.forEach((c: any) => map.set(c.id, c.tax_ids || []));
  } catch (e) {
    logger.warn('Could not fetch category tax_ids:', e);
  }
  return map;
};

export const buildLineVals = (exp: any, catTaxMap: Map<number, number[]>) => ({
  name: exp.description,
  amount: exp.amount,
  category_id: exp.categoryId || false,
  partner_id: exp.vendorId || false,
  invoice_date: exp.invoiceDate || false,
  vendor_vat: exp.vendorVat || false,
  vendor_cr: exp.vendorCr || false,
  notes: exp.notes || false,
  receipt_file: exp.receiptFile || false,
  receipt_filename: exp.receiptFilename || false,
  with_vat: !!exp.withVat,
  ...(exp.withVat && exp.categoryId && catTaxMap.get(exp.categoryId)?.length
    ? { tax_ids: [[6, 0, catTaxMap.get(exp.categoryId)]] }
    : {}),
});

// Link ems.petty.invoice.document records created by OCR scans to the new
// request and their matching expense lines
const linkOcrDocuments = async (auth: any, expenses: any[], requestId: number, lineIds: number[]) => {
  const docs = expenses
    .map((exp, i) => ({ docId: exp.ocrDocumentId, lineId: lineIds[i] }))
    .filter((d) => d.docId);
  for (const d of docs) {
    try {
      const data: Record<string, any> = { request_id: requestId };
      if (d.lineId) data.expense_line_id = d.lineId;
      await odooWrite(auth, { model: 'ems.petty.invoice.document', ids: [d.docId], data });
    } catch (e) {
      logger.warn(`Could not link OCR document ${d.docId}:`, e);
    }
  }
};

// Create new request in Odoo
router.post('/', validate(createRequestSchema), asyncHandler(async (req: ExpressRequest, res: Response) => {
  const holderId = getHolderId(req);
  if (!holderId) return errorResponse(res, 403, 'No Odoo holder linked to this user', 'NO_HOLDER');

  const { description, expenses, submit, dedicatedRequestId } = req.body;

  const auth = await odooAuthenticate();
  const catTaxMap = await getCategoryTaxMap(auth, (expenses || []).map((e: any) => e.categoryId));

  const data: Record<string, any> = {
    holder_id: holderId,
    description,
  };
  if (dedicatedRequestId) data.dedicated_request_id = dedicatedRequestId;
  if (expenses?.length) {
    data.line_ids = expenses.map((exp: any) => [0, 0, buildLineVals(exp, catTaxMap)]);
  }

  let newId: number;
  try {
    newId = await odooCreate(auth, { model: ODOO_MODEL, data });
  } catch (e: any) {
    logger.error('Odoo create request failed:', e);
    return errorResponse(res, 502, `Odoo create failed: ${e.message}`, 'ODOO_ERROR');
  }

  // Link OCR invoice documents to the request + their expense lines
  if (expenses?.some((e: any) => e.ocrDocumentId)) {
    const created = await search_read(auth, {
      model: ODOO_MODEL,
      domain: [['id', '=', newId]],
      fields: ['line_ids'],
      limit: 1,
    });
    await linkOcrDocuments(auth, expenses, newId, created[0]?.line_ids || []);
  }

  if (submit) {
    try {
      await execute_kw(auth, ODOO_MODEL, 'action_submit', [[newId]]);
    } catch (e: any) {
      logger.warn(`Created request ${newId} but submit failed:`, e);
    }
  }

  const rows = await search_read(auth, {
    model: ODOO_MODEL,
    domain: [['id', '=', newId]],
    fields: REQUEST_FIELDS,
    limit: 1,
  });

  logger.info(`Request created in Odoo: ${newId} for holder ${holderId}`);

  const response: ApiResponse<Request> = {
    success: true,
    data: mapRequest(rows[0]),
    timestamp: new Date()
  };
  res.status(201).json(response);
}));

// Update request (draft only)
router.put('/:id', validate(updateRequestSchema), asyncHandler(async (req: ExpressRequest, res: Response) => {
  const holderId = getHolderId(req);
  if (!holderId) return errorResponse(res, 403, 'No Odoo holder linked to this user', 'NO_HOLDER');

  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) return errorResponse(res, 400, 'Invalid request ID', 'INVALID_ID');

  const auth = await odooAuthenticate();
  const rows = await search_read(auth, {
    model: ODOO_MODEL,
    domain: [['id', '=', id], ['holder_id', '=', holderId]],
    fields: REQUEST_FIELDS,
    limit: 1,
  });
  if (!rows.length) return errorResponse(res, 404, 'Request not found', 'REQUEST_NOT_FOUND');
  if (rows[0].state !== 'draft') {
    return errorResponse(res, 400, 'Can only update requests in draft status', 'INVALID_STATUS');
  }

  const { description, expenses, submit } = req.body;
  const data: Record<string, any> = {};
  if (description !== undefined) data.description = description;
  if (expenses !== undefined) {
    const catTaxMap = await getCategoryTaxMap(auth, expenses.map((e: any) => e.categoryId));
    data.line_ids = [[5, 0, 0], ...expenses.map((exp: any) => [0, 0, buildLineVals(exp, catTaxMap)])];
  }

  try {
    if (Object.keys(data).length) await odooWrite(auth, { model: ODOO_MODEL, ids: [id], data });
    if (expenses?.some((e: any) => e.ocrDocumentId)) {
      const created = await search_read(auth, {
        model: ODOO_MODEL,
        domain: [['id', '=', id]],
        fields: ['line_ids'],
        limit: 1,
      });
      await linkOcrDocuments(auth, expenses, id, created[0]?.line_ids || []);
    }
    if (submit) await execute_kw(auth, ODOO_MODEL, 'action_submit', [[id]]);
  } catch (e: any) {
    logger.error(`Odoo update request ${id} failed:`, e);
    return errorResponse(res, 502, `Odoo update failed: ${e.message}`, 'ODOO_ERROR');
  }

  const updated = await search_read(auth, {
    model: ODOO_MODEL,
    domain: [['id', '=', id]],
    fields: REQUEST_FIELDS,
    limit: 1,
  });

  const response: ApiResponse<Request> = { success: true, data: mapRequest(updated[0]), timestamp: new Date() };
  res.status(200).json(response);
}));

// Update request status via Odoo workflow
router.patch('/:id/status', validate(updateStatusSchema), asyncHandler(async (req: ExpressRequest, res: Response) => {
  const holderId = getHolderId(req);
  if (!holderId) return errorResponse(res, 403, 'No Odoo holder linked to this user', 'NO_HOLDER');

  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) return errorResponse(res, 400, 'Invalid request ID', 'INVALID_ID');

  const { status } = req.body as { status: RequestStatus };
  const action = statusToAction[status];
  if (!action) {
    return errorResponse(res, 400, `Status transition to ${status} is not supported from the app`, 'INVALID_TRANSITION');
  }

  const auth = await odooAuthenticate();
  const rows = await search_read(auth, {
    model: ODOO_MODEL,
    domain: [['id', '=', id], ['holder_id', '=', holderId]],
    fields: REQUEST_FIELDS,
    limit: 1,
  });
  if (!rows.length) return errorResponse(res, 404, 'Request not found', 'REQUEST_NOT_FOUND');

  try {
    await execute_kw(auth, ODOO_MODEL, action, [[id]]);
  } catch (e: any) {
    logger.error(`Odoo ${action} on request ${id} failed:`, e);
    return errorResponse(res, 502, `Odoo workflow failed: ${e.message}`, 'ODOO_ERROR');
  }

  const updated = await search_read(auth, {
    model: ODOO_MODEL,
    domain: [['id', '=', id]],
    fields: REQUEST_FIELDS,
    limit: 1,
  });

  // Fire a push notification to the holder about the status change
  const stateLabel: Record<string, string> = {
    submitted: 'مقدم', manager_approved: 'اعتماد المدير', finance_approved: 'اعتماد المالية',
    posted: 'مرحّل', rejected: 'مرفوض', cancelled: 'ملغي', draft: 'مسودة',
  };
  sendPushToHolder(holderId, {
    title: `طلب ${updated[0]?.name || '#' + id}`,
    body: `تم تحديث الحالة إلى: ${stateLabel[updated[0]?.state] || updated[0]?.state}`,
    url: `/requests/${id}`,
  }).catch(() => {});

  const response: ApiResponse<Request> = { success: true, data: mapRequest(updated[0]), timestamp: new Date() };
  res.status(200).json(response);
}));

// Delete request (draft only)
router.delete('/:id', asyncHandler(async (req: ExpressRequest, res: Response) => {
  const holderId = getHolderId(req);
  if (!holderId) return errorResponse(res, 403, 'No Odoo holder linked to this user', 'NO_HOLDER');

  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) return errorResponse(res, 400, 'Invalid request ID', 'INVALID_ID');

  const auth = await odooAuthenticate();
  const rows = await search_read(auth, {
    model: ODOO_MODEL,
    domain: [['id', '=', id], ['holder_id', '=', holderId]],
    fields: ['id', 'state'],
    limit: 1,
  });
  if (!rows.length) return errorResponse(res, 404, 'Request not found', 'REQUEST_NOT_FOUND');
  if (rows[0].state !== 'draft') {
    return errorResponse(res, 400, 'Can only delete draft requests', 'INVALID_STATUS');
  }

  try {
    await odooUnlink(auth, { model: ODOO_MODEL, ids: [id] });
  } catch (e: any) {
    logger.error(`Odoo delete request ${id} failed:`, e);
    return errorResponse(res, 502, `Odoo delete failed: ${e.message}`, 'ODOO_ERROR');
  }

  logger.info(`Request deleted in Odoo: ${id}`);
  const response: ApiResponse<{ message: string }> = {
    success: true,
    data: { message: 'Request deleted successfully' },
    timestamp: new Date()
  };
  res.status(200).json(response);
}));

export default router;
