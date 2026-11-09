import { QueryClientProvider } from "@tanstack/react-query";
import { render } from "@testing-library/react";
import type { ReactNode } from "react";
import { MemoryRouter } from "react-router-dom";
import * as account from "../api/account";
import type { Me } from "../api/account";
import App from "../App";
import { NotificationsProvider } from "../notifications";
import { makeQueryClient } from "../queryClient";

/** A logged-in user for pages: the test file must vi.mock("../api/account") (or the right relative path). */
export function me(counts: Partial<Me["counts"]> = {}, user: Partial<Me["user"]> = {}): Me {
  return {
    user: {
      username: "gab", first_name: "", last_name: "", full_name: "", email: "", is_staff: false,
      date_joined: "2026-01-05T10:00:00Z", last_login: null, ...user,
    },
    counts: { pending_changes: 0, orders_to_ship: 0, ...counts },
  };
}

export function mockMe(value: Me = me()) {
  vi.mocked(account.getMe).mockResolvedValue(value);
}

export function Providers({ path, children }: { path: string; children: ReactNode }) {
  return (
    <QueryClientProvider client={makeQueryClient()}>
      <MemoryRouter initialEntries={[path]}>
        <NotificationsProvider>{children}</NotificationsProvider>
      </MemoryRouter>
    </QueryClientProvider>
  );
}

/** The whole app at `path`, with a fresh query cache. */
export function renderPage(path: string) {
  return render(
    <Providers path={path}>
      <App />
    </Providers>,
  );
}
