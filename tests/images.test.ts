import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { collections, FEATURED_CATEGORY } from '../src/config/collections.ts';
import { mapCatalog, type MapWarning } from '../src/lib/commerce/square/mapper.ts';
import type { SquareCatalogObject } from '../src/lib/commerce/square/types.ts';
import { cardStatus, priceLabel } from '../src/lib/format.ts';

const LOC = 'LTESTLOC001';
const img = (id: string, url?: string, extra: Partial<SquareCatalogObject> = {}): SquareCatalogObject =>
  ({ type: 'IMAGE', id, present_at_all_locations: true, image_data: url === undefined ? {} : { url }, ...extra });
const variation = (id: string, itemId: string, extra: Record<string, unknown> = {}, price: number | null = 5000): SquareCatalogObject => ({
  type: 'ITEM_VARIATION', id, present_at_location_ids: [LOC], present_at_all_locations: false,
  item_variation_data: { item_id: itemId, name: `V ${id}`, ordinal: 1, pricing_type: 'FIXED_PRICING', ...(price === null ? {} : { price_money: { amount: price, currency: 'CAD' } }), track_inventory: false, ...extra },
});
const item = (id: string, name: string, data: Record<string, unknown>, vars: SquareCatalogObject[]): SquareCatalogObject => ({
  type: 'ITEM', id, present_at_location_ids: [LOC], present_at_all_locations: false, created_at: '2025-01-01T00:00:00Z',
  item_data: { name, product_type: 'REGULAR', variations: vars, ...data },
});

const objects: SquareCatalogObject[] = [
  img('IMG_A', 'https://cdn.example/a.jpg'), img('IMG_B', 'https://cdn.example/b.jpg'), img('IMG_C', 'https://cdn.example/c.jpg'),
  img('IMG_GONE', 'https://cdn.example/gone.jpg', { is_deleted: true }), img('IMG_NOURL'), img('IMG_HTTP', 'http://insecure.example/x.jpg'),
  item('ONE', 'Single Image Item', { image_ids: ['IMG_A'] }, [variation('V1', 'ONE')]),
  item('MANY', 'Many Images Item', { image_ids: ['IMG_B', 'IMG_A', 'IMG_B'] }, [variation('V2', 'MANY')]),
  item('VARIMG', 'Variation Image Item', { image_ids: ['IMG_A'] }, [variation('V3a', 'VARIMG', { image_ids: ['IMG_C'] }), variation('V3b', 'VARIMG', { ordinal: 2 })]),
  item('NONE', 'No Image At All', {}, [variation('V4', 'NONE')]),
  item('BROKEN', 'Broken Image Refs', { image_ids: ['IMG_MISSING', 'IMG_GONE', 'IMG_NOURL', 'IMG_HTTP'] }, [variation('V5', 'BROKEN')]),
  item('ECOM', 'Online Url Fallback', { ecom_image_uris: ['https://online.example/e.jpg', 'http://nope.example/x.jpg'] }, [variation('V6', 'ECOM')]),
  item('NOPRICE', 'Price Lookup Failed', { image_ids: ['IMG_A'] }, [variation('V7', 'NOPRICE', {}, null)]),
  item('SOLD', 'Genuinely Sold Out', { image_ids: ['IMG_A'] }, [variation('V8', 'SOLD', { track_inventory: true })]),
  item('MULTI', 'Pretty Poison Collection', { image_ids: ['IMG_A'] }, [variation('V9a', 'MULTI', { name: 'Small' }), variation('V9b', 'MULTI', { name: 'Large', ordinal: 2 }, 8000)]),
  { type: 'CATEGORY', id: 'CAT1', present_at_all_locations: true, category_data: { name: 'After Dark' } },
  item('CATWINS', 'Pretty Poison Candle', { image_ids: ['IMG_A'], categories: [{ id: 'CAT1' }] }, [variation('V10', 'CATWINS')]),
];

