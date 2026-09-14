import { Router, Request, Response } from 'express';
import { logger } from '../utils/logger';
import { asyncHandler } from '../middleware/validation';
import {
  authenticate as odooAuthenticate,
  search_read,
  execute_kw,
} from '../services/odoo';
import { ApiResponse, RequestStatus, RequestType } from '../types';

const router = Router();

const REQUEST_MODEL = 'ems.petty.request';
const odooToStatus: Record<string, RequestStatus> = {
  draft: RequestStatus.DRAFT,
  submitted: RequestStatus.SUBMITTED,
  manager_approved: RequestStatus.APPROVED,
  finance_approved: RequestStatus.APPROVED,
  posted: RequestStatus.PAID,
  rejected: RequestStatus.REJECTED,
  cancelled: RequestStatus.CANCELLED,
};

router.get('/', asyncHandler(async (req: Request, res: Response) => {
  const holderId = req.user?.userMetadata?.odooHolderId;
  if (!holderId) {
    const response: ApiResponse<null> = {
      success: false,
      error: { message: 'No Odoo holder linked to this user', code: 'NO_HOLDER' },
      timestamp: new Date(),
    };
    return res.status(403).json(response);
  }

  const auth = await odooAuthenticate();

  const holders = await search_read(auth, {
    model: 'ems.petty.holder',
    domain: [['id', '=', holderId]],
    fields: [
      'id', 'name', 'employee_id', 'department_id', 'state',
      'limit_amount', 'used_amount', 'remaining_amount', 'replenishment_total',
    ],
    limit: 1,
  });

  if (!holders.length) {
    const response: ApiResponse<null> = {
      success: false,
      error: { message: 'Holder not found in Odoo', code: 'HOLDER_NOT_FOUND' },
      timestamp: new Date(),
    };
    return res.status(404).json(response);
  }

  const h = holders[0];
  const holder = {
    id: h.id,
    name: h.name,
    employeeName: Array.isArray(h.employee_id) ? h.employee_id[1] : '',
    department: Array.isArray(h.department_id) ? h.department_id[1] : '',
    state: h.state,
    limitAmount: h.limit_amount,
    usedAmount: h.used_amount,
    remainingAmount: h.remaining_amount,
    replenishmentTotal: h.replenishment_total,
  };

  const monthStart = new Date();
  monthStart.setDate(1);
  const monthStartStr = monthStart.toISOString().slice(0, 10);

  const pendingStates = ['submitted', 'manager_approved', 'finance_approved'];
  const [pendingCount, monthCount, monthPosted, recent] = await Promise.all([
    execute_kw(auth, REQUEST_MODEL, 'search_count', [[['holder_id', '=', holderId], ['state', 'in', pendingStates]]]),
    execute_kw(auth, REQUEST_MODEL, 'search_count', [[['holder_id', '=', holderId], ['date', '>=', monthStartStr]]]),
    search_read(auth, {
      model: REQUEST_MODEL,
      domain: [['holder_id', '=', holderId], ['state', '=', 'posted'], ['date', '>=', monthStartStr]],
      fields: ['amount_total'],
      limit: 500,
    }),
    search_read(auth, {
      model: REQUEST_MODEL,
      domain: [['holder_id', '=', holderId]],
      fields: ['id', 'name', 'date', 'description', 'amount_total', 'state', 'dedicated_request_id', 'create_date'],
      limit: 5,
      order: 'id desc',
    }),
  ]);

  const totalSpentThisMonth = (monthPosted as any[]).reduce((s, r) => s + (r.amount_total || 0), 0);

  const stats = {
    totalBalance: holder.remainingAmount,
    pendingRequests: pendingCount || 0,
    totalRequestsThisMonth: monthCount || 0,
    totalSpentThisMonth,
  };

  const recentRequests = (recent as any[]).map((r) => ({
    id: String(r.id),
    userId: `holder_${holderId}`,
    odooRequestId: r.id,
    type: r.dedicated_request_id ? RequestType.ADVANCE : RequestType.EXPENSE,
    amount: r.amount_total || 0,
    description: r.description || r.name,
    status: odooToStatus[r.state] || RequestStatus.DRAFT,
    createdAt: r.create_date ? new Date(r.create_date) : new Date(),
    updatedAt: r.create_date ? new Date(r.create_date) : new Date(),
  }));

  const response: ApiResponse<any> = {
    success: true,
    data: { holder, stats, recentRequests },
    timestamp: new Date(),
  };
  res.json(response);
}));

export default router;
