import { Badge } from "@/components/ui/badge";
import { useQuery } from "@tanstack/react-query";
import type { ColumnDef } from "@tanstack/react-table";
import { Link } from "react-router-dom";
import { useAction } from "../actions";
import { publish } from "../api/sale";
import { getSync, resolveConflict, runSync, type Conflict } from "../api/sync";
import DataTable from "../components/DataTable";
import { PageHead } from "../components/Header";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { DIM, FACTS, H2, HINT, SECTION, SECTION_HEAD, SUB } from "@/lib/styles";
import { cn } from "@/lib/utils";
import { SyncIcon } from "../components/icons";
import PageState from "../components/PageState";
import { capfirst, naturalday, time } from "../format";
import { useDocumentTitle } from "../hooks/useDocumentTitle";

/** "Today, 18:05" like `{{ d|naturalday|capfirst }}, {{ d|time:"H:i" }}`, or "Never". */
const when = (iso: string | null) => (iso ? `${capfirst(naturalday(iso))}, ${time(iso)}` : "Never");

/** ledger/sync.html */
export default function SyncPage() {
  useDocumentTitle("Sync");
  const query = useQuery({ queryKey: ["sync"], queryFn: getSync });
  const syncAll = useAction(() => runSync());
  const pushChanges = useAction(() => publish());
  const resolve = useAction(({ id, keep }: { id: number; keep: "ledger" | "remote" }) => resolveConflict(id, keep));
  if (!query.data) return <PageState error={query.error} />;
  const { pending_changes: pending, connections, conflicts, log } = query.data;

  const columns: ColumnDef<Conflict>[] = [
    {
      id: "card",
      header: "Card",
      cell: ({ row: { original: d } }) => (
        <>
          <div className="font-medium">{d.name}</div>
          <div className={SUB}>{d.set_code} · {d.condition} · {d.language}</div>
        </>
      ),
    },
    { id: "service", header: "Service", accessorKey: "service", meta: { className: DIM } },
    { id: "ledger", header: "In Ledger", accessorKey: "local_value", meta: { className: "font-mono" } },
    { id: "remote", header: "On service", accessorKey: "remote_value", meta: { className: "font-mono text-warn" } },
    {
      id: "action",
      header: "Action",
      meta: { align: "right" },
      cell: ({ row: { original: d } }) => (
        <div className="flex justify-end gap-2">
          <Button type="button" variant="raised" size="sm" disabled={resolve.isPending}
            onClick={() => resolve.mutate({ id: d.id, keep: "ledger" })}>Keep Ledger</Button>
          <Button type="button" variant="ghost" size="sm" disabled={resolve.isPending}
            onClick={() => resolve.mutate({ id: d.id, keep: "remote" })}>Keep remote</Button>
        </div>
      ),
    },
  ];

  return (
    <>
      <PageHead
        eyebrow="Connected services"
        title="Sync"
        actions={
          <form method="post" onSubmit={(e) => { e.preventDefault(); syncAll.mutate(); }}>
            <Button type="submit" variant="primary" disabled={syncAll.isPending}>
              <SyncIcon />
              Sync all
            </Button>
          </form>
        }
      />

      <section className="grid grid-cols-[repeat(auto-fit,minmax(320px,1fr))] gap-5" aria-label="Connections">
        {connections.map((s) => {
          const waiting = pending + s.open_conflicts;
          return (
            <Card asChild key={s.name} className="gap-[18px]">
              <article>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className={cn(H2, "text-2xl")}>{s.name}</h2>
                  <div className={cn(HINT, "mt-1")}>{s.description}</div>
                </div>
                {waiting ? (
                  <Badge variant="pending"><span className="size-2 rounded-full bg-current" aria-hidden="true" />{waiting} pending</Badge>
                ) : (
                  <Badge variant="ok"><span className="size-2 rounded-full bg-current" aria-hidden="true" />In sync</Badge>
                )}
              </div>
              <dl className={FACTS}>
                <div><dt>Last sync</dt><dd className="font-mono">{when(s.last_sync)}</dd></div>
                <div><dt>Direction</dt><dd>{s.direction || "—"}</dd></div>
                <div><dt>Orders imported</dt><dd className="font-mono">{when(s.orders_synced_at)}</dd></div>
                <div>
                  <dt>API token</dt>
                  <dd>{s.token_ok ? "Configured" : <Link to="/account/#cardtrader">Not configured</Link>}</dd>
                </div>
              </dl>
              <div className="flex flex-wrap items-center gap-2.5 [&_form]:m-0">
                <form method="post" onSubmit={(e) => { e.preventDefault(); pushChanges.mutate(); }}>
                  <Button type="submit" variant="raised" disabled={!pending || pushChanges.isPending}>
                    Publish changes
                  </Button>
                </form>
                <Button asChild variant="ghost"><Link to="/account/#cardtrader">Settings</Link></Button>
              </div>
              </article>
            </Card>
          );
        })}
      </section>

      <section className={SECTION} aria-labelledby="diff-title">
        <div className={SECTION_HEAD}>
          <h2 id="diff-title" className={H2}>Conflicts to resolve</h2>
          <span className={HINT}>Choose which source wins for each card</span>
        </div>
        <DataTable className="min-w-[820px]" columns={columns} data={conflicts} getRowId={(d) => String(d.id)}
          empty="No conflicts — Ledger and connected services agree." />
      </section>

      <section className={SECTION} aria-labelledby="log-title">
        <h2 id="log-title" className={H2}>Activity log</h2>
        {log.length ? (
          <ol className="m-0 flex list-none flex-col rounded-[12px] border border-line bg-card p-0">
            {log.map((l, i) => (
              <li key={i} className="flex flex-wrap items-center gap-4 border-b border-line px-5 py-3.5 last:border-b-0">
                <time className="min-w-[130px] font-mono text-[13px] text-muted-foreground" dateTime={l.created_at}>
                  {capfirst(naturalday(l.created_at, "M j"))} {time(l.created_at, true)}
                </time>
                <span data-slot="log-dot" data-tone={l.level === "warn" ? "warn" : "ok"}
                  className={cn("size-2 rounded-full", l.level === "warn" ? "bg-warn" : "bg-ok")}>
                  <span className="sr-only">{l.level_label}</span>
                </span>
                <span className="min-w-[200px] flex-1 text-sm">{l.message}</span>
              </li>
            ))}
          </ol>
        ) : (
          <p className={cn(HINT, "m-0")}>No activity yet.</p>
        )}
      </section>
    </>
  );
}
