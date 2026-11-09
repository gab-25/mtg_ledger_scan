import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ApiError } from "../api/client";
import * as collection from "../api/collection";
import * as api from "../api/sale";
import type { ListingDetail } from "../api/sale";
import { mockMe, renderPage } from "../test/renderPage";

vi.mock("../api/account");
vi.mock("../api/collection");
vi.mock("../api/sale");

function detail(over: Partial<ListingDetail> = {}): ListingDetail {
  return {
    item: { id: 7, name: "Counterspell", set_code: "DMR", condition: "NM", language: "EN", foil: false, quantity: 3 },
    listing: { exists: true, quantity: 1, price: "0.80", market_price: null, status: "to_publish" },
    cm_suggestion: "0.95",
    ...over,
  };
}

beforeEach(() => {
  mockMe();
  vi.mocked(collection.getChoices).mockResolvedValue({
    colors: [], conditions: [], languages: [],
    listing_statuses: [["published", "Published"], ["to_publish", "To publish"], ["sold", "Sold"]],
  });
  vi.mocked(api.getListings).mockResolvedValue({ stats: { active: 0, value: "0", sold_month: 0, to_publish: 0 }, status: "", results: [] });
});

describe("ListingFormPage", () => {
  it("edits a listing and goes back to the sale page", async () => {
    vi.mocked(api.getListing).mockResolvedValue(detail());
    vi.mocked(api.saveListing).mockResolvedValue({ messages: [{ level: "success", text: "Listing for Counterspell saved." }] });
    renderPage("/sale/7/");
    expect(await screen.findByRole("heading", { name: "Counterspell" })).toBeInTheDocument();
    expect(screen.getByText("DMR · NM · EN · 3 owned")).toBeInTheDocument();
    expect(screen.getByLabelText("Status")).toHaveValue("to_publish");
    expect(document.title).toBe("Listing · Counterspell · MTG Ledger");
    await userEvent.click(screen.getByRole("button", { name: "Use" }));
    expect(screen.getByLabelText("Price")).toHaveValue(0.95);
    await userEvent.click(screen.getByRole("button", { name: "Save listing" }));
    expect(api.saveListing).toHaveBeenCalledWith(7, { quantity: "1", price: "0.95", market_price: "", status: "to_publish" });
    expect(await screen.findByRole("heading", { name: "For sale" })).toBeInTheDocument();
    expect(screen.getByText("Listing for Counterspell saved.")).toBeInTheDocument();
  });

  it("a new listing: create button, foil trend label, no suggestion", async () => {
    vi.mocked(api.getListing).mockResolvedValue(detail({
      item: { id: 7, name: "Counterspell", set_code: "DMR", condition: "NM", language: "EN", foil: true, quantity: 1 },
      listing: { exists: false, quantity: 1, price: "0.50", market_price: null, status: "to_publish" },
      cm_suggestion: null,
    }));
    renderPage("/sale/7/");
    expect(await screen.findByRole("button", { name: "Create listing" })).toBeInTheDocument();
    expect(screen.getByText("DMR · NM · EN · FOIL · 1 owned")).toBeInTheDocument();
    expect(screen.getByText("Cardmarket trend (foil)")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Use" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Remove listing" })).not.toBeInTheDocument();
  });

  it("shows the quantity error under its field", async () => {
    vi.mocked(api.getListing).mockResolvedValue(detail());
    vi.mocked(api.saveListing).mockRejectedValue(new ApiError("x", 400, "invalid", undefined, { quantity: ["You only own 3 copies."] }));
    renderPage("/sale/7/");
    await userEvent.click(await screen.findByRole("button", { name: "Save listing" }));
    const error = await screen.findByText("You only own 3 copies.");
    expect(error.closest(".field")).toContainElement(screen.getByLabelText("Quantity"));
  });

  it("removes the listing after confirming; an error keeps the page", async () => {
    vi.mocked(api.getListing).mockResolvedValue(detail());
    vi.mocked(api.deleteListing).mockRejectedValueOnce(new ApiError("Listing not removed: down", 502, "service_error"));
    vi.stubGlobal("confirm", vi.fn().mockReturnValue(true));
    renderPage("/sale/7/");
    await userEvent.click(await screen.findByRole("button", { name: "Remove listing" }));
    expect(window.confirm).toHaveBeenCalledWith("Remove this listing?");
    expect(await screen.findByText("Listing not removed: down")).toHaveClass("message", "error");
    expect(screen.getByRole("heading", { name: "Counterspell" })).toBeInTheDocument();
  });
});
