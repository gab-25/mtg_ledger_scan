import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { chooseOption } from "@/test/select";
import * as api from "../api/collection";
import type { Collection, CollectionRow } from "../api/collection";
import { mockMe, renderPage } from "../test/renderPage";

vi.mock("../api/account");
vi.mock("../api/collection");
vi.mock("../api/sale");

export function row(over: Partial<CollectionRow> = {}): CollectionRow {
  return {
    id: 7, name: "Thoughtseize", set_code: "2XM", is_product: false, category_id: 1, category_name: "Magic Single Card",
    image_url: "https://img/thoughtseize.jpg", foil: false, condition: "NM", condition_label: "Near Mint", language: "EN",
    quantity: 3, price: "12.00",
    badge: { label: "In collection", tone: "neutral" }, ...over,
  };
}

function collection(over: Partial<Collection> = {}): Collection {
  return {
    results: [row()], count: 1, page: 1, num_pages: 1,
    stats: { total: 1234, unique: 12, value: "1234.50", for_sale: 3 },
    sets: ["2XM", "LTR"], filtered: false,
    categories: [{ id: 1, name: "Magic Single Card" }, { id: 5, name: "Sealed Product" }],
    ...over,
  };
}

const lastParams = () => vi.mocked(api.getCollection).mock.lastCall![0].toString();

beforeEach(() => {
  mockMe();
  vi.mocked(api.getChoices).mockResolvedValue({
    conditions: [["NM", "Near Mint"], ["EX", "Excellent"]],
    languages: [["EN", "English"], ["IT", "Italian"]],
    listing_statuses: [["published", "Published"], ["to_publish", "To publish"], ["sold", "Sold"]],
  });
});

