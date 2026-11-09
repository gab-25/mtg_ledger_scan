import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import * as api from "../api/orders";
import type { OrderRow, Orders } from "../api/orders";
import { mockMe, renderPage } from "../test/renderPage";

vi.mock("../api/account");
vi.mock("../api/orders");

export function orderRow(over: Partial<OrderRow> = {}): OrderRow {
  return {
    id: 5, code: "c5", packing_number: 3, can_ship: true, buyer_username: "ada", via_cardtrader_zero: false,
    ship_city: "Torino", ship_country_code: "IT", shipping_method: "Letter", tracked: false, size: 2, sent_at: null,
    paid_at: new Date().toISOString(), total: "12.34", badge: { label: "To ship", tone: "pending" }, ...over,
  };
}

const TABS = [
  { key: "to_ship", label: "To ship", count: 1 }, { key: "ct_zero", label: "CT Zero pending", count: 0 },
  { key: "shipped", label: "Shipped", count: 4 }, { key: "completed", label: "Completed", count: 0 },
  { key: "issues", label: "Issues", count: 1 },
];

function orders(over: Partial<Orders> = {}): Orders {
  return {
    tab: "to_ship", stats: { to_ship: 1, items_to_ship: 2, shipped_month: 3, revenue_month: "40.00" }, tabs: TABS,
    orders_synced_at: new Date(Date.now() - 2 * 3600 * 1000).toISOString(), results: [orderRow()], ...over,
  };
}

beforeEach(() => mockMe());

describe("ShipmentsPage", () => {
  it("shows stats, tabs and orders", async () => {
    vi.mocked(api.getOrders).mockResolvedValue(orders());
    renderPage("/shipments/");
    expect(await screen.findByRole("heading", { name: "Shipments" })).toBeInTheDocument();
    expect(screen.getByText("Imported 2 hours ago")).toHaveClass("hint");
    const stats = screen.getByRole("region", { name: "Shipping summary" });
    expect(within(stats).getByText("1")).toHaveClass("warn");
    expect(within(stats).getByText("€40.00")).toHaveClass("accent");
    const tabs = screen.getByRole("navigation", { name: "Order status" });
    expect(within(tabs).getByRole("link", { name: "To ship 1" })).toHaveAttribute("aria-current", "true");
    expect(within(tabs).getByRole("link", { name: "Issues 1" })).toHaveAttribute("href", "/shipments/?tab=issues");
    const order = screen.getByRole("link", { name: /#c5/ });
    expect(order).toHaveAttribute("href", "/shipments/5/");
    expect(order).toHaveTextContent("Pack3");
    expect(within(order).getByText("Torino · IT")).toBeInTheDocument();
    expect(within(order).getByText("2 cards")).toBeInTheDocument();
    expect(within(order).getByText("Paid today")).toBeInTheDocument();
    expect(within(order).getByText("€12.34")).toHaveClass("order-total");
    expect(document.title).toBe("Shipments · MTG Ledger");
  });

  it("a cold link to a tab asks for it; CT Zero hint; empty text", async () => {
    vi.mocked(api.getOrders).mockResolvedValue(orders({ tab: "ct_zero", results: [], orders_synced_at: null }));
    renderPage("/shipments/?tab=ct_zero");
    expect(await screen.findByText(/CardTrader Zero sales are collected here/)).toBeInTheDocument();
    expect(api.getOrders).toHaveBeenCalledWith("ct_zero");
    expect(screen.getByText("No orders here.")).toBeInTheDocument();
    expect(screen.getByText("Orders never imported")).toBeInTheDocument();
  });

  it("nothing to ship", async () => {
    vi.mocked(api.getOrders).mockResolvedValue(orders({ results: [] }));
    renderPage("/shipments/");
    expect(await screen.findByText(/Nothing to ship\. Use “Import orders”/)).toBeInTheDocument();
  });

  it("imports orders", async () => {
    vi.mocked(api.getOrders).mockResolvedValue(orders());
    vi.mocked(api.importOrders).mockResolvedValue({ messages: [{ level: "success", text: "Orders imported: 1 new, 0 updated." }] });
    renderPage("/shipments/");
    await userEvent.click(await screen.findByRole("button", { name: "Import orders" }));
    expect(await screen.findByText("Orders imported: 1 new, 0 updated.")).toBeInTheDocument();
  });
});
