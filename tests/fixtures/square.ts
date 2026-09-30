/**
 * Realistic Square API response fixtures (Sandbox-shaped), used by the unit tests AND by the
 * local fake Square server (scripts/fake-square.ts). Covers every catalogue case the
 * integration must handle. Nothing here is real LaNoir data.
 */
import type { SquareCatalogObject, SquareInventoryCount } from '../../src/lib/commerce/square/types.ts';

export const LOCATION = 'L0SZPKA80GMNA';
export const OTHER_LOCATION = 'LOTHERLOC99';
const CAD = 'CAD';
const at = (created: string) => ({ created_at: created, updated_at: created, present_at_all_locations: true });

const category = (id: string, name: string): SquareCatalogObject => ({ type: 'CATEGORY', id, category_data: { name } });
const image = (id: string, url: string, caption?: string): SquareCatalogObject => ({ type: 'IMAGE', id, image_data: { url, caption } });

const optionVal = (id: string, optionId: string, name: string, ordinal: number, color?: string): SquareCatalogObject => ({
  type: 'ITEM_OPTION_VAL', id, item_option_value_data: { item_option_id: optionId, name, ordinal, ...(color ? { color } : {}) },
});

function variation(id: string, itemId: string, name: string, priceCents: number | null, extra: Partial<NonNullable<SquareCatalogObject['item_variation_data']>> = {}, top: Partial<SquareCatalogObject> = {}): SquareCatalogObject {
  return {
    type: 'ITEM_VARIATION', id, present_at_all_locations: true,
    item_variation_data: {
      item_id: itemId, name, ordinal: 1, pricing_type: priceCents === null ? 'VARIABLE_PRICING' : 'FIXED_PRICING',
      ...(priceCents === null ? {} : { price_money: { amount: priceCents, currency: CAD } }),
      ...extra,
    },
    ...top,
  };
}

