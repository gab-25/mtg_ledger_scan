import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";

/** The pager of the paginated tables: Previous, "n / N", Next (hidden with a single page). */
export default function Pager({ page, numPages, href }: { page: number; numPages: number; href: (page: number) => string }) {
  if (numPages <= 1) return null;
  return (
    <nav className="flex gap-2" aria-label="Pagination">
      {page > 1 && (
        <Button asChild size="sm">
          <Link to={href(page - 1)}>Previous</Link>
        </Button>
      )}
      <Button asChild size="sm" variant="ghost">
        <span aria-current="page">
          {page} / {numPages}
        </span>
      </Button>
      {page < numPages && (
        <Button asChild size="sm">
          <Link to={href(page + 1)}>Next</Link>
        </Button>
      )}
    </nav>
  );
}
