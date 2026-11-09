import { useSearchParams } from "react-router-dom";

/**
 * The page's query string, and links that change some of its params like the Django views' _query(): the page
 * param is dropped, `null` removes a param, "?" when nothing is left.
 */
export function useQueryParams() {
  const [params] = useSearchParams();
  function hrefWith(changes: Record<string, string | null>): string {
    const next = new URLSearchParams(params);
    next.delete("page");
    for (const [key, value] of Object.entries(changes)) {
      if (value === null) next.delete(key);
      else next.set(key, value);
    }
    const encoded = next.toString();
    return encoded ? `?${encoded}` : "?";
  }
  /** The current query with another page. */
  function pageHref(page: number): string {
    const next = new URLSearchParams(params);
    next.set("page", String(page));
    return `?${next}`;
  }
  return { params, hrefWith, pageHref };
}
