import { PageHead } from "../components/Header";
import { HINT } from "@/lib/styles";
import { cn } from "@/lib/utils";
import { useDocumentTitle } from "../hooks/useDocumentTitle";

/** A page that does not exist, or an object that is not yours (the API answered 404). */
export default function NotFoundPage() {
  useDocumentTitle("Not found");
  return (
    <>
      <PageHead title="Not found" />
      <p className={cn(HINT, "m-0")}>This page does not exist.</p>
    </>
  );
}
