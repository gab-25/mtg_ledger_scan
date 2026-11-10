import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import * as api from "../api/cards";
import type { CardSearch, Printing } from "../api/cards";
import { mockMe, renderPage } from "../test/renderPage";

vi.mock("../api/account");
vi.mock("../api/cards");

function printing(over: Partial<Printing> = {}): Printing {
  return {
    ct_id: 9001, name: "Ugin, the Spirit Dragon", version: "", image_url: "https://img/ugin.jpg", expansion_code: "m21",
    expansion_name: "Core Set 2021", collector_number: "1", owned_qty: null,
    prices: { trend: "12.75", low: "10.00", avg: "12.50", trend_foil: "14.34", low_foil: null, avg_foil: null },
    ...over,
  };
}

function results(over: Partial<CardSearch> = {}): CardSearch {
  return {
    searched: true, filters: { q: "ugin", set: "", number: "", owned: false },
    results: [printing(), printing({ ct_id: 9045, name: "Counterspell", image_url: "", expansion_code: "dmr", expansion_name: "Dominaria Remastered", collector_number: "45", owned_qty: 2, prices: null, version: "Showcase" })],
    count: 2, page: 1, num_pages: 1, prices_date: "2026-11-09T05:00:00Z", ...over,
  };
}

const lastParams = () => vi.mocked(api.searchCards).mock.lastCall![0].toString();

beforeEach(() => mockMe());

describe("CardsPage", () => {
  it("before searching shows the hint and no table", async () => {
    vi.mocked(api.searchCards).mockResolvedValue({ searched: false, filters: { q: "", set: "", number: "", owned: false } });
    renderPage("/cards/");
    expect(await screen.findByRole("heading", { name: "Cards" })).toBeInTheDocument();
    expect(screen.getByText(/Search the card database/)).toBeInTheDocument();
    expect(screen.queryByRole("table")).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Clear" })).not.toBeInTheDocument();
    expect(document.title).toBe("Cards · MTG Ledger");
  });

  it("shows the printings with prices", async () => {
    vi.mocked(api.searchCards).mockResolvedValue(results());
    renderPage("/cards/?q=ugin");
    const table = await screen.findByRole("table");
    expect(within(table).getAllByRole("columnheader").map((h) => h.textContent)).toEqual(
      ["Card", "Set", "Owned", "Trend", "Low", "Avg", "Foil trend", "Foil low", "Foil avg"],
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
    expect(screen.getByText("Showing 2 of 2 printings · Cardmarket price guide of 9 Nov 2026")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Clear" })).toHaveAttribute("href", "/cards/");
  });

  it("filters: set, number and owned keep the search", async () => {
    vi.mocked(api.searchCards).mockResolvedValue(results());
    renderPage("/cards/?q=ugin");
    await screen.findByRole("table");
    await userEvent.type(screen.getByLabelText("Set code"), "m21");
    await userEvent.type(screen.getByLabelText("Collector number"), "007");
    await userEvent.click(screen.getByRole("button", { name: "Apply" }));
    await vi.waitFor(() => expect(lastParams()).toBe("q=ugin&set=m21&number=007"));
    await userEvent.click(screen.getByLabelText("In my collection"));
    await vi.waitFor(() => expect(lastParams()).toBe("q=ugin&set=m21&number=007&owned=1"));
  });

  it("clicking the In my collection pill text toggles the checkbox once", async () => {
    vi.mocked(api.searchCards).mockResolvedValue(results());
    renderPage("/cards/?q=ugin");
    await screen.findByRole("table");
    const box = screen.getByRole("checkbox", { name: "In my collection" });
    expect(box).toHaveAttribute("aria-checked", "false");
    await userEvent.click(screen.getByText("In my collection"));
    await vi.waitFor(() => expect(lastParams()).toBe("q=ugin&owned=1"));
    expect(vi.mocked(api.searchCards).mock.calls.filter(([p]) => p.toString() === "q=ugin&owned=1")).toHaveLength(1);
  });

  it("no results and the pager", async () => {
    vi.mocked(api.searchCards).mockResolvedValue(
      results({ results: [], count: 0, filters: { q: "", set: "tm21", number: "", owned: false }, page: 1, num_pages: 1 }),
    );
    renderPage("/cards/?set=tm21");
    expect(await screen.findByText("No cards match these criteria.")).toBeInTheDocument();
  });

  it("the pager keeps the filters", async () => {
    vi.mocked(api.searchCards).mockResolvedValue(
      results({ filters: { q: "", set: "tm21", number: "", owned: true }, page: 1, num_pages: 2, count: 60 }),
    );
    renderPage("/cards/?set=tm21&owned=1");
    const pager = await screen.findByRole("navigation", { name: "Pagination" });
    expect(within(pager).getByRole("link", { name: "Next" })).toHaveAttribute("href", "/cards/?set=tm21&owned=1&page=2");
  });
});
