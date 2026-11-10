import { useQuery } from "@tanstack/react-query";
import type { ColumnDef } from "@tanstack/react-table";
import { useEffect, useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { EXPORT_URL, getChoices, getCollection, type CollectionRow } from "../api/collection";
import { badgeVariant } from "@/api/types";
import { Badge } from "@/components/ui/badge";
import DataTable, { TableFoot } from "../components/DataTable";
import { ClearLink, FilterDivider, FilterSelect, Filters, PillDot } from "../components/Filters";
import { PageHead } from "../components/Header";
import SearchBox from "../components/SearchBox";
import { Button } from "@/components/ui/button";
import { DIM, NUM, SUB } from "@/lib/styles";
import { cn } from "@/lib/utils";
import PageState from "../components/PageState";
import Pager from "../components/Pager";
import StatTile, { StatTiles } from "../components/StatTile";
import { euro, intcomma } from "../format";
import { useDocumentTitle } from "../hooks/useDocumentTitle";
import { useQueryParams } from "../hooks/useQueryParams";

const columns: ColumnDef<CollectionRow>[] = [
  {
    id: "card",
    header: "Card",
    cell: ({ row: { original: r } }) => (
      <div className="flex items-center gap-3">
        <span className="inline-block size-2.5 flex-none rounded-full" style={{ background: r.pip }} />
        <div>
          <Link className="font-medium text-foreground no-underline hover:text-gold-hi hover:underline" to={`/cards/${r.id}/`}>
            {r.name}
          </Link>
          {r.foil && <FoilTag />}
          <div className={SUB}>{r.type_line}</div>
        </div>
      </div>
    ),
  },
  { id: "set", header: "Set", accessorKey: "set_code", meta: { className: cn("font-mono", DIM) } },
  {
    id: "cond",
    header: "Cond.",
    meta: { className: DIM },
    cell: ({ row: { original: r } }) => (
      <abbr title={r.condition_label} style={{ textDecoration: "none" }}>
        {r.condition}
      </abbr>
    ),
  },
  { id: "language", header: "Language", accessorKey: "language", meta: { className: DIM } },
  { id: "qty", header: "Qty", accessorKey: "quantity", meta: { align: "right", className: NUM } },
  {
    id: "price", header: "Price", meta: { align: "right", className: NUM },
    cell: ({ row: { original: r } }) => euro(r.price, 2),
  },
  { id: "status", header: "Status", cell: ({ row: { original: r } }) => <Badge variant={badgeVariant(r.badge.tone)}>{r.badge.label}</Badge> },
];

/** The small gold FOIL tag after a card name. */
export function FoilTag() {
  return (
    <span className="ml-1.5 rounded-sm border border-[#4A4128] px-1 py-px align-[2px] text-[10px] tracking-[1px] text-gold uppercase">Foil</span>
  );
}

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
      <PageHead
        eyebrow="Ledger"
        title="Collection"
        actions={
          <>
            <SearchBox id="q" label="Search cards" value={search} placeholder="Search by name, set, type…"
              onChange={setSearch} onSubmit={submitSearch} />
            <Button asChild><Link to="/cards/import/">Import CSV</Link></Button>
            <Button asChild><a href={EXPORT_URL}>Export CSV</a></Button>
            <Button asChild><Link to="/scan/">Scan cards</Link></Button>
            <Button asChild variant="primary"><Link to="/cards/add/">+ Add cards</Link></Button>
          </>
        }
      />

      <StatTiles label="Summary">
        <StatTile label="Total cards" value={intcomma(data.stats.total)} />
        <StatTile label="Unique cards" value={intcomma(data.stats.unique)} />
        <StatTile label="Estimated value" value={euro(data.stats.value ?? 0, 0)} tone="accent" />
        <StatTile label="For sale" value={intcomma(data.stats.for_sale)} />
      </StatTiles>

      <Filters>
        <Button asChild variant="pill">
          <Link to={hrefWith({ color: null })} {...(colorCodes.includes(color) ? {} : { "aria-current": "true" })}>All</Link>
        </Button>
        {data.color_filters.map((c) => (
          <Button key={c.code} asChild variant="pill">
            <Link to={hrefWith({ color: c.code })} {...(color === c.code ? { "aria-current": "true" } : {})}>
              <PillDot color={c.pip} />
              {c.label}
            </Link>
          </Button>
        ))}
        <FilterDivider />
        <Button asChild variant="pill">
          <Link to={hrefWith({ foil: foil ? null : "1" })} {...(foil ? { "aria-current": "true" } : {})}>Foil only</Link>
        </Button>
        <FilterSelect id="f-set" label="Set" placeholder="Set" allLabel="All sets" value={setCode}
          options={data.sets.map((s) => [s, s])} onChange={(v) => navigate(hrefWith({ set: v }))} />
        <FilterSelect id="f-cond" label="Condition" placeholder="Condition" allLabel="All conditions" value={cond}
          options={choices.data?.conditions ?? []} onChange={(v) => navigate(hrefWith({ cond: v }))} />
        {data.filtered && <ClearLink to="/">Clear filters</ClearLink>}
      </Filters>

      <DataTable
        className="min-w-[880px]"
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
      <TableFoot>
        <span>
          Showing {data.results.length} of {intcomma(data.count)} entries
        </span>
        <Pager page={data.page} numPages={data.num_pages} href={pageHref} />
      </TableFoot>
    </>
  );
}
