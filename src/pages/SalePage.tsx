import { useQuery } from "@tanstack/react-query";
import type { ColumnDef } from "@tanstack/react-table";
import type { ReactNode } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useAction } from "../actions";
import { getChoices } from "../api/collection";
import { getListings, publish, type SaleRow } from "../api/sale";
import { badgeVariant } from "@/api/types";
import { Badge } from "@/components/ui/badge";
import DataTable, { TablePanel } from "../components/DataTable";
import FoilTag from "../components/FoilTag";
import { PencilIcon } from "../components/icons";
import PageState from "../components/PageState";
import StatTile, { StatTiles } from "../components/StatTile";
import { PageHead } from "../components/Header";
import { Button } from "@/components/ui/button";
import { DIM, EMPTY, META, NUM } from "@/lib/styles";
import { cn } from "@/lib/utils";
import { euro, pluralize } from "../format";
import { useDocumentTitle } from "../hooks/useDocumentTitle";
import { useIsMobile } from "../hooks/useMediaQuery";
import ListingDialog from "./ListingDialog";
import { DIALOG_STATE, useDialogParam } from "../hooks/useDialogParam";

const current = (active: boolean) => (active ? ({ "aria-current": "true" } as const) : {});

type OpenHref = (pk: number) => string;

/** The "Edit" button of a listing: its dialog over the list. */
function EditButton({ row, openHref }: { row: SaleRow; openHref: OpenHref }) {
  return (
    <Button asChild size="sm">
      <Link to={openHref(row.item_id)} state={DIALOG_STATE} aria-label={`Edit ${row.name}`}><PencilIcon />Edit</Link>
    </Button>
  );
}

const columns = (openHref: OpenHref): ColumnDef<SaleRow>[] => [
  {
    id: "card", header: "Card",
    cell: ({ row: { original: r } }) => <><span className="font-medium">{r.name}</span>{r.foil && <FoilTag />}</>,
  },
  { id: "set", header: "Set", accessorKey: "set_code", meta: { className: cn("font-mono", DIM) } },
  { id: "cond", header: "Cond.", accessorKey: "condition", meta: { className: DIM } },
  { id: "language", header: "Language", accessorKey: "language", meta: { className: DIM } },
  { id: "qty", header: "Qty", accessorKey: "quantity", meta: { align: "right", className: NUM } },
  { id: "price", header: "Your price", meta: { align: "right", className: NUM }, cell: ({ row: { original: r } }) => euro(r.price, 2) },
  { id: "status", header: "Status", cell: ({ row: { original: r } }) => <Badge variant={badgeVariant(r.badge.tone)}>{r.badge.label}</Badge> },
  {
    id: "actions", header: () => <span className="sr-only">Actions</span>, meta: { align: "right", className: "text-right" },
    cell: ({ row: { original: r } }) => <EditButton row={r} openHref={openHref} />,
  },
];

/** The listings as a list on a phone, in place of the table (like the collection's). */
function SaleList({ rows, empty, openHref }: { rows: SaleRow[]; empty: ReactNode; openHref: OpenHref }) {
  if (rows.length === 0) return <p className={EMPTY}>{empty}</p>;
  return (
    <ul className="m-0 flex list-none flex-col p-0">
      {rows.map((r) => (
        <li key={r.item_id} className="flex min-h-16 items-center gap-3 border-b border-line py-2">
          <span className="flex min-w-0 flex-1 flex-col gap-0.5">
            <span className="flex items-center gap-1.5">
              <span className="truncate font-medium">{r.name}</span>
              {r.foil && <FoilTag />}
            </span>
            <span className={META}>{r.set_code} · {r.condition} · {r.language} · ×{r.quantity}</span>
          </span>
          <span className="flex flex-none flex-col items-end gap-1">
            <span className="font-mono">{euro(r.price, 2)}</span>
            <Badge variant={badgeVariant(r.badge.tone)}>{r.badge.label}</Badge>
          </span>
          <EditButton row={r} openHref={openHref} />
        </li>
      ))}
    </ul>
  );
}

/** ledger/sale.html */
export default function SalePage() {
  useDocumentTitle("For sale");
  const [params] = useSearchParams();
  const status = params.get("status") ?? "";
  const query = useQuery({ queryKey: ["listings", status], queryFn: () => getListings(status) });
  const choices = useQuery({ queryKey: ["choices"], queryFn: getChoices });
  const push = useAction(() => publish());
  const { openHref } = useDialogParam("sell");
  const mobile = useIsMobile();
  if (!query.data) return <PageState error={query.error} />;
  const { stats, results } = query.data;
  const empty = <>No listings yet. Press “Sell” on a card of your <Link to="/">collection</Link>.</>;
  const active = query.data.status;

  return (
    <>
      <PageHead
        eyebrow="CardTrader listings"
        title="For sale"
        actions={
          <>
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

      <TablePanel label="Cards for sale">
        {mobile ? (
          <SaleList rows={results} empty={empty} openHref={openHref} />
        ) : (
          <DataTable className="min-w-[880px]" framed={false} columns={columns(openHref)} data={results}
            getRowId={(r) => String(r.item_id)} empty={empty} />
        )}
      </TablePanel>
      <ListingDialog />
    </>
  );
}