export const catalogObjects: SquareCatalogObject[] = [
  // ---- categories (mixed case on purpose: matching must be case-insensitive)
  category('CAT_PP', 'Pretty Poison'),
  category('CAT_AD', 'after dark'),
  category('CAT_MM', 'MYSTIC MINIS'),
  category('CAT_PRIDE', 'Pride Exclusive'),
  category('CAT_WEAR', 'Statement Wear'),
  category('CAT_ACC', 'Accessories / Jewelry'),
  category('CAT_FEAT', 'Featured'),
  category('CAT_OTHER', 'Some Unrelated Category'),

  image('IMG_BOX', 'https://items-images-sandbox.s3.us-west-2.amazonaws.com/box.jpg', 'Box set on black'),
  image('IMG_TEE', 'https://items-images-sandbox.s3.us-west-2.amazonaws.com/tee.jpg'),
  image('IMG_BAD', 'http://insecure.example.com/not-https.jpg'),

  // ---- item options: Size + Colour (with hex swatches)
  {
    type: 'ITEM_OPTION', id: 'OPT_SIZE',
    item_option_data: { name: 'Size', display_name: 'Size', values: [
      optionVal('VAL_S', 'OPT_SIZE', 'S', 1), optionVal('VAL_M', 'OPT_SIZE', 'M', 2),
    ] },
  },
  {
    type: 'ITEM_OPTION', id: 'OPT_COLOUR',
    item_option_data: { name: 'Colour', display_name: 'Colour', values: [
      optionVal('VAL_BLACK', 'OPT_COLOUR', 'Black', 1, '#000000'), optionVal('VAL_PINK', 'OPT_COLOUR', 'Pink', 2, '#E682B3'),
    ] },
  },

  // 1. No variations (single default variation), tracked, in stock, with image, Featured
  {
    type: 'ITEM', id: 'ITEM_BOX', ...at('2026-09-20T10:00:00Z'),
    item_data: {
      name: 'Pretty Poison Box Set', description_plaintext: 'A curated box set.', product_type: 'REGULAR',
      categories: [{ id: 'CAT_PP' }, { id: 'CAT_FEAT' }], image_ids: ['IMG_BOX', 'IMG_BAD'],
      variations: [variation('VAR_BOX', 'ITEM_BOX', 'Regular', 6500, { track_inventory: true })],
    },
  },

  // 2. Size x Colour variations; mixed inventory states
  {
    type: 'ITEM', id: 'ITEM_TEE', ...at('2026-09-19T10:00:00Z'),
    item_data: {
      name: 'Not Straight Not Sorry Tee', product_type: 'REGULAR',
      categories: [{ id: 'CAT_WEAR' }, { id: 'CAT_PRIDE' }], image_ids: ['IMG_TEE'],
      item_options: [{ item_option_id: 'OPT_SIZE' }, { item_option_id: 'OPT_COLOUR' }],
      variations: [
        // tracked, 3 in stock
        variation('VAR_TEE_S_BLACK', 'ITEM_TEE', 'S / Black', 3400, { ordinal: 1, track_inventory: true, item_option_values: [{ item_option_id: 'OPT_SIZE', item_option_value_id: 'VAL_S' }, { item_option_id: 'OPT_COLOUR', item_option_value_id: 'VAL_BLACK' }] }),
        // tracked, NO inventory count at all → sold out
        variation('VAR_TEE_S_PINK', 'ITEM_TEE', 'S / Pink', 3400, { ordinal: 2, track_inventory: true, item_option_values: [{ item_option_id: 'OPT_SIZE', item_option_value_id: 'VAL_S' }, { item_option_id: 'OPT_COLOUR', item_option_value_id: 'VAL_PINK' }] }),
        // tracked, count of exactly 0 → sold out
        variation('VAR_TEE_M_BLACK', 'ITEM_TEE', 'M / Black', 3400, { ordinal: 3, track_inventory: true, item_option_values: [{ item_option_id: 'OPT_SIZE', item_option_value_id: 'VAL_M' }, { item_option_id: 'OPT_COLOUR', item_option_value_id: 'VAL_BLACK' }] }),
        // NOT tracked → always available
        variation('VAR_TEE_M_PINK', 'ITEM_TEE', 'M / Pink', 3600, { ordinal: 4, item_option_values: [{ item_option_id: 'OPT_SIZE', item_option_value_id: 'VAL_M' }, { item_option_id: 'OPT_COLOUR', item_option_value_id: 'VAL_PINK' }] }),
      ],
    },
  },

  // 3. No images at all, untracked inventory, lower-case category match
  {
    type: 'ITEM', id: 'ITEM_CANDLE', ...at('2026-09-18T10:00:00Z'),
    item_data: {
      name: 'After Dark Skull Candle', product_type: 'REGULAR', categories: [{ id: 'CAT_AD' }],
      variations: [variation('VAR_CANDLE', 'ITEM_CANDLE', 'Regular', 3800)],
    },
  },

  // 4. Variable pricing → cannot be bought by catalog id
  {
    type: 'ITEM', id: 'ITEM_VARPRICE', ...at('2026-09-17T10:00:00Z'),
    item_data: { name: 'Custom Piece', product_type: 'REGULAR', variations: [variation('VAR_VARPRICE', 'ITEM_VARPRICE', 'Regular', null)] },
  },

  // 5. Location override: merchant-marked sold out, tracked
  {
    type: 'ITEM', id: 'ITEM_EARRINGS', ...at('2026-09-16T10:00:00Z'),
    item_data: {
      name: 'Astrology Earrings', product_type: 'REGULAR', categories: [{ id: 'CAT_MM' }, { id: 'CAT_ACC' }],
      variations: [variation('VAR_EARRINGS', 'ITEM_EARRINGS', 'Regular', 1800, { track_inventory: true, location_overrides: [{ location_id: LOCATION, sold_out: true }] })],
    },
  },

  // 6. Several variations but no item options → "Option" group built from variation names
  {
    type: 'ITEM', id: 'ITEM_CHARM', ...at('2026-09-15T10:00:00Z'),
    item_data: {
      name: 'Mini Skull Charm', product_type: 'REGULAR', categories: [{ id: 'CAT_MM' }],
      variations: [
        variation('VAR_CHARM_L', 'ITEM_CHARM', 'Large', 1600, { ordinal: 2 }),
        variation('VAR_CHARM_S', 'ITEM_CHARM', 'Small', 1400, { ordinal: 1 }),
      ],
    },
  },

  // 7. Location price override + expired "sold out" flag (expired flag must be ignored)
  {
    type: 'ITEM', id: 'ITEM_STUDS', ...at('2026-09-14T10:00:00Z'),
    item_data: {
      name: 'Moon Studs', product_type: 'REGULAR', categories: [{ id: 'CAT_ACC' }],
      variations: [variation('VAR_STUDS', 'ITEM_STUDS', 'Regular', 1000, { location_overrides: [{ location_id: LOCATION, price_money: { amount: 1200, currency: CAD }, sold_out: true, sold_out_valid_until: '2020-01-01T00:00:00Z' }] })],
    },
  },

  // 8. Same name as #1 → slug collision must be disambiguated deterministically
  {
    type: 'ITEM', id: 'ITEM_BOX2_ABCD', ...at('2026-09-01T10:00:00Z'),
    item_data: { name: 'Pretty Poison Box Set', product_type: 'REGULAR', categories: [{ id: 'CAT_PP' }], variations: [variation('VAR_BOX2', 'ITEM_BOX2_ABCD', 'Regular', 7000)] },
  },

  // ---- items that must NOT appear
  { type: 'ITEM', id: 'ITEM_ARCHIVED', ...at('2026-08-01T10:00:00Z'), item_data: { name: 'Archived Thing', is_archived: true, variations: [variation('VAR_ARCH', 'ITEM_ARCHIVED', 'Regular', 100)] } },
  { type: 'ITEM', id: 'ITEM_DELETED', ...at('2026-08-01T10:00:00Z'), is_deleted: true, item_data: { name: 'Deleted Thing', variations: [variation('VAR_DEL', 'ITEM_DELETED', 'Regular', 100)] } },
  { type: 'ITEM', id: 'ITEM_ELSEWHERE', created_at: '2026-08-01T10:00:00Z', present_at_all_locations: false, present_at_location_ids: [OTHER_LOCATION], item_data: { name: 'Other Location Only', variations: [variation('VAR_ELSE', 'ITEM_ELSEWHERE', 'Regular', 100)] } },
  { type: 'ITEM', id: 'ITEM_ABSENT', created_at: '2026-08-01T10:00:00Z', present_at_all_locations: true, absent_at_location_ids: [LOCATION], item_data: { name: 'Absent Here', variations: [variation('VAR_ABS', 'ITEM_ABSENT', 'Regular', 100)] } },
  { type: 'ITEM', id: 'ITEM_GIFT', ...at('2026-08-01T10:00:00Z'), item_data: { name: 'Gift Card', product_type: 'GIFT_CARD', variations: [variation('VAR_GIFT', 'ITEM_GIFT', 'Regular', 2500)] } },
  { type: 'ITEM', id: 'ITEM_NOVAR', ...at('2026-08-01T10:00:00Z'), item_data: { name: 'No Variations At All', variations: [] } },
];

