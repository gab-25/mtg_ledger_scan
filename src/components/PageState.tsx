import { ApiError } from "../api/client";
import NotFoundPage from "../pages/NotFoundPage";

/** What a page shows while its data loads or when loading failed. */
export default function PageState({ error }: { error: Error | null }) {
  if (!error) return null; // loading: the page appears when its data is there, as a server-rendered page did
  if (error instanceof ApiError && error.status === 404) return <NotFoundPage />;
  return (
    <ul className="messages" role="alert">
      <li className="message error">{error.message}</li>
    </ul>
  );
}
