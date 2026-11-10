import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

/** Picks an option of a shadcn Select: opens it from its trigger, then clicks the option by name. */
export async function chooseOption(trigger: HTMLElement, name: string | RegExp): Promise<void> {
  await userEvent.click(trigger);
  await userEvent.click(await screen.findByRole("option", { name }));
}
