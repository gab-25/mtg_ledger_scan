import { useQuery } from "@tanstack/react-query";
import { Link, useSearchParams } from "react-router-dom";
import { useAction } from "../actions";
import { getOrders, importOrders } from "../api/orders";
import Badge from "../components/Badge";
import { PackageIcon, SyncIcon } from "../components/icons";
import PageState from "../components/PageState";
import StatTile from "../components/StatTile";
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
      <header className="page-head">
        <div>
          <div className="eyebrow">CardTrader orders</div>
          <h1>Shipments</h1>
        </div>
        <div className="actions">
          <span className="hint">{synced ? `Imported ${naturaltime(synced)}` : "Orders never imported"}</span>
          <form method="post" onSubmit={(e) => { e.preventDefault(); sync.mutate(); }}>
            <button type="submit" className="btn btn-primary" disabled={sync.isPending}>
              <SyncIcon />
              Import orders
            </button>
          </form>
        </div>
      </header>

      <section className="stats" aria-label="Shipping summary">
        <StatTile label="Orders to ship" value={stats.to_ship} tone={stats.to_ship ? "warn" : ""} />
        <StatTile label="Cards to pack" value={stats.items_to_ship} />
        <StatTile label="Shipped this month" value={stats.shipped_month} />
        <StatTile label="Sales this month" value={euro(stats.revenue_month, 2)} tone="accent" />
      </section>

      <nav className="tabs" aria-label="Order status">
        {tabs.map((t) => (
          <Link key={t.key} className="pill" to={`/shipments/?tab=${t.key}`} {...(t.key === tab ? { "aria-current": "true" } : {})}>
            {t.label} <span className="tab-count">{t.count}</span>
          </Link>
        ))}
      </nav>

      {tab === "ct_zero" && (
        <p className="hint" style={{ margin: 0 }}>
          CardTrader Zero sales are collected here and merged by CardTrader into one order each week: ship only the merged
          order when it appears under “To ship”.
        </p>
      )}

      <section className="order-list" aria-label="Orders">
        {results.map((o) => (
          <Link key={o.id} className="order-row" to={`/shipments/${o.id}/`}>
            <div className="packing">
              {o.packing_number && o.can_ship ? (
                <>
                  <small>Pack</small>
                  {o.packing_number}
                </>
              ) : (
                <PackageIcon size={22} stroke="#A7A39A" />
              )}
            </div>
            <div>
              <div className="order-code">#{o.code}</div>
              <div className="sub">
                {o.buyer_username || "—"}
                {o.via_cardtrader_zero && " · CT Zero"}
              </div>
            </div>
            <div className="hide-sm">
              <div>
                {o.ship_city || "—"}
                {o.ship_country_code && ` · ${o.ship_country_code}`}
              </div>
              <div className="sub">
                {o.shipping_method || "Shipping method n/a"}
                {o.tracked && " · tracked"}
              </div>
            </div>
            <div className="hide-sm">
              <div>
                {o.size} card{pluralize(o.size)}
              </div>
              <div className="sub">
                {o.sent_at ? `Sent ${naturalday(o.sent_at)}` : o.paid_at ? `Paid ${naturalday(o.paid_at)}` : ""}
              </div>
            </div>
            <div className="order-right">
              <Badge badge={o.badge} />
              <span className="order-total">{o.total !== null && euro(o.total, 2)}</span>
            </div>
          </Link>
        ))}
        {results.length === 0 && (
          <p className="empty" style={{ border: "1px solid var(--line)", borderRadius: 12, background: "var(--surface)", margin: 0 }}>
            {tab === "to_ship" ? "Nothing to ship. Use “Import orders” to fetch new sales from CardTrader." : "No orders here."}
          </p>
        )}
      </section>
    </>
  );
}
