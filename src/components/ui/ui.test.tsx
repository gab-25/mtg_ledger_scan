import userEvent from "@testing-library/user-event";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { render, screen } from "@testing-library/react";
import { badgeVariant } from "@/api/types";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

describe("ui primitives", () => {
  test("Badge exposes its variant", () => {
    render(<Badge variant="pending">Sync pending</Badge>);
    expect(screen.getByText("Sync pending")).toHaveAttribute("data-variant", "pending");
  });

  test("Alert exposes its variant", () => {
    render(<Alert variant="error">Broken</Alert>);
    expect(screen.getByText("Broken")).toHaveAttribute("data-variant", "error");
  });

  test("Button asChild renders the child element", () => {
    render(
      <Button asChild variant="pill">
        <a href="/x" aria-current="true">x</a>
      </Button>,
    );
    const link = screen.getByRole("link", { name: "x" });
    expect(link.tagName).toBe("A");
    expect(link).toHaveAttribute("href", "/x");
  });

  test("badgeVariant maps API tones, unknown ones to neutral", () => {
    expect(badgeVariant("live")).toBe("live");
    expect(badgeVariant("weird")).toBe("neutral");
  });
});

describe("review fixes", () => {
  test("a file input is not styled as read-only; a readonly input is", () => {
    render(<><Input type="file" aria-label="file" /><Input readOnly aria-label="ro" /></>);
    expect(screen.getByLabelText("file").className).not.toMatch(/(^|\s)read-only:/);
    expect(screen.getByLabelText("ro")).toHaveClass("[&[readonly]]:bg-surface-2");
  });

  test("select menu rows are at least 44px tall (touch target)", async () => {
    render(
      <Select defaultValue="1">
        <SelectTrigger aria-label="n"><SelectValue /></SelectTrigger>
        <SelectContent><SelectItem value="1">One</SelectItem></SelectContent>
      </Select>,
    );
    await userEvent.click(screen.getByLabelText("n"));
    expect(await screen.findByRole("option", { name: "One" })).toHaveClass("min-h-11");
  });
});
