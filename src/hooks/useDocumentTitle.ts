import { useEffect } from "react";

/** <title> of the page, as base.html's "{% block title %} · MTG Ledger". */
export function useDocumentTitle(title: string | null | undefined) {
  useEffect(() => {
    if (title) document.title = `${title} · MTG Ledger`;
  }, [title]);
}
