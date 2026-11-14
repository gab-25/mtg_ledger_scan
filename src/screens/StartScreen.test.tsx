import { chooseOption } from "@/test/select";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import * as api from "../api/scan";
import { ApiError } from "../api/client";
import type { OpenSession } from "../api/types";
import { DMR, session, setup } from "../test/fixtures";
import StartScreen from "./StartScreen";

vi.mock("../api/scan");

beforeEach(() => {
  vi.mocked(api.listSessions).mockResolvedValue({ results: [] });
});

const openSession = (over: Partial<OpenSession> = {}): OpenSession => ({
  ...session(), created_at: "2026-11-11T08:00:00Z", updated_at: "2026-11-11T09:00:00Z", ...over,
});

function renderStart() {
  return render(
    <MemoryRouter initialEntries={["/scan"]}>
      <Routes>
        <Route path="/scan" element={<StartScreen />} />
        <Route path="/scan/:uuid" element={<p>camera page</p>} />
      </Routes>
    </MemoryRouter>,
  );
}

describe("StartScreen", () => {
  it("preselects last expansion and condition", async () => {
    vi.mocked(api.getSetup).mockResolvedValue(setup({ defaults: { expansion_id: DMR.id, condition: "EX" } }));
    renderStart();
    expect(await screen.findByLabelText("Expansion")).toHaveTextContent("DMR · Dominaria Remastered");
    expect(screen.getByRole("radio", { name: "EX" })).toBeChecked();
    expect(screen.getByRole("link", { name: "Collection" })).toHaveAttribute("href", "/");
  });

  it("shows missing-service warnings with links", async () => {
    vi.mocked(api.getSetup).mockResolvedValue(
      setup({ missing: [{ message: "CardTrader is not connected: the card catalog needs its API token.", url: "/account/#cardtrader" }] }),
    );
    renderStart();
    expect(await screen.findByText(/CardTrader is not connected/)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Connect it in Profile and settings" })).toHaveAttribute("href", "/account/#cardtrader");
  });

  it("starts session and navigates to camera", async () => {
    vi.mocked(api.getSetup).mockResolvedValue(setup());
    vi.mocked(api.startSession).mockResolvedValue({ session: session({ uuid: "abc" }), warnings: [] });
    renderStart();
    await chooseOption(await screen.findByLabelText("Expansion"), "DMR · Dominaria Remastered");
    await userEvent.click(screen.getByRole("radio", { name: "EX" }));
    await userEvent.click(screen.getByRole("button", { name: /Open camera|Start and continue on phone/ }));
    expect(api.startSession).toHaveBeenCalledWith(DMR.id, "EX");
    expect(await screen.findByText("camera page")).toBeInTheDocument();
  });

  it("All expansions sends null", async () => {
    vi.mocked(api.getSetup).mockResolvedValue(setup({ defaults: { expansion_id: DMR.id, condition: "NM" } }));
    vi.mocked(api.startSession).mockResolvedValue({ session: session(), warnings: [] });
    renderStart();
    await chooseOption(await screen.findByLabelText("Expansion"), "All expansions");
    await userEvent.click(screen.getByRole("button", { name: /Open camera|Start and continue on phone/ }));
    expect(api.startSession).toHaveBeenCalledWith(null, "NM");
  });

  it("shows warnings from start and still opens the camera", async () => {
    vi.mocked(api.getSetup).mockResolvedValue(setup({ warnings: ["Could not load the expansions from CardTrader: down"] }));
    vi.mocked(api.startSession).mockResolvedValue({ session: session({ uuid: "abc" }), warnings: ["Could not preload DMR"] });
    renderStart();
    expect(await screen.findByText(/Could not load the expansions/)).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: /Open camera|Start and continue on phone/ }));
    expect(await screen.findByText("camera page")).toBeInTheDocument();
  });

  it("button matches the device", async () => {
    vi.mocked(api.getSetup).mockResolvedValue(setup());
    vi.spyOn(navigator, "userAgent", "get").mockReturnValue("Mozilla/5.0 (iPhone; CPU iPhone OS 18_0) Mobile/15E148");
    renderStart();
    expect(await screen.findByRole("button", { name: "Open camera" })).toBeInTheDocument();
  });

  it("desktop button explains the phone handoff", async () => {
    vi.mocked(api.getSetup).mockResolvedValue(setup());
    vi.spyOn(navigator, "userAgent", "get").mockReturnValue("Mozilla/5.0 (X11; Linux x86_64) Chrome/140.0");
    renderStart();
    expect(await screen.findByRole("button", { name: "Start and continue on phone" })).toBeInTheDocument();
  });

  it("shows a load error", async () => {
    vi.mocked(api.getSetup).mockRejectedValue(new Error("Something went wrong (500) — try again"));
    renderStart();
    expect(await screen.findByRole("alert")).toHaveTextContent("Something went wrong (500)");
  });

  it("offers the open sessions to resume, above a new one", async () => {
    vi.mocked(api.getSetup).mockResolvedValue(setup());
    vi.mocked(api.listSessions).mockResolvedValue({
      results: [openSession({ uuid: "s1", count: 12 }), openSession({ uuid: "s2", expansion: null, default_condition: "EX", count: 1 })],
    });
    renderStart();
    const list = await screen.findByRole("region", { name: "Open sessions" });
    const [first, second] = within(list).getAllByRole("listitem");
    expect(first).toHaveTextContent("DMR · Dominaria Remastered · NM");
    expect(first).toHaveTextContent("12 cards · started");
    expect(within(first).getByRole("link", { name: "Resume DMR · Dominaria Remastered · NM" })).toHaveAttribute("href", "/scan/s1/");
    expect(within(first).getByRole("link", { name: /Resume/ })).toHaveAttribute("data-variant", "primary");
    expect(second).toHaveTextContent("All expansions · EX");
    expect(second).toHaveTextContent("1 card · started");
    expect(within(second).getByRole("link", { name: /Resume/ })).toHaveAttribute("data-variant", "raised");
    expect(screen.getByRole("button", { name: /Open camera|Start and continue on phone/ })).toHaveAttribute("data-variant", "raised");
  });

  it("without open sessions, or if they can't be listed, only the new session form", async () => {
    vi.mocked(api.getSetup).mockResolvedValue(setup());
    vi.mocked(api.listSessions).mockRejectedValue(new ApiError("Something went wrong (500) — try again", 500, "server"));
    renderStart();
    const button = await screen.findByRole("button", { name: /Open camera|Start and continue on phone/ });
    expect(button).toHaveAttribute("data-variant", "primary");
    expect(screen.queryByRole("region", { name: "Open sessions" })).not.toBeInTheDocument();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("discards an open session after confirming, cancel keeps it", async () => {
    vi.mocked(api.getSetup).mockResolvedValue(setup());
    vi.mocked(api.listSessions).mockResolvedValue({ results: [openSession({ uuid: "s1", count: 12 })] });
    vi.mocked(api.discardSession).mockResolvedValue(undefined);
    renderStart();
    const list = await screen.findByRole("region", { name: "Open sessions" });
    await userEvent.click(within(list).getByRole("button", { name: "Discard DMR · Dominaria Remastered · NM" }));
    expect(within(list).getByText("Discard this session and its 12 cards?")).toBeInTheDocument();
    await userEvent.click(within(list).getByRole("button", { name: "Cancel" }));
    expect(api.discardSession).not.toHaveBeenCalled();
    expect(within(list).getByRole("link", { name: /Resume/ })).toBeInTheDocument();

    await userEvent.click(within(list).getByRole("button", { name: /Discard DMR/ }));
    await userEvent.click(within(list).getByRole("button", { name: "Discard" }));
    expect(api.discardSession).toHaveBeenCalledWith("s1");
    await vi.waitFor(() => expect(screen.queryByRole("region", { name: "Open sessions" })).not.toBeInTheDocument());
    expect(screen.getByRole("button", { name: /Open camera|Start and continue on phone/ })).toHaveAttribute("data-variant", "primary");
  });

  it("a session already discarded elsewhere just leaves the list; other errors are shown", async () => {
    vi.mocked(api.getSetup).mockResolvedValue(setup());
    vi.mocked(api.listSessions).mockResolvedValue({ results: [openSession({ uuid: "s1" }), openSession({ uuid: "s2" })] });
    vi.mocked(api.discardSession)
      .mockRejectedValueOnce(new ApiError("Not found.", 404, "not_found"))
      .mockRejectedValueOnce(new ApiError("Something went wrong (500) — try again", 500, "server"));
    renderStart();
    const list = await screen.findByRole("region", { name: "Open sessions" });
    const discard = async (row: HTMLElement) => {
      await userEvent.click(within(row).getByRole("button", { name: /Discard DMR/ }));
      await userEvent.click(within(row).getByRole("button", { name: "Discard" }));
    };
    await discard(within(list).getAllByRole("listitem")[0]);
    await vi.waitFor(() => expect(within(list).getAllByRole("listitem")).toHaveLength(1));
    await discard(within(list).getAllByRole("listitem")[0]);
    expect(await screen.findByRole("alert")).toHaveTextContent("Something went wrong (500)");
    expect(within(list).getAllByRole("listitem")).toHaveLength(1);
  });
});
