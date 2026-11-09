// fetch wrapper for mtg_ledger's /api/scan/: same-origin session, Django CSRF, JSON errors.

const PREFIX = "/api/scan/";

export class ApiError extends Error {
  status: number;
  code: string;
  helpUrl?: string;

  constructor(message: string, status: number, code: string, helpUrl?: string) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
    this.helpUrl = helpUrl;
  }
}

export function csrfToken(): string {
  const match = document.cookie.match(/(?:^|;\s*)csrftoken=([^;]+)/);
  return match ? decodeURIComponent(match[1]) : "";
}

export async function request<T>(method: string, path: string, body?: unknown, signal?: AbortSignal): Promise<T> {
  const headers: Record<string, string> = { Accept: "application/json" };
  if (method !== "GET") headers["X-CSRFToken"] = csrfToken();
  let payload: BodyInit | undefined;
  if (body instanceof FormData) {
    payload = body;
  } else if (body !== undefined) {
    headers["Content-Type"] = "application/json";
    payload = JSON.stringify(body);
  }
  const resp = await fetch(PREFIX + path, { method, headers, body: payload, credentials: "same-origin", signal });
  const data = await resp.json().catch(() => null);
  if (resp.ok) return data as T;
  return fail(resp, data);
}

type ErrorBody = Record<string, unknown> & { detail?: string; code?: string; help_url?: string };

/** The messages of a DRF validation error: {"field": ["message"], "non_field_errors": [...]}. */
function validationMessages(data: ErrorBody): string {
  return Object.values(data)
    .flatMap((v) => (Array.isArray(v) ? v : []))
    .filter((m): m is string => typeof m === "string")
    .join(" ");
}

// mtg_ledger answers errors in DRF's format: {"detail", "code", "help_url"?}, or field messages for validation.
function fail(resp: Response, data: ErrorBody | null): never {
  const validation = data && typeof data.detail !== "string" ? validationMessages(data) : "";
  const code = data?.code ?? (validation ? "invalid" : "server");
  if (resp.status === 401 || (resp.status === 403 && code === "not_authenticated")) {
    window.location.assign("/login/?next=" + encodeURIComponent(location.pathname + location.search));
  } else if (resp.status === 409 && code === "closed") {
    window.location.assign("/");
  }
  const message = data?.detail || validation || `Something went wrong (${resp.status}) — try again`;
  throw new ApiError(message, resp.status, code, data?.help_url);
}
