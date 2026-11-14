import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { chooseOption } from "@/test/select";
import * as api from "../api/catalog";
import * as collection from "../api/collection";
import { ApiError } from "../api/client";
import type { CatalogSearch, Printing } from "../api/catalog";
import { mockMe, renderPage } from "../test/renderPage";

vi.mock("../api/account");
vi.mock("../api/catalog");
vi.mock("../api/collection");

function printing(over: Partial<Printing> = {}): Printing {
  return {
    ct_id: 9001, name: "Ugin, the Spirit Dragon", version: "", image_url: "https://img/ugin.jpg", expansion_code: "m21",
    expansion_name: "Core Set 2021", collector_number: "1", owned_qty: null, category_id: 1, category_name: "Magic Single Card", is_product: false,
    accepts_language: true,
    prices: { trend: "12.75", low: "10.00", avg: "12.50", trend_foil: "14.34", low_foil: null, avg_foil: null },
    ...over,
  };
}

function results(over: Partial<CatalogSearch> = {}): CatalogSearch {
  return {
    searched: true, filters: { q: "ugin", set: "", number: "", category: null, owned: false },
    results: [printing(), printing({ ct_id: 9045, name: "Counterspell", image_url: "", expansion_code: "dmr", expansion_name: "Dominaria Remastered", collector_number: "45", owned_qty: 2, prices: null, version: "Showcase" })],
    count: 2, page: 1, num_pages: 1, prices_date: "2026-11-09T05:00:00Z", ...over,
  };
}

const lastParams = () => vi.mocked(api.searchCatalog).mock.lastCall![0].toString();

beforeEach(() => {
  mockMe();
  vi.mocked(api.getCategories).mockResolvedValue([{ id: 1, name: "Magic Single Card" }, { id: 5, name: "Sealed Product" }]);
  vi.mocked(collection.getChoices).mockResolvedValue({
    conditions: [["NM", "Near Mint"], ["EX", "Excellent"]], languages: [["EN", "English"], ["IT", "Italian"]],
    listing_statuses: [],
  });
  vi.mocked(collection.addToCollection).mockResolvedValue({
    messages: [{ level: "success", text: "Added 1× Ugin, the Spirit Dragon." }], id: 3,
  });
});

const BOOSTER = printing({
  ct_id: 7001, name: "Bloomburrow Play Booster", image_url: "", expansion_code: "blb", expansion_name: "Bloomburrow",
  collector_number: "", category_id: 5, category_name: "Sealed Product", is_product: true, accepts_language: true,
  prices: { trend: "4.20", low: null, avg: null, trend_foil: null, low_foil: null, avg_foil: null },
});

/** Opens the Add dialog of the table row showing `name`. */
async function openAdd(name: string) {
  const table = await screen.findByRole("table");
  const row = within(table).getByText(name).closest("tr")!;
  await userEvent.click(within(row).getByRole("button", { name: "Add" }));
  return screen.findByRole("dialog", { name });
}

