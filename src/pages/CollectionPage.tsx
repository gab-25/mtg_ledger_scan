import { useQuery } from "@tanstack/react-query";
import type { ColumnDef } from "@tanstack/react-table";
import { useEffect, useState, type FormEvent, type ReactNode } from "react";
import { Link, useNavigate } from "react-router-dom";
import { EXPORT_URL, getChoices, getCollection, type CollectionRow } from "../api/collection";
import { badgeVariant } from "@/api/types";
import { Badge } from "@/components/ui/badge";
import DataTable, { TableFoot, TablePanel } from "../components/DataTable";
import { ClearLink, FilterDivider, FilterSelect, Filters, PillDot } from "../components/Filters";
import FoilTag from "../components/FoilTag";
import { DownloadIcon, PlusIcon, UploadIcon } from "../components/icons";
import { PageHead } from "../components/Header";
import SearchBox from "../components/SearchBox";
import { Button } from "@/components/ui/button";
import { DIM, EMPTY, META, NUM, SUB } from "@/lib/styles";
import { cn } from "@/lib/utils";
import PageState from "../components/PageState";
import Pager from "../components/Pager";
import StatTile, { StatTiles } from "../components/StatTile";
import { euro, intcomma } from "../format";
import { useDocumentTitle } from "../hooks/useDocumentTitle";
import { useIsMobile } from "../hooks/useMediaQuery";
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
      <abbr title={r.condition_label} className="no-underline">
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
  const mobile = useIsMobile();

  if (!query.data) return <PageState error={query.error} />;
  const data = query.data;
  const colorCodes = data.color_filters.map((c) => c.code);

  function submitSearch(e: FormEvent) {
    e.preventDefault();
    navigate(hrefWith({ q: search.trim() ? search : null }));
  }

  const empty = data.filtered ? (
    "No cards match these filters."
  ) : (
    <>
      Your collection is empty. <Link to="/cards/add/">Add cards</Link> or{" "}
      <Link to="/cards/import/">import a CSV</Link>.
    </>
  );

  return (
    <>
      <PageHead
        eyebrow="Ledger"
        title="Collection"
        actions={
          <>
            <div className="inline-flex max-[839px]:[&>*]:w-11 max-[839px]:[&>*]:px-0 [&>*]:rounded-none [&>*+*]:-ml-px [&>*:first-child]:rounded-l-md [&>*:last-child]:rounded-r-md">
              <Button asChild><Link to="/cards/import/" title="Import CSV"><UploadIcon /><span className="max-[839px]:sr-only">Import CSV</span></Link></Button>
              <Button asChild><a href={EXPORT_URL} title="Export CSV"><DownloadIcon /><span className="max-[839px]:sr-only">Export CSV</span></a></Button>
            </div>
            <Button asChild variant="primary">
              <Link to="/cards/add/"><PlusIcon />Add cards</Link>
            </Button>
          </>
        }
      />

      <StatTiles label="Summary">
        <StatTile label="Total cards" value={intcomma(data.stats.total)} />
        <StatTile label="Unique cards" value={intcomma(data.stats.unique)} />
        <StatTile label="Estimated value" value={euro(data.stats.value ?? 0, 0)} tone="accent" />
        <StatTile label="For sale" value={intcomma(data.stats.for_sale)} />
      </StatTiles>

      <TablePanel
        label="Cards"
        toolbar={
          <>
            <SearchBox id="q" label="Search cards" value={search} placeholder="Search by name, set, type…" className="min-[840px]:min-h-10 min-[840px]:flex-[1_1_260px] min-[840px]:bg-background"
              onChange={setSearch} onSubmit={submitSearch} />
            <Filters scroll>
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
          </>
        }
        footer={
          <TableFoot>
            <span>
              Showing {data.results.length} of {intcomma(data.count)} entries
            </span>
            <Pager page={data.page} numPages={data.num_pages} href={pageHref} />
          </TableFoot>
        }
      >
        {mobile ? (
          <CardList rows={data.results} empty={empty} />
        ) : (
          <DataTable className="min-w-[880px]" framed={false} columns={columns} data={data.results} getRowId={(r) => String(r.id)} empty={empty} />
        )}
      </TablePanel>
    </>
  );
}

/** The cards as a list on a phone, in place of the table: thumb, name, set · condition · language · quantity, price, status. */
function CardList({ rows, empty }: { rows: CollectionRow[]; empty: ReactNode }) {
  if (rows.length === 0) return <p className={EMPTY}>{empty}</p>;
  return (
    <ul className="m-0 flex list-none flex-col p-0">
      {rows.map((r) => (
        <li key={r.id} className="border-b border-line">
          <Link className="flex min-h-16 items-center gap-3 py-2 text-foreground no-underline hover:text-foreground" to={`/cards/${r.id}/`}>
            <span
              aria-hidden="true"
              className="h-12 w-[34px] flex-none rounded-[3px] border border-line-2"
              style={{ background: `linear-gradient(160deg, ${r.pip} 0 14%, var(--color-surface-2) 14%)` }}
            />
            <span className="flex min-w-0 flex-1 flex-col gap-0.5">
              <span className="flex items-center gap-1.5">
                <span className="truncate font-medium">{r.name}</span>
                {r.foil && <FoilTag />}
              </span>
              <span className={META}>
                {r.set_code} · <abbr title={r.condition_label} className="no-underline">{r.condition}</abbr> · {r.language} · ×{r.quantity}
              </span>
            </span>
            <span className="flex flex-none flex-col items-end gap-1">
              <span className="font-mono">{euro(r.price, 2)}</span>
              <Badge variant={badgeVariant(r.badge.tone)}>{r.badge.label}</Badge>
            </span>
          </Link>
        </li>
      ))}
    </ul>
  );
}
