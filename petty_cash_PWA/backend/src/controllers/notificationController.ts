import { Router, Request, Response } from 'express';
import Joi from 'joi';
import fs from 'fs';
import path from 'path';
import webpush from 'web-push';
import { logger } from '../utils/logger';
import { validate, asyncHandler } from '../middleware/validation';
import { authenticate as odooAuthenticate, search_read } from '../services/odoo';
import { ApiResponse } from '../types';

const router = Router();

const DATA_DIR = path.join(__dirname, '..', '..', 'data');
const SUBS_FILE = path.join(DATA_DIR, 'push-subs.json');
const READ_FILE = path.join(DATA_DIR, 'read-notifs.json');
const SETTINGS_FILE = path.join(DATA_DIR, 'notif-settings.json');

const loadJson = (file: string): any => {
  try { return JSON.parse(fs.readFileSync(file, 'utf8')); } catch { return {}; }
};
const saveJson = (file: string, data: any) => {
  try {
    if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
    fs.writeFileSync(file, JSON.stringify(data, null, 2));
  } catch (e) { logger.warn('Notif store write failed:', e); }
};

const getHolderId = (req: Request): number | null =>
  req.user?.userMetadata?.odooHolderId ?? null;

const errorResponse = (res: Response, status: number, message: string, code: string) =>
  res.status(status).json({
    success: false,
    error: { message, code },
    timestamp: new Date(),
  } as ApiResponse<null>);

// ===== Web Push (VAPID) =====
const VAPID_PUBLIC = process.env.VAPID_PUBLIC_KEY;
const VAPID_PRIVATE = process.env.VAPID_PRIVATE_KEY;
if (VAPID_PUBLIC && VAPID_PRIVATE) {
  webpush.setVapidDetails(
    process.env.VAPID_SUBJECT || 'mailto:admin@agmc.local',
    VAPID_PUBLIC,
    VAPID_PRIVATE
  );
}

export const sendPushToHolder = async (holderId: number, payload: { title: string; body: string; url?: string }) => {
  const subs = loadJson(SUBS_FILE)[String(holderId)] || [];
  const settings = loadJson(SETTINGS_FILE)[String(holderId)];
  if (settings && settings.pushEnabled === false) return;
  for (const sub of subs) {
    try {
      await webpush.sendNotification(sub, JSON.stringify(payload));
    } catch (e: any) {
      if (e.statusCode === 404 || e.statusCode === 410) {
        const all = loadJson(SUBS_FILE);
        all[String(holderId)] = subs.filter((s: any) => s.endpoint !== sub.endpoint);
        saveJson(SUBS_FILE, all);
      }
      logger.warn('Push send failed:', e.message);
    }
  }
};

router.get('/vapid-key', (_req: Request, res: Response) => {
  res.json({ success: true, data: { publicKey: VAPID_PUBLIC || null }, timestamp: new Date() });
});

const subSchema = Joi.object({
  endpoint: Joi.string().uri().required(),
  keys: Joi.object({ p256dh: Joi.string().required(), auth: Joi.string().required() }).required(),
});

router.post('/subscribe', validate(subSchema), asyncHandler(async (req: Request, res: Response) => {
  const holderId = getHolderId(req);
  if (!holderId) return errorResponse(res, 403, 'No Odoo holder linked', 'NO_HOLDER');
  const all = loadJson(SUBS_FILE);
  const key = String(holderId);
  all[key] = all[key] || [];
  if (!all[key].find((s: any) => s.endpoint === req.body.endpoint)) all[key].push(req.body);
  saveJson(SUBS_FILE, all);
  res.json({ success: true, data: { message: 'Subscribed' }, timestamp: new Date() });
}));

router.delete('/subscribe', asyncHandler(async (req: Request, res: Response) => {
  const holderId = getHolderId(req);
  if (!holderId) return errorResponse(res, 403, 'No Odoo holder linked', 'NO_HOLDER');
  const all = loadJson(SUBS_FILE);
  const key = String(holderId);
  all[key] = (all[key] || []).filter((s: any) => s.endpoint !== req.body?.endpoint);
  saveJson(SUBS_FILE, all);
  res.json({ success: true, data: { message: 'Unsubscribed' }, timestamp: new Date() });
}));

