/**
 * The card's PUBLIC address: what the QR code, Share button, saved contact, canonical URL and
 * Open Graph URL point to. It comes ONLY from configuration:
 *
 *   CARD_PUBLIC_URL (Cloudflare variable)  →  falls back to `card.publicUrl` in src/config/card.ts
 *
 * It is deliberately NOT derived from the current hostname or from PUBLIC_ALLOW_INDEXING, so
 * staging, previews and local development all share the one permanent URL.
 */

/** Normalises a candidate card URL: https only, no query/hash/credentials, no trailing slash. */
export function normalizeCardUrl(raw: string): string | null {
  let u: URL;
  try {
    u = new URL(raw.trim());
  } catch {
    return null;
  }
  if (u.protocol !== 'https:' || u.username || u.password) return null;
  u.search = '';
  u.hash = '';
  if (u.pathname.length > 1) u.pathname = u.pathname.replace(/\/+$/, '');
  return u.href.replace(/\/$/, '') === u.origin ? u.origin : u.href;
}

/**
 * `configured` is CARD_PUBLIC_URL (may be unset/empty); `fallback` is the default in the card config.
 * An invalid CARD_PUBLIC_URL never breaks the page or prints a broken QR code: the default is used
 * and `onInvalid` is called so the problem is logged.
 */
export function resolveCardPublicUrl(configured: string | undefined, fallback: string, onInvalid?: (value: string) => void): string {
  const wanted = configured?.trim();
  if (wanted) {
    const ok = normalizeCardUrl(wanted);
    if (ok) return ok;
    onInvalid?.(wanted);
  }
  const safe = normalizeCardUrl(fallback);
  if (!safe) throw new Error(`card.publicUrl in src/config/card.ts must be an https URL (got "${fallback}")`);
  return safe;
}

/** Absolute URL of an asset on the same origin as the card's public URL (e.g. the preview image). */
export const sameOrigin = (cardUrl: string, path: string) => new URL(path, cardUrl).href;
