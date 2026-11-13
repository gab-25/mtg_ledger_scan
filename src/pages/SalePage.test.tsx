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
    expect(screen.getByText("No listings yet. Use “List cards” to put cards from your collection on sale.")).toBeInTheDocument();
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
  function detail(over: Partial<api.ListingDetail["listing"]> = {}, cm: string | null = "1.20"): api.ListingDetail {
    return {
      item: { id: 7, name: "Counterspell", set_code: "DMR", condition: "NM", language: "EN", foil: false, quantity: 2 },
      listing: { exists: false, quantity: 1, price: "0.50", market_price: null, status: "to_publish", ...over },
      cm_suggestion: cm,
    };
  }

  async function pick(listing: api.ListingDetail) {
    vi.mocked(collection.getCollection).mockResolvedValue(page([row()]));
    vi.mocked(api.getListing).mockResolvedValue(listing);
    const dialog = await openQuickList();
    await userEvent.type(within(dialog).getByRole("searchbox", { name: "Search your collection" }), "coun");
    await userEvent.click(await within(dialog).findByRole("button", { name: /Counterspell/ }));
    await within(dialog).findByRole("spinbutton", { name: "Price" });
    return dialog;
  }

  it("lists a new card at the Cardmarket trend and goes back to the search", async () => {
    vi.mocked(api.saveListing).mockResolvedValue({ messages: [{ level: "success", text: "Listing for Counterspell saved." }] });
    const dialog = await pick(detail());
    expect(api.getListing).toHaveBeenCalledWith(7);
    expect(within(dialog).getByRole("spinbutton", { name: "Quantity" })).toHaveValue(1);
    expect(within(dialog).getByRole("spinbutton", { name: "Price" })).toHaveValue(1.2);
    expect(within(dialog).getByRole("combobox", { name: "Status" })).toHaveTextContent("To publish");
    expect(within(dialog).getByText("€1.20")).toBeInTheDocument();
    expect(within(dialog).getByRole("button", { name: "List" })).toBeInTheDocument();
    const calls = vi.mocked(collection.getCollection).mock.calls.length;
    await userEvent.type(within(dialog).getByRole("spinbutton", { name: "Price" }), "{Enter}");
    expect(api.saveListing).toHaveBeenCalledWith(7, { quantity: "1", price: "1.20", market_price: "", status: "to_publish" });
    expect(await within(dialog).findByRole("status")).toHaveTextContent("Listed Counterspell.");
    const box = within(dialog).getByRole("searchbox", { name: "Search your collection" });
    expect(box).toHaveValue("coun");
    expect(box).toHaveFocus();
    await within(dialog).findByRole("button", { name: /Counterspell/ });
    expect(vi.mocked(collection.getCollection).mock.calls.length).toBeGreaterThan(calls);
  });

  it("edits an existing listing", async () => {
    vi.mocked(api.saveListing).mockResolvedValue({ messages: [] });
    const dialog = await pick(detail({ exists: true, quantity: 2, price: "3.00", market_price: "2.80", status: "published" }));
    expect(within(dialog).getByRole("spinbutton", { name: "Price" })).toHaveValue(3);
    expect(within(dialog).getByRole("spinbutton", { name: "Quantity" })).toHaveValue(2);
    await userEvent.click(within(dialog).getByRole("button", { name: "Save listing" }));
    expect(api.saveListing).toHaveBeenCalledWith(7, { quantity: "2", price: "3.00", market_price: "2.80", status: "published" });
    expect(await within(dialog).findByRole("status")).toHaveTextContent("Saved Counterspell.");
  });

  it("without a trend the price is the listing default and there is no Use", async () => {
    const dialog = await pick(detail({}, null));
    expect(within(dialog).getByRole("spinbutton", { name: "Price" })).toHaveValue(0.5);
    expect(within(dialog).getByText("—")).toBeInTheDocument();
    expect(within(dialog).queryByRole("button", { name: "Use" })).not.toBeInTheDocument();
  });

  it("shows field errors and other failures inside the dialog", async () => {
    vi.mocked(api.saveListing)
      .mockRejectedValueOnce(new ApiError("Invalid", 400, "invalid", undefined, { quantity: ["You only own 2 copies."] }))
      .mockRejectedValueOnce(new ApiError("Listing not saved: down", 502, "service_error"));
    const dialog = await pick(detail());
    await userEvent.click(within(dialog).getByRole("button", { name: "List" }));
    expect(await within(dialog).findByText("You only own 2 copies.")).toBeInTheDocument();
    await userEvent.click(within(dialog).getByRole("button", { name: "List" }));
    expect(await within(dialog).findByText("Listing not saved: down")).toBeInTheDocument();
    expect(within(dialog).getByRole("spinbutton", { name: "Price" })).toBeInTheDocument();
  });

  it("Back returns to the results without saving", async () => {
    const dialog = await pick(detail());
    await userEvent.click(within(dialog).getByRole("button", { name: "Back" }));
    expect(await within(dialog).findByRole("button", { name: /Counterspell/ })).toBeInTheDocument();
    expect(api.saveListing).not.toHaveBeenCalled();
  });
  it("Escape clears the search first, then closes", async () => {
    vi.mocked(collection.getCollection).mockResolvedValue(page([row()]));
    const dialog = await openQuickList();
    const box = within(dialog).getByRole("searchbox", { name: "Search your collection" });
    await userEvent.type(box, "coun");
    await userEvent.keyboard("{Escape}");
    expect(screen.getByRole("dialog", { name: "List cards" })).toBeInTheDocument();
    expect(box).toHaveValue("");
    await userEvent.keyboard("{Escape}");
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });
  it("a card picked again starts from the server's current listing, not the cached one", async () => {
    const dialog = await pick(detail());
    await userEvent.click(within(dialog).getByRole("button", { name: "Back" }));
    vi.mocked(api.getListing).mockResolvedValue(detail({ exists: true, price: "9.99", status: "published" }));
    await userEvent.click(await within(dialog).findByRole("button", { name: /Counterspell/ }));
    expect(await within(dialog).findByRole("button", { name: "Save listing" })).toBeInTheDocument();
    expect(within(dialog).getByRole("spinbutton", { name: "Price" })).toHaveValue(9.99);
  });

  it("a listing that fails to load says so and can go back", async () => {
    vi.mocked(collection.getCollection).mockResolvedValue(page([row()]));
    vi.mocked(api.getListing).mockRejectedValue(new ApiError("Not found.", 404, "not_found"));
    const dialog = await openQuickList();
    await userEvent.type(within(dialog).getByRole("searchbox", { name: "Search your collection" }), "coun");
    await userEvent.click(await within(dialog).findByRole("button", { name: /Counterspell/ }));
    expect(await within(dialog).findByText("Not found.")).toBeInTheDocument();
    await userEvent.click(within(dialog).getByRole("button", { name: "Back" }));
    expect(await within(dialog).findByRole("button", { name: /Counterspell/ })).toBeInTheDocument();
  });

  it("a search that fails says so", async () => {
    vi.mocked(collection.getCollection).mockRejectedValue(new ApiError("Server error.", 500, "error"));
    const dialog = await openQuickList();
    await userEvent.type(within(dialog).getByRole("searchbox", { name: "Search your collection" }), "coun{Enter}");
    expect(await within(dialog).findByText("Server error.")).toBeInTheDocument();
  });
});
