/**
 * Minimal Square REST client (plain fetch — no SDK). Server-side only.
 *
 * Errors are normalised to CommerceError('upstream_error') with a customer-safe message.
 * Only Square's error category/code/field are kept in `detail` (for server logs); request
 * headers, the access token and request bodies are never attached to an error.
 */
import { CommerceError } from '../types.ts';
import type { SquareConfig } from './config.ts';

export type FetchLike = (input: string, init?: RequestInit) => Promise<Response>;

export interface SquareRequest {
  method?: 'GET' | 'POST';
  query?: Record<string, string | undefined>;
  body?: unknown;
  /** Safe to repeat (reads, or writes with an idempotency key): allows one retry on 429/5xx/network. */
  retry?: boolean;
  timeoutMs?: number;
}

export interface SquareErrorSummary { category?: string; code?: string; field?: string }

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export async function squareRequest<T>(
  config: SquareConfig,
  path: string,
  req: SquareRequest = {},
  fetchImpl: FetchLike = (u, i) => fetch(u, i),
): Promise<T> {
  const url = new URL(path, config.baseUrl);
  for (const [k, v] of Object.entries(req.query ?? {})) if (v !== undefined) url.searchParams.set(k, v);

  const attempts = req.retry ? 2 : 1;
  let lastError: CommerceError | undefined;

  for (let attempt = 0; attempt < attempts; attempt++) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), req.timeoutMs ?? 8000);
    try {
      const res = await fetchImpl(url.toString(), {
        method: req.method ?? 'GET',
        headers: {
          Authorization: `Bearer ${config.accessToken}`,
          'Square-Version': config.apiVersion,
          Accept: 'application/json',
          ...(req.body !== undefined ? { 'Content-Type': 'application/json' } : {}),
        },
        body: req.body !== undefined ? JSON.stringify(req.body) : undefined,
        signal: controller.signal,
      });

      if (res.ok) return (await res.json()) as T;

      let summaries: SquareErrorSummary[] = [];
      try {
        const data = (await res.json()) as { errors?: SquareErrorSummary[] };
        summaries = (data.errors ?? []).map((e) => ({ category: e.category, code: e.code, field: e.field }));
      } catch { /* non-JSON error body */ }

      lastError = new CommerceError(
        'upstream_error',
        'We could not reach the shop right now. Please try again.',
        res.status === 401 || res.status === 403 ? 503 : 502,
        { status: res.status, errors: summaries },
      );
      const transient = res.status === 429 || res.status >= 500;
      if (!transient) break;
    } catch (cause) {
      lastError = new CommerceError('upstream_error', 'We could not reach the shop right now. Please try again.', 502, {
        network: cause instanceof Error ? cause.name : 'unknown',
      });
    } finally {
      clearTimeout(timer);
    }
    if (attempt + 1 < attempts) await sleep(300);
  }
  throw lastError!;
}
