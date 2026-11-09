// /api/sync/: connections, conflicts and the activity log.
import type { Done } from "./account";
import { request } from "./client";

export type Connection = {
  name: string;
  description: string;
  direction: string;
  last_sync: string | null;
  orders_synced_at: string | null;
  token_ok: boolean;
  open_conflicts: number;
};

export type Conflict = {
  id: number;
  name: string;
  set_code: string;
  condition: string;
  language: string;
  service: string;
  local_value: string;
  remote_value: string;
};

export type LogEntry = { created_at: string; level: string; level_label: string; message: string };

export type SyncData = { pending_changes: number; connections: Connection[]; conflicts: Conflict[]; log: LogEntry[] };

export const getSync = () => request<SyncData>("GET", "sync/");
export const runSync = () => request<Done>("POST", "sync/run/");
export const resolveConflict = (id: number, keep: "ledger" | "remote") =>
  request<Done>("POST", `sync/conflicts/${id}/resolve/`, { keep });
