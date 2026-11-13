// /api/listings/: CardTrader listings, the listing form, publishing.
import type { BadgeData } from "./types";
import type { Done } from "./account";
import { request } from "./client";

export type SaleRow = {
  item_id: number;
  name: string;
  set_code: string;
  condition: string;
  language: string;
  foil: boolean;
  quantity: number;
  price: string;
  badge: BadgeData;
};

export type Listings = {
  stats: { active: number; value: string; sold_month: number; to_publish: number };
  status: string;
  results: SaleRow[];
};

export type ListingFields = { quantity: string; price: string; status: string };

export type ListingDetail = {
  item: { id: number; name: string; set_code: string; condition: string; language: string; foil: boolean; quantity: number };
  listing: { exists: boolean; quantity: number; price: string | null; status: string };
  cm_suggestion: string | null;
};

export const getListings = (status: string) =>
  request<Listings>("GET", `listings/${status ? `?status=${encodeURIComponent(status)}` : ""}`);
export const getListing = (itemPk: number) => request<ListingDetail>("GET", `listings/${itemPk}/`);
export const saveListing = (itemPk: number, data: ListingFields) => request<Done>("PUT", `listings/${itemPk}/`, data);
export const deleteListing = (itemPk: number) => request<Done>("DELETE", `listings/${itemPk}/`);
export const publish = () => request<Done>("POST", "listings/publish/");
