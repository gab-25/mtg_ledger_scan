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
    const card = screen.getByRole("article");
    expect(within(card).getByText("DMR · NM · EN")).toBeInTheDocument();
    expect(within(card).getByText("—")).toBeInTheDocument();
    expect(within(card).getByText("€0.80")).toBeInTheDocument();
    expect(within(card).getByRole("link", { name: /^Edit listing\s*for Counterspell$/ })).toHaveAttribute("href", "/sale/7/");
    expect(screen.getByRole("link", { name: "All" })).toHaveAttribute("aria-current", "true");
    expect(document.title).toBe("For sale · MTG Ledger");
  });

  it("filters by status and shows foil and copies", async () => {
    vi.mocked(api.getListings).mockResolvedValue(
      listings({ status: "sold", results: [sale({ foil: true, quantity: 2, market_price: "1.00" })] }),
    );
    renderPage("/sale/?status=sold");
    expect(await screen.findByText("DMR · NM · EN · FOIL · ×2")).toBeInTheDocument();
    expect(api.getListings).toHaveBeenCalledWith("sold");
    expect(screen.getByRole("link", { name: "Sold" })).toHaveAttribute("aria-current", "true");
    expect(screen.getByRole("link", { name: "Sold" })).toHaveAttribute("href", "/sale/?status=sold");
    expect(screen.getByText("€1.00")).toBeInTheDocument();
  });

  it("publish is disabled with nothing to publish; plural label", async () => {
    vi.mocked(api.getListings).mockResolvedValue(listings({ stats: { active: 0, value: "0", sold_month: 0, to_publish: 0 }, results: [] }));
    renderPage("/sale/");
    expect(await screen.findByRole("button", { name: "Publish 0 changes" })).toBeDisabled();
    const empty = screen.getByText(/No listings yet/);
    expect(within(empty).getByRole("link", { name: "collection" })).toHaveAttribute("href", "/");
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
});

function row(over: Partial<collection.CollectionRow> = {}): collection.CollectionRow {
  return {
    id: 7, name: "Counterspell", set_code: "DMR", is_product: false, category_id: null, category_name: null, foil: false,
    condition: "NM", condition_label: "Near Mint", language: "EN", quantity: 2, price: "0.50",
    badge: { label: "In collection", tone: "neutral" }, ...over,
  };
}

function page(rows: collection.CollectionRow[]): collection.Collection {
  return {
    results: rows, count: rows.length, page: 1, num_pages: 1,
    stats: { total: 2, unique: 1, value: "1.00", for_sale: 0 }, sets: [], categories: [], filtered: true,
  };
}

async function openQuickList() {
  vi.mocked(api.getListings).mockResolvedValue(listings());
  renderPage("/sale/");
  await userEvent.click(await screen.findByRole("button", { name: "List cards" }));
  return screen.getByRole("dialog", { name: "List cards" });
}

describe("Quick list", () => {
  it("opens from the page head and searches the collection", async () => {
    vi.mocked(collection.getCollection).mockResolvedValue(page([row()]));
    const dialog = await openQuickList();
    expect(within(dialog).getByText("Type at least 3 letters to find a card.")).toBeInTheDocument();
    await userEvent.type(within(dialog).getByRole("searchbox", { name: "Search your collection" }), "coun");
    const result = await within(dialog).findByRole("button", { name: /Counterspell/ });
    const params = vi.mocked(collection.getCollection).mock.lastCall![0];
    expect(params.get("q")).toBe("coun");
    expect(within(result).getByText("DMR · NM · EN · ×2")).toBeInTheDocument();
    expect(within(result).getByText("In collection")).toBeInTheDocument();
  });

  it("says when nothing matches", async () => {
    vi.mocked(collection.getCollection).mockResolvedValue(page([]));
    const dialog = await openQuickList();
    await userEvent.type(within(dialog).getByRole("searchbox", { name: "Search your collection" }), "zzz{Enter}");
    expect(await within(dialog).findByText("No cards match.")).toBeInTheDocument();
  });
});
