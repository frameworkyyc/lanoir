/**
 * THE ONLY FILE THAT KNOWS HOW THE LOGO ASSET IS CONSTRUCTED.
 *
 * Today: the supplied raster (1920×1080, charcoal ground baked in). It is never
 * modified — we only *display* the region that contains the artwork plus the
 * Brand System's 10% clear space, on the approved Logo Charcoal ground.
 *
 * When a transparent PNG or SVG master arrives:
 *   1. drop it in src/assets/brand/
 *   2. change the import below
 *   3. set `crop` to `null`
 * Layouts stay untouched because they only use <Logo />.
 */
import src from '~/assets/brand/logo-original.png';
import iconSrc from '~/assets/brand/logo-icon.png';

export const logo = {
  src,
  alt: 'LaNoir — Bad Ass Witchery',
  /** Ground the raster was designed on (Brand System: Logo Charcoal). */
  ground: '#343131',
  /**
   * Visible window into the source image, in source pixels.
   * Artwork bounds measured: x 511–1349, y 182–966 (838×784).
   * Window = artwork + 10% of artwork width (84px) clear space each side.
   */
  crop: { x: 427, y: 98, w: 1006, h: 952, sourceW: 1920, sourceH: 1080 } as
    | { x: number; y: number; w: number; h: number; sourceW: number; sourceH: number }
    | null,
  /** Brand System minimum for full artwork on screen. */
  minWidthPx: 320,
};

/**
 * LN monogram — the icon version of the logo, for SMALL placements only
 * (header, mobile menu, favicon). The full logo above stays the master for
 * everything large (footer, packaging, social). Never use both together in one lockup.
 *
 * The supplied file is an opaque PNG on pure black. We never edit it: on dark
 * surfaces it is displayed with `mix-blend-mode: screen`, which makes the black
 * vanish. When a transparent PNG/SVG arrives, swap `src` and set `blend: false`.
 */
export const logoIcon = {
  src: iconSrc,
  alt: 'LaNoir — Bad Ass Witchery',
  /** True while the asset has a black ground that must be blended away (dark surfaces only). */
  blend: true,
};
