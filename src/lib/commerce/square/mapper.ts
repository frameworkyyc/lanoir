/**
 * Maps Square catalogue objects into provider-neutral Products. Pure: no network, no globals.
 *
 * Handles: products without variations, size/colour item options, untracked inventory,
 * sold-out variations, products without images, category → collection matching
 * (case-insensitive), location presence, archived/deleted items.
 */
import type { Collection, Media, OptionGroup, Product, Variant } from '../types.ts';
import { isTracked, resolveStock, type InventoryCounts } from './inventory.ts';
import type { SquareCatalogObject } from './types.ts';

export interface MapOptions {
  locationId: string;
  /** Editorial collections; Square categories are matched to these by name, case-insensitively. */
  collections: Pick<Collection, 'slug' | 'name'>[];
  /** Name of the Square category that flags homepage products. */
  featuredCategory: string;
  now?: () => number;
}

const norm = (s: string | undefined) => (s ?? '').trim().toLowerCase();

export function slugify(name: string): string {
  const s = name
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60)
    .replace(/-+$/g, '');
  return s || 'item';
}

/** Square objects can be scoped to locations. */
export function isPresentAt(obj: SquareCatalogObject, locationId: string): boolean {
  if (obj.is_deleted) return false;
  if (obj.absent_at_location_ids?.includes(locationId)) return false;
  if (obj.present_at_all_locations === false) return !!obj.present_at_location_ids?.includes(locationId);
  return true; // Square's default is present at all locations
}

/** Plain text only: descriptions are rendered as text, never as HTML. */
const toPlainText = (s: string | undefined) =>
  (s ?? '').replace(/<[^>]*>/g, ' ').replace(/[ \t]+/g, ' ').replace(/\n{3,}/g, '\n\n').trim();

const HEX = /^#[0-9a-f]{6}$/i;

/** ids of tracked variations — the only ones whose inventory we need to fetch. */
export function trackedVariationIds(objects: SquareCatalogObject[], locationId: string): string[] {
  const ids: string[] = [];
  for (const item of objects) {
    if (item.type !== 'ITEM' || !item.item_data || !isPresentAt(item, locationId) || item.item_data.is_archived) continue;
    for (const v of item.item_data.variations ?? []) {
      if (isPresentAt(v, locationId) && isTracked(v, locationId)) ids.push(v.id);
    }
  }
  return ids;
}

