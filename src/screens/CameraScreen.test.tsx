import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { ApiError } from "../api/client";
import * as api from "../api/scan";
import { useAutoscan } from "../autoscan/useAutoscan";
import { toJpeg } from "../camera/crop";
import { useCamera } from "../camera/useCamera";
import { candidate, line, session, setup } from "../test/fixtures";
import CameraScreen from "./CameraScreen";

vi.mock("../api/scan");
vi.mock("../camera/useCamera");
vi.mock("../camera/crop");
vi.mock("../autoscan/useAutoscan");

type AutoscanOptions = Parameters<typeof useAutoscan>[0];
let autoscan: AutoscanOptions;
const done = vi.fn();

beforeEach(() => {
  done.mockReset();
  vi.mocked(useCamera).mockReturnValue({ videoRef: { current: null }, ready: true, error: null });
  vi.mocked(toJpeg).mockResolvedValue(new Blob(["jpeg"]));
  vi.mocked(useAutoscan).mockImplementation((opts) => {
    autoscan = opts;
    return { phase: "armed", metrics: null, manual: () => opts.onCapture(), done };
  });
  vi.mocked(api.getSetup).mockResolvedValue(setup());
  vi.mocked(api.getSession).mockResolvedValue({ session: session() });
});

function renderCamera(path = "/s1/") {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/:uuid" element={<CameraScreen />} />
        <Route path="/:uuid/review" element={<p>review page</p>} />
      </Routes>
    </MemoryRouter>,
  );
}

const added = (over = {}) => ({ result: "added" as const, message: "Added · 1 copy", line: line(), count: 1, ...over });

