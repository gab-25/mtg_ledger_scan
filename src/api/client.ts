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

function fail(resp: Response, data: { code?: string; error?: string; help_url?: string } | null): never {

  const code: string = data?.code ?? "server";
  if (resp.status === 401) {
    window.location.assign("/login/?next=" + encodeURIComponent(location.pathname + location.search));
  } else if (resp.status === 409 && code === "closed") {
    window.location.assign("/");
  }
  throw new ApiError(data?.error ?? `Something went wrong (${resp.status}) — try again`, resp.status, code, data?.help_url);
}
