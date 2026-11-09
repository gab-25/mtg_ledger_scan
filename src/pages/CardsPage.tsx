import { useQuery } from "@tanstack/react-query";
import type { ColumnDef } from "@tanstack/react-table";
import { useEffect, useState, type FormEvent } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { searchCards, type CardFilters, type Printing } from "../api/cards";
import DataTable from "../components/DataTable";
import { SearchIcon } from "../components/icons";
import PageState from "../components/PageState";
import Pager from "../components/Pager";
import { dateLong, euro, intcomma } from "../format";
import { useDocumentTitle } from "../hooks/useDocumentTitle";

type PriceKey = keyof NonNullable<Printing["prices"]>;

const price = (key: PriceKey, header: string): ColumnDef<Printing> => ({
  id: key,
  header,
  meta: { align: "right", className: "num" },
  cell: ({ row: { original: p } }) => {
    const value = p.prices?.[key];
    return value !== null && value !== undefined ? euro(value, 2) : "—";
  },
});

const columns: ColumnDef<Printing>[] = [
  {
    id: "card",
    header: "Card",
    cell: ({ row: { original: p } }) => (
      <div className="card-cell">
        {p.image_url && (
          <img src={p.image_url} alt="" loading="lazy" width={36} height={50} style={{ borderRadius: 3, objectFit: "cover" }} />
        )}
        <div>
          {p.name}
          {p.version && <div className="sub">{p.version}</div>}
        </div>
      </div>
    ),
  },
  {
    id: "set",
    header: "Set",
    meta: { className: "mono dim" },
    cell: ({ row: { original: p } }) => (
      <span title={p.expansion_name}>
        {p.expansion_code.toUpperCase()}
        {p.collector_number && ` #${p.collector_number}`}
      </span>
    ),
  },
  {
    id: "owned", header: "Owned", meta: { align: "right", className: "num" },
    cell: ({ row: { original: p } }) => p.owned_qty ?? "—",
  },
  price("trend", "Trend"),
  price("low", "Low"),
  price("avg", "Avg"),
  price("trend_foil", "Foil trend"),
  price("low_foil", "Foil low"),
  price("avg_foil", "Foil avg"),
];

/** The query string of a search, in the order of the Django view: q, set, number, owned. */
function queryOf(f: CardFilters) {
  const params = new URLSearchParams();
  if (f.q) params.set("q", f.q);
  if (f.set) params.set("set", f.set);
  if (f.number) params.set("number", f.number);
  if (f.owned) params.set("owned", "1");
  return params;
}

/** ledger/cards.html */
export default function CardsPage() {
  useDocumentTitle("Cards");
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const query = useQuery({ queryKey: ["cards", params.toString()], queryFn: () => searchCards(params) });
  const fromUrl: CardFilters = {
    q: params.get("q") ?? "", set: params.get("set") ?? "", number: params.get("number") ?? "",
    owned: params.get("owned") === "1",
  };
  const [form, setForm] = useState(fromUrl);
  useEffect(() => setForm(fromUrl), [params]); // eslint-disable-line react-hooks/exhaustive-deps -- reset on navigation

  if (!query.data) return <PageState error={query.error} />;
  const data = query.data;

  const go = (f: CardFilters) => {
    const q = queryOf({ ...f, q: f.q.trim(), set: f.set.trim(), number: f.number.trim() }).toString();
    navigate(q ? `?${q}` : "?");
  };
  const submit = (e: FormEvent) => {
    e.preventDefault();
    go(form);
  };

  return (
    <>
      <header className="page-head">
        <div>
          <div className="eyebrow">Card database</div>
          <h1>Cards</h1>
        </div>
        <div className="actions">
          <form method="get" role="search" className="search" onSubmit={submit}>
            <SearchIcon />
            <label htmlFor="q" className="sr-only">Search cards</label>
            <input id="q" type="search" name="q" value={form.q} placeholder="Search by name or set code…" autoFocus
              onChange={(e) => setForm({ ...form, q: e.target.value })} />
          </form>
        </div>
      </header>

      <form method="get" className="filters" aria-label="Filters" onSubmit={submit}>
        <label htmlFor="f-set" className="sr-only">Set code</label>
        <input id="f-set" name="set" value={form.set} placeholder="Set (e.g. m21)" className={`pill${form.set ? " is-set" : ""}`}
          size={10} onChange={(e) => setForm({ ...form, set: e.target.value })} />
        <label htmlFor="f-number" className="sr-only">Collector number</label>
        <input id="f-number" name="number" value={form.number} placeholder="Number" className={`pill${form.number ? " is-set" : ""}`}
          size={6} onChange={(e) => setForm({ ...form, number: e.target.value })} />
        <label className="pill" {...(form.owned ? { "aria-current": "true" } : {})}>
          <input type="checkbox" name="owned" value="1" checked={form.owned}
            onChange={(e) => go({ ...form, owned: e.target.checked })} />{" "}
          In my collection
        </label>
        <button type="submit" className="pill">Apply</button>
        {data.searched && <Link className="clear-link" to="/cards/">Clear</Link>}
      </form>

      {!data.searched ? (
        <p className="hint">
          Search the card database — every Magic printing on CardTrader, with its Cardmarket prices (updated nightly) — by
          name, set code or collector number, or list the cards you own.
        </p>
      ) : (
        <>
          <DataTable columns={columns} data={data.results} getRowId={(p) => String(p.ct_id)}
            empty="No cards match these criteria." />
          <div className="table-foot">
            <span>
              Showing {data.results.length} of {intcomma(data.count)} printings
              {data.prices_date && ` · Cardmarket price guide of ${dateLong(data.prices_date)}`}
            </span>
            <Pager page={data.page} numPages={data.num_pages}
              href={(page) => `?${queryOf(data.filters)}&page=${page}`} />
          </div>
        </>
      )}
    </>
  );
}