// ===== In-app notifications from Odoo chatter (mail.message on holder's records) =====
router.get('/', asyncHandler(async (req: Request, res: Response) => {
  const holderId = getHolderId(req);
  if (!holderId) return errorResponse(res, 403, 'No Odoo holder linked', 'NO_HOLDER');

  const auth = await odooAuthenticate();
  const reqs = await search_read(auth, {
    model: 'ems.petty.request',
    domain: [['holder_id', '=', holderId]],
    fields: ['id', 'name', 'state', 'write_date'],
    order: 'write_date desc',
    limit: 30,
  });
  const advs = await search_read(auth, {
    model: 'ems.petty.dedicated.request',
    domain: [['holder_id', '=', holderId]],
    fields: ['id', 'name', 'state', 'write_date'],
    order: 'write_date desc',
    limit: 20,
  });

  const stateLabel: Record<string, string> = {
    draft: 'مسودة', submitted: 'مقدم', manager_approved: 'اعتماد المدير',
    finance_approved: 'اعتماد المالية', posted: 'مرحّل', rejected: 'مرفوض',
    cancelled: 'ملغي', disbursed: 'مصروف', settled: 'مسوّى',
  };

  const readMap = loadJson(READ_FILE)[String(holderId)] || {};
  const items = [...reqs.map((r: any) => ({ ...r, kind: 'request' })),
                 ...advs.map((a: any) => ({ ...a, kind: 'advance' }))]
    .sort((a, b) => String(b.write_date).localeCompare(String(a.write_date)))
    .map((r: any) => ({
      id: `${r.kind}-${r.id}`,
      odooId: r.id,
      kind: r.kind,
      title: r.name || `${r.kind} #${r.id}`,
      body: `الحالة: ${stateLabel[r.state] || r.state}`,
      state: r.state,
      date: r.write_date,
      read: !!readMap[`${r.kind}-${r.id}:${r.state}`],
      url: r.kind === 'request' ? `/requests/${r.id}` : '/requests',
    }));

  res.json({ success: true, data: items, timestamp: new Date() });
}));

router.put('/read-all', asyncHandler(async (req: Request, res: Response) => {
  const holderId = getHolderId(req);
  if (!holderId) return errorResponse(res, 403, 'No Odoo holder linked', 'NO_HOLDER');
  const all = loadJson(READ_FILE);
  const key = String(holderId);
  all[key] = all[key] || {};
  (req.body?.ids || []).forEach((id: string) => { all[key][id] = true; });
  // also mark by notification id+state when full objects sent
  (req.body?.entries || []).forEach((e: string) => { all[key][e] = true; });
  saveJson(READ_FILE, all);
  res.json({ success: true, data: { message: 'Marked read' }, timestamp: new Date() });
}));

// ===== Per-holder notification settings =====
const DEFAULT_SETTINGS = {
  pushEnabled: true,
  statusChanges: true,
  approvals: true,
  balanceAlerts: true,
};

router.get('/settings', asyncHandler(async (req: Request, res: Response) => {
  const holderId = getHolderId(req);
  if (!holderId) return errorResponse(res, 403, 'No Odoo holder linked', 'NO_HOLDER');
  const s = { ...DEFAULT_SETTINGS, ...(loadJson(SETTINGS_FILE)[String(holderId)] || {}) };
  res.json({ success: true, data: s, timestamp: new Date() });
}));

const settingsSchema = Joi.object({
  pushEnabled: Joi.boolean().optional(),
  statusChanges: Joi.boolean().optional(),
  approvals: Joi.boolean().optional(),
  balanceAlerts: Joi.boolean().optional(),
});

router.put('/settings', validate(settingsSchema), asyncHandler(async (req: Request, res: Response) => {
  const holderId = getHolderId(req);
  if (!holderId) return errorResponse(res, 403, 'No Odoo holder linked', 'NO_HOLDER');
  const all = loadJson(SETTINGS_FILE);
  const key = String(holderId);
  all[key] = { ...DEFAULT_SETTINGS, ...(all[key] || {}), ...req.body };
  saveJson(SETTINGS_FILE, all);
  res.json({ success: true, data: all[key], timestamp: new Date() });
}));

export default router;