const warnings: MapWarning[] = [];
const counts = new Map<string, number>([['V8', 0]]);
const products = mapCatalog(objects, counts, { locationId: LOC, collections, featuredCategory: FEATURED_CATEGORY, onWarn: (w) => warnings.push(w) });
const by = (name: string) => products.find((p) => p.name === name)!;

describe('Square images → product images', () => {
  it('lists every eligible product, with or without an image', () => {
    assert.equal(products.length, 10);
  });

  it('one image: used as the card image, alt is the product name', () => {
    const p = by('Single Image Item');
    assert.deepEqual(p.images, [{ src: 'https://cdn.example/a.jpg', alt: 'Single Image Item' }]);
  });

  it('multiple images keep Square display order, are de-duplicated and get numbered alt text', () => {
    const p = by('Many Images Item');
    assert.deepEqual(p.images.map((i) => i.src), ['https://cdn.example/b.jpg', 'https://cdn.example/a.jpg']);
    assert.deepEqual(p.images.map((i) => i.alt), ['Many Images Item — photo 1 of 2', 'Many Images Item — photo 2 of 2']);
  });

  it('variation-level images are included after the item images, and variations/ids are untouched', () => {
    const p = by('Variation Image Item');
    assert.deepEqual(p.images.map((i) => i.src), ['https://cdn.example/a.jpg', 'https://cdn.example/c.jpg']);
    assert.deepEqual(p.variants.map((v) => v.id), ['V3a', 'V3b']);
  });

  it('a product that genuinely has no image is still listed (the UI shows the branded fallback), with no warning', () => {
    const p = by('No Image At All');
    assert.deepEqual(p.images, []);
    assert.ok(!warnings.some((w) => w.itemId === 'NONE'));
  });

  it('unresolvable image references are skipped, reported by id only, and never hide the product', () => {
    const p = by('Broken Image Refs');
    assert.deepEqual(p.images, []);
    const codes = warnings.filter((w) => w.itemId === 'BROKEN').map((w) => w.code).sort();
    assert.deepEqual(codes, ['image-bad-url', 'image-deleted', 'image-missing', 'image-no-url', 'item-images-unresolved']);
    for (const w of warnings) assert.deepEqual(Object.keys(w).filter((k) => !['code', 'itemId', 'imageId'].includes(k)), []);
    assert.equal(p.variants[0].availability, 'available');
  });

  it('falls back to Square Online image URLs (https only) when no IMAGE object resolves', () => {
    assert.deepEqual(by('Online Url Fallback').images.map((i) => i.src), ['https://online.example/e.jpg']);
  });
});

describe('collections and availability', () => {
  it('an uncategorised item joins the collection named in its title; a Square category always wins', () => {
    assert.deepEqual(by('Pretty Poison Collection').collections, ['pretty-poison']);
    assert.deepEqual(by('Pretty Poison Candle').collections, ['after-dark']);
    assert.deepEqual(by('Single Image Item').collections, []);
  });

  it('a failed price lookup reads "Currently unavailable", never "Sold out", and never "$0"', () => {
    const p = by('Price Lookup Failed');
    assert.equal(p.variants[0].availability, 'unavailable');
    assert.deepEqual(cardStatus(p), { text: 'Currently unavailable', state: 'unavailable' });
  });

  it('tracked stock at zero is genuinely Sold out', () => {
    assert.deepEqual(cardStatus(by('Genuinely Sold Out')), { text: 'Sold out', state: 'sold-out' });
  });

  it('multi-variation price shows "From" and the Square variation ids are preserved', () => {
    const p = by('Pretty Poison Collection');
    assert.equal(priceLabel(p), 'From $50');
    assert.deepEqual(p.variants.map((v) => v.id), ['V9a', 'V9b']);
    assert.deepEqual(cardStatus(p), { text: 'From $50', state: 'available' });
  });
});
