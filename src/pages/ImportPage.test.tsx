import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ApiError } from "../api/client";
import * as api from "../api/collection";
import { mockMe, renderPage } from "../test/renderPage";

vi.mock("../api/account");
vi.mock("../api/collection");

beforeEach(() => {
  mockMe();
  vi.mocked(api.getImportColumns).mockResolvedValue({ columns: ["name", "set", "number"] });
  vi.mocked(api.getCollection).mockResolvedValue({
    results: [], count: 0, page: 1, num_pages: 1, stats: { total: 0, unique: 0, value: null, for_sale: 0 },
    sets: [], color_filters: [], filtered: false,
  });
});

describe("ImportPage", () => {
  it("lists the columns", async () => {
    renderPage("/cards/import/");
    expect(await screen.findByRole("heading", { name: "Import CSV" })).toBeInTheDocument();
    expect(screen.getAllByText("name")[0].tagName).toBe("CODE");
    expect(screen.getByRole("link", { name: "Export CSV" })).toHaveAttribute("href", "/api/collection/export/");
  });

  it("imports a file and goes to the collection", async () => {
    vi.mocked(api.importCsv).mockResolvedValue({ messages: [{ level: "success", text: "Import complete: 1 new, 0 updated." }] });
    renderPage("/cards/import/");
    const file = new File(["name,set\nBolt,M10\n"], "c.csv", { type: "text/csv" });
    await userEvent.upload(await screen.findByLabelText("CSV file"), file);
    await userEvent.click(screen.getByRole("button", { name: "Import" }));
    expect(api.importCsv).toHaveBeenCalledWith(file);
    expect(await screen.findByText("Import complete: 1 new, 0 updated.")).toBeInTheDocument();
    expect(await screen.findByRole("heading", { name: "Collection" })).toBeInTheDocument();
  });

  it("shows the file error under the field", async () => {
    vi.mocked(api.importCsv).mockRejectedValue(
      new ApiError("x", 400, "invalid", undefined, { file: ["Line 2: invalid condition “XX”."] }),
    );
    renderPage("/cards/import/");
    await userEvent.click(await screen.findByRole("button", { name: "Import" }));
    expect(await screen.findByText("Line 2: invalid condition “XX”.")).toBeInTheDocument();
  });
});
