import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { collections, FEATURED_CATEGORY } from '../src/config/collections.ts';
import { assertCheckoutable, CART_LIMITS, parseCartLines, parseCheckoutRequest, quoteLines } from '../src/lib/commerce/cart.ts';
import { mapCatalog } from '../src/lib/commerce/square/mapper.ts';
import { CommerceError } from '../src/lib/commerce/types.ts';
import { catalogObjects, inventoryCounts, LOCATION } from './fixtures/square.ts';

const counts = new Map(inventoryCounts.filter((c) => c.location_id === LOCATION).map((c) => [c.catalog_object_id!, Number(c.quantity)]));
const products = mapCatalog(catalogObjects, counts, { locationId: LOCATION, collections, featuredCategory: FEATURED_CATEGORY });

const throwsCode = (fn: () => unknown, code: string) =>
  assert.throws(fn, (e: unknown) => e instanceof CommerceError && e.code === code, `expected ${code}`);

describe('cart input parsing (untrusted browser data)', () => {
  it('accepts valid lines and merges duplicates', () => {
    const lines = parseCartLines([{ variantId: 'VAR_BOX', quantity: 1 }, { variantId: 'VAR_BOX', quantity: 2 }, { variantId: 'VAR_CANDLE', quantity: 1 }]);
    assert.deepEqual(lines, [{ variantId: 'VAR_BOX', quantity: 3 }, { variantId: 'VAR_CANDLE', quantity: 1 }]);
  });
  it('rejects non-arrays, empty carts (unless allowed), too many lines', () => {
    throwsCode(() => parseCartLines({}), 'invalid_request');
    throwsCode(() => parseCartLines([]), 'invalid_request');
    assert.deepEqual(parseCartLines([], { allowEmpty: true }), []);
    const many = Array.from({ length: CART_LIMITS.maxLines + 1 }, (_, i) => ({ variantId: `VAR_${String(i).padStart(6, '0')}`, quantity: 1 }));
    throwsCode(() => parseCartLines(many), 'invalid_request');
  });
  it('rejects malformed ids and quantities', () => {
    for (const bad of [
      [{ variantId: '', quantity: 1 }], [{ variantId: 'x', quantity: 1 }], [{ variantId: 'VAR BOX', quantity: 1 }],
      [{ variantId: '../../etc/passwd', quantity: 1 }], [{ variantId: 'VAR_BOX', quantity: 0 }], [{ variantId: 'VAR_BOX', quantity: -1 }],
      [{ variantId: 'VAR_BOX', quantity: 1.5 }], [{ variantId: 'VAR_BOX', quantity: '2' }], [{ variantId: 'VAR_BOX', quantity: 1000 }],
      [{ variantId: 'VAR_BOX' }], [null], ['VAR_BOX'],
    ]) throwsCode(() => parseCartLines(bad), 'invalid_request');
  });
  it('ignores any price the browser tries to send (only id + quantity survive)', () => {
    const [line] = parseCartLines([{ variantId: 'VAR_BOX', quantity: 1, price: 1, unitPrice: { amount: 1 } }]);
    assert.deepEqual(line, { variantId: 'VAR_BOX', quantity: 1 });
  });
  it('checkout body: validates fulfillment + expectedSubtotal', () => {
    const ok = parseCheckoutRequest({ lines: [{ variantId: 'VAR_BOX', quantity: 1 }], fulfillment: 'shipping', expectedSubtotal: 6500 });
    assert.equal(ok.fulfillment, 'shipping');
    assert.equal(ok.expectedSubtotal, 6500);
    throwsCode(() => parseCheckoutRequest({ lines: [{ variantId: 'VAR_BOX', quantity: 1 }], fulfillment: 'drone' }), 'invalid_request');
    throwsCode(() => parseCheckoutRequest({ lines: [{ variantId: 'VAR_BOX', quantity: 1 }], expectedSubtotal: -5 }), 'invalid_request');
    throwsCode(() => parseCheckoutRequest({ lines: [{ variantId: 'VAR_BOX', quantity: 1 }], expectedSubtotal: '65' }), 'invalid_request');
    throwsCode(() => parseCheckoutRequest(null), 'invalid_request');
    throwsCode(() => parseCheckoutRequest([]), 'invalid_request');
  });
});

