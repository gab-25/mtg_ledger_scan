import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import * as api from "../api/scan";
import { blueprint, DMU, line, setup } from "../test/fixtures";
import CardPicker from "./CardPicker";

vi.mock("../api/scan");

const sheoldred = blueprint({ id: 1301, name: "Sheoldred, the Apocalypse", collector_number: "107", expansion: DMU });
const pending = line({
  uuid: "p1", blueprint: null, language: "", needs_confirmation: true, frame_url: "/api/scan/lines/p1/frame.jpg",
  candidates: [blueprint(), blueprint({ id: 1202, name: "Counterspell", version: "Retro frame" })],
});

function renderPicker(over: Partial<Parameters<typeof CardPicker>[0]> = {}) {
  const props = { sessionUuid: "s1", line: pending, setup: setup(), defaultSet: "dmr", onDone: vi.fn(), onClose: vi.fn(), ...over };
  render(<CardPicker {...props} />);
  return props;
}

describe("CardPicker", () => {
  beforeEach(() => {
    vi.mocked(api.search).mockResolvedValue({ results: [sheoldred], where: "dmu", warnings: [] });
  });

  it("lists candidates first and preselects the first", () => {
    renderPicker();
    expect(screen.getByRole("dialog", { name: "Which one is it?" })).toBeInTheDocument();
    const options = screen.getAllByRole("radio");
    expect(options).toHaveLength(2);
    expect(options[0]).toBeChecked();
    expect(screen.getByText(/Retro frame/)).toBeInTheDocument();
    expect(screen.getByRole("img", { name: "Captured photo of the card" })).toHaveAttribute("src", pending.frame_url);
  });

  it("search shows results", async () => {
    renderPicker();
    await userEvent.selectOptions(screen.getByLabelText("Expansion"), "dmu");
    await userEvent.type(screen.getByLabelText("Search by name"), "sheol");
    expect(await screen.findByText("Sheoldred, the Apocalypse")).toBeInTheDocument();
    expect(api.search).toHaveBeenLastCalledWith("s1", "sheol", "dmu");
  });

  it("confirm sends blueprint, language, condition and foil", async () => {
    vi.mocked(api.confirmLine).mockResolvedValue({ line: line(), count: 3 });
    const props = renderPicker();
    await userEvent.click(screen.getAllByRole("radio")[1]);
    await userEvent.selectOptions(screen.getByLabelText("Language"), "IT");
    await userEvent.selectOptions(screen.getByLabelText("Condition"), "EX");
    await userEvent.click(screen.getByLabelText("Foil"));
    await userEvent.click(screen.getByRole("button", { name: "Confirm and continue" }));
    expect(api.confirmLine).toHaveBeenCalledWith("p1", { blueprintId: 1202, language: "IT", condition: "EX", foil: true });
    expect(props.onDone).toHaveBeenCalledWith({ line: line(), count: 3 });
  });

  it("requires a card", async () => {
    const props = renderPicker({ line: null });
    await userEvent.click(screen.getByRole("button", { name: "Add card" }));
    expect(screen.getByRole("alert")).toHaveTextContent("Pick a card and its language.");
    expect(api.addManual).not.toHaveBeenCalled();
    expect(props.onDone).not.toHaveBeenCalled();
  });

  it("shows the server error", async () => {
    vi.mocked(api.confirmLine).mockRejectedValue(new Error("Pick a card and its language."));
    renderPicker();
    await userEvent.click(screen.getByRole("button", { name: "Confirm and continue" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Pick a card and its language.");
  });

  it("decide later closes without calling the API", async () => {
    const props = renderPicker();
    await userEvent.click(screen.getByRole("button", { name: "Decide later" }));
    expect(props.onClose).toHaveBeenCalled();
    expect(api.confirmLine).not.toHaveBeenCalled();
  });

  it("manual add calls addManual", async () => {
    vi.mocked(api.addManual).mockResolvedValue({ line: line({ blueprint: sheoldred }), count: 1 });
    const props = renderPicker({ line: null });
    expect(screen.getByRole("dialog", { name: "Search a card" })).toBeInTheDocument();
    expect(screen.queryByLabelText("Condition")).not.toBeInTheDocument();
    await userEvent.type(screen.getByLabelText("Search by name"), "sheol");
    await userEvent.click(await screen.findByRole("radio", { name: /Sheoldred/ }));
    await userEvent.click(screen.getByRole("button", { name: "Add card" }));
    expect(api.addManual).toHaveBeenCalledWith("s1", 1301, "EN", false);
    expect(props.onDone).toHaveBeenCalled();
    await userEvent.click(screen.getByRole("button", { name: "Back to camera" }));
    expect(props.onClose).toHaveBeenCalled();
  });
});
