import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { mulberry32, starField, particles, particleStyle } from '../src/lib/landing-fx.ts';

describe('landing atmosphere generators', () => {
  it('is deterministic: same seed, same sky (stable builds, no layout shuffle)', () => {
    assert.deepEqual(starField(60, 11), starField(60, 11));
    assert.notDeepEqual(starField(60, 11), starField(60, 12));
    const a = mulberry32(5), b = mulberry32(5);
    assert.deepEqual([a(), a(), a()], [b(), b(), b()]);
  });

  it('keeps stars inside the 1000×1000 field with radii in range', () => {
    const stars = starField(200, 3, [0.6, 1.9]);
    assert.equal(stars.length, 200);
    for (const s of stars) {
      assert.ok(s.x >= 0 && s.x <= 1000 && s.y >= 0 && s.y <= 1000);
      assert.ok(s.r >= 0.6 && s.r <= 1.9);
    }
  });

  it('builds particles within their ranges, pre-warmed with negative delays', () => {
    const range = { size: [2, 4.5], dur: [7, 14], drift: [-44, 44], alpha: [0.5, 0.95] } as const;
    const ps = particles(40, 5, { size: [...range.size], dur: [...range.dur], drift: [...range.drift], alpha: [...range.alpha] });
    assert.equal(ps.length, 40);
    for (const p of ps) {
      assert.ok(p.x >= 0 && p.x <= 100);
      assert.ok(p.size >= 2 && p.size <= 4.5);
      assert.ok(p.dur >= 7 && p.dur <= 14);
      assert.ok(p.drift >= -44 && p.drift <= 44);
      assert.ok(p.alpha >= 0.5 && p.alpha <= 0.95);
      assert.ok(p.delay <= 0 && p.delay >= -p.dur);
    }
  });

  it('emits only CSS custom properties for particle styling', () => {
    const [p] = particles(1, 1, { size: [2, 3], dur: [8, 9], drift: [-10, 10], alpha: [0.5, 0.6] });
    assert.match(particleStyle(p), /^--x:[\d.]+%;--d:-?[\d.]+s;--t:[\d.]+s;--s:[\d.]+px;--dr:-?\d+px;--a:[\d.]+$/);
  });
});
