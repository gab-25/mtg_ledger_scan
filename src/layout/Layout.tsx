import { Link, Outlet, useLocation } from "react-router-dom";
import { ApiError } from "../api/client";
import PageState from "../components/PageState";
import { signOut } from "../signOut";
import { LogoutIcon, Logo, NavCards, NavCollection, NavSale, PackageIcon, SyncIcon } from "../components/icons";
import { useMe } from "../hooks/useMe";
import { Messages } from "../notifications";

type Section = "collection" | "sale" | "cards" | "shipments" | "sync" | "profile" | null;

/** Which sidebar link a page belongs to (base.html's `nav`). */
export function section(pathname: string): Section {
  if (pathname === "/" || /^\/cards\/(add|import|\d+)\/?$/.test(pathname)) return "collection";
  if (pathname.startsWith("/cards")) return "cards";
  if (pathname.startsWith("/sale")) return "sale";
  if (pathname.startsWith("/shipments")) return "shipments";
  if (pathname.startsWith("/sync")) return "sync";
  if (pathname.startsWith("/account")) return "profile";
  return null;
}

const current = (active: boolean) => (active ? ({ "aria-current": "page" } as const) : {});

/** base.html: sidebar with counters and user card, messages, then the page. */
export default function Layout() {
  const { data: me, error } = useMe();
  const nav = section(useLocation().pathname);
  if (!me) {
    // Not logged in: the client is already on its way to /login/. Any other failure is shown.
    if (error instanceof ApiError && error.code === "not_authenticated") return null;
    return <PageState error={error} />;
  }
  const { user, counts } = me;
  const name = user.full_name || user.username;

  return (
    <div className="shell">
      <nav className="sidebar" aria-label="Main navigation">
        <Link className="brand" to="/">
          <Logo />
          <span className="brand-name">MTG Ledger</span>
        </Link>
        <div className="nav-links">
          <Link className="nav-link" to="/" {...current(nav === "collection")}>
            <NavCollection />
            Collection
          </Link>
          <Link className="nav-link" to="/sale/" {...current(nav === "sale")}>
            <NavSale />
            For sale
          </Link>
          <Link className="nav-link" to="/cards/" {...current(nav === "cards")}>
            <NavCards />
            Cards
          </Link>
          <Link className="nav-link" to="/shipments/" {...current(nav === "shipments")}>
            <PackageIcon />
            Shipments
            {counts.orders_to_ship > 0 && (
              <span className="nav-count nav-count-gold">
                {counts.orders_to_ship}
                <span className="sr-only"> orders to ship</span>
              </span>
            )}
          </Link>
          <Link className="nav-link" to="/sync/" {...current(nav === "sync")}>
            <SyncIcon />
            Sync
            {counts.pending_changes > 0 && (
              <span className="nav-count">
                {counts.pending_changes}
                <span className="sr-only"> changes to publish</span>
              </span>
            )}
          </Link>
        </div>
        <div className="user-card">
          <span className="avatar" aria-hidden="true">
            {user.username.slice(0, 1).toUpperCase()}
          </span>
          <div className="user-meta">
            <div className="user-name">{name}</div>
            <Link to="/account/" {...current(nav === "profile")}>
              Profile and settings
            </Link>
          </div>
          <button type="button" className="btn btn-ghost" aria-label="Log out" style={{ width: 44, padding: 0 }}
            onClick={signOut}>
            <LogoutIcon />
          </button>
        </div>
      </nav>

      <main className="main">
        <Messages />
        <Outlet />
      </main>
    </div>
  );
}
