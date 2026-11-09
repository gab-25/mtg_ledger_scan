import { useQuery } from "@tanstack/react-query";
import type { ColumnDef } from "@tanstack/react-table";
import { Link } from "react-router-dom";
import { useAction } from "../actions";
import { publish } from "../api/sale";
import { getSync, resolveConflict, runSync, type Conflict } from "../api/sync";
import DataTable from "../components/DataTable";
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
          <div style={{ fontWeight: 500 }}>{d.name}</div>
          <div className="sub">{d.set_code} · {d.condition} · {d.language}</div>
        </>
      ),
    },
    { id: "service", header: "Service", accessorKey: "service", meta: { className: "dim" } },
    { id: "ledger", header: "In Ledger", accessorKey: "local_value", meta: { className: "mono" } },
    { id: "remote", header: "On service", accessorKey: "remote_value", meta: { className: "mono remote" } },
    {
      id: "action",
      header: "Action",
      meta: { align: "right" },
      cell: ({ row: { original: d } }) => (
        <div className="row-actions">
          <button type="button" className="btn btn-sm btn-raised" disabled={resolve.isPending}
            onClick={() => resolve.mutate({ id: d.id, keep: "ledger" })}>Keep Ledger</button>
          <button type="button" className="btn btn-sm btn-ghost" disabled={resolve.isPending}
            onClick={() => resolve.mutate({ id: d.id, keep: "remote" })}>Keep remote</button>
        </div>
      ),
    },
  ];

  return (
    <>
      <header className="page-head">
        <div>
          <div className="eyebrow">Connected services</div>
          <h1>Sync</h1>
        </div>
        <form method="post" onSubmit={(e) => { e.preventDefault(); syncAll.mutate(); }}>
          <button type="submit" className="btn btn-primary" disabled={syncAll.isPending}>
            <SyncIcon />
            Sync all
          </button>
        </form>
      </header>

      <section className="connections" aria-label="Connections">
        {connections.map((s) => {
          const waiting = pending + s.open_conflicts;
          return (
            <article key={s.name} className="connection">
              <div className="connection-head">
                <div>
                  <h2>{s.name}</h2>
                  <div className="hint" style={{ marginTop: 4 }}>{s.description}</div>
                </div>
                {waiting ? (
                  <span className="badge badge-pending"><span className="pill-dot" />{waiting} pending</span>
                ) : (
                  <span className="badge badge-ok"><span className="pill-dot" />In sync</span>
                )}
              </div>
              <dl className="facts">
                <div><dt>Last sync</dt><dd className="mono">{when(s.last_sync)}</dd></div>
                <div><dt>Direction</dt><dd>{s.direction || "—"}</dd></div>
                <div><dt>Orders imported</dt><dd className="mono">{when(s.orders_synced_at)}</dd></div>
                <div>
                  <dt>API token</dt>
                  <dd>{s.token_ok ? "Configured" : <Link to="/account/#cardtrader">Not configured</Link>}</dd>
                </div>
              </dl>
              <div className="actions" style={{ gap: 10 }}>
                <form method="post" onSubmit={(e) => { e.preventDefault(); pushChanges.mutate(); }}>
                  <button type="submit" className="btn btn-raised" disabled={!pending || pushChanges.isPending}>
                    Publish changes
                  </button>
                </form>
                <Link className="btn btn-ghost" to="/account/#cardtrader">Settings</Link>
              </div>
            </article>
          );
        })}
      </section>

      <section className="section" aria-labelledby="diff-title">
        <div className="section-head">
          <h2 id="diff-title">Conflicts to resolve</h2>
          <span className="hint">Choose which source wins for each card</span>
        </div>
        <DataTable className="table-conflicts" columns={columns} data={conflicts} getRowId={(d) => String(d.id)}
          empty="No conflicts — Ledger and connected services agree." />
      </section>

      <section className="section" aria-labelledby="log-title">
        <h2 id="log-title">Activity log</h2>
        {log.length ? (
          <ol className="log">
            {log.map((l, i) => (
              <li key={i}>
                <time className="log-when" dateTime={l.created_at}>
                  {capfirst(naturalday(l.created_at, "M j"))} {time(l.created_at)}
                </time>
                <span className={`log-dot${l.level === "warn" ? " warn" : ""}`}>
                  <span className="sr-only">{l.level_label}</span>
                </span>
                <span className="log-text">{l.message}</span>
              </li>
            ))}
          </ol>
        ) : (
          <p className="hint">No activity yet.</p>
        )}
      </section>
    </>
  );
}
