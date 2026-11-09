// /api/orders/: CardTrader sale orders, their packing list, shipping and import.
import type { BadgeData } from "../components/Badge";
import type { Done } from "./account";
import { request } from "./client";

export type OrderRow = {
  id: number;
  code: string;
  packing_number: number | null;
  can_ship: boolean;
  buyer_username: string;
  via_cardtrader_zero: boolean;
  ship_city: string;
  ship_country_code: string;
  shipping_method: string;
  tracked: boolean;
  size: number;
  sent_at: string | null;
  paid_at: string | null;
  total: string | null;
  badge: BadgeData;
};

export type Orders = {
  tab: string;
  stats: { to_ship: number; items_to_ship: number; shipped_month: number; revenue_month: string };
  tabs: { key: string; label: string; count: number }[];
  orders_synced_at: string | null;
  results: OrderRow[];
};

export type OrderItem = {
  id: number;
  name: string;
  expansion: string;
  foil: boolean;
  condition: string;
  language: string;
  quantity: number;
  price: string | null;
  item_pk: number | null;
};

export type OrderDetail = OrderRow & {
  state: string;
  state_label: string;
  address_lines: string[];
  ship_note: string;
  buyer_email: string;
  buyer_phone: string;
  max_shipping_days: number | null;
  tracking_code: string;
  items: OrderItem[];
};

export const getOrders = (tab: string) => request<Orders>("GET", `orders/${tab ? `?tab=${encodeURIComponent(tab)}` : ""}`);
export const getOrder = (pk: number) => request<OrderDetail>("GET", `orders/${pk}/`);
export const shipOrder = (pk: number, data: { tracking_code: string; save_tracking: boolean }) =>
  request<Done & { shipped: boolean }>("POST", `orders/${pk}/ship/`, data);
export const importOrders = () => request<Done>("POST", "orders/import/");
