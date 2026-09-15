import { describe, it, expect } from 'vitest';
import { statusToAction, buildLineVals } from '../controllers/requestController';
import { transValue, mapCategory, mapLine } from '../controllers/expenseController';
import { RequestStatus } from '../types';

describe('statusToAction', () => {
  it('maps SUBMITTED to action_submit', () => {
    expect(statusToAction[RequestStatus.SUBMITTED]).toBe('action_submit');
  });
  it('maps CANCELLED to action_cancel', () => {
    expect(statusToAction[RequestStatus.CANCELLED]).toBe('action_cancel');
  });
  it('maps DRAFT to action_draft', () => {
    expect(statusToAction[RequestStatus.DRAFT]).toBe('action_draft');
  });
  it('has no action for APPROVED', () => {
    expect(statusToAction[RequestStatus.APPROVED]).toBeUndefined();
  });
});

describe('buildLineVals', () => {
  const taxMap = new Map([[1, { taxIds: [33], accountId: 555 }]]);

  it('maps basic fields', () => {
    const v = buildLineVals({ description: 'fuel', amount: 50, categoryId: 1, vendorId: 7 }, taxMap);
    expect(v.name).toBe('fuel');
    expect(v.amount).toBe(50);
    expect(v.category_id).toBe(1);
    expect(v.partner_id).toBe(7);
    expect(v.with_vat).toBe(false);
    expect(v.tax_ids).toBeUndefined();
  });

  it('sets tax_ids from category when withVat', () => {
    const v = buildLineVals({ description: 'fuel', amount: 100, categoryId: 1, withVat: true }, taxMap);
    expect(v.with_vat).toBe(true);
    expect(v.tax_ids).toEqual([[6, 0, [33]]]);
  });

  it('omits tax_ids when category has none', () => {
    const v = buildLineVals({ description: 'x', amount: 10, categoryId: 99, withVat: true }, taxMap);
    expect(v.tax_ids).toBeUndefined();
  });

  it('passes invoice/vendor/receipt fields through', () => {
    const v = buildLineVals({
      description: 'd', amount: 1, invoiceDate: '2026-01-01',
      vendorVat: '300', vendorCr: '1010', receiptFile: 'QUJD', receiptFilename: 'r.jpg',
    }, new Map());
    expect(v.invoice_date).toBe('2026-01-01');
    expect(v.vendor_vat).toBe('300');
    expect(v.vendor_cr).toBe('1010');
    expect(v.receipt_file).toBe('QUJD');
    expect(v.receipt_filename).toBe('r.jpg');
  });
});

describe('transValue', () => {
  it('prefers Arabic translation', () => {
    expect(transValue({ en_US: 'Fuel', ar_001: 'محروقات' })).toBe('محروقات');
  });
  it('falls back to first value', () => {
    expect(transValue({ en_US: 'Fuel' })).toBe('Fuel');
  });
  it('passes strings through', () => {
    expect(transValue('ضيافة')).toBe('ضيافة');
  });
  it('handles falsy', () => {
    expect(transValue(false)).toBe('');
  });
});

describe('mapCategory', () => {
  it('maps requirement flags', () => {
    const c = mapCategory({ id: 5, name: 'Fuel', active: true, require_vendor: true, require_attachment: false });
    expect(c.odooCategoryId).toBe(5);
    expect(c.requireVendor).toBe(true);
    expect(c.requireAttachment).toBe(false);
    expect(c.isActive).toBe(true);
  });
});

describe('mapLine', () => {
  it('maps receipt to data URI', () => {
    const l = mapLine({ id: 9, request_id: [3, 'REQ'], name: 'x', amount: 10, amount_total: 11.5, receipt_file: 'QUJD', receipt_filename: 'a.png' });
    expect(l.id).toBe('9');
    expect(l.requestId).toBe('3');
    expect(l.amount).toBe(11.5);
    expect(l.receiptUrl).toBe('data:image/png;base64,QUJD');
  });
  it('omits receiptUrl when no file', () => {
    const l = mapLine({ id: 9, request_id: 3, name: 'x', amount: 10 });
    expect(l.receiptUrl).toBeUndefined();
  });
});
