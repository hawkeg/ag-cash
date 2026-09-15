import crypto from 'crypto';
import fs from 'fs';
import path from 'path';

// PIN store: scrypt-hashed PINs per Odoo holder, persisted to data/pins.json.
// Lockout: 5 failed attempts -> 15 minute lock, tracked in memory.

const DATA_DIR = path.join(__dirname, '..', '..', 'data');
const FILE = path.join(DATA_DIR, 'pins.json');
const MAX_ATTEMPTS = 5;
const LOCK_MS = 15 * 60 * 1000;

interface PinEntry { salt: string; hash: string; }
type PinMap = Record<string, PinEntry>;

const attempts = new Map<number, { count: number; lockedUntil: number }>();

const load = (): PinMap => {
  try { return JSON.parse(fs.readFileSync(FILE, 'utf8')); } catch { return {}; }
};

const save = (data: PinMap) => {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  fs.writeFileSync(FILE, JSON.stringify(data, null, 2));
};

const hashPin = (pin: string, salt: string): string =>
  crypto.scryptSync(pin, salt, 32).toString('hex');

export const hasPin = (holderId: number): boolean => Boolean(load()[String(holderId)]);

export const setPin = (holderId: number, pin: string): void => {
  const data = load();
  const salt = crypto.randomBytes(16).toString('hex');
  data[String(holderId)] = { salt, hash: hashPin(pin, salt) };
  save(data);
  attempts.delete(holderId);
};

export const verifyPin = (holderId: number, pin: string): { ok: boolean; lockedUntil?: number } => {
  const att = attempts.get(holderId);
  if (att?.lockedUntil && att.lockedUntil > Date.now()) {
    return { ok: false, lockedUntil: att.lockedUntil };
  }

  const entry = load()[String(holderId)];
  const ok = entry
    ? crypto.timingSafeEqual(Buffer.from(entry.hash, 'hex'), Buffer.from(hashPin(pin, entry.salt), 'hex'))
    : false;

  if (ok) {
    attempts.delete(holderId);
  } else {
    const count = (att?.count || 0) + 1;
    attempts.set(holderId, {
      count,
      lockedUntil: count >= MAX_ATTEMPTS ? Date.now() + LOCK_MS : 0,
    });
  }
  return { ok };
};

export const validPinFormat = (pin: unknown): pin is string =>
  typeof pin === 'string' && /^\d{4,6}$/.test(pin);
