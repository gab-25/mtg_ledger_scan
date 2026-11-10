import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { chooseOption } from "@/test/select";
import * as api from "../api/collection";
import type { Collection, CollectionRow } from "../api/collection";
import { mockMe, renderPage } from "../test/renderPage";

vi.mock("../api/account");
vi.mock("../api/collection");

export function row(over: Partial<CollectionRow> = {}): CollectionRow {
  return {
    id: 7, name: "Thoughtseize", type_line: "Sorcery", set_code: "2XM", foil: false, condition: "NM",
    condition_label: "Near Mint", language: "EN", quantity: 3, price: "12.00", pip: "#8B8197",
    badge: { label: "In collection", tone: "neutral" }, ...over,
  };
}

function collection(over: Partial<Collection> = {}): Collection {
  return {
    results: [row()], count: 1, page: 1, num_pages: 1,
    stats: { total: 1234, unique: 12, value: "1234.50", for_sale: 3 },
    sets: ["2XM", "LTR"], filtered: false,
    color_filters: [
      { code: "W", label: "White", pip: "#F3EBD3" }, { code: "U", label: "Blue", pip: "#6FA8DC" },
      { code: "B", label: "Black", pip: "#8B8197" }, { code: "R", label: "Red", pip: "#E07A5F" },
      { code: "G", label: "Green", pip: "#6BAF7B" },
    ],
    ...over,
  };
}

const lastParams = () => vi.mocked(api.getCollection).mock.lastCall![0].toString();

beforeEach(() => {
  mockMe();
  vi.mocked(api.getChoices).mockResolvedValue({
    colors: [["W", "White"], ["B", "Black"], ["R", "Red"], ["C", "Colorless"]],
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
    expect(within(table).getByRole("link", { name: "Thoughtseize" })).toHaveAttribute("href", "/cards/7/");
    expect(within(table).getByTitle("Near Mint")).toHaveTextContent("NM");
    expect(within(table).getByText("€12.00")).toBeInTheDocument();
    expect(within(table).getByText("In collection")).toHaveAttribute("data-variant", "neutral");
    expect(screen.getByText("Showing 1 of 1 entries")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Export CSV" })).toHaveAttribute("href", "/api/collection/export/");
    expect(screen.getByRole("link", { name: "Scan cards" })).toHaveAttribute("href", "/scan/");
    expect(screen.getByRole("link", { name: "+ Add cards" })).toHaveAttribute("href", "/cards/add/");
    expect(document.title).toBe("Collection · MTG Ledger");
  });

  it("a cold link with filters asks the server for them", async () => {
    vi.mocked(api.getCollection).mockResolvedValue(collection({ filtered: true, page: 2, num_pages: 3 }));
    renderPage("/?color=B&q=seize&page=2");
    await screen.findByRole("table");
    expect(lastParams()).toBe("color=B&q=seize&page=2");
    expect(screen.getByLabelText("Search cards")).toHaveValue("seize");
    expect(screen.getByRole("link", { name: "Black" })).toHaveAttribute("aria-current", "true");
    const pager = screen.getByRole("navigation", { name: "Pagination" });
    expect(within(pager).getByRole("link", { name: "Next" })).toHaveAttribute("href", "/?color=B&q=seize&page=3");
    expect(screen.getByRole("link", { name: "Clear filters" })).toHaveAttribute("href", "/");
  });

  it("filter pills keep the other filters and drop the page", async () => {
    vi.mocked(api.getCollection).mockResolvedValue(collection({ filtered: true }));
    renderPage("/?color=B&foil=1&page=2");
    await screen.findByRole("table");
    expect(screen.getByRole("link", { name: "All" })).toHaveAttribute("href", "/?foil=1");
    expect(screen.getByRole("link", { name: "Red" })).toHaveAttribute("href", "/?color=R&foil=1");
    expect(screen.getByRole("link", { name: "Foil only" })).toHaveAttribute("href", "/?color=B");
    expect(screen.getByRole("link", { name: "Foil only" })).toHaveAttribute("aria-current", "true");
  });

  it("search and selects reload with the filters", async () => {
    vi.mocked(api.getCollection).mockResolvedValue(collection());
    renderPage("/?color=B");
    await userEvent.type(await screen.findByLabelText("Search cards"), "bolt{Enter}");
    await vi.waitFor(() => expect(lastParams()).toBe("color=B&q=bolt"));
    await chooseOption(screen.getByLabelText("Set"), "LTR");
    await vi.waitFor(() => expect(lastParams()).toBe("color=B&q=bolt&set=LTR"));
    await chooseOption(screen.getByLabelText("Condition"), "Near Mint");
    await vi.waitFor(() => expect(lastParams()).toBe("color=B&q=bolt&set=LTR&cond=NM"));
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
    expect(within(empty).getByRole("link", { name: "Add cards" })).toHaveAttribute("href", "/cards/add/");
    expect(within(empty).getByRole("link", { name: "import a CSV" })).toHaveAttribute("href", "/cards/import/");
    expect(screen.queryByRole("link", { name: "Clear filters" })).not.toBeInTheDocument();
  });

  it("empty filtered result", async () => {
    vi.mocked(api.getCollection).mockResolvedValue(collection({ results: [], count: 0, filtered: true }));
    renderPage("/?q=zzz");
    expect(await screen.findByText("No cards match these filters.")).toBeInTheDocument();
  });
});