/** What /v2/inventory/counts/batch-retrieve would return (IN_STOCK, this location). */
export const inventoryCounts: SquareInventoryCount[] = [
  { catalog_object_id: 'VAR_BOX', catalog_object_type: 'ITEM_VARIATION', state: 'IN_STOCK', location_id: LOCATION, quantity: '5' },
  { catalog_object_id: 'VAR_TEE_S_BLACK', catalog_object_type: 'ITEM_VARIATION', state: 'IN_STOCK', location_id: LOCATION, quantity: '3' },
  { catalog_object_id: 'VAR_TEE_M_BLACK', catalog_object_type: 'ITEM_VARIATION', state: 'IN_STOCK', location_id: LOCATION, quantity: '0' },
  // VAR_TEE_S_PINK deliberately has NO entry (tracked, never stocked)
  { catalog_object_id: 'VAR_EARRINGS', catalog_object_type: 'ITEM_VARIATION', state: 'IN_STOCK', location_id: LOCATION, quantity: '9' },
  { catalog_object_id: 'VAR_BOX', state: 'IN_STOCK', location_id: OTHER_LOCATION, quantity: '100' }, // other location: ignored
];

/**
 * A fetch() stand-in that behaves like Square: paginated catalogue list, inventory counts,
 * payment links. Records every call so tests can assert what was (and wasn't) sent.
 */
export interface FakeCall { method: string; path: string; headers: Record<string, string>; body?: any }

export function fakeSquare(opts: { catalogPageSize?: number; failPaths?: string[]; paymentLinkUrl?: string } = {}) {
  const calls: FakeCall[] = [];
  const pageSize = opts.catalogPageSize ?? 1000;

  const fetchImpl = async (input: string, init: RequestInit = {}): Promise<Response> => {
    const url = new URL(input);
    const headers = Object.fromEntries(Object.entries((init.headers ?? {}) as Record<string, string>));
    const body = init.body ? JSON.parse(String(init.body)) : undefined;
    calls.push({ method: init.method ?? 'GET', path: url.pathname, headers, body });
    const reply = (data: unknown, status = 200) => new Response(JSON.stringify(data), { status });

    if (opts.failPaths?.some((p) => url.pathname.startsWith(p))) {
      return reply({ errors: [{ category: 'API_ERROR', code: 'INTERNAL_SERVER_ERROR', detail: 'secret-ish detail' }] }, 500);
    }
    if (url.pathname === '/v2/catalog/list') {
      const offset = Number(url.searchParams.get('cursor') ?? 0);
      const page = catalogObjects.slice(offset, offset + pageSize);
      const next = offset + pageSize < catalogObjects.length ? String(offset + pageSize) : undefined;
      return reply({ objects: page, ...(next ? { cursor: next } : {}) });
    }
    if (url.pathname === '/v2/inventory/counts/batch-retrieve') {
      const ids = new Set<string>(body.catalog_object_ids);
      return reply({ counts: inventoryCounts.filter((c) => ids.has(c.catalog_object_id!)) });
    }
    if (url.pathname === '/v2/online-checkout/payment-links') {
      return reply({ payment_link: { id: 'PL1', order_id: 'ORD1', url: opts.paymentLinkUrl ?? 'https://sandbox.square.link/u/abc123' } });
    }
    return reply({ errors: [{ category: 'INVALID_REQUEST_ERROR', code: 'NOT_FOUND' }] }, 404);
  };

  return { fetchImpl, calls };
}
