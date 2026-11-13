import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ApiError } from "../api/client";
import * as collection from "../api/collection";
import * as api from "../api/sale";
import type { Listings, SaleRow } from "../api/sale";
import { mockMe, renderPage } from "../test/renderPage";

vi.mock("../api/account");
vi.mock("../api/collection");
vi.mock("../api/sale");

const STATUSES: [string, string][] = [["published", "Published"], ["to_publish", "To publish"], ["sold", "Sold"]];

function sale(over: Partial<SaleRow> = {}): SaleRow {
  return {
    item_id: 7, name: "Counterspell", set_code: "DMR", condition: "NM", language: "EN", foil: false, quantity: 1,
    price: "0.80", market_price: null, badge: { label: "To publish", tone: "pending" }, ...over,
  };
}

function listings(over: Partial<Listings> = {}): Listings {
  return { stats: { active: 4, value: "123.40", sold_month: 2, to_publish: 1 }, status: "", results: [sale()], ...over };
}

beforeEach(() => {
  mockMe();
  vi.mocked(collection.getChoices).mockResolvedValue({ conditions: [], languages: [], listing_statuses: STATUSES });
});

describe("SalePage", () => {
  it("shows stats, listings and the publish button", async () => {
    vi.mocked(api.getListings).mockResolvedValue(listings());
    renderPage("/sale/");
    expect(await screen.findByRole("heading", { name: "For sale" })).toBeInTheDocument();
    const stats = screen.getByRole("region", { name: "Sales summary" });
    expect(within(stats).getByText("€123")).toHaveAttribute("data-tone", "accent");
    expect(within(stats).getByText("1")).toHaveAttribute("data-tone", "warn");
    expect(screen.getByRole("button", { name: "Publish 1 change" })).toBeEnabled();
    const table = screen.getByRole("table");
    for (const header of ["Card", "Set", "Cond.", "Language", "Qty", "Your price", "Market", "Status", "Actions"]) {
      expect(within(table).getByRole("columnheader", { name: header })).toBeInTheDocument();
    }
    const [, row] = within(table).getAllByRole("row");
    expect(within(row).getByText("Counterspell")).toBeInTheDocument();
    expect(within(row).getByText("DMR")).toBeInTheDocument();
    expect(within(row).getByText("€0.80")).toBeInTheDocument();
    expect(within(row).getByText("—")).toBeInTheDocument();
    expect(within(row).getByText("To publish")).toHaveAttribute("data-variant", "pending");
    const edit = within(row).getByRole("link", { name: "Edit Counterspell" });
    expect(edit).toHaveAttribute("href", "/sale/?sell=7");
    expect(edit).toHaveTextContent("Edit");
    expect(screen.getByRole("link", { name: "All" })).toHaveAttribute("aria-current", "true");
    expect(document.title).toBe("For sale · MTG Ledger");
  });

  it("filters by status and shows foil and copies", async () => {
    vi.mocked(api.getListings).mockResolvedValue(
      listings({ status: "sold", results: [sale({ foil: true, quantity: 2, market_price: "1.00" })] }),
    );
    renderPage("/sale/?status=sold");
    const row = within(await screen.findByRole("table")).getAllByRole("row")[1];
    expect(within(row).getByText("Foil")).toBeInTheDocument();
    expect(within(row).getByText("2")).toBeInTheDocument();
    expect(api.getListings).toHaveBeenCalledWith("sold");
    expect(screen.getByRole("link", { name: "Sold" })).toHaveAttribute("aria-current", "true");
    expect(screen.getByRole("link", { name: "Sold" })).toHaveAttribute("href", "/sale/?status=sold");
    expect(screen.getByText("€1.00")).toBeInTheDocument();
  });

  it("publish is disabled with nothing to publish; plural label", async () => {
    vi.mocked(api.getListings).mockResolvedValue(listings({ stats: { active: 0, value: "0", sold_month: 0, to_publish: 0 }, results: [] }));
    renderPage("/sale/");
    expect(await screen.findByRole("button", { name: "Publish 0 changes" })).toBeDisabled();
    const empty = screen.getByText(/Press “Sell” on a card of your/);
    expect(within(empty).getByRole("link", { name: "collection" })).toHaveAttribute("href", "/");
    expect(screen.queryByRole("button", { name: "List cards" })).not.toBeInTheDocument();
  });

  it("publish shows the result, and an error as an error", async () => {
    vi.mocked(api.getListings).mockResolvedValue(listings());
    vi.mocked(api.publish)
      .mockResolvedValueOnce({ messages: [{ level: "success", text: "Published 1 listing to CardTrader." }, { level: "warning", text: "Bolt: not found" }] })
      .mockRejectedValueOnce(new ApiError("Publish failed: down", 502, "service_error"));
    renderPage("/sale/");
    await userEvent.click(await screen.findByRole("button", { name: "Publish 1 change" }));
    expect(await screen.findByText("Bolt: not found")).toHaveAttribute("data-variant", "warning");
    await userEvent.click(screen.getByRole("button", { name: "Publish 1 change" }));
    expect(await screen.findByText("Publish failed: down")).toHaveAttribute("data-variant", "error");
  });

  it("match market prices", async () => {
    vi.mocked(api.getListings).mockResolvedValue(listings());
    vi.mocked(api.matchPrices).mockResolvedValue({ messages: [{ level: "success", text: "All prices already match the market." }] });
    renderPage("/sale/");
    await userEvent.click(await screen.findByRole("button", { name: "Match market prices" }));
    expect(await screen.findByText("All prices already match the market.")).toBeInTheDocument();
  });

  it("on a phone the listings are a list, not a table", async () => {
    vi.stubGlobal("matchMedia", () => ({ matches: true, addEventListener() {}, removeEventListener() {} }));
    vi.mocked(api.getListings).mockResolvedValue(listings({ results: [sale({ foil: true, quantity: 2 })] }));
    renderPage("/sale/");
    const item = (await screen.findByText("Counterspell")).closest("li")!;
    expect(screen.queryByRole("table")).not.toBeInTheDocument();
    expect(item).toHaveTextContent("DMR · NM · EN · ×2");
    expect(within(item).getByText("Foil")).toBeInTheDocument();
    expect(within(item).getByText("€0.80")).toBeInTheDocument();
    expect(within(item).getByText("To publish")).toBeInTheDocument();
    expect(within(item).getByRole("link", { name: "Edit Counterspell" })).toHaveAttribute("href", "/sale/?sell=7");
  });
});
