import { useQuery } from "@tanstack/react-query";
import { Link, useSearchParams } from "react-router-dom";
import { useAction } from "../actions";
import { getChoices } from "../api/collection";
import { getListings, matchPrices, publish } from "../api/sale";
import { badgeVariant } from "@/api/types";
import { Badge } from "@/components/ui/badge";
import PageState from "../components/PageState";
import StatTile from "../components/StatTile";
import { euro, pluralize } from "../format";
import { useDocumentTitle } from "../hooks/useDocumentTitle";

const current = (active: boolean) => (active ? ({ "aria-current": "true" } as const) : {});

/** ledger/sale.html */
export default function SalePage() {
  useDocumentTitle("For sale");
  const [params] = useSearchParams();
  const status = params.get("status") ?? "";
  const query = useQuery({ queryKey: ["listings", status], queryFn: () => getListings(status) });
  const choices = useQuery({ queryKey: ["choices"], queryFn: getChoices });
  const match = useAction(() => matchPrices());
  const push = useAction(() => publish());
  if (!query.data) return <PageState error={query.error} />;
  const { stats, results } = query.data;
  const active = query.data.status;

  return (
    <>
      <header className="page-head">
        <div>
          <div className="eyebrow">CardTrader listings</div>
          <h1>For sale</h1>
        </div>
        <div className="actions">
          <form method="post" onSubmit={(e) => { e.preventDefault(); match.mutate(); }}>
            <button type="submit" className="btn" disabled={match.isPending}>Match market prices</button>
          </form>
          <form method="post" onSubmit={(e) => { e.preventDefault(); push.mutate(); }}>
            <button type="submit" className="btn btn-primary" disabled={!stats.to_publish || push.isPending}>
              Publish {stats.to_publish} change{pluralize(stats.to_publish)}
            </button>
          </form>
        </div>
      </header>

      <section className="stats" aria-label="Sales summary">
        <StatTile label="Active listings" value={stats.active} />
        <StatTile label="Listed value" value={euro(stats.value, 0)} tone="accent" />
        <StatTile label="Sold this month" value={stats.sold_month} />
        <StatTile label="To publish" value={stats.to_publish} tone={stats.to_publish ? "warn" : ""} />
      </section>

      <nav className="filters" aria-label="Filter by status">
        <Link className="pill" to="/sale/" {...current(!active)}>All</Link>
        {(choices.data?.listing_statuses ?? []).map(([value, label]) => (
          <Link key={value} className="pill" to={`/sale/?status=${value}`} {...current(active === value)}>
            {label}
          </Link>
        ))}
      </nav>

      <section className="sale-grid" aria-label="Cards for sale">
        {results.map((l) => (
          <article key={l.item_id} className="sale-card">
            <div className="sale-art">
              <span className="sale-art-name" aria-hidden="true">{l.name}</span>
              <span className="pip" style={{ background: l.pip }} />
              <Badge variant={badgeVariant(l.badge.tone)}>{l.badge.label}</Badge>
            </div>
            <div className="sale-body">
              <div>
                <div className="sale-name">{l.name}</div>
                <div className="sale-meta">
                  {l.set_code} · {l.condition} · {l.language}
                  {l.foil && " · FOIL"}
                  {l.quantity > 1 && ` · ×${l.quantity}`}
                </div>
              </div>
              <div className="price-row">
                <div>
                  <div className="price-label">Your price</div>
                  <div className="price-main">{euro(l.price, 2)}</div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <div className="price-label">Market</div>
                  <div className="price-market">{l.market_price !== null ? euro(l.market_price, 2) : "—"}</div>
                </div>
              </div>
              <Link className="btn btn-block" to={`/sale/${l.item_id}/`}>
                Edit listing<span className="sr-only"> for {l.name}</span>
              </Link>
            </div>
          </article>
        ))}
        {results.length === 0 && (
          <p className="empty" style={{ gridColumn: "1 / -1" }}>
            No listings yet. Open a card in your <Link to="/">collection</Link> and choose “List for sale”.
          </p>
        )}
      </section>
    </>
  );
}
