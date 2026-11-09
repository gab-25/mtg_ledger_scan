import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import * as api from "../api/account";
import type { Account } from "../api/account";
import { ApiError } from "../api/client";
import { me, mockMe, renderPage } from "../test/renderPage";

vi.mock("../api/account");

function account(over: Partial<Account> = {}): Account {
  return {
    cardtrader: { name: "CardTrader", last_sync: null, token_saved: false }, shares_token: false,
    password_help: ["Your password must contain at least 8 characters."], ...over,
  };
}

const ok = (text: string) => ({ messages: [{ level: "success" as const, text }] });

beforeEach(() => {
  mockMe(me({}, {
    username: "gab", first_name: "Gabriele", last_name: "S", full_name: "Gabriele S", email: "gab@example.com",
    is_staff: true, date_joined: "2026-01-05T10:00:00Z", last_login: null,
  }));
});

describe("ProfilePage", () => {
  it("shows the account summary and the forms", async () => {
    vi.mocked(api.getAccount).mockResolvedValue(account());
    renderPage("/account/");
    expect(await screen.findByRole("heading", { name: "Profile and settings" })).toBeInTheDocument();
    const summary = screen.getByRole("region", { name: "Account summary" });
    expect(within(summary).getByText("@gab · admin")).toHaveClass("sub", "mono");
    expect(within(summary).getByText("5 Jan 2026")).toBeInTheDocument();
    expect(within(summary).getByText("—")).toBeInTheDocument();
    expect(screen.getByLabelText("First name")).toHaveValue("Gabriele");
    expect(screen.getByLabelText("Email address")).toHaveValue("gab@example.com");
    expect(screen.getByLabelText("Username")).toHaveAttribute("readonly");
    expect(screen.getByText("Your password must contain at least 8 characters.")).toBeInTheDocument();
    expect(screen.getByText("Not connected")).toHaveClass("badge", "badge-pending");
    expect(screen.getByText(/Never synced\./)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Connect" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Remove token" })).not.toBeInTheDocument();
    expect(screen.queryByText(/also used to load the card catalog/)).not.toBeInTheDocument();
    expect(document.title).toBe("Profile · MTG Ledger");
  });

  it("saves the details; errors stay under the field", async () => {
    vi.mocked(api.getAccount).mockResolvedValue(account());
    vi.mocked(api.updateProfile)
      .mockRejectedValueOnce(new ApiError("x", 400, "invalid", undefined, { email: ["This email is already used by another account."] }))
      .mockResolvedValueOnce(ok("Profile updated."));
    renderPage("/account/");
    const email = await screen.findByLabelText("Email address");
    await userEvent.clear(email);
    await userEvent.type(email, "other@example.com");
    await userEvent.click(screen.getByRole("button", { name: "Save details" }));
    const error = await screen.findByText("This email is already used by another account.");
    expect(error.closest(".field")).toContainElement(email);
    await userEvent.click(screen.getByRole("button", { name: "Save details" }));
    expect(await screen.findByText("Profile updated.")).toHaveClass("message", "success");
    expect(api.updateProfile).toHaveBeenLastCalledWith({ first_name: "Gabriele", last_name: "S", email: "other@example.com" });
  });

  it("changes the password and clears the fields", async () => {
    vi.mocked(api.getAccount).mockResolvedValue(account());
    vi.mocked(api.changePassword).mockResolvedValue(ok("Password changed."));
    renderPage("/account/");
    await userEvent.type(await screen.findByLabelText("Old password"), "old");
    await userEvent.type(screen.getByLabelText("New password"), "N3w-secret");
    await userEvent.type(screen.getByLabelText("New password confirmation"), "N3w-secret");
    await userEvent.click(screen.getByRole("button", { name: "Change password" }));
    expect(api.changePassword).toHaveBeenCalledWith({ old_password: "old", new_password1: "N3w-secret", new_password2: "N3w-secret" });
    expect(await screen.findByText("Password changed.")).toBeInTheDocument();
    expect(screen.getByLabelText("Old password")).toHaveValue("");
  });

  it("connects CardTrader; a rejected token shows the error", async () => {
    vi.mocked(api.getAccount).mockResolvedValue(account());
    vi.mocked(api.setToken)
      .mockRejectedValueOnce(new ApiError("x", 400, "invalid", undefined, { token: ["CardTrader rejected this token: bad token"] }))
      .mockResolvedValueOnce(ok("CardTrader connected (app “My shop”)."));
    renderPage("/account/");
    const token = await screen.findByLabelText("CardTrader API token");
    expect(token).toHaveAttribute("type", "password");
    await userEvent.type(token, "bad");
    await userEvent.click(screen.getByRole("button", { name: "Connect" }));
    expect(await screen.findByText("CardTrader rejected this token: bad token")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Connect" }));
    expect(await screen.findByText("CardTrader connected (app “My shop”).")).toBeInTheDocument();
    expect(screen.getByLabelText("CardTrader API token")).toHaveValue("");
  });

  it("an admin's saved token: warning, replace and remove with the right question", async () => {
    vi.mocked(api.getAccount).mockResolvedValue(account({
      cardtrader: { name: "CardTrader", last_sync: new Date(Date.now() - 5 * 60000).toISOString(), token_saved: true },
      shares_token: true,
    }));
    vi.mocked(api.removeToken).mockResolvedValue(ok("CardTrader token removed."));
    const confirm = vi.fn().mockReturnValue(true);
    vi.stubGlobal("confirm", confirm);
    renderPage("/account/");
    expect(await screen.findByText("Connected")).toHaveClass("badge", "badge-ok");
    expect(screen.getByText(/Last sync 5 minutes ago\./)).toBeInTheDocument();
    expect(screen.getByText(/also used to load the card catalog and prices for every user/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Replace token" })).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Remove token" }));
    expect(confirm).toHaveBeenCalledWith(
      "Disconnect CardTrader? Catalog, prices and scanning will stop for everyone until a new token is added.",
    );
    expect(await screen.findByText("CardTrader token removed.")).toBeInTheDocument();
  });

  it("a friend's question when removing", async () => {
    vi.mocked(api.getAccount).mockResolvedValue(account({ cardtrader: { name: "CardTrader", last_sync: null, token_saved: true } }));
    const confirm = vi.fn().mockReturnValue(false);
    vi.stubGlobal("confirm", confirm);
    renderPage("/account/");
    await userEvent.click(await screen.findByRole("button", { name: "Remove token" }));
    expect(confirm).toHaveBeenCalledWith("Disconnect CardTrader? Publishing and syncing will stop until a new token is added.");
    expect(api.removeToken).not.toHaveBeenCalled();
  });

  it("opening #cardtrader scrolls to the section", async () => {
    vi.mocked(api.getAccount).mockResolvedValue(account());
    const scroll = vi.fn();
    Element.prototype.scrollIntoView = scroll;
    renderPage("/account/#cardtrader");
    await screen.findByRole("heading", { name: "Connected services" });
    await vi.waitFor(() => expect(scroll).toHaveBeenCalled());
    expect(scroll.mock.contexts[0]).toHaveAttribute("id", "cardtrader");
  });

  it("logs out from the session section", async () => {
    vi.mocked(api.getAccount).mockResolvedValue(account());
    vi.mocked(api.logout).mockResolvedValue(undefined);
    const assign = vi.fn();
    vi.stubGlobal("location", { ...window.location, assign });
    renderPage("/account/");
    const session = await screen.findByRole("region", { name: "Session" });
    await userEvent.click(within(session).getByRole("button", { name: "Log out" }));
    expect(assign).toHaveBeenCalledWith("/login/");
  });
});
