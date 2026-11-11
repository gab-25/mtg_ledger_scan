import { useState, type MouseEvent, type ReactNode } from "react";
import { Link, Outlet, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { ApiError } from "../api/client";
import PageState from "../components/PageState";
import { signOut } from "../signOut";
import { LogoutIcon, Logo, NavCards, NavCollection, NavSale, PackageIcon, ScanIcon, SyncIcon } from "../components/icons";
import { useMe } from "../hooks/useMe";
import { Messages } from "../notifications";
import { ScanStartDialog } from "../screens/StartScreen";

type Section = "collection" | "sale" | "catalog" | "shipments" | "sync" | "profile" | null;

/** Which sidebar link a page belongs to (base.html's "nav"). */
export function section(pathname: string): Section {
  if (pathname === "/" || /^\/cards\/(import|\d+)\/?$/.test(pathname)) return "collection";
  if (pathname.startsWith("/catalog")) return "catalog";
  if (pathname.startsWith("/sale")) return "sale";
  if (pathname.startsWith("/shipments")) return "shipments";
  if (pathname.startsWith("/sync")) return "sync";
  if (pathname.startsWith("/account")) return "profile";
  return null;
}

const current = (active: boolean) => (active ? ({ "aria-current": "page" } as const) : {});

/**
 * base.html: sidebar with counters and user card, messages, then the page. On a phone the same navigation is a
 * bottom tab bar, the logo and the user's avatar move to a top bar, and "Scan cards" floats over the collection.
 */
export default function Layout() {
  const { data: me, error } = useMe();
  const nav = section(useLocation().pathname);
  const [scanOpen, setScanOpen] = useState(false);
  if (!me) {
    // Not logged in: the client is already on its way to /login/. Any other failure is shown.
    if (error instanceof ApiError && error.code === "not_authenticated") return null;
    return <PageState error={error} />;
  }
  const { user, counts } = me;
  const name = user.full_name || user.username;
  const initial = user.username.slice(0, 1).toUpperCase();

  return (
    <div className="flex min-h-screen flex-col min-[840px]:flex-row min-[840px]:bg-[linear-gradient(to_right,var(--color-sidebar)_259px,var(--color-line)_259px_260px,var(--color-background)_260px)] print:block print:bg-none">
      <header className="flex items-center justify-between gap-3 px-4 pt-3 pb-1 min-[840px]:hidden print:hidden">
        <Link className="flex items-center gap-2.5 text-foreground no-underline hover:text-foreground" to="/">
          <Logo />
          <span className="font-serif text-xl font-bold tracking-[.2px]">MTG Ledger</span>
        </Link>
        <Link
          className="inline-flex size-11 items-center justify-center rounded-full bg-gold-bg font-serif text-base font-bold text-gold no-underline hover:text-gold-hi"
          to="/account/"
          aria-label="Profile and settings"
        >
          {initial}
        </Link>
      </header>

      <nav
        className={cn(
          "z-40 flex flex-col bg-sidebar print:hidden",
          "max-[839px]:fixed max-[839px]:inset-x-0 max-[839px]:bottom-0 max-[839px]:border-t max-[839px]:border-line max-[839px]:bg-sidebar/95 max-[839px]:pb-[env(safe-area-inset-bottom)] max-[839px]:backdrop-blur",
          "min-[840px]:sticky min-[840px]:top-0 min-[840px]:h-screen min-[840px]:w-[260px] min-[840px]:flex-none min-[840px]:gap-6 min-[840px]:border-r min-[840px]:border-line min-[840px]:px-4 min-[840px]:py-6",
        )}
        aria-label="Main navigation"
      >
        <Link className="flex items-center gap-3 px-2 text-foreground no-underline hover:text-foreground max-[839px]:hidden" to="/">
          <Logo />
          <span className="flex flex-col">
            <span className="font-serif text-[22px] font-bold tracking-[.2px]">MTG Ledger</span>
            <span className="font-mono text-[11px] text-placeholder">v{__APP_VERSION__}</span>
          </span>
        </Link>

        <Button
          asChild
          variant="primary"
          className={cn(
            "min-h-12 text-[15px]",
            "max-[839px]:fixed max-[839px]:right-4 max-[839px]:bottom-[calc(80px+env(safe-area-inset-bottom))] max-[839px]:min-h-[52px] max-[839px]:rounded-full max-[839px]:px-5 max-[839px]:shadow-[0_8px_24px_rgba(0,0,0,.45)]",
            nav !== "collection" && "max-[839px]:hidden",
          )}
        >
          <Link to="/scan/" onClick={(e) => openUnlessNewTab(e, () => setScanOpen(true))}>
            <ScanIcon size={20} />
            Scan cards
          </Link>
        </Button>

        <div className={cn("grid grid-cols-5 px-2 pt-1.5 pb-2", "min-[840px]:flex min-[840px]:flex-col min-[840px]:gap-6 min-[840px]:p-0")}>
          <NavGroup label="Ledger">
            <NavLink to="/" active={nav === "collection"}>
              <NavCollection />
              Collection
            </NavLink>
            <NavLink to="/catalog/" active={nav === "catalog"}>
              <NavCards />
              Catalog
            </NavLink>
          </NavGroup>
          <NavGroup label="CardTrader">
            <NavLink to="/sale/" active={nav === "sale"}>
              <NavSale />
              For sale
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
          </NavGroup>
        </div>

        <div className="mt-auto flex items-center gap-2.5 rounded-lg border border-line p-2 max-[839px]:hidden">
          <span
            className="inline-flex size-10 flex-none items-center justify-center rounded-full bg-gold-bg font-serif text-base font-bold text-gold"
            aria-hidden="true"
          >
            {initial}
          </span>
          <div className="min-w-0 flex-1">
            <div className="truncate text-sm font-semibold">{name}</div>
            <Link className="block truncate text-xs text-muted-foreground no-underline hover:text-foreground aria-[current=page]:text-gold" to="/account/" {...current(nav === "profile")}>
              Profile and settings
            </Link>
          </div>
          <Button variant="ghost" size="icon" className="size-9" aria-label="Log out" onClick={signOut}>
            <LogoutIcon />
          </Button>
        </div>
      </nav>

      <main className="flex min-w-0 flex-1 flex-col gap-6 px-[clamp(16px,3vw,48px)] pt-4 pb-40 min-[840px]:gap-7 min-[840px]:py-8 print:p-0">
        <Messages />
        <Outlet />
      </main>
      <ScanStartDialog open={scanOpen} onOpenChange={setScanOpen} />
    </div>
  );
}

/** A plain click opens the modal; ctrl/cmd/shift/middle click keeps the link's own behaviour (/scan/ as a page). */
function openUnlessNewTab(e: MouseEvent, open: () => void) {
  if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
  e.preventDefault();
  open();
}

/** A labelled group of sidebar links; on a phone its links join the tab bar and the label is hidden. */
function NavGroup({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className={"contents min-[840px]:flex min-[840px]:flex-col min-[840px]:gap-0.5"}>
      <div className="hidden px-3 pb-2 text-[11px] tracking-[1.5px] text-placeholder uppercase min-[840px]:block">{label}</div>
      {children}
    </div>
  );
}

function NavLink({ to, active, children }: { to: string; active: boolean; children: ReactNode }) {
  return (
    <Link
      className={cn(
        "relative flex items-center text-text-3 no-underline hover:text-foreground aria-[current=page]:font-semibold",
        "min-h-14 flex-col justify-center gap-1 text-[11px] aria-[current=page]:text-gold max-[839px]:[&_svg]:size-[22px]",
        "min-[840px]:min-h-11 min-[840px]:flex-row min-[840px]:justify-start min-[840px]:gap-3 min-[840px]:rounded-md min-[840px]:px-3 min-[840px]:text-[15px]",
        "min-[840px]:hover:bg-accent min-[840px]:aria-[current=page]:bg-surface-2 min-[840px]:aria-[current=page]:text-foreground",
        "min-[840px]:aria-[current=page]:shadow-[inset_2px_0_0_var(--color-gold)] min-[840px]:aria-[current=page]:[&_svg]:text-gold",
      )}
      to={to}
      {...current(active)}
    >
      {children}
    </Link>
  );
}

/** A sidebar counter: gold for orders to ship, amber for changes to publish. On a phone, a badge on the tab icon. */
function NavCount({ value, label, variant }: { value: number; label: string; variant: "gold" | "warn" }) {
  return (
    <span
      data-variant={variant}
      className={cn(
        "inline-flex items-center justify-center rounded-full font-bold text-primary-foreground",
        "absolute top-1 left-[calc(50%+4px)] h-[18px] min-w-[18px] border-2 border-sidebar px-1 text-[10px]",
        "min-[840px]:static min-[840px]:ml-auto min-[840px]:h-[22px] min-[840px]:min-w-[22px] min-[840px]:border-0 min-[840px]:px-[7px] min-[840px]:text-xs",
        variant === "gold" ? "bg-gold" : "bg-warn",
      )}
    >
      {value}
      <span className="sr-only"> {label}</span>
    </span>
  );
}
