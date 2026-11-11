// /api/catalog/: every CardTrader product (cards, sealed products, accessories) with Cardmarket prices.
import type { Page } from "./collection";
import { request } from "./client";

type Price = string | null;

export type Printing = {
  ct_id: number;
  name: string;
  version: string;
  image_url: string;
  expansion_code: string;
  expansion_name: string;
  collector_number: string;
  category_id: number | null;
  category_name: string | null;
  is_product: boolean;
  accepts_language: boolean;
  owned_qty: number | null;
  prices: { trend: Price; low: Price; avg: Price; trend_foil: Price; low_foil: Price; avg_foil: Price } | null;
};

export type CatalogFilters = { q: string; set: string; number: string; category: number | null; owned: boolean };

export type CatalogSearch =
  | { searched: false; filters: CatalogFilters }
  | (Page<Printing> & { searched: true; filters: CatalogFilters; prices_date: string | null });

/** A CardTrader category (e.g. "Magic Single Card", "Sealed Product"). */
export type Category = { id: number; name: string };

export const searchCatalog = (params: URLSearchParams) => {
  const query = params.toString();
  return request<CatalogSearch>("GET", `catalog/${query ? `?${query}` : ""}`);
};
export const getCategories = () => request<Category[]>("GET", "catalog/categories/");
