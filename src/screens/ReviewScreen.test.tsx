import { chooseOption } from "@/test/select";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { ApiError } from "../api/client";
import * as api from "../api/scan";
import type { Review } from "../api/types";
import { candidate, line, session, setup } from "../test/fixtures";
import { Messages, NotificationsProvider } from "../notifications";
import ReviewScreen from "./ReviewScreen";

vi.mock("../api/scan");

const pendingLine = line({ uuid: "p1", blueprint: null, needs_confirmation: true, frame_url: "/f.jpg", candidates: [candidate()] });

function review(over: Partial<Review> = {}): Review {
  return { session: session(), lines: [line({ quantity: 2 })], pending: [], copies: 2, unique: 1, listed: 0, ...over };
}

function renderReview() {
  return render(
    <MemoryRouter initialEntries={["/scan/s1/review"]}>
      <NotificationsProvider>
        <Routes>
          <Route path="/scan/:uuid/review" element={<ReviewScreen />} />
          <Route path="/scan/:uuid" element={<p>camera page</p>} />
          <Route path="/" element={<><Messages /><p>collection page</p></>} />
        </Routes>
      </NotificationsProvider>
    </MemoryRouter>,
  );
}

beforeEach(() => {
  vi.mocked(api.getSetup).mockResolvedValue(setup());
  vi.mocked(api.getReview).mockResolvedValue(review());
});

describe("ReviewScreen", () => {
  it("shows totals and merged lines", async () => {
    renderReview();
    expect(await screen.findByRole("heading", { name: "2 cards to save" })).toBeInTheDocument();
    expect(screen.getByText("1 unique · duplicates already merged")).toBeInTheDocument();
    expect(screen.getByText("Counterspell")).toBeInTheDocument();
    expect(screen.getByText("€ 5.00")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Save 2" })).toBeEnabled();
    expect(screen.getByRole("link", { name: "Continue scanning" })).toHaveAttribute("href", "/scan/s1");
  });

  it("save disabled while cards need confirmation", async () => {
    vi.mocked(api.getReview).mockResolvedValue(review({ pending: [pendingLine], copies: 3 }));
    renderReview();
    expect(await screen.findByText(/1 card to confirm — saving is blocked/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Save 3" })).toBeDisabled();
  });

  it("save disabled without cards", async () => {
    vi.mocked(api.getReview).mockResolvedValue(review({ lines: [], copies: 0, unique: 0 }));
    renderReview();
    expect(await screen.findByText("No cards scanned yet.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Save 0" })).toBeDisabled();
  });

  it("threshold accepts comma and shows server error", async () => {
    vi.mocked(api.setThreshold)
      .mockResolvedValueOnce(review({ session: session({ sale_threshold: "2.50" }), listed: 2, lines: [line({ quantity: 2, listed: true })] }))
      .mockRejectedValueOnce(new ApiError("Enter the threshold as a price, e.g. 2.50.", 400, "invalid"));
    renderReview();
    const input = await screen.findByLabelText(/List for sale cards worth more than €/);
    await userEvent.type(input, "2,50");
    await userEvent.click(screen.getByRole("button", { name: "Apply" }));
    expect(api.setThreshold).toHaveBeenCalledWith("s1", "2,50");
    expect(await screen.findByRole("button", { name: "Save 2 · list 2" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "For sale" })).toHaveAttribute("aria-pressed", "true");
    await userEvent.clear(input);
    await userEvent.type(input, "abc");
    await userEvent.click(screen.getByRole("button", { name: "Apply" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Enter the threshold as a price");
  });

  it("for sale toggle sends the opposite", async () => {
    vi.mocked(api.updateLine).mockResolvedValue({ line: line({ listed: true, for_sale: true }), count: 2 });
    renderReview();
    await userEvent.click(await screen.findByRole("button", { name: "Collection only" }));
    expect(api.updateLine).toHaveBeenCalledWith("l1", { for_sale: true });
    expect(api.getReview).toHaveBeenCalledTimes(2);
  });

  it("for sale toggle disabled without price", async () => {
    vi.mocked(api.getReview).mockResolvedValue(review({ lines: [line({ price: null })] }));
    renderReview();
    expect(await screen.findByRole("button", { name: "Collection only" })).toBeDisabled();
    expect(screen.getByText("no price")).toBeInTheDocument();
  });

  it("stepper plus and minus", async () => {
    vi.mocked(api.updateLine).mockResolvedValue({ line: line({ quantity: 3 }), count: 3 });
    vi.mocked(api.undoLine).mockResolvedValue({ line: line({ quantity: 1 }), count: 1 });
    renderReview();
    await userEvent.click(await screen.findByRole("button", { name: "Add one copy of Counterspell" }));
    expect(api.updateLine).toHaveBeenCalledWith("l1", { quantity: 3 });
    await userEvent.click(screen.getByRole("button", { name: "Remove one copy of Counterspell" }));
    expect(api.undoLine).toHaveBeenCalledWith("l1");
  });

  it("edit condition, language and foil", async () => {
    vi.mocked(api.updateLine).mockResolvedValue({ line: line(), count: 2 });
    renderReview();
    await userEvent.click(await screen.findByText("Edit"));
    const row = screen.getByRole("group", { name: "Edit Counterspell" });
    await chooseOption(within(row).getByLabelText("Condition"), "EX");
    await chooseOption(within(row).getByLabelText("Language"), "EN");
    await chooseOption(within(row).getByLabelText("Foil"), "Foil");
    await userEvent.click(within(row).getByRole("button", { name: "Update" }));
    expect(api.updateLine).toHaveBeenCalledWith("l1", { condition: "EX", language: "EN", foil: true });
  });

  it("confirm pending opens picker", async () => {
    vi.mocked(api.getReview).mockResolvedValue(review({ pending: [pendingLine] }));
    vi.mocked(api.confirmLine).mockResolvedValue({ line: line(), count: 3 });
    renderReview();
    await userEvent.click(await screen.findByRole("button", { name: "Confirm" }));
    expect(screen.getByRole("dialog", { name: "Which one is it?" })).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Confirm and continue" }));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(api.getReview).toHaveBeenCalledTimes(2);
  });

  it("remove pending sets quantity 0", async () => {
    vi.mocked(api.getReview).mockResolvedValue(review({ pending: [pendingLine] }));
    vi.mocked(api.updateLine).mockResolvedValue({ line: null, count: 2 });
    renderReview();
    await userEvent.click(await screen.findByRole("button", { name: "Remove" }));
    expect(api.updateLine).toHaveBeenCalledWith("p1", { quantity: 0 });
  });

  it("save goes to the collection and shows the message there", async () => {
    vi.mocked(api.saveSession).mockResolvedValue({
      saved: 2, listed: 0, redirect: "/", messages: [{ level: "success", text: "Saved 2 cards, 0 queued for sale." }],
    });
    renderReview();
    await userEvent.click(await screen.findByRole("button", { name: "Save 2" }));
    expect(api.saveSession).toHaveBeenCalledWith("s1");
    expect(await screen.findByText("collection page")).toBeInTheDocument();
    expect(screen.getByText("Saved 2 cards, 0 queued for sale.")).toHaveAttribute("data-variant", "success");
  });

  it("save error is shown", async () => {
    vi.mocked(api.saveSession).mockRejectedValue(new ApiError("Some cards still need confirmation.", 409, "blocked"));
    renderReview();
    await userEvent.click(await screen.findByRole("button", { name: "Save 2" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Some cards still need confirmation.");
  });
});
