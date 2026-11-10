import { useQuery } from "@tanstack/react-query";
import { Link, useSearchParams } from "react-router-dom";
import { useAction } from "../actions";
import { getOrders, importOrders } from "../api/orders";
import { badgeVariant } from "@/api/types";
import { Badge } from "@/components/ui/badge";
import { PackageIcon, SyncIcon } from "../components/icons";
import PageState from "../components/PageState";
import StatTile, { StatTiles } from "../components/StatTile";
import { PageHead } from "../components/Header";
import { Button } from "@/components/ui/button";
import { HINT, SUB } from "@/lib/styles";
import { cn } from "@/lib/utils";
import { euro, naturalday, naturaltime, pluralize } from "../format";
import { useDocumentTitle } from "../hooks/useDocumentTitle";

/** ledger/shipments.html */
export default function ShipmentsPage() {
  useDocumentTitle("Shipments");
  const [params] = useSearchParams();
  const tabParam = params.get("tab") ?? "";
  const query = useQuery({ queryKey: ["orders", tabParam], queryFn: () => getOrders(tabParam) });
  const sync = useAction(() => importOrders());
  if (!query.data) return <PageState error={query.error} />;
  const { tab, stats, tabs, results, orders_synced_at: synced } = query.data;

  return (
    <>
      <PageHead
        eyebrow="CardTrader orders"
        title="Shipments"
        actions={
          <>
            <span className={HINT}>{synced ? `Imported ${naturaltime(synced)}` : "Orders never imported"}</span>
            <form method="post" onSubmit={(e) => { e.preventDefault(); sync.mutate(); }}>
              <Button type="submit" variant="primary" disabled={sync.isPending}>
                <SyncIcon />
                Import orders
              </Button>
            </form>
          </>
        }
      />

      <StatTiles label="Shipping summary">
        <StatTile label="Orders to ship" value={stats.to_ship} tone={stats.to_ship ? "warn" : ""} />
        <StatTile label="Cards to pack" value={stats.items_to_ship} />
        <StatTile label="Shipped this month" value={stats.shipped_month} />
        <StatTile label="Sales this month" value={euro(stats.revenue_month, 2)} tone="accent" />
      </StatTiles>

      <nav className="flex flex-wrap gap-2" aria-label="Order status">
        {tabs.map((t) => (
          <Button key={t.key} asChild variant="pill" className="group">
            <Link to={`/shipments/?tab=${t.key}`} {...(t.key === tab ? { "aria-current": "true" } : {})}>
              {t.label} <span className="font-mono text-xs text-muted-foreground group-aria-[current=true]:text-gold-hi">{t.count}</span>
            </Link>
          </Button>
        ))}
      </nav>

      {tab === "ct_zero" && (
        <p className={cn(HINT, "m-0")}>
          CardTrader Zero sales are collected here and merged by CardTrader into one order each week: ship only the merged
          order when it appears under “To ship”.
        </p>
      )}

      <section className="flex flex-col gap-3" aria-label="Orders">
        {results.map((o) => (
          <Link
            key={o.id}
            className="grid grid-cols-[48px_minmax(0,1fr)_auto] items-center gap-4 rounded-[12px] border border-line bg-card px-5 py-4 text-foreground no-underline hover:border-line-hover hover:bg-[#1F2129] hover:text-foreground min-[761px]:grid-cols-[64px_minmax(0,1.4fr)_minmax(0,1.2fr)_minmax(0,1fr)_auto]"
            to={`/shipments/${o.id}/`}
          >
            <div className="text-center font-mono text-[22px] text-gold">
              {o.packing_number && o.can_ship ? (
                <>
                  <small className="block text-[10px] tracking-[1px] text-muted-foreground uppercase">Pack</small>
                  {o.packing_number}
                </>
              ) : (
                <PackageIcon size={22} stroke="#A7A39A" />
              )}
            </div>
            <div>
              <div className="font-mono font-medium">#{o.code}</div>
              <div className={SUB}>
                {o.buyer_username || "—"}
                {o.via_cardtrader_zero && " · CT Zero"}
              </div>
            </div>
            <div className="max-[760px]:hidden">
              <div>
                {o.ship_city || "—"}
                {o.ship_country_code && ` · ${o.ship_country_code}`}
              </div>
              <div className={SUB}>
                {o.shipping_method || "Shipping method n/a"}
                {o.tracked && " · tracked"}
              </div>
            </div>
            <div className="max-[760px]:hidden">
              <div>
                {o.size} card{pluralize(o.size)}
              </div>
              <div className={SUB}>
                {o.sent_at ? `Sent ${naturalday(o.sent_at)}` : o.paid_at ? `Paid ${naturalday(o.paid_at)}` : ""}
              </div>
            </div>
            <div className="flex flex-col items-end gap-1.5">
              <Badge variant={badgeVariant(o.badge.tone)}>{o.badge.label}</Badge>
              <span className="font-mono text-base">{o.total !== null && euro(o.total, 2)}</span>
            </div>
          </Link>
        ))}
        {results.length === 0 && (
          <p className="m-0 rounded-[12px] border border-line bg-card px-5 py-10 text-center text-muted-foreground">
            {tab === "to_ship" ? "Nothing to ship. Use “Import orders” to fetch new sales from CardTrader." : "No orders here."}
          </p>
        )}
      </section>
    </>
  );
}
