import { useLocation, useNavigate } from "react-router-dom";

export type DialogParam = "edit" | "sell";

/** Where the dialog was opened from inside the app: closing it goes Back instead of adding an entry. */
export const DIALOG_STATE = { dialog: true } as const;

/**
 * A dialog kept in the page's query string (`?edit=<pk>`, `?sell=<pk>`): Back closes it, a reload reopens it.
 * Links that open it use `openHref(pk)` with `state={DIALOG_STATE}`; every other param (filters, page) is kept.
 */
export function useDialogParam(name: DialogParam) {
  const location = useLocation();
  const navigate = useNavigate();
  const params = new URLSearchParams(location.search);
  const raw = params.get(name) ?? "";
  const pk = /^\d+$/.test(raw) ? Number(raw) : null;

  const href = (next: URLSearchParams) => `${location.pathname}${next.size ? `?${next}` : ""}`;
  const without = () => {
    const next = new URLSearchParams(params);
    next.delete(name);
    return next;
  };

  return {
    pk,
    openHref(itemPk: number) {
      const next = new URLSearchParams(params);
      next.set(name, String(itemPk));
      return href(next);
    },
    close() {
      if ((location.state as { dialog?: boolean } | null)?.dialog) navigate(-1);
      else navigate(href(without()), { replace: true });
    },
  };
}
