import { keepPreviousData, useQuery } from "@tanstack/react-query";
import type { ColumnDef } from "@tanstack/react-table";
import { useEffect, useState, type FormEvent, type ReactNode } from "react";
import { Link, useNavigate } from "react-router-dom";
import { EXPORT_URL, getChoices, getCollection, type CollectionRow } from "../api/collection";
import { badgeVariant } from "@/api/types";
import { Badge } from "@/components/ui/badge";
import DataTable, { TableFoot, TablePanel } from "../components/DataTable";
import { ClearLink, FilterSelect, Filters } from "../components/Filters";
import FoilTag from "../components/FoilTag";
import { DownloadIcon, PencilIcon, PlusIcon, TagIcon, UploadIcon } from "../components/icons";
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
import { DIALOG_STATE, useDialogParam } from "../hooks/useDialogParam";
import CardPreview from "../components/CardPreview";
import ItemDialog from "./ItemDialog";
import ListingDialog from "./ListingDialog";

/** The Cardmarket trend of a row, or a dash when the printing has none. */
const trend = (price: string | null) => (price === null ? "—" : euro(price, 2));

const columns: ColumnDef<CollectionRow>[] = [
  {
    id: "card",
    header: "Card",
    cell: ({ row: { original: r } }) => (
      <div className="flex w-fit items-center gap-3">
        {r.image_url && <CardPreview image={r.image_url} name={r.name} />}
        <div>
          <span className="font-medium">{r.name}</span>
          {r.foil && <FoilTag />}
          {r.is_product && r.category_name && <div className={SUB}>{r.category_name}</div>}
        </div>
      </div>
    ),
  },
  { id: "set", header: "Set", accessorKey: "set_code", meta: { className: cn("font-mono", DIM) } },
  {
    id: "cond",
    header: "Cond.",
    meta: { className: DIM },
    cell: ({ row: { original: r } }) =>
      r.is_product ? "—" : (
        <abbr title={r.condition_label} className="no-underline">
          {r.condition}
        </abbr>
      ),
  },
  { id: "language", header: "Language", accessorKey: "language", meta: { className: DIM } },
  { id: "qty", header: "Qty", accessorKey: "quantity", meta: { align: "right", className: NUM } },
  {
    id: "price", header: "Trend", meta: { align: "right", className: NUM },
    cell: ({ row: { original: r } }) => trend(r.price),
  },
  { id: "status", header: "Status", cell: ({ row: { original: r } }) => <Badge variant={badgeVariant(r.badge.tone)}>{r.badge.label}</Badge> },
  {
    id: "actions", header: () => <span className="sr-only">Actions</span>, meta: { align: "right", className: "text-right" },
    cell: ({ row: { original: r } }) => <RowActions row={r} />,
  },
];

/** The "Edit" (pencil) and "Sell" (tag) buttons of a row: they open the dialogs over the list, keeping its query. */
function RowActions({ row }: { row: CollectionRow }) {
  const edit = useDialogParam("edit");
  const sell = useDialogParam("sell");
  return (
    <span className="inline-flex flex-none gap-1">
      <Button asChild size="sm">
        <Link to={edit.openHref(row.id)} state={DIALOG_STATE} aria-label={`Edit ${row.name}`}><PencilIcon />Edit</Link>
      </Button>
      <Button asChild size="sm">
        <Link to={sell.openHref(row.id)} state={DIALOG_STATE} aria-label={`Sell ${row.name}`}><TagIcon />Sell</Link>
      </Button>
    </span>
  );
}

/** The list's query: the dialogs' params don't change what the server is asked. */
function listParams(params: URLSearchParams) {
  const list = new URLSearchParams(params);
  list.delete("edit");
  list.delete("sell");
  return list;
}

