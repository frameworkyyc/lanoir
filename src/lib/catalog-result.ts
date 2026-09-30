/**
 * Catalogue pages must never crash or show a blank/partial shop when Square is unreachable.
 * `settle` turns a failed load into `{ ok: false }` (logged server-side, without secrets) so the
 * page can render an on-brand error state with a 503 status and no caching.
 */
import type { AstroGlobal } from 'astro';
import { CommerceError } from './commerce/types.ts';

export type Loaded<T> = { ok: true; data: T } | { ok: false };

export async function settle<T>(promise: Promise<T>): Promise<Loaded<T>> {
  try {
    return { ok: true, data: await promise };
  } catch (err) {
    if (err instanceof CommerceError) console.error(`[catalog] ${err.code}`, JSON.stringify(err.detail ?? null));
    else console.error('[catalog] unexpected error', err instanceof Error ? err.name : typeof err);
    return { ok: false };
  }
}

/** Marks the current SSR response as "shop unavailable": 503 and never cached. */
export function markUnavailable(astro: Pick<AstroGlobal, 'response'>) {
  astro.response.status = 503;
  astro.response.headers.set('Cache-Control', 'no-store');
  astro.response.headers.set('Retry-After', '30');
}
