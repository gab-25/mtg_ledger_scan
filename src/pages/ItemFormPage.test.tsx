import { screen } from "@testing-library/react";
import { chooseOption } from "@/test/select";
import userEvent from "@testing-library/user-event";
import { ApiError } from "../api/client";
import * as api from "../api/collection";
import { mockMe, renderPage } from "../test/renderPage";

vi.mock("../api/account");
vi.mock("../api/collection");

const ITEM: api.Item = {
  id: 7, name: "Thoughtseize", set_code: "2XM", collector_number: "107", is_product: false, category_id: 1,
  category_name: "Magic Single Card", condition: "NM", language: "EN", foil: false, quantity: 3, price: "12.00",
  has_listing: false,
};

beforeEach(() => {
  mockMe();
  vi.mocked(api.getChoices).mockResolvedValue({
    conditions: [["NM", "Near Mint"], ["EX", "Excellent"]],
    languages: [["EN", "English"], ["IT", "Italian"]],
    listing_statuses: [],
  });
  vi.mocked(api.getCollection).mockResolvedValue({
    results: [], count: 0, page: 1, num_pages: 1, stats: { total: 0, unique: 0, value: null, for_sale: 0 },
    sets: [], categories: [], filtered: false,
  });
});

describe("ItemFormPage", () => {
  it("edits only the copies of a card", async () => {
    vi.mocked(api.getItem).mockResolvedValue(ITEM);
    vi.mocked(api.updateItem).mockResolvedValue({ messages: [{ level: "success", text: "Saved Thoughtseize." }] });
    renderPage("/cards/7/");
    expect(await screen.findByRole("heading", { name: "Thoughtseize" })).toBeInTheDocument();
    expect(screen.getByText("2XM #107 · Magic Single Card")).toBeInTheDocument();
    for (const gone of ["Name", "Set", "Collector number", "Type", "Color"]) expect(screen.queryByLabelText(gone)).toBeNull();
    await chooseOption(screen.getByLabelText("Condition"), "Excellent");
    await userEvent.clear(screen.getByLabelText("Quantity"));
    await userEvent.type(screen.getByLabelText("Quantity"), "4");
    await userEvent.click(screen.getByRole("button", { name: "Save" }));
    expect(api.updateItem).toHaveBeenCalledWith(7, { condition: "EX", language: "EN", foil: false, quantity: "4", price: "12.00" });
  });

  it("edits a product without condition or foil", async () => {
    vi.mocked(api.getItem).mockResolvedValue({
      ...ITEM, name: "Play Booster", set_code: "BLB", collector_number: "CT12345", is_product: true, category_id: 5,
      category_name: "Sealed Product",
    });
    vi.mocked(api.updateItem).mockResolvedValue({ messages: [] });
    renderPage("/cards/7/");
    expect(await screen.findByText("BLB · Sealed Product")).toBeInTheDocument();
    expect(screen.queryByText(/CT12345/)).toBeNull();
    expect(screen.queryByLabelText("Condition")).toBeNull();
    expect(screen.queryByLabelText("Foil")).toBeNull();
    await chooseOption(screen.getByLabelText("Language"), "Italian");
    await userEvent.click(screen.getByRole("button", { name: "Save" }));
    expect(api.updateItem).toHaveBeenCalledWith(7, { condition: "NM", language: "IT", foil: false, quantity: "3", price: "12.00" });
  });

  it("has no add page", async () => {
    renderPage("/cards/add/");
    expect(await screen.findByRole("heading", { name: "Not found" })).toBeInTheDocument();
  });

  it("shows validation errors under their fields", async () => {
    vi.mocked(api.getItem).mockResolvedValue(ITEM);
    vi.mocked(api.updateItem).mockRejectedValue(new ApiError("x", 400, "invalid", undefined, { quantity: ["Ensure this value is greater than or equal to 0."] }));
    renderPage("/cards/7/");
    await userEvent.click(await screen.findByRole("button", { name: "Save" }));
    const error = await screen.findByText("Ensure this value is greater than or equal to 0.");
    expect(error.closest('[data-slot="field"]')).toContainElement(screen.getByLabelText("Quantity"));
  });

  it("edits a card", async () => {
    vi.mocked(api.getItem).mockResolvedValue(ITEM);
    vi.mocked(api.updateItem).mockResolvedValue({ messages: [{ level: "success", text: "Saved Thoughtseize." }] });
    renderPage("/cards/7/");
    expect(await screen.findByRole("heading", { name: "Thoughtseize" })).toBeInTheDocument();
    expect(screen.getByLabelText("Quantity")).toHaveValue(3);
    expect(screen.getByRole("link", { name: "List for sale" })).toHaveAttribute("href", "/sale/7/");
    expect(screen.queryByRole("button", { name: "Save and add another" })).not.toBeInTheDocument();
    await userEvent.click(screen.getByLabelText("Foil"));
    await userEvent.click(screen.getByRole("button", { name: "Save" }));
    expect(api.updateItem).toHaveBeenCalledWith(7, expect.objectContaining({ foil: true, quantity: "3", price: "12.00" }));
    expect(await screen.findByText("Saved Thoughtseize.")).toBeInTheDocument();
    await vi.waitFor(() => expect(document.title).toBe("Collection · MTG Ledger")); // the navigation is a transition
  });

  it("a card with a listing links to it", async () => {
    vi.mocked(api.getItem).mockResolvedValue({ ...ITEM, has_listing: true });
    renderPage("/cards/7/");
    expect(await screen.findByRole("link", { name: "Edit listing" })).toHaveAttribute("href", "/sale/7/");
  });

  it("removes a card after confirming", async () => {
    vi.mocked(api.getItem).mockResolvedValue(ITEM);
    vi.mocked(api.deleteItem).mockResolvedValue({ messages: [{ level: "success", text: "Removed Thoughtseize from the collection." }] });
    const confirm = vi.fn().mockReturnValueOnce(false).mockReturnValueOnce(true);
    vi.stubGlobal("confirm", confirm);
    renderPage("/cards/7/");
    await userEvent.click(await screen.findByRole("button", { name: "Remove from collection" }));
    expect(confirm).toHaveBeenCalledWith("Remove Thoughtseize from the collection?");
    expect(api.deleteItem).not.toHaveBeenCalled();
    await userEvent.click(screen.getByRole("button", { name: "Remove from collection" }));
    expect(await screen.findByText("Removed Thoughtseize from the collection.")).toBeInTheDocument();
  });

  it("another user's card is not found", async () => {
    vi.mocked(api.getItem).mockRejectedValue(new ApiError("Not found.", 404, "not_found"));
    renderPage("/cards/99/");
    expect(await screen.findByRole("heading", { name: "Not found" })).toBeInTheDocument();
  });
});
