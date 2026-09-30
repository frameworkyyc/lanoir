import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { resolveStock } from '../src/lib/commerce/square/inventory.ts';
import type { SquareCatalogObject } from '../src/lib/commerce/square/types.ts';

const L = 'LOC1';
const v = (data: NonNullable<SquareCatalogObject['item_variation_data']>): SquareCatalogObject => ({
  type: 'ITEM_VARIATION', id: 'V1', item_variation_data: { pricing_type: 'FIXED_PRICING', price_money: { amount: 1000, currency: 'CAD' }, ...data },
});
const NOW = Date.parse('2026-09-30T12:00:00Z');

describe('inventory states', () => {
  it('untracked → available, no quantity', () => {
    const r = resolveStock(v({}), L, new Map());
    assert.deepEqual([r.availability, r.inventory], ['available', { tracked: false }]);
  });
  it('tracked with stock → available with quantity (decimals floored)', () => {
    const r = resolveStock(v({ track_inventory: true }), L, new Map([['V1', 2.9]]));
    assert.deepEqual([r.availability, r.inventory], ['available', { tracked: true, quantity: 2 }]);
  });
  it('tracked with no count row → sold out', () => {
    assert.equal(resolveStock(v({ track_inventory: true }), L, new Map()).availability, 'sold-out');
  });
  it('tracked with negative/zero count → sold out', () => {
    assert.equal(resolveStock(v({ track_inventory: true }), L, new Map([['V1', -4]])).availability, 'sold-out');
    assert.equal(resolveStock(v({ track_inventory: true }), L, new Map([['V1', 0]])).availability, 'sold-out');
  });
  it('location override can turn tracking ON or OFF', () => {
    const on = resolveStock(v({ location_overrides: [{ location_id: L, track_inventory: true }] }), L, new Map());
    assert.equal(on.availability, 'sold-out');
    const off = resolveStock(v({ track_inventory: true, location_overrides: [{ location_id: L, track_inventory: false }] }), L, new Map());
    assert.equal(off.availability, 'available');
  });
  it('overrides for OTHER locations are ignored', () => {
    const r = resolveStock(v({ location_overrides: [{ location_id: 'OTHER', sold_out: true }] }), L, new Map());
    assert.equal(r.availability, 'available');
  });
  it('merchant sold-out flag honours its expiry', () => {
    const future = v({ location_overrides: [{ location_id: L, sold_out: true, sold_out_valid_until: '2026-12-01T00:00:00Z' }] });
    const past = v({ location_overrides: [{ location_id: L, sold_out: true, sold_out_valid_until: '2026-01-01T00:00:00Z' }] });
    assert.equal(resolveStock(future, L, new Map(), () => NOW).availability, 'sold-out');
    assert.equal(resolveStock(past, L, new Map(), () => NOW).availability, 'available');
  });
  it('not sellable / variable pricing / no price → unavailable', () => {
    assert.equal(resolveStock(v({ sellable: false }), L, new Map()).availability, 'unavailable');
    assert.equal(resolveStock(v({ pricing_type: 'VARIABLE_PRICING' }), L, new Map()).availability, 'unavailable');
    assert.equal(resolveStock(v({ price_money: undefined }), L, new Map()).availability, 'unavailable');
  });
  it('string amounts (int64 as string) are parsed', () => {
    const r = resolveStock(v({ price_money: { amount: '2500', currency: 'CAD' } }), L, new Map());
    assert.deepEqual(r.price, { amount: 2500, currency: 'CAD' });
  });
});
