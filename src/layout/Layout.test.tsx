import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import * as account from "../api/account";
import { ApiError } from "../api/client";
import { me, mockMe, renderPage } from "../test/renderPage";

vi.mock("../api/account");

describe("Layout", () => {
  it("shows the sidebar with the counters", async () => {
    mockMe(me({ pending_changes: 3, orders_to_ship: 2 }, { username: "gab", full_name: "Gabriele S" }));
    renderPage("/nope/");
    const nav = await screen.findByRole("navigation", { name: "Main navigation" });
    const shipments = within(nav).getByRole("link", { name: /Shipments/ });
    expect(shipments).toHaveAttribute("href", "/shipments/");
    expect(within(shipments).getByText("2")).toHaveClass("nav-count", "nav-count-gold");
    expect(shipments).toHaveTextContent("Shipments2 orders to ship");
    expect(within(nav).getByRole("link", { name: /Sync/ })).toHaveTextContent("Sync3 changes to publish");
    expect(within(nav).getByText("Gabriele S")).toBeInTheDocument();
    expect(within(nav).getByText("G")).toHaveClass("avatar");
    expect(within(nav).getByRole("link", { name: "Profile and settings" })).toHaveAttribute("href", "/account/");
    for (const [name, href] of [["Collection", "/"], ["For sale", "/sale/"], ["Cards", "/cards/"]]) {
      expect(within(nav).getByRole("link", { name })).toHaveAttribute("href", href);
    }
  });

  it("hides zero counters and marks the current section", async () => {
    mockMe();
    renderPage("/sync/");
    const nav = await screen.findByRole("navigation", { name: "Main navigation" });
    expect(within(nav).getByRole("link", { name: "Sync" })).toHaveAttribute("aria-current", "page");
    expect(within(nav).getByRole("link", { name: "Collection" })).not.toHaveAttribute("aria-current");
    expect(nav.querySelector(".nav-count")).toBeNull();
  });

  it("an unknown page is Not found, inside the layout", async () => {
    mockMe();
    renderPage("/nope/");
    expect(await screen.findByRole("heading", { name: "Not found" })).toBeInTheDocument();
    expect(screen.getByRole("navigation", { name: "Main navigation" })).toBeInTheDocument();
    await waitFor(() => expect(document.title).toBe("Not found · MTG Ledger"));
  });

  it("log out ends the session and goes to the login page", async () => {
    const assign = vi.fn();
    vi.stubGlobal("location", { ...window.location, assign });
    mockMe();
    vi.mocked(account.logout).mockResolvedValue(undefined);
    renderPage("/nope/");
    await userEvent.click(await screen.findByRole("button", { name: "Log out" }));
    expect(account.logout).toHaveBeenCalled();
    expect(assign).toHaveBeenCalledWith("/login/");
  });

  it("a server error on /api/me/ is shown, not a blank page", async () => {
    vi.mocked(account.getMe).mockRejectedValue(new ApiError("Something went wrong (500) — try again", 500, "server"));
    renderPage("/nope/");
    expect(await screen.findByText("Something went wrong (500) — try again")).toHaveClass("message", "error");
  });

  it("renders nothing until the user is known", () => {
    vi.mocked(account.getMe).mockReturnValue(new Promise(() => {}));
    renderPage("/nope/");
    expect(screen.queryByRole("navigation")).not.toBeInTheDocument();
  });
});
