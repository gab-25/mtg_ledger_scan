// /api/collection/ and /api/choices/: the collection, its cards, CSV import/export.
import type { BadgeData } from "./types";
import type { Done } from "./account";
import { request } from "./client";

export type Choice = [string, string];
export type Choices = { colors: Choice[]; conditions: Choice[]; languages: Choice[]; listing_statuses: Choice[] };

export type Page<T> = { results: T[]; count: number; page: number; num_pages: number };

export type CollectionRow = {
  id: number;
  name: string;
  type_line: string;
  set_code: string;
  foil: boolean;
  condition: string;
  condition_label: string;
  language: string;
  quantity: number;
  price: string;
  pip: string;
  badge: BadgeData;
};

export type Collection = Page<CollectionRow> & {
  stats: { total: number | null; unique: number; value: string | null; for_sale: number };
  sets: string[];
  color_filters: { code: string; label: string; pip: string }[];
  filtered: boolean;
};

/** The fields of the add/edit card form (CardItemForm). */
export type ItemFields = {
  name: string;
  set_code: string;
  collector_number: string;
  type_line: string;
  color: string;
  condition: string;
  language: string;
  foil: boolean;
  quantity: string;
  price: string;
};

/** The body of an addition from the catalog (CatalogItemForm): condition and foil for cards only, language when the
 * product takes one. */
export type CatalogItemFields = {
  blueprint: number;
  condition?: string;
  language?: string;
  foil?: boolean;
  quantity: string;
  price: string;
};

export type Item = Omit<ItemFields, "quantity" | "price"> & {
  id: number;
  quantity: number;
  price: string;
  has_listing: boolean;
};

export const EXPORT_URL = "/api/collection/export/";

export const getChoices = () => request<Choices>("GET", "choices/");
export const getCollection = (params: URLSearchParams) => {
  const query = params.toString();
  return request<Collection>("GET", `collection/${query ? `?${query}` : ""}`);
};
export const getItem = (pk: number) => request<Item>("GET", `collection/${pk}/`);
export const createItem = (data: ItemFields) => request<Done & { id: number }>("POST", "collection/", data);
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