describe('cart quoting (server-side price + stock validation)', () => {
  it('prices lines from the catalogue and totals them', () => {
    const q = quoteLines([{ variantId: 'VAR_BOX', quantity: 2 }, { variantId: 'VAR_CANDLE', quantity: 1 }], products);
    assert.equal(q.canCheckout, true);
    assert.deepEqual(q.lines[0].unitPrice, { amount: 6500, currency: 'CAD' });
    assert.deepEqual(q.lines[0].lineTotal, { amount: 13000, currency: 'CAD' });
    assert.deepEqual(q.subtotal, { amount: 16800, currency: 'CAD' });
    assert.equal(q.lines[0].productName, 'Pretty Poison Box Set');
    assert.equal(q.lines[0].image?.src, 'https://items-images-sandbox.s3.us-west-2.amazonaws.com/box.jpg');
  });
  it('flags unknown variants without throwing', () => {
    const q = quoteLines([{ variantId: 'VAR_NOPE123', quantity: 1 }], products);
    assert.deepEqual(q.lines[0].issue, { code: 'not-found' });
    assert.equal(q.canCheckout, false);
    assert.equal(q.subtotal, null);
  });
  it('flags sold-out and unavailable variants', () => {
    const q = quoteLines([{ variantId: 'VAR_TEE_S_PINK', quantity: 1 }, { variantId: 'VAR_VARPRICE', quantity: 1 }, { variantId: 'VAR_EARRINGS', quantity: 1 }], products);
    assert.deepEqual(q.lines.map((l) => l.issue?.code), ['sold-out', 'unavailable', 'sold-out']);
    assert.equal(q.lines[0].maxQuantity, 0);
  });
  it('caps quantity by tracked stock and by the global per-line limit', () => {
    const tooMany = quoteLines([{ variantId: 'VAR_TEE_S_BLACK', quantity: 4 }], products); // only 3 in stock
    assert.deepEqual(tooMany.lines[0].issue, { code: 'insufficient-stock', available: 3 });
    assert.equal(tooMany.lines[0].maxQuantity, 3);
    const overCap = quoteLines([{ variantId: 'VAR_CANDLE', quantity: CART_LIMITS.maxQuantityPerLine + 1 }], products); // untracked
    assert.deepEqual(overCap.lines[0].issue, { code: 'insufficient-stock', available: CART_LIMITS.maxQuantityPerLine });
    const fine = quoteLines([{ variantId: 'VAR_TEE_S_BLACK', quantity: 3 }], products);
    assert.equal(fine.canCheckout, true);
  });
  it('subtotal counts only purchasable lines; canCheckout requires ALL lines fine', () => {
    const q = quoteLines([{ variantId: 'VAR_BOX', quantity: 1 }, { variantId: 'VAR_TEE_S_PINK', quantity: 1 }], products);
    assert.deepEqual(q.subtotal, { amount: 6500, currency: 'CAD' });
    assert.equal(q.canCheckout, false);
  });
  it('empty cart cannot check out', () => {
    const q = quoteLines([], products);
    assert.deepEqual([q.canCheckout, q.subtotal], [false, null]);
  });
});

describe('checkout gate', () => {
  it('rejects a cart with any bad line (cart_invalid, with per-line issues)', () => {
    const q = quoteLines([{ variantId: 'VAR_BOX', quantity: 1 }, { variantId: 'VAR_TEE_S_PINK', quantity: 1 }], products);
    assert.throws(() => assertCheckoutable(q), (e: unknown) => e instanceof CommerceError && e.code === 'cart_invalid' && e.status === 409);
  });
  it('rejects when the price changed since the customer saw it', () => {
    const q = quoteLines([{ variantId: 'VAR_BOX', quantity: 1 }], products);
    assertCheckoutable(q, 6500); // same → fine
    throwsCode(() => assertCheckoutable(q, 6000), 'price_changed');
  });
});
