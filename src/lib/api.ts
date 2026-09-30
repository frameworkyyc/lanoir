/**
 * Small helpers shared by the /api endpoints (server-side only).
 *  - same-origin only (the API exists for our own pages, not third parties)
 *  - bounded JSON bodies
 *  - never cached, never leaks provider details or secrets
 */
import { CommerceError } from './commerce/types.ts';

const MAX_BODY_BYTES = 8 * 1024;

export const json = (data: unknown, status = 200): Response =>
  new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' },
  });

/** Browsers always send Origin (or Sec-Fetch-Site) on same-origin fetch POSTs. */
export function assertSameOrigin(request: Request): void {
  const origin = request.headers.get('Origin');
  const expected = new URL(request.url).origin;
  const fetchSite = request.headers.get('Sec-Fetch-Site');
  const ok = origin ? origin === expected : fetchSite === 'same-origin';
  if (!ok) throw new CommerceError('invalid_request', 'Forbidden.', 403);
}

export async function readJsonBody(request: Request): Promise<unknown> {
  if (!(request.headers.get('Content-Type') ?? '').toLowerCase().includes('application/json')) {
    throw new CommerceError('invalid_request', 'Expected JSON.', 415);
  }
  const declared = Number(request.headers.get('Content-Length') ?? 0);
  if (declared > MAX_BODY_BYTES) throw new CommerceError('invalid_request', 'Request too large.', 413);
  const text = await request.text();
  if (text.length > MAX_BODY_BYTES) throw new CommerceError('invalid_request', 'Request too large.', 413);
  try {
    return JSON.parse(text);
  } catch {
    throw new CommerceError('invalid_request', 'Invalid JSON.', 400);
  }
}

/** Customer-safe error response. Server logs carry the code + Square error codes only (never tokens/headers). */
export function errorResponse(err: unknown): Response {
  if (err instanceof CommerceError) {
    if (err.status >= 500) console.error(`[commerce] ${err.code}`, JSON.stringify(err.detail ?? null));
    const issues = err.code === 'cart_invalid' ? (err.detail as { issues?: unknown } | undefined)?.issues : undefined;
    return json({ error: { code: err.code, message: err.message, ...(issues ? { issues } : {}) } }, err.status);
  }
  console.error('[commerce] unexpected error', err instanceof Error ? err.name : typeof err);
  return json({ error: { code: 'upstream_error', message: 'Something went wrong. Please try again.' } }, 500);
}
