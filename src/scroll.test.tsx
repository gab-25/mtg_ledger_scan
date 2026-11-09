import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Link, Route, Routes } from "react-router-dom";
import { useAction } from "./actions";
import ScrollToTop from "./ScrollToTop";
import { Providers } from "./test/renderPage";

function Page() {
  const action = useAction(() => Promise.resolve({ messages: [{ level: "success", text: "Done." }] }));
  return (
    <>
      <Link to="/b">to b</Link>
      <Link to="/c#part">to c</Link>
      <button onClick={() => action.mutate()}>act</button>
    </>
  );
}

function renderApp() {
  render(
    <Providers path="/a">
      <ScrollToTop />
      <Routes>
        <Route path="/a" element={<Page />} />
        <Route path="/b" element={<p>page b</p>} />
        <Route path="/c" element={<p>page c</p>} />
      </Routes>
    </Providers>,
  );
}

describe("scroll like full page loads", () => {
  it("a navigation starts at the top of the page, where the messages are", async () => {
    const scrollTo = vi.fn();
    vi.stubGlobal("scrollTo", scrollTo);
    renderApp();
    scrollTo.mockClear();
    await userEvent.click(screen.getByRole("link", { name: "to b" }));
    await screen.findByText("page b");
    expect(scrollTo).toHaveBeenCalledWith(0, 0);
  });

  it("a link with a hash is left to the page", async () => {
    const scrollTo = vi.fn();
    vi.stubGlobal("scrollTo", scrollTo);
    renderApp();
    scrollTo.mockClear();
    await userEvent.click(screen.getByRole("link", { name: "to c" }));
    await screen.findByText("page c");
    expect(scrollTo).not.toHaveBeenCalled();
  });

  it("an action that stays on the page scrolls up to its messages", async () => {
    const scrollTo = vi.fn();
    vi.stubGlobal("scrollTo", scrollTo);
    renderApp();
    scrollTo.mockClear();
    await act(() => userEvent.click(screen.getByRole("button", { name: "act" })));
    await vi.waitFor(() => expect(scrollTo).toHaveBeenCalledWith(0, 0));
  });
});
