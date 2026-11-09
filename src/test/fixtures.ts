import type { Blueprint, Line, Session, Setup } from "../api/types";

export const DMR = { id: 1, code: "dmr", name: "Dominaria Remastered" };
export const DMU = { id: 2, code: "dmu", name: "Dominaria United" };

export function blueprint(over: Partial<Blueprint> = {}): Blueprint {
  return {
    id: 1201, name: "Counterspell", collector_number: "045", version: "", rarity: "Common",
    image_url: "https://img/1201.jpg", expansion: DMR, ...over,
  };
}

export function line(over: Partial<Line> = {}): Line {
  return {
    uuid: "l1", blueprint: blueprint(), language: "IT", foil: false, condition: "NM", quantity: 1, price: "5.00",
    for_sale: null, listed: false, needs_confirmation: false, frame_url: null, candidates: [], ...over,
  };
}

export function session(over: Partial<Session> = {}): Session {
  return {
    uuid: "s1", status: "open", expansion: DMR, default_condition: "NM", sale_threshold: null, count: 0,
    last_line: null, is_phone: true, phone_url: "https://pc.ts.net/scan/s1/",
    phone_secure: true, ...over,
  };
}

export function setup(over: Partial<Setup> = {}): Setup {
  return {
    expansions: [DMR, DMU],
    conditions: [{ code: "M", label: "Mint" }, { code: "NM", label: "Near Mint" }, { code: "EX", label: "Excellent" }],
    languages: [{ code: "EN", label: "English" }, { code: "IT", label: "Italian" }],
    defaults: { expansion_id: null, condition: "NM" },
    missing: [],
    warnings: [],
    ...over,
  };
}
