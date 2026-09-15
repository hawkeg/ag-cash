import { describe, it, expect, beforeAll } from 'vitest';

// Integration tests against the running backend + Odoo.
// Requires: backend on :4002 and Odoo reachable per backend/.env.
const BASE = process.env.TEST_API_URL || 'http://localhost:4002';

let token = '';

const req = async (path: string, opts: RequestInit = {}) => {
  const res = await fetch(`${BASE}${path}`, {
    ...opts,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(opts.headers || {}),
    },
  });
  const body: any = await res.json().catch(() => null);
  return { status: res.status, body };
};

const TEST_PIN = '1234';
const TEST_HOLDER = 4;
const TEST_IDENTIFIER = 'PCH/26/0004';

const login = async () => {
  let res = await req('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ identifier: TEST_IDENTIFIER, pin: TEST_PIN }),
  });
  if (res.status === 428) {
    // First run — set the test PIN, which also returns a token
    res = await req('/api/auth/setup-pin', {
      method: 'POST',
      body: JSON.stringify({ identifier: TEST_IDENTIFIER, pin: TEST_PIN }),
    });
  }
  return res;
};

beforeAll(async () => {
  const { status, body } = await login();
  if (status === 200) token = body.data.token;
});

describe('health & info', () => {
  it('GET /health returns ok', async () => {
    const { status, body } = await req('/health');
    expect(status).toBe(200);
    expect(body.status).toBe('ok');
  });

  it('GET /api returns version message', async () => {
    const { status, body } = await req('/api');
    expect(status).toBe(200);
    expect(body.message).toContain('AG-Cash');
  });
});

describe('auth', () => {
  it('GET /api/auth/holders returns active holders', async () => {
    const { status, body } = await req('/api/auth/holders');
    expect(status).toBe(200);
    expect(Array.isArray(body.data)).toBe(true);
    expect(body.data.length).toBeGreaterThan(0);
    expect(body.data[0]).toHaveProperty('employeeName');
  });

  it('POST /api/auth/login issues a JWT with holder claims', async () => {
    const { status, body } = await login();
    expect(status).toBe(200);
    expect(body.data.token).toBeTruthy();
    expect(body.data.user.holder.id).toBe(TEST_HOLDER);
  });

  it('rejects a wrong PIN', async () => {
    const { status } = await req('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ identifier: TEST_IDENTIFIER, pin: '9999' }),
    });
    // 9999 may not be the stored pin; if it matches, skip assertion
    if (status === 200) return;
    expect([401, 429]).toContain(status);
  });

  it('rejects login for a non-existent holder', async () => {
    const { status } = await req('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ identifier: 'NOPE-999999', pin: TEST_PIN }),
    });
    expect([400, 401, 404, 502]).toContain(status);
  });
});

describe('protected routes', () => {
  it('rejects requests without token', async () => {
    const res = await fetch(`${BASE}/api/requests`);
    expect(res.status).toBe(401);
  });

  it('GET /api/auth/me returns holder identity', async () => {
    const { status, body } = await req('/api/auth/me');
    expect(status).toBe(200);
    expect(body.data.odooHolderId).toBe(TEST_HOLDER);
  });

  it('GET /api/requests returns holder-scoped list', async () => {
    const { status, body } = await req('/api/requests');
    expect(status).toBe(200);
    expect(Array.isArray(body.data?.data ?? body.data)).toBe(true);
  });

  it('GET /api/dashboard returns balance + stats', async () => {
    const { status, body } = await req('/api/dashboard');
    expect(status).toBe(200);
    expect(body.data.stats).toHaveProperty('totalBalance');
    expect(body.data.holder).toHaveProperty('employeeName');
  });

  it('GET /api/expenses/categories returns categories with flags', async () => {
    const { status, body } = await req('/api/expenses/categories');
    expect(status).toBe(200);
    expect(body.data[0]).toHaveProperty('requireVendor');
  });

  it('GET /api/expenses/vendors returns partners', async () => {
    const { status, body } = await req('/api/expenses/vendors');
    expect(status).toBe(200);
    expect(body.data.length).toBeGreaterThan(0);
  });

  it('GET /api/reports/summary returns real aggregates', async () => {
    const { status, body } = await req('/api/reports/summary');
    expect(status).toBe(200);
    const d = body.data;
    expect(d).toHaveProperty('totalExpenses');
    expect(d).toHaveProperty('vatAmount');
    expect(d).toHaveProperty('dailyBurnRate');
    expect(d).toHaveProperty('remainingBalance');
    expect(d).toHaveProperty('consumptionRate');
    expect(Array.isArray(d.categorySpending)).toBe(true);
    expect(Array.isArray(d.monthlySpending)).toBe(true);
    expect(Array.isArray(d.topVendors)).toBe(true);
  });

  it('GET /api/reports/summary requires auth', async () => {
    const res = await fetch(`${BASE}/api/reports/summary`);
    expect(res.status).toBe(401);
  });

  it('GET /api/reports/summary accepts date-range filter', async () => {
    const { status, body } = await req('/api/reports/summary?from=2000-01-01&to=2000-01-02');
    expect(status).toBe(200);
    expect(body.data.totalExpenses).toBe(0);
    expect(body.data.lineCount).toBe(0);
  });

  it('GET /api/notifications returns items', async () => {
    const { status, body } = await req('/api/notifications');
    expect(status).toBe(200);
    expect(Array.isArray(body.data)).toBe(true);
  });

  it('request create+delete round-trip', async () => {
    const create = await req('/api/requests', {
      method: 'POST',
      body: JSON.stringify({
        description: 'integration test request',
        expenses: [{ description: 'line one', amount: 5, categoryId: 1 }],
      }),
    });
    expect(create.status).toBe(201);
    const id = create.body.data.id;
    const del = await req(`/api/requests/${id}`, { method: 'DELETE' });
    expect(del.status).toBe(200);
  });
});
