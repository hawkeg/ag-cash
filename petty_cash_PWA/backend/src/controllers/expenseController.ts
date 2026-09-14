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
  'notes', 'receipt_file', 'receipt_filename', 'create_date', 'write_date',
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
  receiptUrl: l.receipt_file
    ? `data:image/${(l.receipt_filename || 'jpg').split('.').pop()};base64,${l.receipt_file}`
    : undefined,
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
  receiptUrl: Joi.string().optional(),
  receiptFile: Joi.string().optional(),
  receiptFilename: Joi.string().optional()
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
  receiptUrl: Joi.string().optional(),
  receiptFile: Joi.string().optional(),
  receiptFilename: Joi.string().optional()
});

// Translated fields can come back as {en_US: '...'} maps via XML-RPC
const transValue = (v: any): string => {
  if (v && typeof v === 'object') {
    return v.ar_001 || v.ar || Object.values(v)[0] as string || '';
  }
  return v || '';
};

const mapCategory = (c: any) => ({
  id: c.id,
  odooCategoryId: c.id,
  name: transValue(c.name),
  nameAr: undefined,
  isActive: c.active !== false,
  requireVendor: !!c.require_vendor,
  requireAttachment: !!c.require_attachment,
});

const CATEGORY_FIELDS = ['id', 'name', 'active', 'require_vendor', 'require_attachment'];

// Expense categories (lookup for forms) - must be before /:id
// Scoped to the holder's allowed categories (expense_category_ids) when set
router.get('/categories', asyncHandler(async (req: Request, res: Response) => {
  const holderId = getHolderId(req);
  const auth = await odooAuthenticate();

  const domain: any[] = [['active', '=', true]];

  if (holderId) {
    const holders = await search_read(auth, {
      model: 'ems.petty.holder',
      domain: [['id', '=', holderId]],
      fields: ['expense_category_ids'],
      limit: 1,
    });
    const allowed: number[] = holders[0]?.expense_category_ids || [];
    if (allowed.length) {
      domain.push(['id', 'in', allowed]);
    }
  }

  const rows = await search_read(auth, {
    model: CATEGORY_MODEL,
    domain,
    fields: CATEGORY_FIELDS,
    order: 'name',
    limit: 200,
  });
  const response: ApiResponse<any[]> = {
    success: true,
    data: rows.map(mapCategory),
    timestamp: new Date(),
  };
  res.json(response);
}));

const categorySchema = Joi.object({
  name: Joi.string().min(2).max(100).required(),
  requireVendor: Joi.boolean().optional(),
  requireAttachment: Joi.boolean().optional(),
});

// Create expense category in Odoo
router.post('/categories', validate(categorySchema), asyncHandler(async (req: Request, res: Response) => {
  const { name, requireVendor, requireAttachment } = req.body;
  const auth = await odooAuthenticate();
  try {
    const newId = await odooCreate(auth, {
      model: CATEGORY_MODEL,
      data: {
        name,
        require_vendor: !!requireVendor,
        require_attachment: !!requireAttachment,
      },
    });
    const rows = await search_read(auth, {
      model: CATEGORY_MODEL, domain: [['id', '=', newId]], fields: CATEGORY_FIELDS, limit: 1,
    });
    const response: ApiResponse<any> = { success: true, data: mapCategory(rows[0]), timestamp: new Date() };
    res.status(201).json(response);
  } catch (e: any) {
    logger.error('Odoo create category failed:', e);
    return errorResponse(res, 502, `Odoo create failed: ${e.message}`, 'ODOO_ERROR');
  }
}));

// Update expense category
router.put('/categories/:id', validate(categorySchema), asyncHandler(async (req: Request, res: Response) => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) return errorResponse(res, 400, 'Invalid category ID', 'INVALID_ID');

  const { name, requireVendor, requireAttachment } = req.body;
  const auth = await odooAuthenticate();
  try {
    await odooWrite(auth, {
      model: CATEGORY_MODEL,
      ids: [id],
      data: {
        name,
        require_vendor: !!requireVendor,
        require_attachment: !!requireAttachment,
      },
    });
    const rows = await search_read(auth, {
      model: CATEGORY_MODEL, domain: [['id', '=', id]], fields: CATEGORY_FIELDS, limit: 1,
    });
    const response: ApiResponse<any> = { success: true, data: mapCategory(rows[0]), timestamp: new Date() };
    res.json(response);
  } catch (e: any) {
    logger.error(`Odoo update category ${id} failed:`, e);
    return errorResponse(res, 502, `Odoo update failed: ${e.message}`, 'ODOO_ERROR');
  }
}));