describe("CameraScreen", () => {
  it("desktop shows QR", async () => {
    vi.mocked(api.getSession).mockResolvedValue({ session: session({ is_phone: false, phone_secure: false, count: 4 }) });
    renderCamera();
    expect(await screen.findByRole("heading", { name: "Continue on your phone" })).toBeInTheDocument();
    const qr = screen.getByRole("img", { name: "QR code linking to https://pc.ts.net/scan/s1/" });
    expect(qr.tagName).toBe("svg");
    expect(qr.querySelector("path")?.getAttribute("d")).toMatch(/^M\d/);
    expect(screen.getByText("https://pc.ts.net/scan/s1/")).toBeInTheDocument();
    expect(screen.getByText(/not HTTPS/)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Review (4)" })).toHaveAttribute("href", "/s1/review");
    expect(useCamera).not.toHaveBeenCalled();
  });

  it("desktop without HTTPS warning when secure", async () => {
    vi.mocked(api.getSession).mockResolvedValue({ session: session({ is_phone: false }) });
    renderCamera();
    await screen.findByRole("heading", { name: "Continue on your phone" });
    expect(screen.queryByText(/not HTTPS/)).not.toBeInTheDocument();
  });

  it("saved session goes to collection", async () => {
    const assign = vi.fn();
    vi.stubGlobal("location", { ...window.location, assign });
    vi.mocked(api.getSession).mockResolvedValue({ session: session({ status: "saved" }) });
    renderCamera();
    await vi.waitFor(() => expect(assign).toHaveBeenCalledWith("/"));
  });

  it("a shot adds the card and updates count", async () => {
    vi.mocked(api.capture).mockResolvedValue(added({ count: 5 }));
    renderCamera();
    await screen.findByRole("button", { name: "Search" });
    await act(() => autoscan.onCapture());
    expect(api.capture).toHaveBeenCalledWith("s1", expect.any(Blob), expect.any(String));
    expect(await screen.findByText("Added · 1 copy")).toBeInTheDocument();
    expect(screen.getByText("Counterspell")).toBeInTheDocument();
    expect(screen.getByText("DMR 045 · NM · IT")).toBeInTheDocument();
    expect(screen.getByTestId("count")).toHaveTextContent("5");
    expect(done).toHaveBeenCalledWith(false);
  });

  it("only one capture at a time", async () => {
    let resolve!: (v: ReturnType<typeof added>) => void;
    vi.mocked(api.capture).mockReturnValue(new Promise((r) => (resolve = r)));
    renderCamera();
    await screen.findByRole("button", { name: "Search" });
    act(() => void autoscan.onCapture());
    act(() => void autoscan.onCapture());
    await act(async () => resolve(added()));
    expect(api.capture).toHaveBeenCalledTimes(1);
  });

  it("uncertain capture opens the confirm panel and pauses autoscan", async () => {
    const pending = line({ uuid: "p1", blueprint: null, needs_confirmation: true, candidates: [candidate()] });
    vi.mocked(api.capture).mockResolvedValue({ result: "confirm", message: "Which one is it?", line: pending, count: 1 });
    renderCamera();
    await screen.findByRole("button", { name: "Search" });
    await act(() => autoscan.onCapture());
    expect(await screen.findByRole("dialog", { name: "Which one is it?" })).toBeInTheDocument();
    expect(autoscan.paused).toBe(true);
    await userEvent.click(screen.getByRole("button", { name: "Decide later" }));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(autoscan.paused).toBe(false);
  });

  it("confirming shows the card as added", async () => {
    const pending = line({ uuid: "p1", blueprint: null, needs_confirmation: true, candidates: [candidate()] });
    vi.mocked(api.capture).mockResolvedValue({ result: "confirm", message: "Which one is it?", line: pending, count: 1 });
    vi.mocked(api.confirmLine).mockResolvedValue({ line: line(), count: 1 });
    renderCamera();
    await screen.findByRole("button", { name: "Search" });
    await act(() => autoscan.onCapture());
    await userEvent.click(await screen.findByRole("button", { name: "Confirm and continue" }));
    expect(await screen.findByText("Counterspell")).toBeInTheDocument();
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("foil toggles last card", async () => {
    vi.mocked(api.capture).mockResolvedValue(added());
    vi.mocked(api.updateLine).mockResolvedValue({ line: line({ foil: true }), count: 1 });
    renderCamera();
    await screen.findByRole("button", { name: "Search" });
    await act(() => autoscan.onCapture());
    await userEvent.click(await screen.findByRole("button", { name: "Foil" }));
    expect(api.updateLine).toHaveBeenCalledWith("l1", { foil: true });
    expect(await screen.findByRole("button", { name: "Foil" })).toHaveAttribute("aria-pressed", "true");
  });

  it("undo removes last card", async () => {
    vi.mocked(api.capture).mockResolvedValue(added());
    vi.mocked(api.undoLine).mockResolvedValue({ line: null, count: 0 });
    renderCamera();
    await screen.findByRole("button", { name: "Search" });
    await act(() => autoscan.onCapture());
    await userEvent.click(await screen.findByRole("button", { name: "Undo" }));
    expect(api.undoLine).toHaveBeenCalledWith("l1");
    expect(await screen.findByText("Removed")).toBeInTheDocument();
    expect(screen.queryByText("Counterspell")).not.toBeInTheDocument();
    expect(screen.getByTestId("count")).toHaveTextContent("0");
  });

  it("no card shows the message", async () => {
    vi.mocked(api.capture).mockResolvedValue({ result: "no_card", message: "No card in the picture — frame a card", line: null, count: 0 });
    renderCamera();
    await screen.findByRole("button", { name: "Search" });
    await act(() => autoscan.onCapture());
    expect(await screen.findByText("No card in the picture — frame a card")).toBeInTheDocument();
    expect(done).toHaveBeenCalledWith(true);
  });

  it("error shows message and help link", async () => {
    vi.mocked(api.capture).mockRejectedValue(
      new ApiError("CardTrader is not connected", 503, "service_missing", "/account/#cardtrader"),
    );
    renderCamera();
    await screen.findByRole("button", { name: "Search" });
    await act(() => autoscan.onCapture());
    expect(await screen.findByText("CardTrader is not connected")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Open Profile and settings" })).toHaveAttribute("href", "/account/#cardtrader");
    expect(done).toHaveBeenCalled();
  });

  it("network error offers retry with the same photo and id", async () => {
    vi.mocked(api.isNetworkError).mockReturnValue(true);
    vi.mocked(api.capture).mockRejectedValueOnce(new TypeError("Failed to fetch")).mockResolvedValueOnce(added());
    renderCamera();
    await screen.findByRole("button", { name: "Search" });
    await act(() => autoscan.onCapture());
    expect(await screen.findByText("No connection — retry to send the same photo")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Retry" }));
    expect(await screen.findByText("Added · 1 copy")).toBeInTheDocument();
    const [first, second] = vi.mocked(api.capture).mock.calls;
    expect(second[1]).toBe(first[1]);
    expect(second[2]).toBe(first[2]);
  });

  it("the next shot after a failed upload resends it instead of a new photo", async () => {
    vi.mocked(api.isNetworkError).mockReturnValue(true);
    vi.mocked(api.capture).mockRejectedValueOnce(new TypeError("Failed to fetch")).mockResolvedValueOnce(added());
    renderCamera();
    await screen.findByRole("button", { name: "Search" });
    await act(() => autoscan.onCapture());
    await screen.findByText(/No connection/);
    await act(() => autoscan.onCapture());
    const [first, second] = vi.mocked(api.capture).mock.calls;
    expect(second[2]).toBe(first[2]);
    expect(toJpeg).toHaveBeenCalledTimes(1);
  });

  it("other errors show their own message", async () => {
    vi.mocked(api.isNetworkError).mockReturnValue(false);
    vi.mocked(toJpeg).mockRejectedValue(new Error("Could not take the photo"));
    renderCamera();
    await screen.findByRole("button", { name: "Search" });
    await act(() => autoscan.onCapture());
    expect(await screen.findByText("Could not take the photo")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Retry" })).not.toBeInTheDocument();
  });


  it("reopened session shows the last added card", async () => {
    vi.mocked(api.getSession).mockResolvedValue({ session: session({ count: 2, last_line: line({ quantity: 2 }) }) });
    renderCamera();
    expect(await screen.findByText("Last added")).toBeInTheDocument();
    expect(screen.getByText("Counterspell")).toBeInTheDocument();
  });

  it("there is no manual shutter", async () => {
    renderCamera();
    await screen.findByRole("button", { name: "Search" });
    expect(screen.queryByRole("button", { name: "Take photo" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Auto" })).not.toBeInTheDocument();
  });

  it("camera error is shown", async () => {
    vi.mocked(useCamera).mockReturnValue({
      videoRef: { current: null }, ready: false,
      error: "Camera not available (HTTPS and permission are required). Use Search.",
    });
    renderCamera();
    expect(await screen.findByText(/Camera not available/)).toBeInTheDocument();
  });

  it("search is disabled while a photo is being recognised", async () => {
    vi.mocked(api.capture).mockReturnValue(new Promise(() => {}));
    renderCamera();
    await screen.findByRole("button", { name: "Search" });
    act(() => void autoscan.onCapture());
    expect(screen.getByRole("button", { name: "Search" })).toBeDisabled();
  });

  it("a confirm arriving over the search panel opens a fresh confirm panel", async () => {
    let resolve!: (v: Awaited<ReturnType<typeof api.capture>>) => void;
    vi.mocked(api.capture).mockReturnValue(new Promise((r) => (resolve = r)));
    vi.mocked(api.search).mockResolvedValue({ results: [], where: "dmr", warnings: [] });
    renderCamera();
    await screen.findByRole("button", { name: "Search" });
    await userEvent.click(screen.getByRole("button", { name: "Search" }));
    await userEvent.type(screen.getByLabelText("Search by name"), "sheol");
    act(() => void autoscan.onCapture());
    const pending = line({ uuid: "p1", blueprint: null, language: "IT", condition: "EX", needs_confirmation: true, candidates: [candidate()] });
    await act(async () => resolve({ result: "confirm", message: "Which one is it?", line: pending, count: 1 }));
    expect(await screen.findByRole("dialog", { name: "Which one is it?" })).toBeInTheDocument();
    expect(screen.getByLabelText("Search by name")).toHaveValue("");
    expect(screen.getAllByRole("radio")[0]).toBeChecked();
    expect(screen.getByLabelText("Language")).toHaveValue("IT");
    expect(screen.getByLabelText("Condition")).toHaveValue("EX");
  });

  it("search opens the add panel", async () => {
    renderCamera();
    await userEvent.click(await screen.findByRole("button", { name: "Search" }));
    expect(screen.getByRole("dialog", { name: "Search a card" })).toBeInTheDocument();
    expect(autoscan.paused).toBe(true);
  });

  it("debug overlay with ?debug=1", async () => {
    vi.mocked(useAutoscan).mockImplementation((opts) => {
      autoscan = opts;
      return {
        phase: "steadying", manual: vi.fn(), done,
        metrics: { edges: 0.12, sharpness: 3.4, motion: 1.5, present: true, sharp: true, still: true, change: 31.5, fromBackground: Infinity,
          sharpRange: [2.9, 3.6], motionRange: [0.8, 2.1] },
      };
    });
    renderCamera("/s1/?debug=1");
    expect(await screen.findByTestId("debug")).toHaveTextContent("steadying");
    expect(screen.getByTestId("debug")).toHaveTextContent("edges 0.120");
    expect(screen.getByTestId("debug")).toHaveTextContent("change 31.5 bg Infinity");
    expect(screen.getByTestId("debug")).toHaveTextContent("sharp 3.40 ok (2.90–3.60)");
    expect(autoscan.debug).toBe(true);
  });
});