describe("CatalogPage", () => {
  it("before searching shows the hint and no table", async () => {
    vi.mocked(api.searchCatalog).mockResolvedValue({ searched: false, filters: { q: "", set: "", number: "", category: null, owned: false } });
    renderPage("/catalog/");
    expect(await screen.findByRole("heading", { name: "Catalog" })).toBeInTheDocument();
    expect(screen.getByText(/sealed products and accessories/i)).toBeInTheDocument();
    expect(screen.queryByRole("table")).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Clear" })).not.toBeInTheDocument();
    expect(document.title).toBe("Catalog · MTG Ledger");
  });

  it("before searching lists the latest releases", async () => {
    vi.mocked(api.searchCatalog).mockResolvedValue({
      ...results({ count: 120, num_pages: 3 }), searched: false,
      filters: { q: "", set: "", number: "", category: null, owned: false },
    });
    renderPage("/catalog/");
    const table = await screen.findByRole("table");
    expect(within(table).getByText("Ugin, the Spirit Dragon")).toBeInTheDocument();
    expect(screen.getByText("Latest releases")).toBeInTheDocument();
    expect(screen.getByText(/Showing 2 of 120 products/)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Next" })).toHaveAttribute("href", "/catalog/?page=2");
    expect(screen.queryByRole("link", { name: "Clear" })).not.toBeInTheDocument();
  });

  it("shows the printings with prices", async () => {
    vi.mocked(api.searchCatalog).mockResolvedValue(results());
    renderPage("/catalog/?q=ugin");
    const table = await screen.findByRole("table");
    expect(within(table).getAllByRole("columnheader").map((h) => h.textContent)).toEqual(
      ["Product", "Set", "Owned", "Trend", "Low", "Avg", "Foil trend", "Foil low", "Foil avg", ""],
    );
    const [, ugin, counter] = within(table).getAllByRole("row");
    expect(within(ugin).getByTitle("Core Set 2021")).toHaveTextContent("M21 #1");
    expect(within(ugin).getByText("€12.75")).toBeInTheDocument();
    expect(within(ugin).getAllByText("—")).toHaveLength(3); // owned, foil low, foil avg
    expect(ugin.querySelector("img")).toHaveAttribute("src", "https://img/ugin.jpg");
    expect(ugin.querySelector("img")).toHaveClass("h-[50px]", "w-9", "object-cover"); // fixed thumbnail size
    expect(within(counter).getByText("2")).toBeInTheDocument();
    expect(within(counter).getByText("Showcase")).toBeInTheDocument();
    expect(within(counter).getAllByText("—")).toHaveLength(6);
    expect(counter.querySelector("img")).toBeNull();
    expect(screen.getByText("Showing 2 of 2 products · Cardmarket price guide of 9 Nov 2026")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Clear" })).toHaveAttribute("href", "/catalog/");
  });

  it("clicking a product's image shows it enlarged", async () => {
    vi.mocked(api.searchCatalog).mockResolvedValue(results());
    renderPage("/catalog/?q=ugin");
    await userEvent.click(await screen.findByRole("button", { name: "Show Ugin, the Spirit Dragon" }));
    const dialog = await screen.findByRole("dialog", { name: "Ugin, the Spirit Dragon" });
    expect(within(dialog).getByRole("img", { name: "Ugin, the Spirit Dragon" })).toHaveAttribute("src", "https://img/ugin.jpg");
    expect(screen.queryByRole("button", { name: "Show Counterspell" })).not.toBeInTheDocument();
  });

  it("searches as you type from the third character, keeping the box focused", async () => {
    vi.mocked(api.searchCatalog).mockResolvedValue(results());
    renderPage("/catalog/?q=ugin");
    const box = await screen.findByLabelText("Search the catalog");
    await userEvent.clear(box);
    await userEvent.type(box, "co");
    await new Promise((r) => setTimeout(r, 400));
    expect(lastParams()).toBe("q=ugin");
    await userEvent.type(box, "unter ");
    await vi.waitFor(() => expect(lastParams()).toBe("q=counter"));
    expect(box).toHaveFocus();
    expect(box).toHaveValue("counter "); // the trailing space being typed is kept
  });

  it("filters: set, number and owned keep the search", async () => {
    vi.mocked(api.searchCatalog).mockResolvedValue(results());
    renderPage("/catalog/?q=ugin");
    await screen.findByRole("table");
    expect(screen.queryByRole("button", { name: "Apply" })).not.toBeInTheDocument();
    // Set and number search as you type, once typing pauses.
    await userEvent.type(screen.getByLabelText("Set code"), "m21");
    await vi.waitFor(() => expect(lastParams()).toBe("q=ugin&set=m21"));
    await userEvent.type(screen.getByLabelText("Collector number"), "007 ");
    await vi.waitFor(() => expect(lastParams()).toBe("q=ugin&set=m21&number=007"));
    expect(screen.getByLabelText("Collector number")).toHaveValue("007 "); // the trailing space being typed is kept
    // Enter searches at once.
    await userEvent.clear(screen.getByLabelText("Set code"));
    await userEvent.type(screen.getByLabelText("Set code"), "dmr{Enter}");
    expect(lastParams()).toBe("q=ugin&set=dmr&number=007");
    await userEvent.click(screen.getByLabelText("In my collection"));
    await vi.waitFor(() => expect(lastParams()).toBe("q=ugin&set=dmr&number=007&owned=1"));
  });

  it("clicking the In my collection pill text toggles the checkbox once", async () => {
    vi.mocked(api.searchCatalog).mockResolvedValue(results());
    renderPage("/catalog/?q=ugin");
    await screen.findByRole("table");
    const box = screen.getByRole("checkbox", { name: "In my collection" });
    expect(box).toHaveAttribute("aria-checked", "false");
    await userEvent.click(screen.getByText("In my collection"));
    await vi.waitFor(() => expect(lastParams()).toBe("q=ugin&owned=1"));
    expect(vi.mocked(api.searchCatalog).mock.calls.filter(([p]) => p.toString() === "q=ugin&owned=1")).toHaveLength(1);
  });

  it("no results and the pager", async () => {
    vi.mocked(api.searchCatalog).mockResolvedValue(
      results({ results: [], count: 0, filters: { q: "", set: "tm21", number: "", category: null, owned: false }, page: 1, num_pages: 1 }),
    );
    renderPage("/catalog/?set=tm21");
    expect(await screen.findByText("Nothing matches these criteria.")).toBeInTheDocument();
  });

  it("the pager keeps the filters", async () => {
    vi.mocked(api.searchCatalog).mockResolvedValue(
      results({ filters: { q: "", set: "tm21", number: "", category: null, owned: true }, page: 1, num_pages: 2, count: 60 }),
    );
    renderPage("/catalog/?set=tm21&owned=1");
    const pager = await screen.findByRole("navigation", { name: "Pagination" });
    expect(within(pager).getByRole("link", { name: "Next" })).toHaveAttribute("href", "/catalog/?set=tm21&owned=1&page=2");
  });

  it("filters by category", async () => {
    vi.mocked(api.searchCatalog).mockResolvedValue(results());
    renderPage("/catalog/?q=ugin");
    await screen.findByRole("table");
    await chooseOption(screen.getByLabelText("Category"), "Sealed Product");
    await vi.waitFor(() => expect(lastParams()).toBe("q=ugin&category=5"));
  });

  it("keeps the category in the pager and clears it", async () => {
    vi.mocked(api.searchCatalog).mockResolvedValue(
      results({ filters: { q: "ugin", set: "", number: "", category: 5, owned: false }, page: 1, num_pages: 2, count: 60 }),
    );
    renderPage("/catalog/?q=ugin&category=5");
    const pager = await screen.findByRole("navigation", { name: "Pagination" });
    expect(within(pager).getByRole("link", { name: "Next" })).toHaveAttribute("href", "/catalog/?q=ugin&category=5&page=2");
    expect(screen.getByLabelText("Category")).toHaveTextContent("Sealed Product");
    expect(screen.getByRole("link", { name: "Clear" })).toHaveAttribute("href", "/catalog/");
  });

  it("on a phone the printings are a list, not a table", async () => {
    vi.stubGlobal("matchMedia", () => ({ matches: true, addEventListener() {}, removeEventListener() {} }));
    vi.mocked(api.searchCatalog).mockResolvedValue(results());
    renderPage("/catalog/?q=ugin");
    const list = await screen.findByRole("list");
    expect(screen.queryByRole("table")).not.toBeInTheDocument();
    const [ugin, counterspell] = within(list).getAllByRole("listitem");
    expect(ugin).toHaveTextContent("Ugin, the Spirit Dragon");
    expect(within(ugin).getByText("M21 #1")).toHaveAttribute("title", "Core Set 2021");
    expect(within(ugin).getByText("€12.75")).toBeInTheDocument();
    expect(within(ugin).getByText("Foil €14.34")).toBeInTheDocument();
    expect(within(ugin).queryByText(/owned/)).not.toBeInTheDocument();
    expect(within(counterspell).getByText("DMR #45 · Showcase")).toBeInTheDocument();
    expect(within(counterspell).getByText("×2 owned")).toHaveAttribute("data-variant", "gold");
    expect(within(counterspell).getByText("Foil —")).toBeInTheDocument();
    expect(screen.getByText(/Showing 2 of 2 products/)).toBeInTheDocument();
  });

  it("on a phone a tap on the image shows the product enlarged", async () => {
    vi.stubGlobal("matchMedia", () => ({ matches: true, addEventListener() {}, removeEventListener() {} }));
    vi.mocked(api.searchCatalog).mockResolvedValue(results());
    renderPage("/catalog/?q=ugin");
    await userEvent.click(await screen.findByRole("button", { name: "Show Ugin, the Spirit Dragon" }));
    const dialog = await screen.findByRole("dialog", { name: "Ugin, the Spirit Dragon" });
    expect(within(dialog).getByRole("img", { name: "Ugin, the Spirit Dragon" })).toHaveAttribute("src", "https://img/ugin.jpg");
    expect(screen.queryByRole("button", { name: "Show Counterspell" })).not.toBeInTheDocument();
  });

  it("on a phone each product has an Add button", async () => {
    vi.stubGlobal("matchMedia", () => ({ matches: true, addEventListener() {}, removeEventListener() {} }));
    vi.mocked(api.searchCatalog).mockResolvedValue(results());
    renderPage("/catalog/?q=ugin");
    const [ugin] = within(await screen.findByRole("list")).getAllByRole("listitem");
    await userEvent.click(within(ugin).getByRole("button", { name: "Add" }));
    expect(await screen.findByRole("dialog", { name: "Ugin, the Spirit Dragon" })).toBeInTheDocument();
  });
});

describe("Adding from the catalog", () => {
  it("adds a card from its row", async () => {
    vi.mocked(api.searchCatalog).mockResolvedValue(results());
    renderPage("/catalog/?q=ugin");
    const dialog = await openAdd("Ugin, the Spirit Dragon");
    expect(dialog).toHaveTextContent("M21 #1");
    expect(within(dialog).getByLabelText("Condition")).toHaveTextContent("Near Mint");
    expect(within(dialog).getByLabelText("Language")).toHaveTextContent("English");
    expect(within(dialog).getByLabelText("Quantity")).toHaveValue(1);
    expect(within(dialog).queryByLabelText("Unit price")).toBeNull();
    await chooseOption(within(dialog).getByLabelText("Condition"), "Excellent");
    await chooseOption(within(dialog).getByLabelText("Language"), "Italian");
    await userEvent.click(within(dialog).getByLabelText("Foil"));
    await userEvent.clear(within(dialog).getByLabelText("Quantity"));
    await userEvent.type(within(dialog).getByLabelText("Quantity"), "2");
    await userEvent.click(within(dialog).getByRole("button", { name: "Add to collection" }));
    expect(collection.addToCollection).toHaveBeenCalledWith(
      { blueprint: 9001, condition: "EX", language: "IT", foil: true, quantity: "2" },
    );
    expect(await screen.findByText("Added 1× Ugin, the Spirit Dragon.")).toBeInTheDocument();
    await vi.waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    const search = screen.getByLabelText("Search the catalog");
    await vi.waitFor(() => expect(search).toHaveFocus());
    expect(search).toHaveValue("ugin");
  });

  it("adds a product that takes a language", async () => {
    vi.mocked(api.searchCatalog).mockResolvedValue(results({ results: [BOOSTER] }));
    renderPage("/catalog/?q=bloomburrow");
    const dialog = await openAdd("Bloomburrow Play Booster");
    expect(within(dialog).queryByLabelText("Condition")).toBeNull();
    expect(within(dialog).queryByLabelText("Foil")).toBeNull();
    await userEvent.click(within(dialog).getByRole("button", { name: "Add to collection" }));
    expect(collection.addToCollection).toHaveBeenCalledWith({ blueprint: 7001, language: "EN", quantity: "1" });
  });

  it("adds a product without language", async () => {
    vi.mocked(api.searchCatalog).mockResolvedValue(results({ results: [{ ...BOOSTER, accepts_language: false }] }));
    renderPage("/catalog/?q=bloomburrow");
    const dialog = await openAdd("Bloomburrow Play Booster");
    expect(within(dialog).queryByLabelText("Language")).toBeNull();
    await userEvent.click(within(dialog).getByRole("button", { name: "Add to collection" }));
    expect(collection.addToCollection).toHaveBeenCalledWith({ blueprint: 7001, quantity: "1" });
  });

  it("shows field errors in the dialog", async () => {
    vi.mocked(api.searchCatalog).mockResolvedValue(results());
    vi.mocked(collection.addToCollection).mockRejectedValue(
      new ApiError("x", 400, "invalid", undefined, { quantity: ["Ensure this value is greater than or equal to 1."] }),
    );
    renderPage("/catalog/?q=ugin");
    const dialog = await openAdd("Ugin, the Spirit Dragon");
    await userEvent.click(within(dialog).getByRole("button", { name: "Add to collection" }));
    expect(await within(dialog).findByText("Ensure this value is greater than or equal to 1.")).toBeInTheDocument();
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.queryByText("x")).toBeNull(); // no message banner
  });

  it("shows other errors inside the dialog", async () => {
    vi.mocked(api.searchCatalog).mockResolvedValue(results());
    vi.mocked(collection.addToCollection).mockRejectedValue(new ApiError("CardTrader is unreachable.", 502, "error"));
    renderPage("/catalog/?q=ugin");
    const dialog = await openAdd("Ugin, the Spirit Dragon");
    await userEvent.click(within(dialog).getByRole("button", { name: "Add to collection" }));
    expect(await within(dialog).findByText("CardTrader is unreachable.")).toBeInTheDocument();
  });

  it("starts from the defaults on every opening", async () => {
    vi.mocked(api.searchCatalog).mockResolvedValue(results());
    renderPage("/catalog/?q=ugin");
    let dialog = await openAdd("Ugin, the Spirit Dragon");
    await chooseOption(within(dialog).getByLabelText("Language"), "Italian");
    await userEvent.click(within(dialog).getByRole("button", { name: "Add to collection" }));
    await vi.waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    dialog = await openAdd("Counterspell");
    expect(within(dialog).getByLabelText("Language")).toHaveTextContent("English");
    expect(within(dialog).getByLabelText("Quantity")).toHaveValue(1);
  });
});
