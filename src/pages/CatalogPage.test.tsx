import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { chooseOption } from "@/test/select";
import * as api from "../api/catalog";
import type { CatalogSearch, Printing } from "../api/catalog";
import { mockMe, renderPage } from "../test/renderPage";

vi.mock("../api/account");
vi.mock("../api/catalog");

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
});

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

  it("shows the printings with prices", async () => {
    vi.mocked(api.searchCatalog).mockResolvedValue(results());
    renderPage("/catalog/?q=ugin");
    const table = await screen.findByRole("table");
    expect(within(table).getAllByRole("columnheader").map((h) => h.textContent)).toEqual(
      ["Product", "Set", "Owned", "Trend", "Low", "Avg", "Foil trend", "Foil low", "Foil avg"],
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

  it("filters: set, number and owned keep the search", async () => {
    vi.mocked(api.searchCatalog).mockResolvedValue(results());
    renderPage("/catalog/?q=ugin");
    await screen.findByRole("table");
    await userEvent.type(screen.getByLabelText("Set code"), "m21");
    await userEvent.type(screen.getByLabelText("Collector number"), "007");
    await userEvent.click(screen.getByRole("button", { name: "Apply" }));
    await vi.waitFor(() => expect(lastParams()).toBe("q=ugin&set=m21&number=007"));
    await userEvent.click(screen.getByLabelText("In my collection"));
    await vi.waitFor(() => expect(lastParams()).toBe("q=ugin&set=m21&number=007&owned=1"));
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
});
