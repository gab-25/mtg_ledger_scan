import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ApiError } from "../api/client";
import * as api from "../api/orders";
import type { OrderDetail } from "../api/orders";
import { mockMe, renderPage } from "../test/renderPage";

vi.mock("../api/account");
vi.mock("../api/orders");

function detail(over: Partial<OrderDetail> = {}): OrderDetail {
  return {
    id: 5, code: "c5", packing_number: 3, can_ship: true, buyer_username: "ada", via_cardtrader_zero: false,
    ship_city: "Torino", ship_country_code: "IT", shipping_method: "Letter", tracked: false, size: 2, sent_at: null,
    paid_at: "2026-11-09T09:05:00Z", total: "12.34", badge: { label: "To ship", tone: "pending" },
    state: "paid", state_label: "To ship", address_lines: ["Ada", "Via Po 1", "10100 Torino TO", "Italy"],
    ship_note: "", buyer_email: "ada@example.com", buyer_phone: "", max_shipping_days: 5, tracking_code: "",
    items: [
      { id: 1, name: "Sheoldred", expansion: "Dominaria United", foil: true, condition: "NM", language: "EN", quantity: 1, price: "12.34", item_pk: 9 },
      { id: 2, name: "Unknown", expansion: "", foil: false, condition: "", language: "", quantity: 1, price: null, item_pk: null },
    ],
    ...over,
  };
}

beforeEach(() => {
  mockMe();
  vi.mocked(api.getOrders).mockResolvedValue({
    tab: "to_ship", stats: { to_ship: 0, items_to_ship: 0, shipped_month: 0, revenue_month: "0" }, tabs: [],
    orders_synced_at: null, results: [],
  });
});

describe("OrderDetailPage", () => {
  it("shows address, facts and the packing list", async () => {
    vi.mocked(api.getOrder).mockResolvedValue(detail());
    renderPage("/shipments/5/");
    expect(await screen.findByRole("heading", { name: "Order #c5" })).toBeInTheDocument();
    expect(screen.getByText("Pack 3 · 2 cards · paid 9 Nov 2026 10:05")).toBeInTheDocument();
    expect(within(screen.getByRole("region", { name: "Ship to" })).getByText("Ada")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "ada@example.com" })).toHaveAttribute("href", "mailto:ada@example.com");
    expect(screen.getByText("up to 5 days")).toBeInTheDocument();
    expect(screen.getByLabelText("Tracking code (optional)")).toHaveValue("");
    const table = screen.getByRole("table");
    expect(within(table).getByLabelText("Packed Sheoldred")).not.toBeChecked();
    expect(within(table).getByRole("link", { name: "in Ledger" })).toHaveAttribute("href", "/?edit=9");
    expect(within(table).getAllByText("—")).toHaveLength(2);
    expect(screen.getByText("€12.34", { selector: "strong" })).toBeInTheDocument();
    expect(document.title).toBe("Order #c5 · MTG Ledger");
  });

  it("the packing checkboxes tick and untick", async () => {
    vi.mocked(api.getOrder).mockResolvedValue(detail());
    renderPage("/shipments/5/");
    const box = await screen.findByRole("checkbox", { name: "Packed Sheoldred" });
    expect(box).toHaveAttribute("aria-checked", "false");
    await userEvent.click(box);
    expect(box).toHaveAttribute("aria-checked", "true");
    await userEvent.click(screen.getByText("Sheoldred"));
    expect(box).toHaveAttribute("aria-checked", "false");
  });

  it("marks as shipped and goes back to the list", async () => {
    vi.mocked(api.getOrder).mockResolvedValue(detail({ tracked: true }));
    vi.mocked(api.shipOrder).mockResolvedValue({ shipped: true, messages: [{ level: "success", text: "Order #c5 marked as shipped." }] });
    renderPage("/shipments/5/");
    await userEvent.type(await screen.findByLabelText("Tracking code (required)"), "RR1IT");
    await userEvent.click(screen.getByRole("button", { name: "Mark as shipped" }));
    expect(api.shipOrder).toHaveBeenCalledWith(5, { tracking_code: "RR1IT", save_tracking: false });
    expect(await screen.findByRole("heading", { name: "Shipments" })).toBeInTheDocument();
    expect(screen.getByText("Order #c5 marked as shipped.")).toBeInTheDocument();
  });

  it("saves the code and stays; errors are shown", async () => {
    vi.mocked(api.getOrder).mockResolvedValue(detail());
    vi.mocked(api.shipOrder)
      .mockResolvedValueOnce({ shipped: false, messages: [{ level: "success", text: "Tracking code saved on CardTrader." }] })
      .mockRejectedValueOnce(new ApiError("Tracked orders need a tracking code before shipping.", 502, "service_error"));
    renderPage("/shipments/5/");
    await userEvent.type(await screen.findByLabelText("Tracking code (optional)"), "RR2IT");
    await userEvent.click(screen.getByRole("button", { name: "Save code" }));
    expect(api.shipOrder).toHaveBeenCalledWith(5, { tracking_code: "RR2IT", save_tracking: true });
    expect(await screen.findByText("Tracking code saved on CardTrader.")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Mark as shipped" }));
    expect(await screen.findByText("Tracked orders need a tracking code before shipping.")).toHaveAttribute("data-variant", "error");
    expect(screen.getByRole("heading", { name: "Order #c5" })).toBeInTheDocument();
  });

  it("orders that cannot be shipped explain why", async () => {
    vi.mocked(api.getOrder).mockResolvedValueOnce(detail({ can_ship: false, state: "hub_pending", state_label: "CT Zero pending" }));
    const { unmount } = renderPage("/shipments/5/");
    expect(await screen.findByText(/Sold through CardTrader Zero: set this card aside/)).toBeInTheDocument();
    unmount();
    vi.mocked(api.getOrder).mockResolvedValueOnce(detail({ can_ship: false, state: "sent", state_label: "Shipped", sent_at: "2026-11-09T09:05:00Z", tracking_code: "RR1IT" }));
    const second = renderPage("/shipments/5/");
    expect(await screen.findByText(/Shipped on 9 Nov 2026 10:05 with tracking/)).toBeInTheDocument();
    second.unmount();
    vi.mocked(api.getOrder).mockResolvedValueOnce(detail({ can_ship: false, state: "canceled", state_label: "Canceled" }));
    renderPage("/shipments/5/");
    expect(await screen.findByText("This order is canceled: no shipping action available.")).toBeInTheDocument();
  });

  it("prints the packing slip", async () => {
    vi.mocked(api.getOrder).mockResolvedValue(detail());
    const print = vi.fn();
    vi.stubGlobal("print", print);
    renderPage("/shipments/5/");
    await userEvent.click(await screen.findByRole("button", { name: "Print packing slip" }));
    expect(print).toHaveBeenCalled();
  });
});
