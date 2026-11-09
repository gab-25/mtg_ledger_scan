import { useQuery } from "@tanstack/react-query";
import type { ColumnDef } from "@tanstack/react-table";
import { useState, type FormEvent } from "react";
import { Link, useParams } from "react-router-dom";
import { useAction } from "../actions";
import { getOrder, shipOrder, type OrderDetail, type OrderItem } from "../api/orders";
import Badge from "../components/Badge";
import DataTable from "../components/DataTable";
import PageState from "../components/PageState";
import { dateTime, euro, pluralize } from "../format";
import { useDocumentTitle } from "../hooks/useDocumentTitle";

const columns: ColumnDef<OrderItem>[] = [
  {
    id: "packed",
    header: () => <span className="sr-only">Packed</span>,
    cell: ({ row: { original: it } }) => <input type="checkbox" id={`pack-${it.id}`} aria-label={`Packed ${it.name}`} />,
  },
  {
    id: "card",
    header: "Card",
    cell: ({ row: { original: it } }) => (
      <>
        <label htmlFor={`pack-${it.id}`} style={{ fontWeight: 500 }}>{it.name}</label>
        {it.foil && <span className="foil-tag">Foil</span>}
        <div className="sub">
          {it.expansion}
          {it.item_pk !== null && (
            <>
              {" · "}
              <Link to={`/cards/${it.item_pk}/`}>in Ledger</Link>
            </>
          )}
        </div>
      </>
    ),
  },
  { id: "cond", header: "Cond.", meta: { className: "dim" }, cell: ({ row: { original: it } }) => it.condition || "—" },
  { id: "language", header: "Language", meta: { className: "dim" }, cell: ({ row: { original: it } }) => it.language || "—" },
  { id: "qty", header: "Qty", accessorKey: "quantity", meta: { align: "right", className: "num" } },
  {
    id: "price", header: "Price", meta: { align: "right", className: "num" },
    cell: ({ row: { original: it } }) => (it.price !== null ? euro(it.price, 2) : ""),
  },
];

/** /shipments/<pk>/ */
export default function OrderDetailPage() {
  const pk = Number(useParams().pk);
  const query = useQuery({ queryKey: ["order", pk], queryFn: () => getOrder(pk) });
  if (!query.data) return <PageState error={query.error} />;
  return <Order order={query.data} />;
}

/** ledger/order_detail.html */
function Order({ order }: { order: OrderDetail }) {
  useDocumentTitle(`Order #${order.code}`);
  const [tracking, setTracking] = useState(order.tracking_code);
  const ship = useAction((save: boolean) => shipOrder(order.id, { tracking_code: tracking, save_tracking: save }), {
    navigateTo: (r) => (r.shipped ? "/shipments/" : null),
  });
  const required = order.via_cardtrader_zero || order.tracked;

  function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const submitter = (e.nativeEvent as SubmitEvent).submitter as HTMLButtonElement | null;
    ship.mutate(submitter?.name === "save_tracking");
  }

  return (
    <>
      <header className="page-head">
        <div>
          <div className="eyebrow no-print">
            <Link to="/shipments/" style={{ color: "inherit", textDecoration: "none" }}>Shipments</Link>
          </div>
          <h1>Order #{order.code}</h1>
          <div className="sub" style={{ marginTop: 6 }}>
            {order.packing_number && order.can_ship ? `Pack ${order.packing_number} · ` : ""}
            {order.size} card{pluralize(order.size)}
            {order.paid_at && ` · paid ${dateTime(order.paid_at)}`}
            {order.via_cardtrader_zero && " · CardTrader Zero"}
          </div>
        </div>
        <div className="actions no-print">
          <Badge badge={order.badge} />
          <button type="button" className="btn" onClick={() => window.print()}>Print packing slip</button>
        </div>
      </header>

      <div className="detail-grid">
        <section className="box" aria-labelledby="ship-to">
          <h2 id="ship-to">Ship to</h2>
          {order.address_lines.length ? (
            <address className="address">
              {order.address_lines.map((line, i) => (
                <div key={i} className={i === 0 ? "address-name" : undefined}>{line}</div>
              ))}
            </address>
          ) : (
            <p className="hint" style={{ margin: 0 }}>No shipping address on this order.</p>
          )}
          {order.ship_note && <div className="note">Note from buyer: {order.ship_note}</div>}
          <dl className="facts">
            <div>
              <dt>Buyer</dt>
              <dd>{order.buyer_username || "—"}</dd>
            </div>
            <div>
              <dt>Contact</dt>
              <dd>
                {order.buyer_email && <a href={`mailto:${order.buyer_email}`}>{order.buyer_email}</a>}
                {order.buyer_phone && <div>{order.buyer_phone}</div>}
                {!order.buyer_email && !order.buyer_phone && "—"}
              </dd>
            </div>
            <div>
              <dt>Shipping method</dt>
              <dd>
                {order.shipping_method || "—"}
                {order.max_shipping_days ? <div className="sub">up to {order.max_shipping_days} days</div> : null}
              </dd>
            </div>
            <div>
              <dt>Tracking</dt>
              <dd className="mono">{order.tracking_code || "—"}</dd>
            </div>
          </dl>
        </section>

        <section className="box no-print" aria-labelledby="ship-title">
          <h2 id="ship-title">Shipping</h2>
          {order.can_ship ? (
            <>
              <form method="post" className="inline-form" onSubmit={submit}>
                <div className="field">
                  <label htmlFor="id_tracking_code">Tracking code{required ? " (required)" : " (optional)"}</label>
                  <input type="text" name="tracking_code" id="id_tracking_code" maxLength={120} value={tracking}
                    onChange={(e) => setTracking(e.target.value)} />
                </div>
                <button type="submit" name="save_tracking" value="1" className="btn" disabled={ship.isPending}>Save code</button>
                <button type="submit" className="btn btn-primary" disabled={ship.isPending}>Mark as shipped</button>
              </form>
              <p className="hint" style={{ margin: 0 }}>
                “Mark as shipped” saves the tracking code on CardTrader, then moves the order to Shipped.
                {order.via_cardtrader_zero && " CardTrader Zero orders must have a tracking code before shipping."}
              </p>
            </>
          ) : order.state === "hub_pending" ? (
            <p className="hint" style={{ margin: 0 }}>
              Sold through CardTrader Zero: set this card aside. CardTrader will merge it into the weekly order to send to the hub.
            </p>
          ) : order.sent_at ? (
            <p style={{ margin: 0 }}>
              Shipped on {dateTime(order.sent_at)}
              {order.tracking_code && (
                <>
                  {" "}with tracking <span className="mono">{order.tracking_code}</span>
                </>
              )}
              .
            </p>
          ) : (
            <p className="hint" style={{ margin: 0 }}>
              This order is {order.state_label.toLowerCase()}: no shipping action available.
            </p>
          )}
        </section>
      </div>

      <section className="section" aria-labelledby="items-title">
        <div className="section-head">
          <h2 id="items-title">Packing list</h2>
          <span className="hint no-print">Tick each card as you pack it</span>
        </div>
        <DataTable className="check-list" style={{ minWidth: 640 }} columns={columns} data={order.items}
          getRowId={(it) => String(it.id)} empty="No items on this order." />
        {order.total !== null && (
          <div className="table-foot">
            <span />
            <span>
              Total to you <strong className="mono" style={{ color: "var(--text)" }}>{euro(order.total, 2)}</strong>
            </span>
          </div>
        )}
      </section>
    </>
  );
}