// Archive expense category (set active=false - safer than delete)
router.delete('/categories/:id', asyncHandler(async (req: Request, res: Response) => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) return errorResponse(res, 400, 'Invalid category ID', 'INVALID_ID');

  const auth = await odooAuthenticate();
  try {
    await odooWrite(auth, { model: CATEGORY_MODEL, ids: [id], data: { active: false } });
  } catch (e: any) {
    logger.error(`Odoo archive category ${id} failed:`, e);
    return errorResponse(res, 502, `Odoo archive failed: ${e.message}`, 'ODOO_ERROR');
  }
  const response: ApiResponse<{ message: string }> = {
    success: true,
    data: { message: 'Category archived' },
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
    fields: ['id', 'name', 'vat', 'phone'],
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

// Create a new vendor (res.partner) from the app
const vendorSchema = Joi.object({
  name: Joi.string().min(2).max(200).required(),
  vat: Joi.string().max(50).optional(),
  phone: Joi.string().max(50).optional(),
});

router.post('/vendors', validate(vendorSchema), asyncHandler(async (req: Request, res: Response) => {
  const { name, vat, phone } = req.body;
  const auth = await odooAuthenticate();
  try {
    const newId = await odooCreate(auth, {
      model: PARTNER_MODEL,
      data: { name, vat: vat || false, phone: phone || false, supplier_rank: 1 },
    });
    const response: ApiResponse<any> = {
      success: true,
      data: { id: newId, odooVendorId: newId, name, vat },
      timestamp: new Date(),
    };
    res.status(201).json(response);
  } catch (e: any) {
    logger.error('Odoo create vendor failed:', e);
    return errorResponse(res, 502, `Odoo create failed: ${e.message}`, 'ODOO_ERROR');
  }
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
        receipt_file: req.body.receiptFile || false,
        receipt_filename: req.body.receiptFilename || false,
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

  const { categoryId, vendorId, amount, description, invoiceDate, vendorVat, vendorCr, notes, receiptFile, receiptFilename } = req.body;
  const data: Record<string, any> = {};
  if (categoryId !== undefined) data.category_id = categoryId || false;
  if (vendorId !== undefined) data.partner_id = vendorId || false;
  if (amount !== undefined) data.amount = amount;
  if (description !== undefined) data.name = description;
  if (invoiceDate !== undefined) data.invoice_date = invoiceDate || false;
  if (vendorVat !== undefined) data.vendor_vat = vendorVat || false;
  if (vendorCr !== undefined) data.vendor_cr = vendorCr || false;
  if (notes !== undefined) data.notes = notes || false;
  if (receiptFile !== undefined) {
    data.receipt_file = receiptFile || false;
    data.receipt_filename = receiptFilename || false;
  }

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

// ============ OCR (ems_petty_invoice_ocr) ============
const INVOICE_DOC_MODEL = 'ems.petty.invoice.document';
const OCR_RESULT_MODEL = 'ems.petty.ocr.extraction.result';

const ocrUploadSchema = Joi.object({
  file: Joi.string().required(),
  fileName: Joi.string().required(),
  requestId: Joi.number().optional(),
});

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

// Upload invoice image -> run Odoo OCR -> return extracted fields
router.post('/ocr', validate(ocrUploadSchema), asyncHandler(async (req: Request, res: Response) => {
  const holderId = getHolderId(req);
  if (!holderId) return errorResponse(res, 403, 'No Odoo holder linked to this user', 'NO_HOLDER');

  const { file, fileName, requestId } = req.body;
  const auth = await odooAuthenticate();

  const data: Record<string, any> = {
    holder_id: holderId,
    file_data: file,
    file_name: fileName,
    source: 'mobile_camera',
    device_info: req.headers['user-agent'] || 'ag-cash pwa',
  };
  if (requestId) data.request_id = requestId;

  let docId: number;
  try {
    docId = await odooCreate(auth, { model: INVOICE_DOC_MODEL, data });
    await execute_kw(auth, INVOICE_DOC_MODEL, 'action_process_ocr', [[docId]]);
  } catch (e: any) {
    logger.error('OCR create/process failed:', e);
    return errorResponse(res, 502, `OCR failed: ${e.message}`, 'ODOO_ERROR');
  }

  // Poll until done/error (max ~90s)
  let doc: any = null;
  for (let i = 0; i < 30; i++) {
    await sleep(3000);
    const rows = await search_read(auth, {
      model: INVOICE_DOC_MODEL,
      domain: [['id', '=', docId]],
      fields: ['state', 'error_message', 'ocr_result_id', 'needs_review'],
      limit: 1,
    });
    doc = rows[0];
    if (!doc || ['done', 'error', 'cancelled'].includes(doc.state)) break;
  }

  if (!doc) return errorResponse(res, 504, 'OCR timed out', 'OCR_TIMEOUT');
  if (doc.state !== 'done') {
    return errorResponse(res, 502, doc.error_message || `OCR ended in state ${doc.state}`, 'OCR_FAILED');
  }

  let result: any = {};
  if (Array.isArray(doc.ocr_result_id) && doc.ocr_result_id[0]) {
    const rows = await search_read(auth, {
      model: OCR_RESULT_MODEL,
      domain: [['id', '=', doc.ocr_result_id[0]]],
      fields: [
        'vendor_name', 'vendor_tax_id', 'vendor_commercial_reg', 'vendor_partner_id',
        'invoice_number', 'invoice_date', 'subtotal_amount', 'tax_amount',
        'total_amount', 'currency_detected', 'category_id', 'category_match_state',
        'category_match_score', 'confidence_score', 'needs_review', 'description',
      ],
      limit: 1,
    });
    result = rows[0] || {};
  }

  const response: ApiResponse<any> = {
    success: true,
    data: {
      documentId: docId,
      needsReview: doc.needs_review || result.needs_review,
      vendorName: result.vendor_name || undefined,
      vendorId: Array.isArray(result.vendor_partner_id) ? result.vendor_partner_id[0] : undefined,
      vendorVat: result.vendor_tax_id || undefined,
      invoiceNumber: result.invoice_number || undefined,
      invoiceDate: result.invoice_date || undefined,
      amount: result.total_amount || undefined,
      taxAmount: result.tax_amount || undefined,
      categoryId: Array.isArray(result.category_id) ? result.category_id[0] : undefined,
      categoryMatchState: result.category_match_state || undefined,
      confidence: result.confidence_score ?? undefined,
      description: result.description || undefined,
    },
    timestamp: new Date(),
  };
  res.status(200).json(response);
}));

// Confirm an OCR document -> creates the expense line (+request) in Odoo
router.post('/ocr/:id/confirm', asyncHandler(async (req: Request, res: Response) => {
  const holderId = getHolderId(req);
  if (!holderId) return errorResponse(res, 403, 'No Odoo holder linked to this user', 'NO_HOLDER');

  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) return errorResponse(res, 400, 'Invalid document ID', 'INVALID_ID');

  const auth = await odooAuthenticate();
  try {
    await execute_kw(auth, INVOICE_DOC_MODEL, 'action_create_expense_line', [[id]]);
  } catch (e: any) {
    return errorResponse(res, 502, `Confirm failed: ${e.message}`, 'ODOO_ERROR');
  }
  const rows = await search_read(auth, {
    model: INVOICE_DOC_MODEL,
    domain: [['id', '=', id]],
    fields: ['expense_line_id', 'request_id'],
    limit: 1,
  });
  const response: ApiResponse<any> = {
    success: true,
    data: {
      expenseLineId: Array.isArray(rows[0]?.expense_line_id) ? rows[0].expense_line_id[0] : undefined,
      requestId: Array.isArray(rows[0]?.request_id) ? rows[0].request_id[0] : undefined,
    },
    timestamp: new Date(),
  };
  res.status(200).json(response);
}));

export default router;
