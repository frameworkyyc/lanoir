/**
 * The ONE place that decides how a remote (Square CDN) image URL becomes an <img src>.
 *
 * Today: Square's files are served directly, unmodified, with no resizing.
 * To introduce Cloudflare Image Transformations later, change ONLY these two functions, e.g.
 *   imageSrc(url, { width }) → `/cdn-cgi/image/width=${width},format=auto,fit=cover/${url}`
 * and have imageSrcset return a width-descriptor list. Nothing in the commerce layer changes.
 */
export interface ImageOptions {
  /** Desired rendered width in CSS px, for when transformations exist. */
  width?: number;
}

export function imageSrc(url: string, _opts: ImageOptions = {}): string {
  return url;
}

/** Undefined = "no srcset" (single untransformed file). */
export function imageSrcset(_url: string, _widths: number[]): string | undefined {
  return undefined;
}
