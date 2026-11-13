import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ApiError } from "../api/client";
import * as collection from "../api/collection";
import * as api from "../api/sale";
import type { ListingDetail, Listings, SaleRow } from "../api/sale";
import { mockMe, renderPage } from "../test/renderPage";

vi.mock("../api/account");
vi.mock("../api/collection");
vi.mock("../api/sale");

const STATUSES: [string, string][] = [["published", "Published"], ["to_publish", "To publish"], ["sold", "Sold"]];

function sale(over: Partial<SaleRow> = {}): SaleRow {
  return {
    item_id: 7, name: "Counterspell", set_code: "DMR", condition: "NM", language: "EN", foil: false, quantity: 2,
    price: "3.00", market_price: "2.80", badge: { label: "Published", tone: "ok" }, ...over,
  };
}

function listings(over: Partial<Listings> = {}): Listings {
  return { stats: { active: 1, value: "6.00", sold_month: 0, to_publish: 0 }, status: "", results: [sale()], ...over };
}

function detail(listing: Partial<ListingDetail["listing"]> = {}, over: Partial<ListingDetail> = {}): ListingDetail {
  return {
    item: { id: 7, name: "Counterspell", set_code: "DMR", condition: "NM", language: "EN", foil: false, quantity: 2 },
    listing: { exists: true, quantity: 2, price: "3.00", market_price: "2.80", status: "published", ...listing },
    cm_suggestion: "1.20",
    ...over,
  };
}

const NEW = { exists: false, quantity: 1, price: "0.50", market_price: null, status: "to_publish" };

beforeEach(() => {
  mockMe();
  vi.mocked(collection.getChoices).mockResolvedValue({ conditions: [], languages: [], listing_statuses: STATUSES });
  vi.mocked(api.getListings).mockResolvedValue(listings());
});

async function dialogAt(path: string) {
  renderPage(path);
  const dialog = await screen.findByRole("dialog", { name: "Counterspell" });
  await within(dialog).findByRole("spinbutton", { name: "Price" });
  return dialog;
}

