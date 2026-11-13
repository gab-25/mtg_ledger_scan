import { screen, waitFor, within } from "@testing-library/react";
import { chooseOption } from "@/test/select";
import userEvent from "@testing-library/user-event";
import { ApiError } from "../api/client";
import * as api from "../api/collection";
import * as sale from "../api/sale";
import { mockMe, renderPage } from "../test/renderPage";

vi.mock("../api/account");
vi.mock("../api/collection");
vi.mock("../api/sale");

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
    listing_statuses: [["to_publish", "To publish"]],
  });
  vi.mocked(api.getCollection).mockResolvedValue({
    results: [], count: 0, page: 1, num_pages: 1, stats: { total: 0, unique: 0, value: null, for_sale: 0 },
    sets: [], categories: [], filtered: false,
  });
});

async function dialogAt(path: string, name = "Thoughtseize") {
  renderPage(path);
  const dialog = await screen.findByRole("dialog", { name });
  await within(dialog).findByRole("button", { name: "Save" });
  return dialog;
}

describe("ItemDialog", () => {
  it("edits only the copies of a card", async () => {
    vi.mocked(api.getItem).mockResolvedValue(ITEM);
    vi.mocked(api.updateItem).mockResolvedValue({ messages: [{ level: "success", text: "Saved Thoughtseize." }] });
    const dialog = await dialogAt("/?edit=7");
    expect(within(dialog).getByText("2XM #107 · Magic Single Card")).toBeInTheDocument();
    for (const gone of ["Name", "Set", "Collector number", "Type", "Color"]) expect(within(dialog).queryByLabelText(gone)).toBeNull();
    expect(within(dialog).getByLabelText("Quantity")).toHaveValue(3);
    await chooseOption(within(dialog).getByLabelText("Condition"), "Excellent");
    await userEvent.clear(within(dialog).getByLabelText("Quantity"));
    await userEvent.type(within(dialog).getByLabelText("Quantity"), "4");
    await userEvent.click(within(dialog).getByLabelText("Foil"));
    await userEvent.click(within(dialog).getByRole("button", { name: "Save" }));
    expect(api.updateItem).toHaveBeenCalledWith(7, { condition: "EX", language: "EN", foil: true, quantity: "4", price: "12.00" });
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    expect(screen.getByText("Saved Thoughtseize.")).toBeInTheDocument();
  });

  it("edits a product without condition or foil", async () => {
    vi.mocked(api.getItem).mockResolvedValue({
      ...ITEM, name: "Play Booster", set_code: "BLB", collector_number: "CT12345", is_product: true, category_id: 5,
      category_name: "Sealed Product",
    });
    vi.mocked(api.updateItem).mockResolvedValue({ messages: [] });
    const dialog = await dialogAt("/?edit=7", "Play Booster");
    expect(within(dialog).getByText("BLB · Sealed Product")).toBeInTheDocument();
    expect(within(dialog).queryByText(/CT12345/)).toBeNull();
    expect(within(dialog).queryByLabelText("Condition")).toBeNull();
    expect(within(dialog).queryByLabelText("Foil")).toBeNull();
    await chooseOption(within(dialog).getByLabelText("Language"), "Italian");
    await userEvent.click(within(dialog).getByRole("button", { name: "Save" }));
    expect(api.updateItem).toHaveBeenCalledWith(7, { condition: "NM", language: "IT", foil: false, quantity: "3", price: "12.00" });
  });

  it("has no add page", async () => {
    renderPage("/cards/add/");
    expect(await screen.findByRole("heading", { name: "Not found" })).toBeInTheDocument();
  });

  it("shows validation errors under their fields and other errors inside", async () => {
    vi.mocked(api.getItem).mockResolvedValue(ITEM);
    vi.mocked(api.updateItem)
      .mockRejectedValueOnce(new ApiError("x", 400, "invalid", undefined, { quantity: ["Ensure this value is greater than or equal to 0."] }))
      .mockRejectedValueOnce(new ApiError("Server error.", 500, "error"));
    const dialog = await dialogAt("/?edit=7");
    await userEvent.click(within(dialog).getByRole("button", { name: "Save" }));
    const error = await within(dialog).findByText("Ensure this value is greater than or equal to 0.");
    expect(error.closest('[data-slot="field"]')).toContainElement(within(dialog).getByLabelText("Quantity"));
    await userEvent.click(within(dialog).getByRole("button", { name: "Save" }));
    expect(await within(dialog).findByText("Server error.")).toBeInTheDocument();
  });

  it("removes a card after confirming", async () => {
    vi.mocked(api.getItem).mockResolvedValue(ITEM);
    vi.mocked(api.deleteItem).mockResolvedValue({ messages: [{ level: "success", text: "Removed Thoughtseize from the collection." }] });
    const confirm = vi.fn().mockReturnValueOnce(false).mockReturnValueOnce(true);
    vi.stubGlobal("confirm", confirm);
    const dialog = await dialogAt("/?edit=7");
    await userEvent.click(within(dialog).getByRole("button", { name: "Remove from collection" }));
    expect(confirm).toHaveBeenCalledWith("Remove Thoughtseize from the collection?");
    expect(api.deleteItem).not.toHaveBeenCalled();
    await userEvent.click(within(dialog).getByRole("button", { name: "Remove from collection" }));
    expect(api.deleteItem).toHaveBeenCalledWith(7);
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    expect(screen.getByText("Removed Thoughtseize from the collection.")).toBeInTheDocument();
  });

  it("another user's card says not found inside the dialog", async () => {
    vi.mocked(api.getItem).mockRejectedValue(new ApiError("Not found.", 404, "not_found"));
    renderPage("/?edit=99");
    const dialog = await screen.findByRole("dialog");
    expect(await within(dialog).findByText("Not found.")).toBeInTheDocument();
    await userEvent.click(within(dialog).getByRole("button", { name: "Cancel" }));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("List for sale switches to the sell dialog", async () => {
    vi.mocked(api.getItem).mockResolvedValue(ITEM);
    vi.mocked(sale.getListing).mockResolvedValue({
      item: { id: 7, name: "Thoughtseize", set_code: "2XM", condition: "NM", language: "EN", foil: false, quantity: 3 },
      listing: { exists: false, quantity: 1, price: "12.00", market_price: null, status: "to_publish" },
      cm_suggestion: "11.50",
    });
    const dialog = await dialogAt("/?edit=7");
    await userEvent.click(within(dialog).getByRole("button", { name: "List for sale" }));
    const sell = await screen.findByRole("dialog", { name: "Thoughtseize" });
    expect(await within(sell).findByRole("button", { name: "Create listing" })).toBeInTheDocument();
    expect(sale.getListing).toHaveBeenCalledWith(7);
    await userEvent.click(within(sell).getByRole("button", { name: "Cancel" }));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("a card with a listing offers to edit it", async () => {
    vi.mocked(api.getItem).mockResolvedValue({ ...ITEM, has_listing: true });
    const dialog = await dialogAt("/?edit=7");
    expect(within(dialog).getByRole("button", { name: "Edit listing" })).toBeInTheDocument();
  });

  it("old card URLs open the dialog", async () => {
    vi.mocked(api.getItem).mockResolvedValue(ITEM);
    await dialogAt("/cards/7/");
    expect(screen.getByRole("heading", { name: "Collection", hidden: true })).toBeInTheDocument();
  });
});
