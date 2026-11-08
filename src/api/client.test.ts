import { ApiError, request } from "./client";
import { capture } from "./scan";

function json(status: number, body: unknown) {
  return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
}

function stubLocation(pathname = "/scan/abc/", search = "") {
  const assign = vi.fn();
  vi.stubGlobal("location", { pathname, search, assign });
  return assign;
}

describe("request", () => {
  beforeEach(() => {
    document.cookie = "csrftoken=tok123";
  });

  it("sends csrf header and JSON body on POST", async () => {
    const fetch = vi.fn().mockResolvedValue(json(200, { ok: 1 }));
    vi.stubGlobal("fetch", fetch);
    await expect(request("POST", "sessions/", { condition: "NM" })).resolves.toEqual({ ok: 1 });
    const [url, init] = fetch.mock.calls[0];
    expect(url).toBe("/api/scan/sessions/");
    expect(init.headers["X-CSRFToken"]).toBe("tok123");
    expect(init.headers["Content-Type"]).toBe("application/json");
    expect(init.body).toBe('{"condition":"NM"}');
    expect(init.credentials).toBe("same-origin");
  });

  it("sends no csrf header on GET", async () => {
    const fetch = vi.fn().mockResolvedValue(json(200, {}));
    vi.stubGlobal("fetch", fetch);
    await request("GET", "setup/");
    expect(fetch.mock.calls[0][1].headers["X-CSRFToken"]).toBeUndefined();
  });

  it("401 redirects to login", async () => {
    const assign = stubLocation("/scan/abc/", "?debug=1");
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(json(401, { error: "Log in", code: "login" })));
    await expect(request("GET", "setup/")).rejects.toBeInstanceOf(ApiError);
    expect(assign).toHaveBeenCalledWith("/login/?next=%2Fscan%2Fabc%2F%3Fdebug%3D1");
  });

  it("closed session goes to collection", async () => {
    const assign = stubLocation();
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(json(409, { error: "saved", code: "closed" })));
    await expect(request("POST", "lines/x/undo/")).rejects.toBeInstanceOf(ApiError);
    expect(assign).toHaveBeenCalledWith("/");
  });

  it("throws ApiError with code and help_url", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(json(503, { error: "CardTrader is not connected", code: "service_missing", help_url: "/account/#cardtrader" })),
    );
    const err = await request("GET", "setup/").catch((e) => e);
    expect(err).toBeInstanceOf(ApiError);
    expect(err).toMatchObject({ status: 503, code: "service_missing", helpUrl: "/account/#cardtrader", message: "CardTrader is not connected" });
  });

  it("non-JSON error becomes a generic ApiError", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("<html>boom</html>", { status: 500 })));
    const err = await request("GET", "setup/").catch((e) => e);
    expect(err).toMatchObject({ status: 500, code: "server" });
  });
});

describe("capture", () => {
  it("retries capture with same id on network errors", async () => {
    const fetch = vi
      .fn()
      .mockRejectedValueOnce(new TypeError("Failed to fetch"))
      .mockResolvedValueOnce(json(200, { result: "added", message: "Added · 1 copy", line: null, count: 1 }));
    vi.stubGlobal("fetch", fetch);
    const result = await capture("s1", new Blob(["x"]), "cap-1");
    expect(result.result).toBe("added");
    expect(fetch).toHaveBeenCalledTimes(2);
    const ids = fetch.mock.calls.map(([, init]) => (init.body as FormData).get("capture_id"));
    expect(ids).toEqual(["cap-1", "cap-1"]);
    expect(fetch.mock.calls[0][0]).toBe("/api/scan/sessions/s1/captures/");
    expect(fetch.mock.calls[0][1].headers["Content-Type"]).toBeUndefined();
  });

  it("gives up after the retries", async () => {
    const fetch = vi.fn().mockRejectedValue(new TypeError("Failed to fetch"));
    vi.stubGlobal("fetch", fetch);
    await expect(capture("s1", new Blob(["x"]), "cap-1", 2)).rejects.toBeInstanceOf(TypeError);
    expect(fetch).toHaveBeenCalledTimes(3);
  });
});
