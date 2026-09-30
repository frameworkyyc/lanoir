/**
 * THE ONLY FILE THAT KNOWS HOW THE LOGO ASSETS ARE BUILT.
 *
 * Masters (never modified) live in src/assets/brand/:
 *   logo-original.png  the full script logo (1920×1080 raster, charcoal ground baked in)
 *   logo-icon.png      the LN monogram (1283×1226, opaque on black)
 * `npm run brand-images` generates optimised WebP variants into public/brand/ — static files, so
 * server-rendered pages never need runtime image transformation.
 *
 * When a transparent PNG/SVG master arrives: replace the master, re-run `npm run brand-images`
 * (or point `variants` at the SVG), update the dimensions, set `crop: null` / `blend: false`.
 * Layouts stay untouched because they only use <Logo />.
 */

export interface LogoVariant { w: number; url: string }

export const logo = {
  variants: [480, 960, 1440, 1920].map((w) => ({ w, url: `/brand/logo-${w}.webp` })) as LogoVariant[],
  width: 1920,
  height: 1080,
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
 * (header, mobile menu, favicon). The full logo stays the master for everything large
 * (footer, packaging, social). Never use both together in one lockup.
 *
 * The supplied file is an opaque PNG on pure black. We never edit it: on dark surfaces it is
 * displayed with `mix-blend-mode: screen`, which makes the black vanish.
 */
export const logoIcon = {
  variants: [112, 168, 224, 336].map((w) => ({ w, url: `/brand/logo-icon-${w}.webp` })) as LogoVariant[],
  width: 1283,
  height: 1226,
  alt: 'LaNoir — Bad Ass Witchery',
  /** True while the asset has a black ground that must be blended away (dark surfaces only). */
  blend: true,
};
