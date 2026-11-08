import { request } from "./client";
import type {
  CaptureResult, LineChanges, LineResult, Review, SaveResult, SearchResult, Session, Setup,
} from "./types";

export const getSetup = () => request<Setup>("GET", "setup/");

export const startSession = (expansionId: number | null, condition: string) =>
  request<{ session: Session; warnings: string[] }>("POST", "sessions/", { expansion_id: expansionId, condition });

export const getSession = (uuid: string) => request<{ session: Session }>("GET", `sessions/${uuid}/`);

/** Upload one photo. Network failures are retried with the same captureId, so the server never adds it twice. */
export async function capture(uuid: string, frame: Blob, captureId: string, retries = 2): Promise<CaptureResult> {
  for (let attempt = 0; ; attempt++) {
    const form = new FormData();
    form.append("frame", frame, "card.jpg");
    form.append("capture_id", captureId);
    try {
      return await request<CaptureResult>("POST", `sessions/${uuid}/captures/`, form);
    } catch (err) {
      if (!(err instanceof TypeError) || attempt >= retries) throw err;
    }
  }
}

export function search(uuid: string, q: string, set?: string) {
  const params = new URLSearchParams({ q });
  if (set) params.set("set", set);
  return request<SearchResult>("GET", `sessions/${uuid}/search/?${params}`);
}

export const addManual = (uuid: string, blueprintId: number, language: string, foil: boolean) =>
  request<LineResult>("POST", `sessions/${uuid}/manual/`, { blueprint_id: blueprintId, language, foil });

export const getReview = (uuid: string) => request<Review>("GET", `sessions/${uuid}/review/`);

export const setThreshold = (uuid: string, threshold: string) =>
  request<Review>("PUT", `sessions/${uuid}/threshold/`, { threshold });

export const saveSession = (uuid: string) => request<SaveResult>("POST", `sessions/${uuid}/save/`);

export const updateLine = (uuid: string, changes: LineChanges) => request<LineResult>("PATCH", `lines/${uuid}/`, changes);

export const undoLine = (uuid: string) => request<LineResult>("POST", `lines/${uuid}/undo/`);

export const confirmLine = (
  uuid: string,
  pick: { blueprintId: number; language: string; condition?: string; foil: boolean },
) =>
  request<LineResult>("POST", `lines/${uuid}/confirm/`, {
    blueprint_id: pick.blueprintId, language: pick.language, condition: pick.condition, foil: pick.foil,
  });
