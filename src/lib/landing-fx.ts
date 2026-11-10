/**
 * Deterministic generators for the landing's atmosphere (stars, embers, motes). Seeded, so the
 * build output is stable and the layout never "shuffles" between deploys.
 */

/** Small, fast seeded PRNG (mulberry32). */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export interface Star { x: number; y: number; r: number }

/** Stars in a 1000×1000 box (the SVGs scale it with `slice`). Radii skew small, with a few larger. */
export function starField(count: number, seed: number, radius: [number, number] = [0.6, 1.9]): Star[] {
  const rand = mulberry32(seed);
  return Array.from({ length: count }, () => ({
    x: Math.round(rand() * 1000),
    y: Math.round(rand() * 1000),
    r: +(radius[0] + rand() ** 2.2 * (radius[1] - radius[0])).toFixed(2),
  }));
}

export interface Particle {
  /** Horizontal start, % of the container. */
  x: number;
  /** Negative delay (s): the field is already populated when it fades in. */
  delay: number;
  /** Duration (s). */
  dur: number;
  /** Size (px). */
  size: number;
  /** Horizontal drift (px) over the flight. */
  drift: number;
  /** Peak opacity. */
  alpha: number;
}

export interface ParticleRange { size: [number, number]; dur: [number, number]; drift: [number, number]; alpha: [number, number] }

export function particles(count: number, seed: number, r: ParticleRange): Particle[] {
  const rand = mulberry32(seed);
  const between = (lo: number, hi: number) => lo + rand() * (hi - lo);
  return Array.from({ length: count }, () => {
    const dur = +between(...r.dur).toFixed(1);
    return {
      x: Math.round(rand() * 100),
      delay: -+(rand() * dur).toFixed(1),
      dur,
      size: +between(...r.size).toFixed(1),
      drift: Math.round(between(...r.drift)),
      alpha: +between(...r.alpha).toFixed(2),
    };
  });
}

/** Inline style for a particle (CSS custom properties read by the stylesheet). */
export const particleStyle = (p: Particle) =>
  `--x:${p.x}%;--d:${p.delay}s;--t:${p.dur}s;--s:${p.size}px;--dr:${p.drift}px;--a:${p.alpha}`;
