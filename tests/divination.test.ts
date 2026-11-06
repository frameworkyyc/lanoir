import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { divination as d, meetPullQuote } from '../src/config/divination.ts';

const allCopy = (): string[] => [
  d.title, d.description,
  d.hero.eyebrow, d.hero.headline, d.hero.support, d.hero.intro,
  d.meet.heading, ...d.meet.paragraphs,
  ...d.services.flatMap((s) => [s.title, ...s.paragraphs]),
  d.approach.heading, d.approach.lead, d.approach.closing,
  d.ethics.eyebrow, d.ethics.heading, d.ethics.intro,
  ...d.ethics.groups.flatMap((g) => [g.title, ...g.items]),
  d.closing.headline, d.closing.support, d.closing.enquire,
];

describe('/divination copy (confirmed content only)', () => {
  it('has the confirmed hero lines verbatim', () => {
    assert.equal(d.hero.eyebrow, 'Divination by LaNoir');
    assert.equal(d.hero.headline, 'Love Beyond the Veil.');
    assert.equal(d.hero.support, 'Where Spirit Speaks and Intuition Leads.');
    assert.equal(d.hero.intro, 'Intuitive readings for clarity, reflection and guidance through Lenormand, pendulum dowsing, mediumship and spirit scribing.');
  });

  it('has Meet Cindy as four paragraphs, and the two services with the confirmed titles', () => {
    assert.equal(d.meet.heading, 'Meet Cindy');
    assert.equal(d.meet.paragraphs.length, 4);
    assert.deepEqual(d.services.map((s) => s.title), ['Lenormand Readings', 'Mediumship & Spirit Scribing']);
    assert.deepEqual(d.services.map((s) => s.paragraphs.length), [2, 2]);
    assert.ok(d.services[0].paragraphs[0].includes('La Santa Muerte Lenormand deck'));
    assert.ok(d.services[1].paragraphs[1].includes('a specific connection or message cannot be guaranteed'));
  });

  it('has the approach and the five ethics groups, with the confirmed bullet counts', () => {
    assert.equal(d.approach.heading, 'A Practice Rooted in Respect');
    assert.equal(d.approach.closing, 'Readings explore possibilities. They do not determine your future or replace your own judgment.');
    assert.equal(d.ethics.heading, 'Ethics & Sacred Practice');
    assert.deepEqual(d.ethics.groups.map((g) => g.title), ['Honesty', 'Client Autonomy', 'Emotional Safety', 'Confidentiality', 'Professional Boundaries']);
    assert.deepEqual(d.ethics.groups.map((g) => g.items.length), [3, 3, 3, 2, 2]);
  });

  it('uses "Sacred Laws" only as a decorative subtitle and never calls this a privacy policy', () => {
    assert.equal(d.ethics.eyebrow, 'Sacred Laws');
    for (const t of allCopy()) assert.ok(!/privacy policy/i.test(t), t);
  });

  it('adds nothing that was not confirmed: no prices, durations, booking claims, credentials or placeholders', () => {
    const banned = [/\$\s?\d/, /\bCAD\b|\bUSD\b/, /\bper (hour|session)\b/i, /\b\d+\s?(min|minutes|hours?)\b/i, /book (now|online|a session)/i, /\bcertified\b|\bcertification\b|\bdegree\b/i, /\b\d+\+? years\b/i, /being finalised|coming soon|lorem/i];
    for (const t of allCopy()) for (const re of banned) assert.ok(!re.test(t), `"${t}" matches ${re}`);
  });

  it('metadata uses only the confirmed claim', () => {
    assert.equal(d.path, '/divination');
    assert.equal(d.description, d.hero.intro);
    assert.ok(d.title.includes('Love Beyond the Veil'));
  });

  it('pull quote is lifted verbatim from the biography (nothing new is written)', () => {
    const bio = d.meet.paragraphs.join(' ');
    assert.ok(bio.toLowerCase().includes(meetPullQuote.toLowerCase()), meetPullQuote);
    assert.equal(meetPullQuote, 'A welcoming, respectful and meaningful experience guided by intuition, compassion and an open heart.');
  });

  it('timeline labels come from the existing Lenormand copy (three months; six-to-nine months)', () => {
    const [near, far] = d.services[0].timeline!;
    assert.equal(near, '3 months');
    assert.equal(far, '6–9 months');
    assert.ok(/three months/.test(d.services[0].paragraphs[0]) && /six-to-nine-month/.test(d.services[0].paragraphs[0]));
    assert.equal(d.services[1].timeline, undefined);
  });
});
