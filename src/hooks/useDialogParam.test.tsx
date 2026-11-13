import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Link, MemoryRouter, useLocation, useNavigate } from "react-router-dom";
import { DIALOG_STATE, useDialogParam } from "./useDialogParam";

function Probe() {
  const { search } = useLocation();
  const navigate = useNavigate();
  const edit = useDialogParam("edit");
  return (
    <>
      <output>{search}</output>
      <Link to="/?q=b">next list</Link>
      <Link to={edit.openHref(7)} state={DIALOG_STATE}>open</Link>
      <button onClick={edit.close}>close</button>
      <button onClick={() => navigate(-1)}>back</button>
    </>
  );
}

const renderAt = (path: string) => render(<MemoryRouter initialEntries={[path]}><Probe /></MemoryRouter>);
const click = (name: string) => userEvent.click(screen.getByRole(name === "next list" || name === "open" ? "link" : "button", { name }));
const search = () => screen.getByRole("status").textContent;

describe("useDialogParam", () => {
  it("closing a dialog opened in the app goes Back, leaving no entry", async () => {
    renderAt("/?q=a");
    await click("next list");
    await click("open");
    expect(search()).toBe("?q=b&edit=7");
    await click("close");
    expect(search()).toBe("?q=b");
    await click("back");
    expect(search()).toBe("?q=a");
  });

  it("closing a dialog loaded directly replaces its URL", async () => {
    renderAt("/?q=a&edit=7");
    await click("close");
    expect(search()).toBe("?q=a");
  });
});
