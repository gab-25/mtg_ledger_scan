// The JSON API of mtg_ledger under /api/scan/ (contract: gab-25/mtg_ledger#10).

export type Expansion = { id: number; code: string; name: string };
export type Blueprint = {
  id: number;
  name: string;
  collector_number: string;
  version: string;
  rarity: string;
  image_url: string;
  expansion: Expansion;
};
/** A capture candidate: matches_name tells whether it carries the name read (the server sorts those first). */
export type Candidate = Blueprint & { matches_name: boolean };
export type Choice = { code: string; label: string };
export type Line = {
  uuid: string;
  blueprint: Blueprint | null;
  language: string;
  foil: boolean;
  condition: string;
  quantity: number;
  price: string | null;
  for_sale: boolean | null;
  listed: boolean;
  needs_confirmation: boolean;
  frame_url: string | null;
  /** The card name the model read ("" if it read none). */
  read_name: string;
  candidates: Candidate[];
};
export type Session = {
  uuid: string;
  status: "open" | "saved";
  expansion: Expansion | null;
  default_condition: string;
  sale_threshold: string | null;
  count: number;
  last_line: Line | null;
  is_phone: boolean;
  phone_url: string;
  phone_secure: boolean;
};
export type Missing = { message: string; url: string };
export type Setup = {
  expansions: Expansion[];
  conditions: Choice[];
  languages: Choice[];
  defaults: { expansion_id: number | null; condition: string };
  missing: Missing[];
  warnings: string[];
};
export type CaptureResult = {
  result: "added" | "confirm" | "no_card" | "busy" | "handled";
  message: string;
  line: Line | null;
  count: number;
};
export type LineResult = { line: Line | null; count: number };
export type SearchResult = { results: Blueprint[]; where: string | null; warnings: string[] };
export type Review = {
  session: Session;
  lines: Line[];
  pending: Line[];
  copies: number;
  unique: number;
  listed: number;
};
export type SaveResult = { saved: number; listed: number; redirect: string };
export type LineChanges = Partial<{
  foil: boolean;
  condition: string;
  language: string;
  quantity: number;
  for_sale: boolean | null;
}>;
