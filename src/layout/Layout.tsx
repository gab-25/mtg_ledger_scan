import type { ReactNode } from "react";
import { Link, Outlet, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
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
    <div className="flex min-h-screen flex-wrap min-[840px]:bg-[linear-gradient(to_right,var(--color-sidebar)_259px,var(--color-line)_259px_260px,var(--color-background)_260px)] print:block print:bg-none">
      <nav
        className="flex max-w-full flex-[1_1_240px] flex-col gap-7 border-r border-line bg-sidebar px-5 py-7 min-[840px]:sticky min-[840px]:top-0 min-[840px]:h-screen min-[840px]:flex-[0_0_260px] print:hidden"
        aria-label="Main navigation"
      >
        <Link className="flex items-center gap-3 px-2 text-foreground no-underline hover:text-foreground" to="/">
          <Logo />
          <span className="font-serif text-[22px] font-bold tracking-[.2px]">MTG Ledger</span>
        </Link>
        <div className="flex flex-col gap-1">
          <NavLink to="/" active={nav === "collection"}>
            <NavCollection />
            Collection
          </NavLink>
          <NavLink to="/sale/" active={nav === "sale"}>
            <NavSale />
            For sale
          </NavLink>
          <NavLink to="/cards/" active={nav === "cards"}>
            <NavCards />
            Cards
          </NavLink>
          <NavLink to="/shipments/" active={nav === "shipments"}>
            <PackageIcon />
            Shipments
            {counts.orders_to_ship > 0 && <NavCount value={counts.orders_to_ship} label="orders to ship" variant="gold" />}
          </NavLink>
          <NavLink to="/sync/" active={nav === "sync"}>
            <SyncIcon />
            Sync
            {counts.pending_changes > 0 && <NavCount value={counts.pending_changes} label="changes to publish" variant="warn" />}
          </NavLink>
        </div>
        <div className="mt-auto flex items-center gap-3 rounded-lg border border-line p-3">
          <span
            className="inline-flex size-10 flex-none items-center justify-center rounded-full bg-gold-bg font-serif text-base font-bold text-gold"
            aria-hidden="true"
          >
            {user.username.slice(0, 1).toUpperCase()}
          </span>
          <div className="min-w-0 flex-1">
            <div className="truncate text-sm font-semibold">{name}</div>
            <Link className="text-xs text-muted-foreground no-underline hover:text-foreground" to="/account/" {...current(nav === "profile")}>
              Profile and settings
            </Link>
          </div>
          <Button variant="ghost" size="icon" aria-label="Log out" onClick={signOut}>
            <LogoutIcon />
          </Button>
        </div>
      </nav>

      <main className="flex min-w-0 flex-[999_1_560px] flex-col gap-7 px-[clamp(16px,3vw,48px)] py-8 print:p-0">
        <Messages />
        <Outlet />
      </main>
    </div>
  );
}

function NavLink({ to, active, children }: { to: string; active: boolean; children: ReactNode }) {
  return (
    <Link
      className="flex min-h-11 items-center gap-3 rounded-md px-3 text-[15px] text-text-3 no-underline hover:bg-accent hover:text-foreground aria-[current=page]:bg-surface-2 aria-[current=page]:font-semibold aria-[current=page]:text-foreground"
      to={to}
      {...current(active)}
    >
      {children}
    </Link>
  );
}

/** A sidebar counter: gold for orders to ship, amber for changes to publish. */
function NavCount({ value, label, variant }: { value: number; label: string; variant: "gold" | "warn" }) {
  return (
    <span
      data-variant={variant}
      className={cn(
        "ml-auto inline-flex h-[22px] min-w-[22px] items-center justify-center rounded-full px-[7px] text-xs font-bold text-primary-foreground",
        variant === "gold" ? "bg-gold" : "bg-warn",
      )}
    >
      {value}
      <span className="sr-only"> {label}</span>
    </span>
  );
}
