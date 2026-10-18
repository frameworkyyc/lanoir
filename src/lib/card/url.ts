/**
 * The address this card shares (QR code, Share button, saved contact, link-preview tags).
 *  - production: ALWAYS the permanent public URL, even if the page was opened via another host
 *  - staging / local: the address the page was actually opened on, so testing never sends
 *    anyone to a production page that may not exist yet
 */
export function resolveCardUrl(opts: { requestUrl: string; isProduction: boolean; productionUrl: string; path?: string }): string {
  if (opts.isProduction) return new URL(opts.productionUrl).href;
  const u = new URL(opts.requestUrl);
  return new URL(opts.path ?? '/card', u.origin).href;
}

/** Absolute URL of something under the same origin as the card (e.g. the preview image). */
export const sameOrigin = (cardUrl: string, path: string) => new URL(path, cardUrl).href;
