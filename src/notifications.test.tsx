import { act, render, screen } from "@testing-library/react";
import { MemoryRouter, useNavigate } from "react-router-dom";
import { Messages, NotificationsProvider, useNotify, type Msg } from "./notifications";

let go: (to: string) => void = () => {};
let notify: (msgs: Msg[], opts?: { afterNavigation?: boolean }) => void = () => {};

function Probe() {
  go = useNavigate();
  notify = useNotify();
  return <Messages />;
}

function renderProbe() {
  render(
    <MemoryRouter initialEntries={["/a"]}>
      <NotificationsProvider>
        <Probe />
      </NotificationsProvider>
    </MemoryRouter>,
  );
}

describe("notifications", () => {
  it("renders nothing without messages", () => {
    renderProbe();
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });

  it("renders each message with its level as class", () => {
    renderProbe();
    act(() => notify([{ level: "success", text: "Saved." }, { level: "warning", text: "Careful." }]));
    const list = screen.getByRole("status");
    expect(list).toHaveClass("messages");
    expect(screen.getByText("Saved.")).toHaveClass("message", "success");
    expect(screen.getByText("Careful.")).toHaveClass("message", "warning");
  });

  it("a message shown on this page is cleared by the next navigation", () => {
    renderProbe();
    act(() => notify([{ level: "success", text: "Published." }]));
    expect(screen.getByText("Published.")).toBeInTheDocument();
    act(() => go("/b"));
    expect(screen.queryByText("Published.")).not.toBeInTheDocument();
  });

  it("a message before a redirect shows on the next page, then clears", () => {
    renderProbe();
    act(() => {
      notify([{ level: "success", text: "Added 4× Lightning Bolt." }], { afterNavigation: true });
      go("/b");
    });
    expect(screen.getByText("Added 4× Lightning Bolt.")).toBeInTheDocument();
    act(() => go("/c"));
    expect(screen.queryByText("Added 4× Lightning Bolt.")).not.toBeInTheDocument();
  });

  it("new messages replace nothing: they add up", () => {
    renderProbe();
    act(() => notify([{ level: "success", text: "One." }]));
    act(() => notify([{ level: "error", text: "Two." }]));
    expect(screen.getAllByRole("listitem")).toHaveLength(2);
  });
});
