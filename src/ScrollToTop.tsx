import { useEffect, useRef } from "react";
import { useLocation, useNavigationType } from "react-router-dom";

/**
 * Pages start at the top, as full page loads did (the messages are there). Back/forward keep the browser's
 * position, and a link to an anchor (#cardtrader) is left to its page.
 */
export default function ScrollToTop() {
  const { key, hash } = useLocation();
  const type = useNavigationType();
  const first = useRef(true);
  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    if (type !== "POP" && !hash) window.scrollTo(0, 0);
  }, [key]); // eslint-disable-line react-hooks/exhaustive-deps -- once per navigation
  return null;
}
