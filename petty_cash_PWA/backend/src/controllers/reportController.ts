import { Router, Request, Response } from 'express';
import { Request as ExpressRequest } from 'express';
import { asyncHandler } from '../middleware/validation';
import { authenticate as odooAuthenticate, search_read } from '../services/odoo';
import { ApiResponse } from '../types';

const router = Router();

const getHolderId = (req: ExpressRequest): number | null =>
  req.user?.userMetadata?.odooHolderId ?? null;

// GET /api/reports/summary?from=YYYY-MM-DD&to=YYYY-MM-DD
// Aggregates the holder's real expense lines from Odoo.
router.get('/summary', asyncHandler(async (req: Request, res: Response) => {
  const holderId = getHolderId(req);
  if (!holderId) {
    return res.status(403).json({
      success: false,
      error: { message: 'No Odoo holder linked to this user', code: 'NO_HOLDER' },
      timestamp: new Date(),
    } as ApiResponse<null>);
  }

  const auth = await odooAuthenticate();

  // Holder's requests (any non-cancelled state counts toward spending)
  const requests = await search_read(auth, {
    model: 'ems.petty.request',
    domain: [['holder_id', '=', holderId], ['state', 'not in', ['cancelled', 'rejected']]],
    fields: ['id', 'state', 'date', 'create_date', 'amount_total'],
    limit: 500,
  });
  const requestIds = requests.map((r: any) => r.id);
  const requestDate = new Map<number, string>(
    requests.map((r: any) => [r.id, r.date || r.create_date])
  );

  // Holder balance
  const holders = await search_read(auth, {
    model: 'ems.petty.holder',
    domain: [['id', '=', holderId]],
    fields: ['limit_amount', 'remaining_amount', 'used_amount'],
    limit: 1,
  });
  const holder = holders[0] || {};

  // Expense lines for those requests
  const lines = requestIds.length
    ? await search_read(auth, {
        model: 'ems.petty.expense.line',
        domain: [['request_id', 'in', requestIds]],
        fields: ['id', 'amount', 'amount_total', 'with_vat', 'category_id', 'partner_id', 'request_id', 'invoice_date', 'create_date'],
        limit: 2000,
      })
    : [];

  // Optional date-range filter on the line's invoice/create date
  const from = req.query.from ? new Date(req.query.from as string) : null;
  const to = req.query.to ? new Date(req.query.to as string) : null;
  const inRange = (l: any) => {
    const d = new Date(l.invoice_date || l.create_date || requestDate.get(l.request_id?.[0]) || 0);
    return (!from || d >= from) && (!to || d <= to);
  };
  const categoryFilter = req.query.category as string | undefined;
  const scoped = lines.filter(
    (l: any) =>
      inRange(l) &&
      (!categoryFilter ||
        categoryFilter === 'all' ||
        (Array.isArray(l.category_id) ? l.category_id[1] : 'بدون تصنيف') === categoryFilter)
  );

  const totalExpenses = scoped.reduce((s: number, l: any) => s + (l.amount_total || l.amount || 0), 0);
  const vatAmount = scoped.reduce(
    (s: number, l: any) => s + (l.with_vat ? Math.max((l.amount_total || 0) - (l.amount || 0), 0) : 0),
    0
  );

  const catMap = new Map<string, number>();
  const monthMap = new Map<string, number>();
  const vendorMap = new Map<string, number>();
  for (const l of scoped) {
    const total = l.amount_total || l.amount || 0;
    const cat = Array.isArray(l.category_id) ? l.category_id[1] : 'بدون تصنيف';
    catMap.set(cat, (catMap.get(cat) || 0) + total);
    const d = new Date(l.invoice_date || l.create_date || requestDate.get(l.request_id?.[0]) || Date.now());
    const mk = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    monthMap.set(mk, (monthMap.get(mk) || 0) + total);
    const vendor = Array.isArray(l.partner_id) ? l.partner_id[1] : 'بدون مورد';
    vendorMap.set(vendor, (vendorMap.get(vendor) || 0) + total);
  }

  const categorySpending = [...catMap.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([category, amount]) => ({ category, amount }));
  const monthlySpending = [...monthMap.entries()]
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([month, amount]) => ({ month, amount }));
  const topVendors = [...vendorMap.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([vendor, amount]) => ({ vendor, amount }));

  // Burn rate: total / days elapsed this month (or range length)
  const now = new Date();
  const rangeDays = from && to
    ? Math.max(1, Math.ceil((to.getTime() - from.getTime()) / 86400000))
    : now.getDate();
  const dailyBurnRate = totalExpenses / rangeDays;

  const limit = holder.limit_amount || 0;
  const used = holder.used_amount || 0;

  res.json({
    success: true,
    data: {
      totalExpenses,
      vatAmount,
      dailyBurnRate: Math.round(dailyBurnRate * 100) / 100,
      remainingBalance: holder.remaining_amount ?? 0,
      limitAmount: limit,
      consumptionRate: limit ? Math.round((used / limit) * 1000) / 10 : 0,
      categorySpending,
      monthlySpending,
      topVendors,
      requestCount: requests.length,
      lineCount: scoped.length,
    },
    timestamp: new Date(),
  } as ApiResponse<any>);
}));

export default router;
