import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ApiError } from "../api/client";
import * as api from "../api/collection";
import { mockMe, renderPage } from "../test/renderPage";

vi.mock("../api/account");
vi.mock("../api/collection");

const ITEM: api.Item = {
  id: 7, name: "Thoughtseize", set_code: "2XM", collector_number: "", type_line: "Sorcery", color: "B",
  condition: "NM", language: "EN", foil: false, quantity: 3, price: "12.00", has_listing: false,
};

beforeEach(() => {
  mockMe();
  vi.mocked(api.getChoices).mockResolvedValue({
    colors: [["B", "Black"], ["R", "Red"], ["C", "Colorless"]],
    conditions: [["NM", "Near Mint"], ["EX", "Excellent"]],
    languages: [["EN", "English"], ["IT", "Italian"]],
    listing_statuses: [],
  });
  vi.mocked(api.getCollection).mockResolvedValue({
    results: [], count: 0, page: 1, num_pages: 1, stats: { total: 0, unique: 0, value: null, for_sale: 0 },
    sets: [], color_filters: [], filtered: false,
  });
});

async function fillBolt() {
  await userEvent.type(await screen.findByLabelText("Name"), "Lightning Bolt");
  await userEvent.type(screen.getByLabelText("Set"), "m10");
  await userEvent.selectOptions(screen.getByLabelText("Color"), "R");
  await userEvent.clear(screen.getByLabelText("Quantity"));
  await userEvent.type(screen.getByLabelText("Quantity"), "4");
  await userEvent.clear(screen.getByLabelText("Unit price"));
  await userEvent.type(screen.getByLabelText("Unit price"), "1.50");
}

describe("ItemFormPage", () => {
  it("adds cards and shows the message on the collection", async () => {
    vi.mocked(api.createItem).mockResolvedValue({ id: 9, messages: [{ level: "success", text: "Added 4× Lightning Bolt." }] });
    renderPage("/cards/add/");
    expect(await screen.findByRole("heading", { name: "Add cards" })).toBeInTheDocument();
    expect(screen.getByLabelText("Condition")).toHaveValue("NM");
    expect(screen.getByLabelText("Language")).toHaveValue("EN");
    expect(screen.getByLabelText("Color")).toHaveValue("C");
    await fillBolt();
    await userEvent.click(screen.getByRole("button", { name: "Save" }));
    expect(api.createItem).toHaveBeenCalledWith({
      name: "Lightning Bolt", set_code: "m10", collector_number: "", type_line: "", color: "R", condition: "NM",
      language: "EN", foil: false, quantity: "4", price: expect.stringMatching(/^1\.50?$/), // jsdom drops the 0
    });
    expect(await screen.findByRole("heading", { name: "Collection" })).toBeInTheDocument();
    expect(screen.getByText("Added 4× Lightning Bolt.")).toHaveClass("message", "success");
  });

  it("save and add another gives an empty form", async () => {
    vi.mocked(api.createItem).mockResolvedValue({ id: 9, messages: [{ level: "success", text: "Added 4× Lightning Bolt." }] });
    renderPage("/cards/add/");
    await fillBolt();
    await userEvent.click(screen.getByRole("button", { name: "Save and add another" }));
    expect(await screen.findByText("Added 4× Lightning Bolt.")).toBeInTheDocument();
    await vi.waitFor(() => expect(screen.getByLabelText("Name")).toHaveValue("")); // the navigation is a transition
    expect(screen.getByRole("heading", { name: "Add cards" })).toBeInTheDocument();
  });

  it("the browser checks required fields first, as on the Django form", async () => {
    renderPage("/cards/add/");
    await userEvent.click(await screen.findByRole("button", { name: "Save" }));
    expect(api.createItem).not.toHaveBeenCalled();
    expect(screen.getByLabelText("Name")).toBeRequired();
  });

  it("shows validation errors under their fields", async () => {
    vi.mocked(api.createItem).mockRejectedValue(new ApiError("x", 400, "invalid", undefined, { name: ["This field is required."] }));
    renderPage("/cards/add/");
    await fillBolt();
    await userEvent.click(screen.getByRole("button", { name: "Save" }));
    const error = await screen.findByText("This field is required.");
    expect(error.closest(".field")).toContainElement(screen.getByLabelText("Name"));
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
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
