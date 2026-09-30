import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { DEFAULT_SQUARE_API_VERSION, resolveSquareConfig } from '../src/lib/commerce/square/config.ts';
import { CommerceError } from '../src/lib/commerce/types.ts';
import { squareRequest } from '../src/lib/commerce/square/client.ts';
import { fakeSquare, LOCATION } from './fixtures/square.ts';

const base = { SQUARE_ENVIRONMENT: 'sandbox', SQUARE_LOCATION_ID: LOCATION, SQUARE_ACCESS_TOKEN: 'secret-token' };
const notConfigured = (env: Record<string, string | undefined>) =>
  assert.throws(() => resolveSquareConfig(env), (e: unknown) => e instanceof CommerceError && e.code === 'not_configured' && e.status === 503);

describe('Sandbox / Production configuration', () => {
  it('sandbox and production resolve to different Square hosts', () => {
    assert.equal(resolveSquareConfig(base).baseUrl, 'https://connect.squareupsandbox.com');
    const prod = resolveSquareConfig({ ...base, SQUARE_ENVIRONMENT: 'production', SQUARE_LOCATION_ID: 'LPRODLOC1234' });
    assert.equal(prod.baseUrl, 'https://connect.squareup.com');
    assert.equal(prod.environment, 'production');
  });
  it('FAILS CLOSED: nothing defaults to sandbox or production', () => {
    notConfigured({ ...base, SQUARE_ENVIRONMENT: undefined });
    notConfigured({ ...base, SQUARE_ENVIRONMENT: '' });
    notConfigured({ ...base, SQUARE_ENVIRONMENT: 'staging' });
    notConfigured({ ...base, SQUARE_LOCATION_ID: undefined });
    notConfigured({ ...base, SQUARE_LOCATION_ID: 'bad id!' });
    notConfigured({ ...base, SQUARE_ACCESS_TOKEN: undefined });
    notConfigured({ ...base, SQUARE_ACCESS_TOKEN: '   ' });
  });
  it('production can never be paired with the Sandbox location id', () => {
    notConfigured({ ...base, SQUARE_ENVIRONMENT: 'production' }); // base uses the sandbox location
  });
  it('the environment value is case/whitespace tolerant', () => {
    assert.equal(resolveSquareConfig({ ...base, SQUARE_ENVIRONMENT: ' Sandbox ' }).environment, 'sandbox');
  });
  it('application id is optional; version + cache have safe defaults', () => {
    const c = resolveSquareConfig(base);
    assert.equal(c.applicationId, undefined);
    assert.equal(c.apiVersion, DEFAULT_SQUARE_API_VERSION);
    assert.equal(c.cacheSeconds, 30);
    assert.equal(resolveSquareConfig({ ...base, SQUARE_CACHE_SECONDS: '9999' }).cacheSeconds, 600);
    assert.equal(resolveSquareConfig({ ...base, SQUARE_CACHE_SECONDS: '0' }).cacheSeconds, 0);
    notConfigured({ ...base, SQUARE_API_VERSION: 'latest' });
  });
  it('pickup is off unless explicitly enabled; shipping is on', () => {
    assert.deepEqual(resolveSquareConfig(base).fulfillment, { shipping: true, pickup: false });
    assert.equal(resolveSquareConfig({ ...base, FULFILLMENT_PICKUP_ENABLED: 'true' }).fulfillment.pickup, true);
  });
  it('base-URL override is only honoured for sandbox + localhost (a real token can never be redirected)', () => {
    assert.equal(resolveSquareConfig({ ...base, SQUARE_API_BASE_URL: 'http://localhost:4010' }).baseUrl, 'http://localhost:4010');
    notConfigured({ ...base, SQUARE_API_BASE_URL: 'https://evil.example.com' });
    notConfigured({ ...base, SQUARE_API_BASE_URL: 'http://evil.localhost.attacker.com' });
    notConfigured({ ...base, SQUARE_ENVIRONMENT: 'production', SQUARE_LOCATION_ID: 'LPRODLOC1234', SQUARE_API_BASE_URL: 'http://localhost:4010' });
  });
  it('error messages are customer-safe and never contain the token', () => {
    try { resolveSquareConfig({ ...base, SQUARE_LOCATION_ID: undefined }); assert.fail(); } catch (e) {
      assert.ok(e instanceof CommerceError);
      assert.ok(!e.message.includes('secret-token') && !String(e.detail).includes('secret-token'));
      assert.equal(e.message, 'The shop is temporarily unavailable.');
    }
  });
});

describe('Square client', () => {
  it('sends bearer auth and the pinned Square-Version to the configured host', async () => {
    const { fetchImpl, calls } = fakeSquare();
    await squareRequest(resolveSquareConfig(base), '/v2/catalog/list', { query: { types: 'ITEM' } }, fetchImpl);
    assert.equal(calls[0].headers.Authorization, 'Bearer secret-token');
    assert.equal(calls[0].headers['Square-Version'], DEFAULT_SQUARE_API_VERSION);
  });
  it('upstream errors never leak the token, request headers or Square detail text', async () => {
    const { fetchImpl } = fakeSquare({ failPaths: ['/v2/catalog'] });
    await assert.rejects(
      () => squareRequest(resolveSquareConfig(base), '/v2/catalog/list', {}, fetchImpl),
      (e: unknown) => {
        assert.ok(e instanceof CommerceError);
        const dump = JSON.stringify({ m: e.message, d: e.detail, s: e.stack });
        assert.equal(e.code, 'upstream_error');
        assert.ok(!dump.includes('secret-token'), 'token leaked');
        assert.ok(!dump.includes('secret-ish detail'), 'Square detail text leaked');
        assert.deepEqual((e.detail as { errors: unknown[] }).errors, [{ category: 'API_ERROR', code: 'INTERNAL_SERVER_ERROR', field: undefined }]);
        return true;
      },
    );
  });
  it('retries once on transient failures when safe, but not otherwise', async () => {
    let n = 0;
    const flaky = async () => (++n === 1 ? new Response('{}', { status: 503 }) : new Response('{"ok":true}'));
    assert.deepEqual(await squareRequest(resolveSquareConfig(base), '/x', { retry: true }, flaky), { ok: true });
    n = 0;
    await assert.rejects(() => squareRequest(resolveSquareConfig(base), '/x', { retry: false }, flaky));
  });
  it('401/403 surface as 503 "shop unavailable" (bad credentials are a server problem, not the customer\'s)', async () => {
    const denied = async () => new Response('{"errors":[{"category":"AUTHENTICATION_ERROR","code":"UNAUTHORIZED"}]}', { status: 401 });
    await assert.rejects(() => squareRequest(resolveSquareConfig(base), '/x', {}, denied), (e: unknown) => e instanceof CommerceError && e.status === 503);
  });
});
