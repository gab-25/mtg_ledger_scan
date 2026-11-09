import { Link } from "react-router-dom";

/** The pager of the paginated tables: Previous, "n / N", Next (hidden with a single page). */
export default function Pager({ page, numPages, href }: { page: number; numPages: number; href: (page: number) => string }) {
  if (numPages <= 1) return null;
  return (
    <nav className="pager" aria-label="Pagination">
      {page > 1 && (
        <Link className="btn btn-sm" to={href(page - 1)}>
          Previous
        </Link>
      )}
      <span className="btn btn-sm btn-ghost" aria-current="page">
        {page} / {numPages}
      </span>
      {page < numPages && (
        <Link className="btn btn-sm" to={href(page + 1)}>
          Next
        </Link>
      )}
    </nav>
  );
}
