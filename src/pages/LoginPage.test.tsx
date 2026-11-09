import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import * as account from "../api/account";
import { ApiError } from "../api/client";
import { mockMe, renderPage } from "../test/renderPage";

vi.mock("../api/account");

async function signIn(password = "pw") {
  await userEvent.type(await screen.findByLabelText("Username"), "gab");
  await userEvent.type(screen.getByLabelText("Password"), password);
  await userEvent.click(screen.getByRole("button", { name: "Sign in" }));
}

describe("LoginPage", () => {
  beforeEach(() => {
    vi.mocked(account.ensureCsrf).mockResolvedValue(undefined);
    mockMe();
  });

  it("shows the form errors", async () => {
    vi.mocked(account.login).mockRejectedValue(
      new ApiError("x", 400, "invalid", undefined, {
        non_field_errors: ["Please enter a correct username and password. Note that both fields may be case-sensitive."],
      }),
    );
    renderPage("/login/");
    await signIn("nope");
    expect(await screen.findByText(/Please enter a correct username and password/)).toBeInTheDocument();
    expect(account.login).toHaveBeenCalledWith("gab", "nope");
    expect(document.title).toBe("Sign in · MTG Ledger");
  });

  it("goes back to next after login", async () => {
    vi.mocked(account.login).mockResolvedValue({ ok: true });
    renderPage("/login/?next=%2Fnope%2F%3Fstatus%3Dsold");
    await signIn();
    expect(await screen.findByRole("heading", { name: "Not found" })).toBeInTheDocument();
  });

  it("ignores a next outside the site", async () => {
    vi.mocked(account.login).mockResolvedValue({ ok: true });
    const assign = vi.fn();
    vi.stubGlobal("location", { ...window.location, assign });
    renderPage("/login/?next=%2F%2Fevil.com%2F");
    await signIn();
    expect(await screen.findByRole("navigation", { name: "Main navigation" })).toBeInTheDocument();
    expect(assign).not.toHaveBeenCalled();
  });

  it("a next outside the app is a full page load", async () => {
    vi.mocked(account.login).mockResolvedValue({ ok: true });
    const assign = vi.fn();
    vi.stubGlobal("location", { ...window.location, assign });
    renderPage("/login/?next=%2Fapi%2Fdocs%2F");
    await signIn();
    await vi.waitFor(() => expect(assign).toHaveBeenCalledWith("/api/docs/"));
  });
});
