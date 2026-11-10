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
