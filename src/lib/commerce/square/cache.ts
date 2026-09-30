/**
 * Two-tier cache for Square reads.
 *  1. In-isolate memory (always works, incl. *.workers.dev preview URLs where the Cache API is a no-op)
 *  2. Cloudflare Cache API (`caches.default`) — shared across requests in the same data centre
 * Concurrent misses for one key share a single upstream call (no stampede on Square).
 * Keys must include the Square environment + location so sandbox and production never mix.
 */
const memory = new Map<string, { expires: number; value: unknown }>();
const inflight = new Map<string, Promise<unknown>>();

const edge = (): Cache | undefined => (globalThis as { caches?: { default?: Cache } }).caches?.default;
const edgeUrl = (key: string) => `https://cache.lanoir.invalid/${encodeURIComponent(key)}`;

export async function cached<T>(
  key: string,
  ttlSeconds: number,
  loader: () => Promise<T>,
  opts: { fresh?: boolean; now?: () => number } = {},
): Promise<T> {
  const now = opts.now ?? Date.now;
  if (ttlSeconds <= 0) return loader();

  if (!opts.fresh) {
    const hit = memory.get(key);
    if (hit && hit.expires > now()) return hit.value as T;

    const cache = edge();
    if (cache) {
      try {
        const res = await cache.match(edgeUrl(key));
        if (res) {
          const value = (await res.json()) as T;
          memory.set(key, { expires: now() + ttlSeconds * 1000, value });
          return value;
        }
      } catch { /* cache is best-effort */ }
    }

    const pending = inflight.get(key);
    if (pending) return pending as Promise<T>;
  }

  const promise = (async () => {
    const value = await loader();
    memory.set(key, { expires: now() + ttlSeconds * 1000, value });
    const cache = edge();
    if (cache) {
      try {
        await cache.put(
          edgeUrl(key),
          new Response(JSON.stringify(value), {
            headers: { 'Content-Type': 'application/json', 'Cache-Control': `public, max-age=${ttlSeconds}` },
          }),
        );
      } catch { /* best-effort */ }
    }
    return value;
  })();

  inflight.set(key, promise);
  try {
    return await promise;
  } finally {
    inflight.delete(key);
  }
}

/** Test helper. */
export function clearCache() {
  memory.clear();
  inflight.clear();
}
