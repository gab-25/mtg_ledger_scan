import { useEffect, useRef } from "react";
import { useLocation, useNavigationType } from "react-router-dom";

/** The page a URL shows, without the dialog open over it (`?edit=`, `?sell=`). */
function pageOf(pathname: string, search: string) {
  const params = new URLSearchParams(search);
  params.delete("edit");
  params.delete("sell");
  return `${pathname}?${params}`;
}

/**
 * Pages start at the top, as full page loads did (the messages are there). Back/forward keep the browser's
 * position, a link to an anchor (#cardtrader) is left to its page, and opening or closing a dialog keeps the list
 * behind it where it is.
 */
export default function ScrollToTop() {
  const { key, hash, pathname, search } = useLocation();
  const type = useNavigationType();
  const previous = useRef<string | null>(null);
  useEffect(() => {
    const page = pageOf(pathname, search);
    const before = previous.current;
    previous.current = page;
    if (before === null || before === page) return;
    if (type !== "POP" && !hash) window.scrollTo(0, 0);
  }, [key]); // eslint-disable-line react-hooks/exhaustive-deps -- once per navigation
  return null;
}
