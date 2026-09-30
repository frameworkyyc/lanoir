import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { buildPaymentLinkRequest, createPaymentLink } from '../src/lib/commerce/square/checkout.ts';
import { resolveSquareConfig } from '../src/lib/commerce/square/config.ts';
import { CommerceError } from '../src/lib/commerce/types.ts';
import { fakeSquare, LOCATION } from './fixtures/square.ts';

const config = (extra: Record<string, string> = {}) =>
  resolveSquareConfig({ SQUARE_ENVIRONMENT: 'sandbox', SQUARE_LOCATION_ID: LOCATION, SQUARE_ACCESS_TOKEN: 'TOKEN-SHOULD-NEVER-LEAK', ...extra });

const lines = [{ variantId: 'VAR_BOX', quantity: 2 }, { variantId: 'VAR_TEE_S_BLACK', quantity: 1 }];
const build = (over: object = {}) =>
  buildPaymentLinkRequest({ config: config(), lines, origin: 'https://lanoir.example.com', idempotencyKey: 'idem-1', ...over });

describe('checkout request creation', () => {
  it('uses Square catalog VARIATION ids as line items (so inventory is decremented)', () => {
    const body = build();
    assert.deepEqual(body.order.line_items, [
      { catalog_object_id: 'VAR_BOX', quantity: '2' },
      { catalog_object_id: 'VAR_TEE_S_BLACK', quantity: '1' },
    ]);
    assert.equal(body.order.location_id, LOCATION);
  });
  it('never sends prices, names or totals — Square prices the order from its catalogue', () => {
    const json = JSON.stringify(build());
    for (const forbidden of ['price', 'amount', 'base_price_money', 'name', 'total']) assert.ok(!json.includes(forbidden), `body must not contain "${forbidden}"`);
  });
  it('applies the taxes configured in Square (never computed by the site)', () => {
    assert.equal(build().order.pricing_options.auto_apply_taxes, true);
  });
  it('shipping is the default: Square collects the address; no shipping price is sent', () => {
    const body = build();
    assert.equal(body.checkout_options.ask_for_shipping_address, true);
    assert.ok(!JSON.stringify(body).includes('shipping_fee'));
  });
  it('pickup is wired but disabled by default, and can be enabled by config without a cart change', () => {
    assert.throws(() => build({ fulfillment: 'pickup' }), (e: unknown) => e instanceof CommerceError && e.code === 'fulfillment_disabled');
    const enabled = buildPaymentLinkRequest({ config: config({ FULFILLMENT_PICKUP_ENABLED: 'true' }), lines, fulfillment: 'pickup', origin: 'https://x.test', idempotencyKey: 'k' });
    assert.equal(enabled.checkout_options.ask_for_shipping_address, false);
  });
  it('redirects back to OUR /order-complete, derived from the server-known origin', () => {
    assert.equal(build().checkout_options.redirect_url, 'https://lanoir.example.com/order-complete');
  });
  it('carries the idempotency key and refuses an empty cart', () => {
    assert.equal(build().idempotency_key, 'idem-1');
    assert.throws(() => build({ lines: [] }), (e: unknown) => e instanceof CommerceError && e.code === 'invalid_request');
  });
});

describe('payment link call', () => {
  it('POSTs to the Payment Links API with bearer auth + pinned version, returns the Square URL', async () => {
    const { fetchImpl, calls } = fakeSquare();
    const url = await createPaymentLink(config(), build(), fetchImpl);
    assert.equal(url, 'https://sandbox.square.link/u/abc123');
    const call = calls[0];
    assert.deepEqual([call.method, call.path], ['POST', '/v2/online-checkout/payment-links']);
    assert.equal(call.headers.Authorization, 'Bearer TOKEN-SHOULD-NEVER-LEAK');
    assert.match(call.headers['Square-Version'], /^\d{4}-\d{2}-\d{2}$/);
    assert.ok(!JSON.stringify(call.body).includes('TOKEN')); // token only in the header, never the body
  });
  it('refuses to redirect to a non-Square or non-https checkout URL', async () => {
    for (const evil of ['https://evil.example.com/pay', 'http://sandbox.square.link/u/x', 'javascript:alert(1)', 'https://squareup.com.evil.io/x']) {
      const { fetchImpl } = fakeSquare({ paymentLinkUrl: evil });
      await assert.rejects(() => createPaymentLink(config(), build(), fetchImpl), (e: unknown) => e instanceof CommerceError && e.code === 'upstream_error', evil);
    }
  });
});
