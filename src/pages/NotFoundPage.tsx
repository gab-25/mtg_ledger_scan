import { useDocumentTitle } from "../hooks/useDocumentTitle";

/** A page that does not exist, or an object that is not yours (the API answered 404). */
export default function NotFoundPage() {
  useDocumentTitle("Not found");
  return (
    <>
      <header className="page-head">
        <div>
          <h1>Not found</h1>
        </div>
      </header>
      <p className="hint">This page does not exist.</p>
    </>
  );
}