/** ledger/collection.html */
export default function CollectionPage() {
  useDocumentTitle("Collection");
  const { params, hrefWith, pageHref } = useQueryParams();
  const navigate = useNavigate();
  // The previous page stays on screen while the next loads, so the search box keeps focus while typing.
  const list = listParams(params);
  const query = useQuery({
    queryKey: ["collection", list.toString()], queryFn: () => getCollection(list), placeholderData: keepPreviousData,
  });
  const choices = useQuery({ queryKey: ["choices"], queryFn: getChoices });
  const q = params.get("q") ?? "";
  const [search, setSearch] = useState(q);
  // Keep what is being typed (e.g. a trailing space) when it is the search just run.
  useEffect(() => setSearch((s) => (s.trim() === q ? s : q)), [q]);
  const foil = params.get("foil") === "1";
  const setCode = params.get("set") ?? "";
  const cond = params.get("cond") ?? "";
  const category = params.get("category") ?? "";
  const mobile = useIsMobile();

  if (!query.data) return <PageState error={query.error} />;
  const data = query.data;

  function submitSearch(e: FormEvent) {
    e.preventDefault();
    navigate(hrefWith({ q: search.trim() ? search : null }));
  }

  /** Search as you type: the first search is a new history entry, refinements replace it. */
  function autoSearch(text: string) {
    if (text !== q) navigate(hrefWith({ q: text || null }), { replace: q !== "" });
  }

  const empty = data.filtered ? (
    "No cards match these filters."
  ) : (
    <>
      Your collection is empty. <Link to="/catalog/">Add cards from the catalog</Link> or{" "}
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
              <Link to="/catalog/"><PlusIcon />Add cards</Link>
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
            <SearchBox id="q" label="Search cards" value={search} placeholder="Search by name or set…" className="min-[840px]:min-h-10 min-[840px]:flex-[1_1_260px] min-[840px]:bg-background"
              onChange={setSearch} onSubmit={submitSearch} onSearch={autoSearch} />
            <Filters scroll>
              <Button asChild variant="pill">
                <Link to={hrefWith({ foil: foil ? null : "1" })} {...(foil ? { "aria-current": "true" } : {})}>Foil only</Link>
              </Button>
              <FilterSelect id="f-set" label="Set" placeholder="Set" allLabel="All sets" value={setCode}
                options={data.sets.map((s) => [s, s])} onChange={(v) => navigate(hrefWith({ set: v }))} />
              <FilterSelect id="f-cond" label="Condition" placeholder="Condition" allLabel="All conditions" value={cond}
                options={choices.data?.conditions ?? []} onChange={(v) => navigate(hrefWith({ cond: v }))} />
              <FilterSelect id="f-category" label="Category" placeholder="Category" allLabel="All categories" value={category}
                options={data.categories.map((c) => [String(c.id), c.name])} onChange={(v) => navigate(hrefWith({ category: v }))} />
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
      <ItemDialog />
      <ListingDialog />
    </>
  );
}

/** The cards as a list on a phone, in place of the table: thumb, name, set · condition · language · quantity, price, status
 * (products have no condition). */
function CardList({ rows, empty }: { rows: CollectionRow[]; empty: ReactNode }) {
  if (rows.length === 0) return <p className={EMPTY}>{empty}</p>;
  return (
    <ul className="m-0 flex list-none flex-col p-0">
      {rows.map((r) => (
        <li key={r.id} className="border-b border-line">
          <div className="flex min-h-16 items-center gap-3 py-2">
            {r.image_url ? (
              <CardPreview image={r.image_url} name={r.name} className="h-12 w-[34px]" />
            ) : (
              <span aria-hidden="true" className="h-12 w-[34px] flex-none rounded-[3px] border border-line-2 bg-surface-2" />
            )}
            <span className="flex min-w-0 flex-1 flex-col gap-0.5">
              <span className="flex items-center gap-1.5">
                <span className="truncate font-medium">{r.name}</span>
                {r.foil && <FoilTag />}
              </span>
              <span className={META}>
                {r.set_code} ·{" "}
                {!r.is_product && <><abbr title={r.condition_label} className="no-underline">{r.condition}</abbr> · </>}
                {r.language} · ×{r.quantity}
              </span>
            </span>
            <span className="flex flex-none flex-col items-end gap-1">
              <span className="font-mono">{trend(r.price)}</span>
              <Badge variant={badgeVariant(r.badge.tone)}>{r.badge.label}</Badge>
            </span>
            <RowActions row={r} />
          </div>
        </li>
      ))}
    </ul>
  );
}
