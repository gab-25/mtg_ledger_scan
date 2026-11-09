// /api/cards/: the card database (CardTrader printings with Cardmarket prices).
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
  owned_qty: number | null;
  prices: { trend: Price; low: Price; avg: Price; trend_foil: Price; low_foil: Price; avg_foil: Price } | null;
};

export type CardFilters = { q: string; set: string; number: string; owned: boolean };

export type CardSearch =
  | { searched: false; filters: CardFilters }
  | (Page<Printing> & { searched: true; filters: CardFilters; prices_date: string | null });

export const searchCards = (params: URLSearchParams) => {
  const query = params.toString();
  return request<CardSearch>("GET", `cards/${query ? `?${query}` : ""}`);
};
