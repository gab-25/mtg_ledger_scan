import { cn } from "@/lib/utils";

test("cn merges and dedupes tailwind classes", () => {
  expect(cn("px-2", false && "hidden", "px-4")).toBe("px-4");
});
