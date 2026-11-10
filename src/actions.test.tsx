import { screen } from "@testing-library/react";
import { render } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useQuery } from "@tanstack/react-query";
import { Route, Routes } from "react-router-dom";
import { useAction } from "./actions";
import { ApiError } from "./api/client";
import { Messages } from "./notifications";
import { Providers } from "./test/renderPage";

let loads = 0;

function Page({ fn, to }: { fn: () => Promise<unknown>; to?: string }) {
  useQuery({ queryKey: ["counts"], queryFn: () => ++loads });
  const action = useAction(fn, to ? { navigateTo: to } : undefined);
  return (
    <>
      <Messages />
      <button onClick={() => action.mutate()}>Go</button>
    </>
  );
}

function renderAction(fn: () => Promise<unknown>, to?: string) {
  render(
    <Providers path="/a">
      <Routes>
        <Route path="/a" element={<Page fn={fn} to={to} />} />
        <Route path="/b" element={<><Messages /><p>page b</p></>} />
      </Routes>
    </Providers>,
  );
}

describe("useAction", () => {
  beforeEach(() => {
    loads = 0;
  });

  it("shows the messages and reloads every query (sidebar counters too)", async () => {
    renderAction(() => Promise.resolve({ messages: [{ level: "success", text: "Published 1 listing to CardTrader." }] }));
    await vi.waitFor(() => expect(loads).toBe(1));
    await userEvent.click(screen.getByRole("button", { name: "Go" }));
    expect(await screen.findByText("Published 1 listing to CardTrader.")).toHaveAttribute("data-variant", "success");
    await vi.waitFor(() => expect(loads).toBe(2));
  });

  it("navigates and shows the messages on the next page", async () => {
    renderAction(() => Promise.resolve({ messages: [{ level: "success", text: "Listing removed." }] }), "/b");
    await userEvent.click(screen.getByRole("button", { name: "Go" }));
    expect(await screen.findByText("page b")).toBeInTheDocument();
    expect(screen.getByText("Listing removed.")).toBeInTheDocument();
  });

  it("an error becomes an error message", async () => {
    renderAction(() => Promise.reject(new ApiError("Publish failed: down", 502, "service_error")));
    await userEvent.click(screen.getByRole("button", { name: "Go" }));
    expect(await screen.findByText("Publish failed: down")).toHaveAttribute("data-variant", "error");
  });

  it("validation errors stay with the form", async () => {
    renderAction(() => Promise.reject(new ApiError("bad", 400, "invalid", undefined, { quantity: ["bad"] })));
    await userEvent.click(screen.getByRole("button", { name: "Go" }));
    await vi.waitFor(() => expect(screen.queryByRole("status")).not.toBeInTheDocument());
  });
});
