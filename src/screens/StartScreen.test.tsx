import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import * as api from "../api/scan";
import { DMR, session, setup } from "../test/fixtures";
import StartScreen from "./StartScreen";

vi.mock("../api/scan");

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
    expect(await screen.findByLabelText("Expansion")).toHaveValue(String(DMR.id));
    expect(screen.getByRole("radio", { name: "EX" })).toBeChecked();
    expect(screen.getByRole("link", { name: "Collection" })).toHaveAttribute("href", "/");
  });

  it("shows missing-service warnings with links", async () => {
    vi.mocked(api.getSetup).mockResolvedValue(
      setup({ missing: [{ message: "CardTrader is not connected: the card catalog and prices need its API token.", url: "/account/#cardtrader" }] }),
    );
    renderStart();
    expect(await screen.findByText(/CardTrader is not connected/)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Connect it in Profile and settings" })).toHaveAttribute("href", "/account/#cardtrader");
  });

  it("starts session and navigates to camera", async () => {
    vi.mocked(api.getSetup).mockResolvedValue(setup());
    vi.mocked(api.startSession).mockResolvedValue({ session: session({ uuid: "abc" }), warnings: [] });
    renderStart();
    await userEvent.selectOptions(await screen.findByLabelText("Expansion"), String(DMR.id));
    await userEvent.click(screen.getByRole("radio", { name: "EX" }));
    await userEvent.click(screen.getByRole("button", { name: /Open camera|Start and continue on phone/ }));
    expect(api.startSession).toHaveBeenCalledWith(DMR.id, "EX");
    expect(await screen.findByText("camera page")).toBeInTheDocument();
  });

  it("All expansions sends null", async () => {
    vi.mocked(api.getSetup).mockResolvedValue(setup({ defaults: { expansion_id: DMR.id, condition: "NM" } }));
    vi.mocked(api.startSession).mockResolvedValue({ session: session(), warnings: [] });
    renderStart();
    await userEvent.selectOptions(await screen.findByLabelText("Expansion"), "All expansions");
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
});