describe("ListingDialog", () => {
  it("opens from Edit listing and saves an existing listing", async () => {
    vi.mocked(api.getListing).mockResolvedValue(detail());
    vi.mocked(api.saveListing).mockResolvedValue({ messages: [{ level: "success", text: "Listing for Counterspell saved." }] });
    renderPage("/sale/");
    const link = await screen.findByRole("link", { name: /^Edit listing\s*for Counterspell$/ });
    expect(link).toHaveAttribute("href", "/sale/?sell=7");
    await userEvent.click(link);
    const dialog = await screen.findByRole("dialog", { name: "Counterspell" });
    expect(within(dialog).getByText("DMR · NM · EN · 2 owned")).toBeInTheDocument();
    expect(await within(dialog).findByRole("spinbutton", { name: "Quantity" })).toHaveValue(2);
    expect(within(dialog).getByRole("spinbutton", { name: "Price" })).toHaveValue(3);
    expect(within(dialog).getByRole("spinbutton", { name: "Market price" })).toHaveValue(2.8);
    expect(within(dialog).getByRole("combobox", { name: "Status" })).toHaveTextContent("Published");
    await userEvent.click(within(dialog).getByRole("button", { name: "Save listing" }));
    expect(api.saveListing).toHaveBeenCalledWith(7, { quantity: "2", price: "3.00", market_price: "2.80", status: "published" });
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    expect(screen.getByText("Listing for Counterspell saved.")).toBeInTheDocument();
  });

  it("a new listing starts at the Cardmarket trend", async () => {
    vi.mocked(api.getListing).mockResolvedValue(detail(NEW));
    const dialog = await dialogAt("/sale/?sell=7");
    expect(within(dialog).getByRole("spinbutton", { name: "Price" })).toHaveValue(1.2);
    expect(within(dialog).getByText("Cardmarket trend")).toBeInTheDocument();
    expect(within(dialog).getByText("€1.20")).toBeInTheDocument();
    expect(within(dialog).getByRole("button", { name: "Use" })).toBeInTheDocument();
    expect(within(dialog).getByRole("button", { name: "Create listing" })).toBeInTheDocument();
    expect(within(dialog).queryByRole("button", { name: "Remove listing" })).not.toBeInTheDocument();
  });

  it("without a trend the price is the listing default and there is no Use", async () => {
    vi.mocked(api.getListing).mockResolvedValue(detail(NEW, { cm_suggestion: null }));
    const dialog = await dialogAt("/sale/?sell=7");
    expect(within(dialog).getByRole("spinbutton", { name: "Price" })).toHaveValue(0.5);
    expect(within(dialog).queryByRole("button", { name: "Use" })).not.toBeInTheDocument();
  });

  it("a foil shows the foil trend", async () => {
    vi.mocked(api.getListing).mockResolvedValue(
      detail({}, { item: { id: 7, name: "Counterspell", set_code: "DMR", condition: "NM", language: "EN", foil: true, quantity: 2 } }),
    );
    const dialog = await dialogAt("/sale/?sell=7");
    expect(within(dialog).getByText("Cardmarket trend (foil)")).toBeInTheDocument();
    expect(within(dialog).getByText("DMR · NM · EN · FOIL · 2 owned")).toBeInTheDocument();
  });

  it("field and other errors stay inside the dialog", async () => {
    vi.mocked(api.getListing).mockResolvedValue(detail());
    vi.mocked(api.saveListing)
      .mockRejectedValueOnce(new ApiError("Invalid", 400, "invalid", undefined, { quantity: ["You only own 2 copies."] }))
      .mockRejectedValueOnce(new ApiError("Listing not saved: down", 502, "service_error"));
    const dialog = await dialogAt("/sale/?sell=7");
    await userEvent.click(within(dialog).getByRole("button", { name: "Save listing" }));
    const quantity = within(dialog).getByRole("spinbutton", { name: "Quantity" }).closest("[data-slot=field]")!;
    expect(await within(quantity as HTMLElement).findByText("You only own 2 copies.")).toBeInTheDocument();
    await userEvent.click(within(dialog).getByRole("button", { name: "Save listing" }));
    expect(await within(dialog).findByText("Listing not saved: down")).toBeInTheDocument();
    expect(screen.getByRole("dialog", { name: "Counterspell" })).toBeInTheDocument();
  });

  it("removes the listing after confirming", async () => {
    vi.mocked(api.getListing).mockResolvedValue(detail());
    vi.mocked(api.deleteListing).mockResolvedValue({ messages: [{ level: "success", text: "Listing removed." }] });
    const confirm = vi.spyOn(window, "confirm").mockReturnValueOnce(false).mockReturnValueOnce(true);
    const dialog = await dialogAt("/sale/?sell=7");
    await userEvent.click(within(dialog).getByRole("button", { name: "Remove listing" }));
    expect(api.deleteListing).not.toHaveBeenCalled();
    await userEvent.click(within(dialog).getByRole("button", { name: "Remove listing" }));
    expect(confirm).toHaveBeenCalledWith("Remove this listing?");
    expect(api.deleteListing).toHaveBeenCalledWith(7);
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    expect(screen.getByText("Listing removed.")).toBeInTheDocument();
  });

  it("a listing that fails to load says so", async () => {
    vi.mocked(api.getListing).mockRejectedValue(new ApiError("Not found.", 404, "not_found"));
    renderPage("/sale/?sell=7");
    const dialog = await screen.findByRole("dialog");
    expect(await within(dialog).findByText("Not found.")).toBeInTheDocument();
    await userEvent.click(within(dialog).getByRole("button", { name: "Cancel" }));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("Cancel on a directly loaded URL keeps the other params", async () => {
    vi.mocked(api.getListing).mockResolvedValue(detail());
    vi.mocked(api.getListings).mockResolvedValue(listings({ status: "published" }));
    const dialog = await dialogAt("/sale/?status=published&sell=7");
    await userEvent.click(within(dialog).getByRole("button", { name: "Cancel" }));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Published" })).toHaveAttribute("aria-current", "true");
    expect(api.getListings).toHaveBeenLastCalledWith("published");
  });

  it("?sell=abc opens nothing", async () => {
    renderPage("/sale/?sell=abc");
    expect(await screen.findByRole("heading", { name: "For sale" })).toBeInTheDocument();
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(api.getListing).not.toHaveBeenCalled();
  });

  it("old listing URLs open the dialog", async () => {
    vi.mocked(api.getListing).mockResolvedValue(detail());
    await dialogAt("/sale/7/");
    expect(screen.getByRole("heading", { name: "For sale", hidden: true })).toBeInTheDocument(); // behind the dialog
  });
});
