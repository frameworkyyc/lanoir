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
  /** Square Online image URLs (a fallback when no IMAGE object resolves). */
  ecom_image_uris?: string[];
  item_options?: { item_option_id?: string }[];
  modifier_list_info?: SquareItemModifierListInfo[];
  variations?: SquareCatalogObject[];
}

export interface SquareItemModifierListInfo {
  modifier_list_id?: string;
  enabled?: boolean;
  ordinal?: number;
  min_selected_modifiers?: number;
  max_selected_modifiers?: number;
  modifier_overrides?: {
    modifier_id?: string;
    on_by_default?: boolean;
    price_money?: SquareMoney;
    hidden_online?: boolean;
  }[];
}

export interface SquareModifierListData {
  name?: string;
  modifier_type?: 'LIST' | 'TEXT';
  selection_type?: 'SINGLE' | 'MULTIPLE';
  min_selected_modifiers?: number;
  max_selected_modifiers?: number;
  allow_quantities?: boolean;
  image_ids?: string[];
  modifiers?: SquareCatalogObject[];
}

export interface SquareModifierData {
  name?: string;
  modifier_list_id?: string;
  ordinal?: number;
  price_money?: SquareMoney;
  on_by_default?: boolean;
  hidden_online?: boolean;
  image_id?: string;
  location_overrides?: { location_id?: string; price_money?: SquareMoney; sold_out?: boolean }[];
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
  modifier_list_data?: SquareModifierListData;
  modifier_data?: SquareModifierData;
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
