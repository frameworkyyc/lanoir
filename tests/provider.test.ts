import assert from 'node:assert/strict';
import { beforeEach, describe, it } from 'node:test';
import { clearCache } from '../src/lib/commerce/square/cache.ts';
import { resolveSquareConfig } from '../src/lib/commerce/square/config.ts';
import { createSquareProvider } from '../src/lib/commerce/square/index.ts';
import { CommerceError } from '../src/lib/commerce/types.ts';
import { fakeSquare, LOCATION } from './fixtures/square.ts';

const env = { SQUARE_ENVIRONMENT: 'sandbox', SQUARE_LOCATION_ID: LOCATION, SQUARE_ACCESS_TOKEN: 'secret-token' };
const make = (opts: Parameters<typeof fakeSquare>[0] = {}, envOver: Record<string, string> = {}) => {
  const fake = fakeSquare(opts);
  const provider = createSquareProvider({ getConfig: () => resolveSquareConfig({ ...env, ...envOver }), fetchImpl: fake.fetchImpl, newIdempotencyKey: () => 'idem-fixed' });
  return { ...fake, provider };
};
const code = (c: string) => (e: unknown) => e instanceof CommerceError && e.code === c;

beforeEach(() => clearCache());

describe('Square provider (against a Square-shaped fake)', () => {
  it('loads catalogue + inventory and follows pagination', async () => {
    const { provider, calls } = make({ catalogPageSize: 5 });
    const products = await provider.getProducts();
    assert.equal(products.length, 8);
    assert.ok(calls.filter((c) => c.path === '/v2/catalog/list').length > 1, 'should page through the catalogue');
    const inv = calls.find((c) => c.path === '/v2/inventory/counts/batch-retrieve')!;
    assert.deepEqual(inv.body.location_ids, ['L0SZPKA80GMNA']);
    assert.ok(!inv.body.catalog_object_ids.includes('VAR_CANDLE'), 'untracked variations are not looked up');
  });
  it('filters by collection and featured flag; collections need no Square call', async () => {
    const { provider, calls } = make();
    assert.equal((await provider.getCollections()).length, 6);
    assert.equal(calls.length, 0);
    assert.deepEqual((await provider.getProducts({ featured: true })).map((p) => p.slug), ['pretty-poison-box-set']);
    assert.deepEqual((await provider.getProducts({ collection: 'mystic-minis' })).map((p) => p.name).sort(), ['Astrology Earrings', 'Mini Skull Charm']);
  });
  it('caches within the TTL (one upstream load for many reads)', async () => {
    const { provider, calls } = make();
    await provider.getProducts(); await provider.getProduct('pretty-poison-box-set'); await provider.quoteCart([{ variantId: 'VAR_BOX', quantity: 1 }]);
    assert.equal(calls.filter((c) => c.path === '/v2/catalog/list').length, 1);
  });
  it('an upstream failure is an error, NEVER an empty/sold-out catalogue', async () => {
    const { provider } = make({ failPaths: ['/v2/inventory'] });
    await assert.rejects(() => provider.getProducts(), code('upstream_error'));
  });
  it('misconfiguration fails closed without calling Square', async () => {
    const { provider, calls } = make({}, { SQUARE_ENVIRONMENT: '' });
    await assert.rejects(() => provider.getProducts(), code('not_configured'));
    assert.equal(calls.length, 0);
  });
  it('checkout: re-validates with FRESH data, then creates a payment link for variation ids', async () => {
    const { provider, calls } = make();
    await provider.getProducts(); // warm the cache
    const before = calls.filter((c) => c.path === '/v2/catalog/list').length;
    const res = await provider.createCheckout({ lines: [{ variantId: 'VAR_BOX', quantity: 2 }], expectedSubtotal: 13000 }, { origin: 'https://lanoir.example.com' });
    assert.equal(res.url, 'https://sandbox.square.link/u/abc123');
    assert.equal(calls.filter((c) => c.path === '/v2/catalog/list').length, before + 1, 'checkout must bypass the cache');
    const link = calls.find((c) => c.path === '/v2/online-checkout/payment-links')!;
    assert.deepEqual(link.body.order.line_items, [{ catalog_object_id: 'VAR_BOX', quantity: '2' }]);
    assert.equal(link.body.idempotency_key, 'idem-fixed');
  });
  it('checkout is refused (and Square is never asked to create a link) for sold-out / changed-price / unknown lines', async () => {
    const { provider, calls } = make();
    const origin = { origin: 'https://x.test' };
    await assert.rejects(() => provider.createCheckout({ lines: [{ variantId: 'VAR_TEE_S_PINK', quantity: 1 }] }, origin), code('cart_invalid'));
    await assert.rejects(() => provider.createCheckout({ lines: [{ variantId: 'VAR_NOPE123', quantity: 1 }] }, origin), code('cart_invalid'));
    await assert.rejects(() => provider.createCheckout({ lines: [{ variantId: 'VAR_BOX', quantity: 1 }], expectedSubtotal: 100 }, origin), code('price_changed'));
    await assert.rejects(() => provider.createCheckout({ lines: [{ variantId: 'VAR_BOX', quantity: 99 }] }, origin), code('cart_invalid'));
    assert.ok(!calls.some((c) => c.path === '/v2/online-checkout/payment-links'));
  });
  it('checkout with pickup disabled is refused', async () => {
    const { provider } = make();
    await assert.rejects(() => provider.createCheckout({ lines: [{ variantId: 'VAR_BOX', quantity: 1 }], fulfillment: 'pickup' }, { origin: 'https://x.test' }), code('fulfillment_disabled'));
  });
});
