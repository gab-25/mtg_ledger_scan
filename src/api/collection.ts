// /api/collection/ and /api/choices/: the collection, its cards, CSV import/export.
import type { BadgeData } from "./types";
import type { Done } from "./account";
import type { Category } from "./catalog";
import { request } from "./client";

export type Choice = [string, string];
export type Choices = { conditions: Choice[]; languages: Choice[]; listing_statuses: Choice[] };

export type Page<T> = { results: T[]; count: number; page: number; num_pages: number };

export type CollectionRow = {
  id: number;
  name: string;
  set_code: string;
  /** A sealed product or accessory: it has no condition and no foil. */
  is_product: boolean;
  category_id: number | null;
  category_name: string | null;
  /** The catalog image ("" when the card has no CardTrader blueprint), thumbnail and large version (see Printing). */
  image_url: string;
  image_large_url: string;
  foil: boolean;
  condition: string;
  condition_label: string;
  language: string;
  quantity: number;
  /** Cardmarket trend of the printing (foil trend for foil copies), null when unknown. */
  price: string | null;
  badge: BadgeData;
};

export type Collection = Page<CollectionRow> & {
  stats: { total: number | null; unique: number; value: string | null; for_sale: number };
  sets: string[];
  /** The categories present in the collection, for the filter. */
  categories: Category[];
  filtered: boolean;
};

/** The fields of the edit form (ItemForm): the copies only, the product never changes. */
export type ItemFields = {
  condition: string;
  language: string;
  foil: boolean;
  quantity: string;
};

/** The body of an addition from the catalog (CatalogItemForm): condition and foil for cards only, language when the
 * product takes one. */
export type CatalogItemFields = {
  blueprint: number;
  condition?: string;
  language?: string;
  foil?: boolean;
  quantity: string;
};

export type Item = Omit<ItemFields, "quantity"> & {
  id: number;
  name: string;
  set_code: string;
  collector_number: string;
  is_product: boolean;
  category_id: number | null;
  category_name: string | null;
  quantity: number;
  /** Cardmarket trend, as on the collection rows. */
  price: string | null;
  has_listing: boolean;
};

export const EXPORT_URL = "/api/collection/export/";

export const getChoices = () => request<Choices>("GET", "choices/");
export const getCollection = (params: URLSearchParams) => {
  const query = params.toString();
  return request<Collection>("GET", `collection/${query ? `?${query}` : ""}`);
};
export const getItem = (pk: number) => request<Item>("GET", `collection/${pk}/`);
export const addToCollection = (data: CatalogItemFields) =>
  request<Done & { id: number }>("POST", "collection/", data);
export const updateItem = (pk: number, data: ItemFields) => request<Done>("PUT", `collection/${pk}/`, data);
export const deleteItem = (pk: number) => request<Done>("DELETE", `collection/${pk}/`);
export const getImportColumns = () => request<{ columns: string[] }>("GET", "collection/import/");
export function importCsv(file: File | null) {
  const form = new FormData();
  if (file) form.append("file", file);
  return request<Done>("POST", "collection/import/", form);
}
