/** The subset of Square's Catalog / Inventory / Checkout shapes this integration reads. */

export interface SquareMoney { amount?: number | string; currency?: string }

export interface SquareLocationOverride {
  location_id?: string;
  price_money?: SquareMoney;
  track_inventory?: boolean;
  sold_out?: boolean;
  sold_out_valid_until?: string;
}

export interface SquareItemVariationData {
  item_id?: string;
  name?: string;
  sku?: string;
  ordinal?: number;
  pricing_type?: 'FIXED_PRICING' | 'VARIABLE_PRICING';
  price_money?: SquareMoney;
  location_overrides?: SquareLocationOverride[];
  track_inventory?: boolean;
  sellable?: boolean;
  item_option_values?: { item_option_id?: string; item_option_value_id?: string }[];
  image_ids?: string[];
}

export interface SquareItemData {
  name?: string;
  description?: string;
  description_plaintext?: string;
  is_archived?: boolean;
  product_type?: string;
  category_id?: string;
  categories?: { id?: string; ordinal?: number }[];
  image_ids?: string[];
  item_options?: { item_option_id?: string }[];
  variations?: SquareCatalogObject[];
}

export interface SquareCatalogObject {
  type: string;
  id: string;
  updated_at?: string;
  created_at?: string;
  is_deleted?: boolean;
  present_at_all_locations?: boolean;
  present_at_location_ids?: string[];
  absent_at_location_ids?: string[];
  item_data?: SquareItemData;
  item_variation_data?: SquareItemVariationData;
  category_data?: { name?: string };
  image_data?: { url?: string; caption?: string; name?: string };
  item_option_data?: { name?: string; display_name?: string; values?: SquareCatalogObject[] };
  item_option_value_data?: { item_option_id?: string; name?: string; color?: string; ordinal?: number };
}

export interface SquareListCatalogResponse { objects?: SquareCatalogObject[]; cursor?: string }

export interface SquareInventoryCount {
  catalog_object_id?: string;
  catalog_object_type?: string;
  state?: string;
  location_id?: string;
  /** Decimal string, e.g. "12" or "2.5". */
  quantity?: string;
}
export interface SquareInventoryResponse { counts?: SquareInventoryCount[]; cursor?: string }

export interface SquarePaymentLinkResponse {
  payment_link?: { id?: string; url?: string; long_url?: string; order_id?: string };
}
