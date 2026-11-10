import { render, screen, within } from "@testing-library/react";
import type { ColumnDef } from "@tanstack/react-table";
import { MemoryRouter } from "react-router-dom";
import DataTable from "./DataTable";
import Field from "./Field";
import userEvent from "@testing-library/user-event";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { chooseOption } from "@/test/select";
import Pager from "./Pager";
import StatTile from "./StatTile";

type Row = { name: string; qty: number };
const columns: ColumnDef<Row>[] = [
  { header: "Card", accessorKey: "name" },
  { header: "Qty", accessorKey: "qty", meta: { align: "right", className: "num" } },
];

describe("DataTable", () => {
  it("renders rows with column classes and right-aligned headers", () => {
    render(<DataTable columns={columns} data={[{ name: "Bolt", qty: 4 }]} empty="Nothing." />);
    const [card, qty] = screen.getAllByRole("columnheader");
    expect(card).toHaveAttribute("scope", "col");
    expect(qty).toHaveStyle({ textAlign: "right" });
    expect(screen.getByRole("cell", { name: "4" })).toHaveClass("num");
    expect(screen.getByRole("table").parentElement).toHaveClass("table-wrap");
  });

  it("shows the empty message across all columns", () => {
    render(<DataTable columns={columns} data={[]} empty="No cards match these filters." />);
    const cell = screen.getByRole("cell", { name: "No cards match these filters." });
    expect(cell).toHaveClass("empty");
    expect(cell).toHaveAttribute("colspan", "2");
  });
});

describe("Pager", () => {
  it("links previous and next pages", () => {
    render(<MemoryRouter><Pager page={2} numPages={3} href={(p) => `?color=B&page=${p}`} /></MemoryRouter>);
    const nav = screen.getByRole("navigation", { name: "Pagination" });
    expect(within(nav).getByRole("link", { name: "Previous" })).toHaveAttribute("href", "/?color=B&page=1");
    expect(within(nav).getByRole("link", { name: "Next" })).toHaveAttribute("href", "/?color=B&page=3");
    expect(within(nav).getByText("2 / 3")).toHaveAttribute("aria-current", "page");
  });

  it("is hidden with a single page", () => {
    render(<MemoryRouter><Pager page={1} numPages={1} href={(p) => `?page=${p}`} /></MemoryRouter>);
    expect(screen.queryByRole("navigation")).not.toBeInTheDocument();
  });
});

describe("Field, Badge, StatTile", () => {
  it("field with label, help and errors", () => {
    render(<Field label="Name" id="name" help="Your name." errors={["This field is required."]} wide><Input id="name" /></Field>);
    expect(screen.getByLabelText("Name")).toBeInTheDocument();
    expect(screen.getByText("Your name.")).toBeInTheDocument();
    expect(screen.getByRole("listitem")).toHaveTextContent("This field is required.");
  });

  it("checkbox field: a shadcn checkbox labelled after it, toggled by a click", async () => {
    render(<Field label="Foil" id="foil" check><Checkbox id="foil" /></Field>);
    const box = screen.getByRole("checkbox", { name: "Foil" });
    expect(box).toHaveAttribute("aria-checked", "false");
    await userEvent.click(screen.getByText("Foil"));
    expect(box).toHaveAttribute("aria-checked", "true");
  });

  it("a select labelled by its field, picked with chooseOption", async () => {
    render(
      <Field label="Number" id="num">
        <Select defaultValue="1">
          <SelectTrigger id="num"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="1">One</SelectItem>
            <SelectItem value="2">Two</SelectItem>
          </SelectContent>
        </Select>
      </Field>,
    );
    const trigger = screen.getByLabelText("Number");
    expect(trigger).toHaveAttribute("role", "combobox");
    await chooseOption(trigger, "Two");
    expect(trigger).toHaveTextContent("Two");
  });

  it("stat", () => {
    render(<StatTile label="To publish" value={3} tone="warn" />);
    expect(screen.getByText("3")).toHaveClass("stat-value", "warn");
  });
});
