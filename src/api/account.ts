// /api/me/, /api/auth/ and /api/account/: who is logged in, login/logout, profile and the CardTrader token.
import { csrfToken, request } from "./client";
import type { Msg } from "./types";

export type Done = { messages: Msg[] };

export type Me = {
  user: {
    username: string;
    first_name: string;
    last_name: string;
    full_name: string;
    email: string;
    is_staff: boolean;
    date_joined: string;
    last_login: string | null;
  };
  counts: { pending_changes: number; orders_to_ship: number };
};

export type Account = {
  cardtrader: { name: string; last_sync: string | null; token_saved: boolean };
  shares_token: boolean;
  /** The password rules, shown under "New password". */
  password_help: string[];
};

export const getMe = () => request<Me>("GET", "me/");

/** The login form needs the CSRF cookie before its POST. */
export async function ensureCsrf() {
  if (!csrfToken()) await request<void>("GET", "auth/csrf/");
}

export const login = (username: string, password: string) =>
  request<{ ok: true }>("POST", "auth/login/", { username, password });
export const logout = () => request<void>("POST", "auth/logout/");

export const getAccount = () => request<Account>("GET", "account/");
export const updateProfile = (data: { first_name: string; last_name: string; email: string }) =>
  request<Done>("PUT", "account/profile/", data);
export const changePassword = (data: { old_password: string; new_password1: string; new_password2: string }) =>
  request<Done>("POST", "account/password/", data);
export const setToken = (token: string) => request<Done>("PUT", "account/cardtrader-token/", { token });
export const removeToken = () => request<Done>("DELETE", "account/cardtrader-token/");
