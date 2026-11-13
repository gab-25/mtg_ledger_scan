import { useQuery } from "@tanstack/react-query";
import { Link, useSearchParams } from "react-router-dom";
import { useAction } from "../actions";
import { getChoices } from "../api/collection";
import { getListings, matchPrices, publish } from "../api/sale";
import { badgeVariant } from "@/api/types";
import { Badge } from "@/components/ui/badge";
import PageState from "../components/PageState";
import StatTile, { StatTiles } from "../components/StatTile";
import { PageHead } from "../components/Header";
import { Button } from "@/components/ui/button";
import { META, PRICE_LABEL } from "@/lib/styles";
import { euro, pluralize } from "../format";
import { useDocumentTitle } from "../hooks/useDocumentTitle";
import QuickList from "./QuickList";

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
      <PageHead
        eyebrow="CardTrader listings"
        title="For sale"
        actions={
          <>
            <QuickList />
            <form method="post" onSubmit={(e) => { e.preventDefault(); match.mutate(); }}>
              <Button type="submit" disabled={match.isPending}>Match market prices</Button>
            </form>
            <form method="post" onSubmit={(e) => { e.preventDefault(); push.mutate(); }}>
              <Button type="submit" variant="primary" disabled={!stats.to_publish || push.isPending}>
                Publish {stats.to_publish} change{pluralize(stats.to_publish)}
              </Button>
            </form>
          </>
        }
      />

      <StatTiles label="Sales summary">
        <StatTile label="Active listings" value={stats.active} />
        <StatTile label="Listed value" value={euro(stats.value, 0)} tone="accent" />
        <StatTile label="Sold this month" value={stats.sold_month} />
        <StatTile label="To publish" value={stats.to_publish} tone={stats.to_publish ? "warn" : ""} />
      </StatTiles>

      <nav className="flex flex-wrap items-center gap-2" aria-label="Filter by status">
        <Button asChild variant="pill"><Link to="/sale/" {...current(!active)}>All</Link></Button>
        {(choices.data?.listing_statuses ?? []).map(([value, label]) => (
          <Button key={value} asChild variant="pill">
            <Link to={`/sale/?status=${value}`} {...current(active === value)}>{label}</Link>
          </Button>
        ))}
      </nav>

      <section className="grid grid-cols-[repeat(auto-fill,minmax(240px,1fr))] gap-5" aria-label="Cards for sale">
        {results.map((l) => (
          <article key={l.item_id} className="flex flex-col overflow-hidden rounded-xl border border-line bg-card">
            <div className="relative flex aspect-[5/3] items-center justify-center border-b border-line bg-surface-2 px-4 text-center">
              <span className="font-serif text-xl font-semibold text-[#6C6960]" aria-hidden="true">{l.name}</span>
              <Badge variant={badgeVariant(l.badge.tone)} className="absolute top-2 right-2 min-h-6 px-[9px] text-[11px]">
                {l.badge.label}
              </Badge>
            </div>
            <div className="flex flex-1 flex-col gap-3 p-4">
              <div>
                <div className="text-[15px] font-semibold">{l.name}</div>
                <div className={META}>
                  {l.set_code} · {l.condition} · {l.language}
                  {l.foil && " · FOIL"}
                  {l.quantity > 1 && ` · ×${l.quantity}`}
                </div>
              </div>
              <div className="mt-auto flex items-end justify-between gap-2">
                <div>
                  <div className={PRICE_LABEL}>Your price</div>
                  <div className="font-mono text-xl">{euro(l.price, 2)}</div>
                </div>
                <div className="text-right">
                  <div className={PRICE_LABEL}>Market</div>
                  <div className="font-mono text-sm text-text-2">{l.market_price !== null ? euro(l.market_price, 2) : "—"}</div>
                </div>
              </div>
              <Button asChild size="block">
                <Link to={`/sale/${l.item_id}/`}>
                  Edit listing<span className="sr-only"> for {l.name}</span>
                </Link>
              </Button>
            </div>
          </article>
        ))}
        {results.length === 0 && (
          <p className="col-span-full m-0 px-5 py-10 text-center text-muted-foreground">
            No listings yet. Use “List cards” to put cards from your collection on sale.
          </p>
        )}
      </section>
    </>
  );
}
