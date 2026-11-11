import { useSyncExternalStore } from "react";

/** Whether a CSS media query matches, kept up to date. Without matchMedia (jsdom) it never matches. */
export function useMediaQuery(query: string): boolean {
  return useSyncExternalStore(
    (onChange) => {
      if (typeof window.matchMedia !== "function") return () => {};
      const list = window.matchMedia(query);
      list.addEventListener("change", onChange);
      return () => list.removeEventListener("change", onChange);
    },
    () => typeof window.matchMedia === "function" && window.matchMedia(query).matches,
  );
}

/** The phone layout: under 840px the sidebar becomes a bottom tab bar (same breakpoint as Layout). */
export const MOBILE_QUERY = "(max-width: 839px)";

export const useIsMobile = () => useMediaQuery(MOBILE_QUERY);
