import { request as apiRequest } from "./client";
import type {
  CaptureResult, LineChanges, LineResult, OpenSession, Review, SaveResult, SearchResult, Session, Setup,
} from "./types";

/** The scan endpoints live under /api/scan/. */
const request = <T,>(method: string, path: string, body?: unknown, signal?: AbortSignal) =>
  apiRequest<T>(method, `scan/${path}`, body, signal);

export const getSetup = () => request<Setup>("GET", "setup/");

export const startSession = (expansionId: number | null, condition: string) =>
  request<{ session: Session; warnings: string[] }>("POST", "sessions/", { expansion_id: expansionId, condition });

/** The user's open sessions, most recent activity first (at most 10). */
export const listSessions = () => request<{ results: OpenSession[] }>("GET", "sessions/");

/** Discard an open session with its cards (204); a saved one answers 409 "closed". */
export const discardSession = (uuid: string) => request<void>("DELETE", `sessions/${uuid}/`);

export const getSession = (uuid: string) => request<{ session: Session }>("GET", `sessions/${uuid}/`);

export type CaptureOptions = {
  /** Wait before each retry after a network failure or timeout (ms); its length is the number of retries. */
  retryDelays: number[];
  /** Abort one upload after this long (recognition takes a few seconds). */
  timeoutMs: number;
  /** While the server answers "busy" (an earlier upload of this photo is being recognised), ask again this often… */
  busyPollMs: number;
  /** …at most this many times. */
  busyPolls: number;
};

export const CAPTURE_OPTIONS: CaptureOptions = { retryDelays: [1000, 3000], timeoutMs: 45000, busyPollMs: 1500, busyPolls: 30 };

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/** True for failures where the server may never have seen the request (or its answer was lost). */
export function isNetworkError(err: unknown) {
  return err instanceof TypeError || (err instanceof DOMException && (err.name === "AbortError" || err.name === "TimeoutError"));
}

function uploadOnce(uuid: string, frame: Blob, captureId: string, timeoutMs: number) {
  const form = new FormData();
  form.append("frame", frame, "card.jpg");
  form.append("capture_id", captureId);
  const abort = new AbortController();
  const timer = setTimeout(() => abort.abort(new DOMException("The upload took too long", "TimeoutError")), timeoutMs);
  return request<CaptureResult>("POST", `sessions/${uuid}/captures/`, form, abort.signal).finally(() => clearTimeout(timer));
}

/**
 * Upload one photo. Every attempt carries the same captureId, so the server never adds the card twice:
 * network failures and timeouts are retried after a pause, and a "busy" answer (an earlier attempt still being
 * recognised) is polled until the result is ready.
 */
export async function capture(uuid: string, frame: Blob, captureId: string, opts: CaptureOptions = CAPTURE_OPTIONS): Promise<CaptureResult> {
  let retries = 0;
  let polls = 0;
  for (;;) {
    let result: CaptureResult;
    try {
      result = await uploadOnce(uuid, frame, captureId, opts.timeoutMs);
    } catch (err) {
      if (!isNetworkError(err) || retries >= opts.retryDelays.length) throw err;
      await sleep(opts.retryDelays[retries++]);
      continue;
    }
    if (result.result !== "busy" || polls >= opts.busyPolls) return result;
    polls++;
    await sleep(opts.busyPollMs);
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