export function mapCatalog(objects: SquareCatalogObject[], counts: InventoryCounts, opts: MapOptions): Product[] {
  const { locationId } = opts;
  const byId = new Map<string, SquareCatalogObject>();
  const index = (o: SquareCatalogObject) => byId.set(o.id, o);
  for (const o of objects) {
    index(o);
    for (const nested of o.item_option_data?.values ?? []) index(nested); // option values can be nested
  }

  const categoryName = (id: string | undefined) => norm(byId.get(id ?? '')?.category_data?.name);
  const collectionByName = new Map(opts.collections.map((c) => [norm(c.name), c.slug]));

  const items = objects
    .filter((o) => o.type === 'ITEM' && o.item_data && isPresentAt(o, locationId) && !o.item_data.is_archived)
    .filter((o) => !o.item_data!.product_type || o.item_data!.product_type === 'REGULAR')
    // Newest first (Square has no manual sort order); name breaks ties so output is deterministic.
    .sort((a, b) => (b.created_at ?? '').localeCompare(a.created_at ?? '') || (a.item_data!.name ?? '').localeCompare(b.item_data!.name ?? ''));

  const usedSlugs = new Set<string>();
  const products: Product[] = [];

  for (const item of items) {
    const data = item.item_data!;
    const name = (data.name ?? '').trim();
    const variations = (data.variations ?? [])
      .filter((v) => v.type === 'ITEM_VARIATION' && v.item_variation_data && isPresentAt(v, locationId))
      .sort((a, b) => (a.item_variation_data!.ordinal ?? 0) - (b.item_variation_data!.ordinal ?? 0));
    if (!name || variations.length === 0) continue;

    // ---- option groups (Size, Colour…) ----------------------------------------------------
    const itemOptionOrder = data.item_options?.map((o) => o.item_option_id ?? '') ?? [];
    const groups = new Map<string, OptionGroup & { rank: number }>();
    const variantOptions = new Map<string, Record<string, string>>();

    for (const v of variations) {
      const opts2: Record<string, string> = {};
      for (const pair of v.item_variation_data!.item_option_values ?? []) {
        const option = byId.get(pair.item_option_id ?? '');
        const value = byId.get(pair.item_option_value_id ?? '');
        const optName = (option?.item_option_data?.display_name || option?.item_option_data?.name || '').trim();
        const valName = (value?.item_option_value_data?.name ?? '').trim();
        if (!optName || !valName) continue;
        opts2[optName] = valName;
        const group = groups.get(optName) ?? { name: optName, values: [], rank: itemOptionOrder.indexOf(pair.item_option_id ?? '') };
        if (!group.values.some((x) => x.value === valName)) {
          const colour = value?.item_option_value_data?.color;
          group.values.push({ value: valName, ...(colour && HEX.test(colour) ? { swatch: colour } : {}) });
        }
        groups.set(optName, group);
      }
      variantOptions.set(v.id, opts2);
    }

    // Several variations but no item options: expose the variation names as one "Option" group.
    if (groups.size === 0 && variations.length > 1) {
      const group: OptionGroup & { rank: number } = { name: 'Option', values: [], rank: 0 };
      for (const v of variations) {
        const n = (v.item_variation_data!.name ?? '').trim() || 'Default';
        variantOptions.set(v.id, { Option: n });
        if (!group.values.some((x) => x.value === n)) group.values.push({ value: n });
      }
      groups.set('Option', group);
    }
    const optionGroups: OptionGroup[] = [...groups.values()]
      .sort((a, b) => (a.rank < 0 ? 99 : a.rank) - (b.rank < 0 ? 99 : b.rank))
      .map(({ name: gName, values }) => ({ name: gName, values }));

    // ---- variants -----------------------------------------------------------------------
    const fallbackCurrency =
      variations.map((v) => v.item_variation_data!.price_money?.currency).find(Boolean) ?? 'USD';
    const variants: Variant[] = [];
    for (const v of variations) {
      const stock = resolveStock(v, locationId, counts, opts.now);
      const options = variantOptions.get(v.id) ?? {};
      const variationName = (v.item_variation_data!.name ?? '').trim();
      const title = Object.values(options).join(' / ') || variationName || 'Default';
      variants.push({
        id: v.id,
        title,
        sku: v.item_variation_data!.sku || undefined,
        // A variant with no readable price is forced unavailable and never shown as purchasable.
        price: stock.price ?? { amount: 0, currency: fallbackCurrency },
        availability: stock.price ? stock.availability : 'unavailable',
        available: !!stock.price && stock.availability === 'available',
        inventory: stock.inventory,
        options,
      });
    }

    // ---- images (missing images are fine: the UI renders a neutral placeholder) ------------
    const imageIds = [...(data.image_ids ?? []), ...variations.flatMap((v) => v.item_variation_data!.image_ids ?? [])];
    const images: Media[] = [];
    for (const id of new Set(imageIds)) {
      const img = byId.get(id)?.image_data;
      if (img?.url && /^https:\/\//i.test(img.url)) images.push({ src: img.url, alt: img.caption || name });
    }

    // ---- categories → collections / featured ------------------------------------------------
    const catIds = [...(data.categories ?? []).map((c) => c.id), data.category_id];
    const catNames = new Set(catIds.map(categoryName).filter(Boolean));
    const collectionSlugs = [...catNames].map((n) => collectionByName.get(n)).filter((s): s is string => !!s);

    // ---- slug (unique, stable) -----------------------------------------------------------------
    let slug = slugify(name);
    if (usedSlugs.has(slug)) slug = `${slug}-${item.id.slice(-4).toLowerCase()}`;
    usedSlugs.add(slug);

    products.push({
      id: item.id,
      slug,
      name,
      description: toPlainText(data.description_plaintext || data.description) || undefined,
      collections: [...new Set(collectionSlugs)],
      images,
      variants,
      optionGroups,
      featured: catNames.has(norm(opts.featuredCategory)),
    });
  }
  return products;
}