describe("CollectionPage", () => {
  it("shows the stats and the cards", async () => {
    vi.mocked(api.getCollection).mockResolvedValue(collection());
    renderPage("/");
    expect(await screen.findByRole("heading", { name: "Collection" })).toBeInTheDocument();
    const stats = screen.getByRole("region", { name: "Summary" });
    expect(within(stats).getByText("1,234")).toBeInTheDocument();
    expect(within(stats).getByText("€1,235")).toHaveAttribute("data-tone", "accent");
    const table = screen.getByRole("table");
    expect(within(table).queryByRole("link", { name: "Thoughtseize" })).not.toBeInTheDocument();
    expect(within(table).getByRole("link", { name: "Edit Thoughtseize" })).toHaveAttribute("href", "/?edit=7");
    expect(within(table).getByRole("link", { name: "Sell Thoughtseize" })).toHaveAttribute("href", "/?sell=7");
    expect(within(table).getByRole("columnheader", { name: "Actions" })).toBeInTheDocument();
    expect(within(table).getByRole("link", { name: "Edit Thoughtseize" })).toHaveTextContent("Edit");
    expect(within(table).getByRole("link", { name: "Sell Thoughtseize" })).toHaveTextContent("Sell");
    expect(within(table).getByTitle("Near Mint")).toHaveTextContent("NM");
    expect(within(table).getByRole("columnheader", { name: "Trend" })).toBeInTheDocument();
    expect(within(table).getByText("€12.00")).toBeInTheDocument();
    expect(within(table).getByText("In collection")).toHaveAttribute("data-variant", "neutral");
    expect(screen.getByText("Showing 1 of 1 entries")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Export CSV" })).toHaveAttribute("href", "/api/collection/export/");
    expect(screen.getByRole("link", { name: "Scan cards" })).toHaveAttribute("href", "/scan/");
    expect(screen.getByRole("link", { name: "Add cards" })).toHaveAttribute("href", "/catalog/");
    expect(document.title).toBe("Collection · MTG Ledger");
  });

  it("shows a thumbnail and the card enlarged on hover or focus", async () => {
    vi.mocked(api.getCollection).mockResolvedValue(collection({ results: [row(), row({ id: 8, name: "Loose Card", image_url: "" })] }));
    renderPage("/");
    const [, card, loose] = within(await screen.findByRole("table")).getAllByRole("row");
    expect(card.querySelector("img")).toHaveAttribute("src", "https://img/thoughtseize.jpg");
    expect(loose.querySelector("img")).toBeNull();
    await userEvent.hover(card.querySelector("img")!);
    expect(await screen.findByRole("img", { name: "Thoughtseize" })).toHaveAttribute("src", "https://img/thoughtseize.jpg");
    await userEvent.unhover(card.querySelector("img")!);
    await waitFor(() => expect(screen.queryByRole("img", { name: "Thoughtseize" })).not.toBeInTheDocument());
    (within(card).getByText("Thoughtseize").closest("[tabindex]") as HTMLElement).focus();
    expect(await screen.findByRole("img", { name: "Thoughtseize" })).toBeInTheDocument();
  });

  it("a card without image has no preview", async () => {
    vi.mocked(api.getCollection).mockResolvedValue(collection({ results: [row({ image_url: "" })] }));
    renderPage("/");
    await userEvent.hover(await screen.findByText("Thoughtseize"));
    await new Promise((r) => setTimeout(r, 400));
    expect(screen.queryByRole("img", { name: "Thoughtseize" })).not.toBeInTheDocument();
  });

  it("a cold link with filters asks the server for them", async () => {
    vi.mocked(api.getCollection).mockResolvedValue(collection({ filtered: true, page: 2, num_pages: 3 }));
    renderPage("/?category=5&q=seize&page=2");
    await screen.findByRole("table");
    expect(lastParams()).toBe("category=5&q=seize&page=2");
    expect(screen.getByLabelText("Search cards")).toHaveValue("seize");
    expect(screen.getByLabelText("Category")).toHaveTextContent("Sealed Product");
    const pager = screen.getByRole("navigation", { name: "Pagination" });
    expect(within(pager).getByRole("link", { name: "Next" })).toHaveAttribute("href", "/?category=5&q=seize&page=3");
    expect(screen.getByRole("link", { name: "Clear filters" })).toHaveAttribute("href", "/");
  });

  it("the foil pill keeps the other filters and drops the page", async () => {
    vi.mocked(api.getCollection).mockResolvedValue(collection({ filtered: true }));
    renderPage("/?category=1&foil=1&page=2");
    await screen.findByRole("table");
    expect(screen.getByRole("link", { name: "Foil only" })).toHaveAttribute("href", "/?category=1");
    expect(screen.getByRole("link", { name: "Foil only" })).toHaveAttribute("aria-current", "true");
  });

  it("has no color filters, pips or type line", async () => {
    vi.mocked(api.getCollection).mockResolvedValue(collection());
    renderPage("/");
    await screen.findByRole("table");
    expect(screen.queryByRole("link", { name: "All" })).toBeNull();
    expect(screen.queryByRole("link", { name: "Black" })).toBeNull();
    expect(screen.queryByText("Sorcery")).toBeNull();
    expect(screen.getByPlaceholderText("Search by name or set…")).toBeInTheDocument();
  });

  it("filters by category", async () => {
    vi.mocked(api.getCollection).mockResolvedValue(collection());
    renderPage("/?q=bolt");
    await chooseOption(await screen.findByLabelText("Category"), "Sealed Product");
    await vi.waitFor(() => expect(lastParams()).toBe("q=bolt&category=5"));
    await chooseOption(screen.getByLabelText("Category"), "All categories");
    await vi.waitFor(() => expect(lastParams()).toBe("q=bolt"));
  });

  it("shows products without condition or foil", async () => {
    const booster = row({ id: 9, name: "Play Booster", is_product: true, category_id: 5, category_name: "Sealed Product", quantity: 1 });
    vi.mocked(api.getCollection).mockResolvedValue(collection({ results: [booster] }));
    renderPage("/");
    const table = await screen.findByRole("table");
    const [, product] = within(table).getAllByRole("row");
    expect(within(product).queryByText("NM")).toBeNull();
    expect(within(product).getByText("—")).toBeInTheDocument();
  });

  it("on a phone products have no condition", async () => {
    vi.stubGlobal("matchMedia", () => ({ matches: true, addEventListener() {}, removeEventListener() {} }));
    const booster = row({ id: 9, name: "Play Booster", set_code: "BLB", is_product: true, quantity: 1 });
    vi.mocked(api.getCollection).mockResolvedValue(collection({ results: [booster] }));
    renderPage("/");
    const card = (await screen.findByText("Play Booster")).closest("li")!;
    expect(card).toHaveTextContent("BLB · EN · ×1");
  });

  it("search and selects reload with the filters", async () => {
    vi.mocked(api.getCollection).mockResolvedValue(collection());
    renderPage("/?foil=1");
    await userEvent.type(await screen.findByLabelText("Search cards"), "bolt{Enter}");
    await vi.waitFor(() => expect(lastParams()).toBe("foil=1&q=bolt"));
    await chooseOption(screen.getByLabelText("Set"), "LTR");
    await vi.waitFor(() => expect(lastParams()).toBe("foil=1&q=bolt&set=LTR"));
    await chooseOption(screen.getByLabelText("Condition"), "Near Mint");
    await vi.waitFor(() => expect(lastParams()).toBe("foil=1&q=bolt&set=LTR&cond=NM"));
  });

  it("searches as you type from the third character, and again when cleared", async () => {
    vi.mocked(api.getCollection).mockResolvedValue(collection());
    renderPage("/?foil=1");
    const box = await screen.findByLabelText("Search cards");
    await userEvent.type(box, "bo");
    await new Promise((r) => setTimeout(r, 400));
    expect(lastParams()).toBe("foil=1");
    await userEvent.type(box, "lt");
    await vi.waitFor(() => expect(lastParams()).toBe("foil=1&q=bolt"));
    expect(vi.mocked(api.getCollection).mock.calls.filter(([p]) => p.toString().includes("q="))).toHaveLength(1); // debounced
    expect(box).toHaveFocus();
    await userEvent.clear(box);
    await vi.waitFor(() => expect(lastParams()).toBe("foil=1"));
  });

  it("the search box has no browser autocomplete and clears with its button or Escape", async () => {
    vi.mocked(api.getCollection).mockResolvedValue(collection());
    renderPage("/?q=bolt");
    const box = await screen.findByLabelText("Search cards");
    expect(box).toHaveAttribute("autocomplete", "off");
    await userEvent.click(screen.getByRole("button", { name: "Clear search" }));
    expect(box).toHaveValue("");
    expect(box).toHaveFocus();
    await vi.waitFor(() => expect(lastParams()).toBe(""));
    expect(screen.queryByRole("button", { name: "Clear search" })).not.toBeInTheDocument();
    await userEvent.type(box, "bolt{Enter}");
    await vi.waitFor(() => expect(lastParams()).toBe("q=bolt"));
    await userEvent.keyboard("{Escape}");
    await vi.waitFor(() => expect(lastParams()).toBe(""));
  });

  it("the All item of a select clears that filter", async () => {
    vi.mocked(api.getCollection).mockResolvedValue(collection());
    renderPage("/?set=LTR&cond=NM");
    await chooseOption(await screen.findByLabelText("Set"), "All sets");
    await vi.waitFor(() => expect(lastParams()).toBe("cond=NM"));
    await chooseOption(screen.getByLabelText("Condition"), "All conditions");
    await vi.waitFor(() => expect(lastParams()).toBe(""));
  });

  it("empty states", async () => {
    vi.mocked(api.getCollection).mockResolvedValue(collection({ results: [], count: 0 }));
    renderPage("/");
    const empty = await screen.findByText(/Your collection is empty/);
    expect(within(empty).getByRole("link", { name: "Add cards from the catalog" })).toHaveAttribute("href", "/catalog/");
    expect(within(empty).getByRole("link", { name: "import a CSV" })).toHaveAttribute("href", "/cards/import/");
    expect(screen.queryByRole("link", { name: "Clear filters" })).not.toBeInTheDocument();
  });

  it("empty filtered result", async () => {
    vi.mocked(api.getCollection).mockResolvedValue(collection({ results: [], count: 0, filtered: true }));
    renderPage("/?q=zzz");
    expect(await screen.findByText("No cards match these filters.")).toBeInTheDocument();
  });

  it("on a phone the cards are a list, not a table", async () => {
    const matchMedia = (query: string) =>
      ({ matches: query === "(max-width: 839px)", addEventListener() {}, removeEventListener() {} }) as unknown as MediaQueryList;
    vi.stubGlobal("matchMedia", matchMedia);
    vi.mocked(api.getCollection).mockResolvedValue(collection({ results: [row({ foil: true })] }));
    renderPage("/");
    const card = (await screen.findByText("Thoughtseize")).closest("li")!;
    expect(screen.queryByRole("table")).not.toBeInTheDocument();
    expect(within(card).getAllByRole("link").map((l) => l.getAttribute("href"))).toEqual(["/?edit=7", "/?sell=7"]);
    expect(within(card).getByRole("link", { name: "Edit Thoughtseize" })).toBeInTheDocument();
    expect(within(card).getByRole("link", { name: "Edit Thoughtseize" })).toHaveTextContent("Edit");
    expect(within(card).getByRole("link", { name: "Sell Thoughtseize" })).toHaveTextContent("Sell");
    expect(card).toHaveTextContent("2XM · NM · EN · ×3");
    expect(within(card).getByText("Foil")).toBeInTheDocument();
    expect(within(card).getByText("€12.00")).toBeInTheDocument();
    expect(within(card).getByText("In collection")).toHaveAttribute("data-variant", "neutral");
    expect(card.querySelector("img")).toHaveAttribute("src", "https://img/thoughtseize.jpg");
  });

  it("on a phone a tap on the thumbnail shows the card enlarged", async () => {
    vi.stubGlobal("matchMedia", () => ({ matches: true, addEventListener() {}, removeEventListener() {} }));
    vi.mocked(api.getCollection).mockResolvedValue(collection({ results: [row()] }));
    renderPage("/");
    await userEvent.click(await screen.findByRole("button", { name: "Show Thoughtseize" }));
    const dialog = await screen.findByRole("dialog", { name: "Thoughtseize" });
    expect(within(dialog).getByRole("img", { name: "Thoughtseize" })).toHaveAttribute("src", "https://img/thoughtseize.jpg");
    await userEvent.click(within(dialog).getByRole("button", { name: "Close" }));
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
  });

  it("on a touch screen a tap on a table row's card shows it enlarged", async () => {
    const matchMedia = (query: string) =>
      ({ matches: query === "(hover: none)", addEventListener() {}, removeEventListener() {} }) as unknown as MediaQueryList;
    vi.stubGlobal("matchMedia", matchMedia);
    vi.mocked(api.getCollection).mockResolvedValue(collection({ results: [row()] }));
    renderPage("/");
    const [, card] = within(await screen.findByRole("table")).getAllByRole("row");
    await userEvent.click(within(card).getByText("Thoughtseize"));
    const dialog = await screen.findByRole("dialog", { name: "Thoughtseize" });
    expect(within(dialog).getByRole("img", { name: "Thoughtseize" })).toBeInTheDocument();
  });

  it("on a phone a card without image keeps the placeholder", async () => {
    vi.stubGlobal("matchMedia", () => ({ matches: true, addEventListener() {}, removeEventListener() {} }));
    vi.mocked(api.getCollection).mockResolvedValue(collection({ results: [row({ image_url: "" })] }));
    renderPage("/");
    const card = (await screen.findByText("Thoughtseize")).closest("li")!;
    expect(card.querySelector("img")).toBeNull();
    expect(screen.queryByRole("button", { name: "Show Thoughtseize" })).not.toBeInTheDocument();
  });

  it("shows a dash without a trend", async () => {
    vi.mocked(api.getCollection).mockResolvedValue(collection({ results: [row({ price: null })] }));
    renderPage("/");
    const cells = within(await screen.findByRole("table")).getAllByRole("cell");
    const header = screen.getAllByRole("columnheader").map((h) => h.textContent);
    expect(cells[header.indexOf("Trend")]).toHaveTextContent(/^—$/);
  });

  it("on a phone a card without a trend shows a dash", async () => {
    vi.stubGlobal("matchMedia", () => ({ matches: true, addEventListener() {}, removeEventListener() {} }));
    vi.mocked(api.getCollection).mockResolvedValue(collection({ results: [row({ price: null })] }));
    renderPage("/");
    const card = (await screen.findByText("Thoughtseize")).closest("li")!;
    expect(within(card).getByText("—")).toBeInTheDocument();
  });

  it("an empty collection on a phone says so", async () => {
    vi.stubGlobal("matchMedia", () => ({ matches: true, addEventListener() {}, removeEventListener() {} }));
    vi.mocked(api.getCollection).mockResolvedValue(collection({ results: [], count: 0, filtered: true }));
    renderPage("/?q=zzz");
    expect(await screen.findByText("No cards match these filters.")).toBeInTheDocument();
  });
  it("the row buttons keep the search, filters and page", async () => {
    vi.mocked(api.getCollection).mockResolvedValue(collection({ page: 2, num_pages: 3 }));
    renderPage("/?q=thought&set=2XM&page=2");
    expect(await screen.findByRole("link", { name: "Edit Thoughtseize" })).toHaveAttribute("href", "/?q=thought&set=2XM&page=2&edit=7");
    expect(screen.getByRole("link", { name: "Sell Thoughtseize" })).toHaveAttribute("href", "/?q=thought&set=2XM&page=2&sell=7");
  });

  it("opening a dialog doesn't reload the list, and Back closes it", async () => {
    vi.mocked(api.getCollection).mockResolvedValue(collection());
    vi.mocked(api.getItem).mockResolvedValue({
      id: 7, name: "Thoughtseize", set_code: "2XM", collector_number: "107", is_product: false, category_id: 1,
      category_name: "Magic Single Card", condition: "NM", language: "EN", foil: false, quantity: 3, price: "12.00",
      has_listing: false,
    });
    renderPage("/?q=thought");
    await userEvent.click(await screen.findByRole("link", { name: "Edit Thoughtseize" }));
    expect(await screen.findByRole("dialog", { name: "Thoughtseize" })).toBeInTheDocument();
    expect(api.getCollection).toHaveBeenCalledTimes(1);
    await userEvent.keyboard("{Escape}");
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    expect(screen.getByRole("searchbox", { name: "Search cards" })).toHaveValue("thought");
    expect(screen.getByRole("link", { name: "Edit Thoughtseize" })).toHaveAttribute("href", "/?q=thought&edit=7");
    expect(api.getCollection).toHaveBeenCalledTimes(1);
  });
});
