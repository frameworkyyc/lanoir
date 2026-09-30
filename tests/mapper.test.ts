import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { collections, FEATURED_CATEGORY } from '../src/config/collections.ts';
import { mapCatalog, slugify, trackedVariationIds } from '../src/lib/commerce/square/mapper.ts';
import { catalogObjects, inventoryCounts, LOCATION } from './fixtures/square.ts';

const counts = new Map(inventoryCounts.filter((c) => c.location_id === LOCATION).map((c) => [c.catalog_object_id!, Number(c.quantity)]));
const products = mapCatalog(catalogObjects, counts, { locationId: LOCATION, collections, featuredCategory: FEATURED_CATEGORY });
const bySlug = (slug: string) => products.find((p) => p.slug === slug)!;
const byName = (name: string) => products.find((p) => p.name === name)!;

describe('Square → Product mapping', () => {
  it('excludes archived, deleted, other-location, absent, gift-card and variation-less items', () => {
    const names = products.map((p) => p.name);
    for (const hidden of ['Archived Thing', 'Deleted Thing', 'Other Location Only', 'Absent Here', 'Gift Card', 'No Variations At All']) {
      assert.ok(!names.includes(hidden), `${hidden} must not be listed`);
    }
    assert.equal(products.length, 8);
  });

  it('product WITHOUT variations: one variant, no options, no option groups', () => {
    const p = bySlug('after-dark-skull-candle');
    assert.equal(p.variants.length, 1);
    assert.deepEqual(p.variants[0].options, {});
    assert.deepEqual(p.optionGroups, []);
    assert.equal(p.variants[0].id, 'VAR_CANDLE'); // the Square catalog VARIATION id
    assert.deepEqual(p.variants[0].price, { amount: 3800, currency: 'CAD' });
  });

  it('size + colour options: option groups in merchant order, with hex swatches', () => {
    const p = bySlug('not-straight-not-sorry-tee');
    assert.deepEqual(p.optionGroups.map((g) => g.name), ['Size', 'Colour']);
    assert.deepEqual(p.optionGroups[0].values, [{ value: 'S' }, { value: 'M' }]);
    assert.deepEqual(p.optionGroups[1].values, [
      { value: 'Black', swatch: '#000000' },
      { value: 'Pink', swatch: '#E682B3' },
    ]);
    const v = p.variants.find((x) => x.id === 'VAR_TEE_S_BLACK')!;
    assert.deepEqual(v.options, { Size: 'S', Colour: 'Black' });
    assert.equal(v.title, 'S / Black');
  });

  it('several variations without item options become one "Option" group', () => {
    const p = bySlug('mini-skull-charm');
    assert.deepEqual(p.optionGroups, [{ name: 'Option', values: [{ value: 'Small' }, { value: 'Large' }] }]);
    assert.deepEqual(p.variants.map((v) => v.title), ['Small', 'Large']); // ordered by Square ordinal
  });

  it('inventory: tracked in-stock / tracked never-stocked / tracked zero / untracked', () => {
    const tee = bySlug('not-straight-not-sorry-tee');
    const v = (id: string) => tee.variants.find((x) => x.id === id)!;
    assert.deepEqual([v('VAR_TEE_S_BLACK').availability, v('VAR_TEE_S_BLACK').inventory], ['available', { tracked: true, quantity: 3 }]);
    assert.deepEqual([v('VAR_TEE_S_PINK').availability, v('VAR_TEE_S_PINK').available], ['sold-out', false]); // no count row
    assert.deepEqual([v('VAR_TEE_M_BLACK').availability, v('VAR_TEE_M_BLACK').inventory], ['sold-out', { tracked: true, quantity: 0 }]);
    assert.deepEqual([v('VAR_TEE_M_PINK').availability, v('VAR_TEE_M_PINK').inventory], ['available', { tracked: false }]);
    assert.deepEqual(v('VAR_TEE_M_PINK').price, { amount: 3600, currency: 'CAD' }); // per-variation price
  });

  it('merchant-marked sold out (location override) wins over stock on hand', () => {
    const v = byName('Astrology Earrings').variants[0];
    assert.equal(v.availability, 'sold-out');
    assert.equal(v.available, false);
  });

  it('location price override applies; an EXPIRED sold-out flag is ignored', () => {
    const v = byName('Moon Studs').variants[0];
    assert.deepEqual(v.price, { amount: 1200, currency: 'CAD' });
    assert.equal(v.availability, 'available');
  });

  it('variable-priced variation is unavailable (cannot be ordered by catalog id)', () => {
    const v = byName('Custom Piece').variants[0];
    assert.equal(v.availability, 'unavailable');
    assert.equal(v.available, false);
  });

  it('images: missing images → empty list; non-https urls dropped; caption used as alt', () => {
    assert.deepEqual(bySlug('after-dark-skull-candle').images, []);
    const box = bySlug('pretty-poison-box-set');
    assert.deepEqual(box.images, [{ src: 'https://items-images-sandbox.s3.us-west-2.amazonaws.com/box.jpg', alt: 'Box set on black' }]);
    // no caption → falls back to product name
    assert.equal(bySlug('not-straight-not-sorry-tee').images[0].alt, 'Not Straight Not Sorry Tee');
  });

  it('categories match collections case-insensitively; Featured sets the flag; unknown categories ignored', () => {
    assert.deepEqual(bySlug('after-dark-skull-candle').collections, ['after-dark']); // "after dark"
    assert.deepEqual(byName('Astrology Earrings').collections.sort(), ['accessories', 'mystic-minis']); // "MYSTIC MINIS"
    assert.deepEqual(bySlug('not-straight-not-sorry-tee').collections.sort(), ['pride-exclusive', 'statement-wear']);
    assert.equal(bySlug('pretty-poison-box-set').featured, true);
    assert.equal(bySlug('after-dark-skull-candle').featured, false);
    assert.ok(!products.some((p) => p.collections.includes('some-unrelated-category')));
  });

  it('slugs are unique and deterministic when names collide', () => {
    const boxes = products.filter((p) => p.name === 'Pretty Poison Box Set').map((p) => p.slug);
    assert.deepEqual(boxes, ['pretty-poison-box-set', 'pretty-poison-box-set-abcd']); // newest keeps the clean slug
    assert.equal(new Set(products.map((p) => p.slug)).size, products.length);
  });

  it('only tracked variations are queued for an inventory lookup', () => {
    const ids = trackedVariationIds(catalogObjects, LOCATION).sort();
    assert.deepEqual(ids, ['VAR_BOX', 'VAR_EARRINGS', 'VAR_TEE_M_BLACK', 'VAR_TEE_S_BLACK', 'VAR_TEE_S_PINK']);
  });

  it('descriptions are plain text (HTML stripped)', () => {
    const objs = structuredClone(catalogObjects);
    const box = objs.find((o) => o.id === 'ITEM_BOX')!;
    box.item_data!.description_plaintext = undefined;
    box.item_data!.description = '<p>Hello <script>alert(1)</script>world</p>';
    const p = mapCatalog(objs, counts, { locationId: LOCATION, collections, featuredCategory: FEATURED_CATEGORY }).find((x) => x.id === 'ITEM_BOX')!;
    assert.ok(!/[<>]/.test(p.description!));
  });
});

describe('slugify', () => {
  it('handles accents, symbols and empties', () => {
    assert.equal(slugify('Crème Brûlée & Co.'), 'creme-brulee-and-co');
    assert.equal(slugify('!!!'), 'item');
  });
});
