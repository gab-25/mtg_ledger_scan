import { useQuery } from "@tanstack/react-query";
import type { ColumnDef } from "@tanstack/react-table";
import { useEffect, useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { EXPORT_URL, getChoices, getCollection, type CollectionRow } from "../api/collection";
import Badge from "../components/Badge";
import DataTable from "../components/DataTable";
import { SearchIcon } from "../components/icons";
import PageState from "../components/PageState";
import Pager from "../components/Pager";
import StatTile from "../components/StatTile";
import { euro, intcomma } from "../format";
import { useDocumentTitle } from "../hooks/useDocumentTitle";
import { useQueryParams } from "../hooks/useQueryParams";

const columns: ColumnDef<CollectionRow>[] = [
  {
    id: "card",
    header: "Card",
    cell: ({ row: { original: r } }) => (
      <div className="card-cell">
        <span className="dot" style={{ background: r.pip }} />
        <div>
          <Link to={`/cards/${r.id}/`}>{r.name}</Link>
          {r.foil && <span className="foil-tag">Foil</span>}
          <div className="sub">{r.type_line}</div>
        </div>
      </div>
    ),
  },
  { id: "set", header: "Set", accessorKey: "set_code", meta: { className: "mono dim" } },
  {
    id: "cond",
    header: "Cond.",
    meta: { className: "dim" },
    cell: ({ row: { original: r } }) => (
      <abbr title={r.condition_label} style={{ textDecoration: "none" }}>
        {r.condition}
      </abbr>
    ),
  },
  { id: "language", header: "Language", accessorKey: "language", meta: { className: "dim" } },
  { id: "qty", header: "Qty", accessorKey: "quantity", meta: { align: "right", className: "num" } },
  {
    id: "price", header: "Price", meta: { align: "right", className: "num" },
    cell: ({ row: { original: r } }) => euro(r.price, 2),
  },
  { id: "status", header: "Status", cell: ({ row: { original: r } }) => <Badge badge={r.badge} /> },
];

/** ledger/collection.html */
export default function CollectionPage() {
  useDocumentTitle("Collection");
  const { params, hrefWith, pageHref } = useQueryParams();
  const navigate = useNavigate();
  const query = useQuery({ queryKey: ["collection", params.toString()], queryFn: () => getCollection(params) });
  const choices = useQuery({ queryKey: ["choices"], queryFn: getChoices });
  const q = params.get("q") ?? "";
  const [search, setSearch] = useState(q);
  useEffect(() => setSearch(q), [q]);
  const color = params.get("color") ?? "";
  const foil = params.get("foil") === "1";
  const setCode = params.get("set") ?? "";
  const cond = params.get("cond") ?? "";

  if (!query.data) return <PageState error={query.error} />;
  const data = query.data;
  const colorCodes = data.color_filters.map((c) => c.code);

  function submitSearch(e: FormEvent) {
    e.preventDefault();
    navigate(hrefWith({ q: search.trim() ? search : null }));
  }

  return (
    <>
      <header className="page-head">
        <div>
          <div className="eyebrow">Ledger</div>
          <h1>Collection</h1>
        </div>
        <div className="actions">
          <form method="get" role="search" className="search" onSubmit={submitSearch}>
            <SearchIcon />
            <label htmlFor="q" className="sr-only">Search cards</label>
            <input id="q" type="search" name="q" value={search} placeholder="Search by name, set, type…"
              onChange={(e) => setSearch(e.target.value)} />
          </form>
          <Link className="btn" to="/cards/import/">Import CSV</Link>
          <a className="btn" href={EXPORT_URL}>Export CSV</a>
          <Link className="btn" to="/scan/">Scan cards</Link>
          <Link className="btn btn-primary" to="/cards/add/">+ Add cards</Link>
        </div>
      </header>

      <section className="stats" aria-label="Summary">
        <StatTile label="Total cards" value={intcomma(data.stats.total)} />
        <StatTile label="Unique cards" value={intcomma(data.stats.unique)} />
        <StatTile label="Estimated value" value={euro(data.stats.value ?? 0, 0)} tone="accent" />
        <StatTile label="For sale" value={intcomma(data.stats.for_sale)} />
      </section>

      <form method="get" className="filters" aria-label="Filters" onSubmit={(e) => e.preventDefault()}>
        <Link className="pill" to={hrefWith({ color: null })} {...(colorCodes.includes(color) ? {} : { "aria-current": "true" })}>
          All
        </Link>
        {data.color_filters.map((c) => (
          <Link key={c.code} className="pill" to={hrefWith({ color: c.code })}
            {...(color === c.code ? { "aria-current": "true" } : {})}>
            <span className="pill-dot" style={{ background: c.pip }} />
            {c.label}
          </Link>
        ))}
        <span className="divider" aria-hidden="true" />
        <Link className="pill" to={hrefWith({ foil: foil ? null : "1" })} {...(foil ? { "aria-current": "true" } : {})}>
          Foil only
        </Link>
        <label htmlFor="f-set" className="sr-only">Set</label>
        <select id="f-set" name="set" className={`pill pill-select${setCode ? " is-set" : ""}`} value={setCode}
          onChange={(e) => navigate(hrefWith({ set: e.target.value || null }))}>
          <option value="">Set</option>
          {data.sets.map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
        <label htmlFor="f-cond" className="sr-only">Condition</label>
        <select id="f-cond" name="cond" className={`pill pill-select${cond ? " is-set" : ""}`} value={cond}
          onChange={(e) => navigate(hrefWith({ cond: e.target.value || null }))}>
          <option value="">Condition</option>
          {(choices.data?.conditions ?? []).map(([value, label]) => (
            <option key={value} value={value}>{label}</option>
          ))}
        </select>
        {data.filtered && <Link className="clear-link" to="/">Clear filters</Link>}
      </form>

      <DataTable
        className="table-collection"
        columns={columns}
        data={data.results}
        getRowId={(r) => String(r.id)}
        empty={
          data.filtered ? (
            "No cards match these filters."
          ) : (
            <>
              Your collection is empty. <Link to="/cards/add/">Add cards</Link> or{" "}
              <Link to="/cards/import/">import a CSV</Link>.
            </>
          )
        }
      />
      <div className="table-foot">
        <span>
          Showing {data.results.length} of {intcomma(data.count)} entries
        </span>
        <Pager page={data.page} numPages={data.num_pages} href={pageHref} />
      </div>
    </>
  );
}
