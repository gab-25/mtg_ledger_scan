// /api/catalog/: every CardTrader product (cards, sealed products, accessories).
import type { Page } from "./collection";
import { request } from "./client";

export type Printing = {
  ct_id: number;
  name: string;
  version: string;
  /** CardTrader's thumbnail (180×251); `image_large_url` is the 488×680 one ("" until the catalog sync stores it). */
  image_url: string;
  image_large_url: string;
  expansion_code: string;
  expansion_name: string;
  collector_number: string;
  category_id: number | null;
  category_name: string | null;
  is_product: boolean;
  accepts_language: boolean;
  owned_qty: number | null;
};

export type CatalogFilters = { q: string; set: string; number: string; category: number | null; owned: boolean };

/** A page of products. */
export type CatalogPage = Page<Printing>;

/**
 * A search (`searched: true`), or, with no filters, the latest releases: products of the newest sets first
 * (gab-25/mtg_ledger_core#30). A backend without that sends only `searched` and `filters`.
 */
export type CatalogSearch =
  | ({ searched: false; filters: CatalogFilters } & (CatalogPage | { results?: undefined }))
  | (CatalogPage & { searched: true; filters: CatalogFilters });

/** A CardTrader category (e.g. "Magic Single Card", "Sealed Product"). */
export type Category = { id: number; name: string };

export const searchCatalog = (params: URLSearchParams) => {
  const query = params.toString();
  return request<CatalogSearch>("GET", `catalog/${query ? `?${query}` : ""}`);
};
export const getCategories = () => request<Category[]>("GET", "catalog/categories/");
