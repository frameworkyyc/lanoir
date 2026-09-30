/**
 * Square configuration resolved from Worker environment variables.
 *
 * Design rules:
 *  - FAIL CLOSED. Nothing defaults to sandbox or production: SQUARE_ENVIRONMENT must be
 *    exactly "sandbox" or "production".
 *  - The access token is read only here, only on the server, and never logged or returned.
 *  - `message` on thrown errors is customer-safe; which variable is missing goes in `detail`
 *    (server logs only).
 */
import { CommerceError } from '../types.ts';

export type SquareEnvironment = 'sandbox' | 'production';

export interface RawSquareEnv {
  SQUARE_ENVIRONMENT?: string;
  SQUARE_LOCATION_ID?: string;
  SQUARE_ACCESS_TOKEN?: string;
  /** Not needed for Square-hosted checkout (only for Square's on-page card form). Optional. */
  SQUARE_APPLICATION_ID?: string;
  /** Optional. Pin a different Square API version (YYYY-MM-DD). */
  SQUARE_API_VERSION?: string;
  /** Optional. Seconds to cache catalogue+inventory at the edge (0–600). Default 30. */
  SQUARE_CACHE_SECONDS?: string;
  /** Optional. "true" enables pickup at checkout. Shipping is the default. */
  FULFILLMENT_PICKUP_ENABLED?: string;
  /** Local development ONLY: http://localhost… fixture server. Ignored/rejected otherwise. */
  SQUARE_API_BASE_URL?: string;
}

export interface SquareConfig {
  environment: SquareEnvironment;
  baseUrl: string;
  locationId: string;
  accessToken: string;
  applicationId?: string;
  apiVersion: string;
  cacheSeconds: number;
  fulfillment: { shipping: boolean; pickup: boolean };
}

/** Pinned so Square API changes never alter behaviour silently. Verify when upgrading. */
export const DEFAULT_SQUARE_API_VERSION = '2025-10-16';

const BASE_URLS: Record<SquareEnvironment, string> = {
  sandbox: 'https://connect.squareupsandbox.com',
  production: 'https://connect.squareup.com',
};

/** The known Sandbox location. A production config must never point at it. */
const KNOWN_SANDBOX_LOCATION_IDS = new Set(['L0SZPKA80GMNA']);

const fail = (detail: string): never => {
  throw new CommerceError('not_configured', 'The shop is temporarily unavailable.', 503, detail);
};

export function resolveSquareConfig(env: RawSquareEnv): SquareConfig {
  const environment = (env.SQUARE_ENVIRONMENT ?? '').trim().toLowerCase();
  if (environment !== 'sandbox' && environment !== 'production') {
    return fail('SQUARE_ENVIRONMENT must be "sandbox" or "production"');
  }

  const locationId = (env.SQUARE_LOCATION_ID ?? '').trim();
  if (!/^[A-Za-z0-9]{6,40}$/.test(locationId)) return fail('SQUARE_LOCATION_ID is missing or malformed');

  const accessToken = (env.SQUARE_ACCESS_TOKEN ?? '').trim();
  if (!accessToken) return fail('SQUARE_ACCESS_TOKEN is not set');

  if (environment === 'production' && KNOWN_SANDBOX_LOCATION_IDS.has(locationId)) {
    return fail('production environment is configured with a sandbox location id');
  }

  let baseUrl = BASE_URLS[environment];
  if (env.SQUARE_API_BASE_URL) {
    // Dev-only escape hatch for the local fixture server. It can never redirect a real token:
    // only sandbox mode, only http://localhost or 127.0.0.1.
    let url: URL | undefined;
    try { url = new URL(env.SQUARE_API_BASE_URL); } catch { /* handled below */ }
    const local = url && url.protocol === 'http:' && (url.hostname === 'localhost' || url.hostname === '127.0.0.1');
    if (environment !== 'sandbox' || !local || !url) return fail('SQUARE_API_BASE_URL is only allowed for sandbox + localhost');
    baseUrl = url.origin;
  }

  const version = (env.SQUARE_API_VERSION ?? '').trim();
  if (version && !/^\d{4}-\d{2}-\d{2}$/.test(version)) return fail('SQUARE_API_VERSION must be YYYY-MM-DD');

  const cacheRaw = env.SQUARE_CACHE_SECONDS?.trim();
  const cacheParsed = cacheRaw === undefined || cacheRaw === '' ? 30 : Number(cacheRaw);
  const cacheSeconds = Number.isFinite(cacheParsed) ? Math.min(600, Math.max(0, Math.floor(cacheParsed))) : 30;

  return {
    environment,
    baseUrl,
    locationId,
    accessToken,
    applicationId: env.SQUARE_APPLICATION_ID?.trim() || undefined,
    apiVersion: version || DEFAULT_SQUARE_API_VERSION,
    cacheSeconds,
    fulfillment: { shipping: true, pickup: env.FULFILLMENT_PICKUP_ENABLED?.trim().toLowerCase() === 'true' },
  };
}
