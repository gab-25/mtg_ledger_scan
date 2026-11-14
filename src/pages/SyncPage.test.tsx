import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import * as sale from "../api/sale";
import * as api from "../api/sync";
import type { SyncData } from "../api/sync";
import { mockMe, renderPage } from "../test/renderPage";

vi.mock("../api/account");
vi.mock("../api/sale");
vi.mock("../api/sync");

function data(over: Partial<SyncData> = {}): SyncData {
  return {
    pending_changes: 2,
    connections: [{
      name: "CardTrader", description: "Marketplace", direction: "Ledger → CardTrader", last_sync: null,
      orders_synced_at: new Date().toISOString(), token_ok: true, open_conflicts: 1,
    }],
    conflicts: [{
      id: 4, name: "Counterspell", set_code: "DMR", condition: "NM", language: "EN", service: "CardTrader",
      local_value: "€0.80", remote_value: "€0.70",
    }],
    log: [
      { created_at: "2026-11-04T17:05:09Z", level: "warn", level_label: "Warning", message: "2 listings rejected" },
      { created_at: "2026-11-04T16:00:00Z", level: "ok", level_label: "OK", message: "3 listings published" },
    ],
    ...over,
  };
}

beforeEach(() => mockMe());

describe("SyncPage", () => {
  it("shows the connection, conflicts and log", async () => {
    vi.mocked(api.getSync).mockResolvedValue(data());
    renderPage("/sync/");
    expect(await screen.findByRole("heading", { name: "Sync" })).toBeInTheDocument();
    const connection = screen.getByRole("article");
    expect(within(connection).getByText("3 pending")).toHaveAttribute("data-variant", "pending");
    expect(within(connection).getByText("Never")).toBeInTheDocument();
    expect(within(connection).getByText(/^Today, \d\d:\d\d$/)).toBeInTheDocument();
    expect(within(connection).getByText("Configured")).toBeInTheDocument();
    expect(within(connection).getByRole("button", { name: "Publish changes" })).toBeEnabled();
    expect(within(connection).getByRole("link", { name: "Settings" })).toHaveAttribute("href", "/account/#cardtrader");
    const table = screen.getByRole("table");
    expect(within(table).getByText("DMR · NM · EN")).toBeInTheDocument();
    expect(within(table).getByText("€0.70")).toBeInTheDocument();
    const first = screen.getByText("2 listings rejected").closest("li")!;
    expect(within(first).getByText("Nov 4 18:05:09")).toHaveAttribute("datetime", "2026-11-04T17:05:09Z");
    expect(first.querySelector("[data-slot=log-dot]")).toHaveAttribute("data-tone", "warn");
    expect(within(first).getByText("Warning")).toHaveClass("sr-only");
    expect(document.title).toBe("Sync · MTG Ledger");
  });

  it("in sync, token missing, no conflicts, no activity", async () => {
    vi.mocked(api.getSync).mockResolvedValue(data({
      pending_changes: 0, conflicts: [], log: [],
      connections: [{ name: "CardTrader", description: "", direction: "", last_sync: null, orders_synced_at: null, token_ok: false, open_conflicts: 0 }],
    }));
    renderPage("/sync/");
    expect(await screen.findByText("In sync")).toHaveAttribute("data-variant", "ok");
    expect(screen.getByRole("link", { name: "Not configured" })).toHaveAttribute("href", "/account/#cardtrader");
    expect(screen.getByRole("button", { name: "Publish changes" })).toBeDisabled();
    expect(screen.getByRole("cell", { name: "No conflicts — Ledger and connected services agree." })).toBeInTheDocument();
    expect(screen.getByText("No activity yet.")).toBeInTheDocument();
    expect(screen.getByText("—")).toBeInTheDocument();
  });

  it("resolves a conflict, syncs and publishes", async () => {
    vi.mocked(api.getSync).mockResolvedValue(data());
    vi.mocked(api.resolveConflict).mockResolvedValue({ messages: [{ level: "success", text: "Conflict on Counterspell resolved." }] });
    vi.mocked(api.runSync).mockResolvedValue({ messages: [{ level: "success", text: "Sync complete: 0 conflicts to resolve." }] });
    vi.mocked(sale.publish).mockResolvedValue({ messages: [{ level: "success", text: "Published 2 listings to CardTrader." }] });
    renderPage("/sync/");
    await userEvent.click(await screen.findByRole("button", { name: "Keep remote" }));
    expect(api.resolveConflict).toHaveBeenCalledWith(4, "remote");
    expect(await screen.findByText("Conflict on Counterspell resolved.")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Keep Ledger" }));
    expect(api.resolveConflict).toHaveBeenLastCalledWith(4, "ledger");
    await userEvent.click(screen.getByRole("button", { name: "Sync all" }));
    expect(await screen.findByText("Sync complete: 0 conflicts to resolve.")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Publish changes" }));
    expect(await screen.findByText("Published 2 listings to CardTrader.")).toBeInTheDocument();
  });

  it("on a phone the conflicts are a list", async () => {
    vi.stubGlobal("matchMedia", () => ({ matches: true, addEventListener() {}, removeEventListener() {} }));
    vi.mocked(api.getSync).mockResolvedValue(data());
    vi.mocked(api.resolveConflict).mockResolvedValue({ messages: [] });
    renderPage("/sync/");
    const conflict = (await screen.findByText("Counterspell")).closest("li")!;
    expect(screen.queryByRole("table")).not.toBeInTheDocument();
    expect(conflict).toHaveTextContent("DMR · NM · EN");
    expect(within(conflict).getByText("In Ledger").nextElementSibling).toHaveTextContent("€0.80");
    expect(within(conflict).getByText("On service").nextElementSibling).toHaveTextContent("€0.70");
    await userEvent.click(within(conflict).getByRole("button", { name: "Keep remote" }));
    expect(api.resolveConflict).toHaveBeenCalledWith(4, "remote");
  });

  it("on a phone, no conflicts", async () => {
    vi.stubGlobal("matchMedia", () => ({ matches: true, addEventListener() {}, removeEventListener() {} }));
    vi.mocked(api.getSync).mockResolvedValue(data({ conflicts: [] }));
    renderPage("/sync/");
    expect(await screen.findByText("No conflicts — Ledger and connected services agree.")).toBeInTheDocument();
  });
});
