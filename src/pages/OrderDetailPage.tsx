import { useQuery } from "@tanstack/react-query";
import type { ColumnDef } from "@tanstack/react-table";
import { useState, type FormEvent } from "react";
import { Link, useParams } from "react-router-dom";
import { useAction } from "../actions";
import { getOrder, shipOrder, type OrderDetail, type OrderItem } from "../api/orders";
import { badgeVariant } from "@/api/types";
import { Badge } from "@/components/ui/badge";
import DataTable, { TableFoot } from "../components/DataTable";
import Field from "../components/Field";
import { PageHead } from "../components/Header";
import FoilTag from "../components/FoilTag";
import { Button } from "@/components/ui/button";
import { Card, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { DETAIL_GRID, DIM, EMPTY, FACTS, H2, HINT, META, NOTE, NUM, SECTION, SECTION_HEAD, SUB } from "@/lib/styles";
import { cn } from "@/lib/utils";
import PageState from "../components/PageState";
import { dateTime, euro, pluralize } from "../format";
import { useDocumentTitle } from "../hooks/useDocumentTitle";
import { useIsMobile } from "../hooks/useMediaQuery";

const columns: ColumnDef<OrderItem>[] = [
  {
    id: "packed",
    header: () => <span className="sr-only">Packed</span>,
    meta: { className: "w-9" },
    cell: ({ row: { original: it } }) => <Checkbox id={`pack-${it.id}`} aria-label={`Packed ${it.name}`} className="align-middle" />,
  },
  {
    id: "card",
    header: "Card",
    cell: ({ row: { original: it } }) => (
      <>
        <label htmlFor={`pack-${it.id}`} className="cursor-pointer font-medium">{it.name}</label>
        {it.foil && <FoilTag />}
        <div className={SUB}>
          {it.expansion}
          <InLedger item={it} />
        </div>
      </>
    ),
  },
  { id: "cond", header: "Cond.", meta: { className: DIM }, cell: ({ row: { original: it } }) => it.condition || "—" },
  { id: "language", header: "Language", meta: { className: DIM }, cell: ({ row: { original: it } }) => it.language || "—" },
  { id: "qty", header: "Qty", accessorKey: "quantity", meta: { align: "right", className: NUM } },
  {
    id: "price", header: "Price", meta: { align: "right", className: NUM },
    cell: ({ row: { original: it } }) => (it.price !== null ? euro(it.price, 2) : ""),
  },
];

/** "in Ledger": the item of the collection the line was sold from, when it is still there. */
function InLedger({ item }: { item: OrderItem }) {
  return item.item_pk !== null ? <>{" · "}<Link to={`/?edit=${item.item_pk}`}>in Ledger</Link></> : null;
}

/** The packing list on a phone, in place of the table: tick box; name, expansion, condition · language; quantity and
 * price. */
function PackingList({ items }: { items: OrderItem[] }) {
  if (items.length === 0) return <p className={EMPTY}>No items on this order.</p>;
  return (
    <ul className="m-0 flex list-none flex-col border-t border-line p-0">
      {items.map((it) => (
        <li key={it.id} className="flex items-center gap-3 border-b border-line py-2.5">
          <Checkbox id={`pack-${it.id}`} aria-label={`Packed ${it.name}`} className="flex-none" />
          <span className="flex min-w-0 flex-1 flex-col gap-0.5">
            <span>
              <label htmlFor={`pack-${it.id}`} className="cursor-pointer font-medium">{it.name}</label>
              {it.foil && <FoilTag />}
            </span>
            {(it.expansion || it.item_pk !== null) && (
              <span className={SUB}>
                {it.expansion}
                <InLedger item={it} />
              </span>
            )}
            {(it.condition || it.language) && (
              <span className={cn(META, "mt-0")}>{[it.condition, it.language].filter(Boolean).join(" · ")}</span>
            )}
          </span>
          <span className="flex flex-none flex-col items-end gap-0.5 font-mono">
            <span>×{it.quantity}</span>
            {it.price !== null && <span className="text-text-2">{euro(it.price, 2)}</span>}
          </span>
        </li>
      ))}
    </ul>
  );
}

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
  const mobile = useIsMobile();

  function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const submitter = (e.nativeEvent as SubmitEvent).submitter as HTMLButtonElement | null;
    ship.mutate(submitter?.name === "save_tracking");
  }

  return (
    <>
      <PageHead
        eyebrow={<Link to="/shipments/" className="text-inherit no-underline print:hidden">Shipments</Link>}
        title={`Order #${order.code}`}
        meta={
          <span className="font-sans">
            {order.packing_number && order.can_ship ? `Pack ${order.packing_number} · ` : ""}
            {order.size} card{pluralize(order.size)}
            {order.paid_at && ` · paid ${dateTime(order.paid_at)}`}
            {order.via_cardtrader_zero && " · CardTrader Zero"}
          </span>
        }
        actions={
          <div className="flex flex-wrap items-center gap-3 print:hidden">
            <Badge variant={badgeVariant(order.badge.tone)}>{order.badge.label}</Badge>
            <Button type="button" onClick={() => window.print()}>Print packing slip</Button>
          </div>
        }
      />

      <div className={DETAIL_GRID}>
        <Card asChild>
          <section aria-labelledby="ship-to">
          <CardTitle id="ship-to">Ship to</CardTitle>
          {order.address_lines.length ? (
            <address className="m-0 text-base leading-[1.55] not-italic print:text-[14pt]">
              {order.address_lines.map((line, i) => (
                <div key={i} className={i === 0 ? "font-semibold" : undefined}>{line}</div>
              ))}
            </address>
          ) : (
            <p className={cn(HINT, "m-0")}>No shipping address on this order.</p>
          )}
          {order.ship_note && <div className={NOTE}>Note from buyer: {order.ship_note}</div>}
          <dl className={FACTS}>
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
                {order.max_shipping_days ? <div className={SUB}>up to {order.max_shipping_days} days</div> : null}
              </dd>
            </div>
            <div>
              <dt>Tracking</dt>
              <dd className="font-mono">{order.tracking_code || "—"}</dd>
            </div>
          </dl>
          </section>
        </Card>

        <Card asChild className="print:hidden">
          <section aria-labelledby="ship-title">
          <CardTitle id="ship-title">Shipping</CardTitle>
          {order.can_ship ? (
            <>
              <form method="post" className="m-0 flex flex-wrap items-start gap-2.5" onSubmit={submit}>
                <div className="flex-[1_1_200px]">
                  <Field label={`Tracking code${required ? " (required)" : " (optional)"}`} id="id_tracking_code">
                    <Input type="text" name="tracking_code" id="id_tracking_code" maxLength={120} value={tracking}
                      onChange={(e) => setTracking(e.target.value)} />
                  </Field>
                </div>
                <Button type="submit" name="save_tracking" value="1" className="mt-[26px]" disabled={ship.isPending}>Save code</Button>
                <Button type="submit" variant="primary" className="mt-[26px]" disabled={ship.isPending}>Mark as shipped</Button>
              </form>
              <p className={cn(HINT, "m-0")}>
                “Mark as shipped” saves the tracking code on CardTrader, then moves the order to Shipped.
                {order.via_cardtrader_zero && " CardTrader Zero orders must have a tracking code before shipping."}
              </p>
            </>
          ) : order.state === "hub_pending" ? (
            <p className={cn(HINT, "m-0")}>
              Sold through CardTrader Zero: set this card aside. CardTrader will merge it into the weekly order to send to the hub.
            </p>
          ) : order.sent_at ? (
            <p className="m-0">
              Shipped on {dateTime(order.sent_at)}
              {order.tracking_code && (
                <>
                  {" "}with tracking <span className="font-mono">{order.tracking_code}</span>
                </>
              )}
              .
            </p>
          ) : (
            <p className={cn(HINT, "m-0")}>
              This order is {order.state_label.toLowerCase()}: no shipping action available.
            </p>
          )}
          </section>
        </Card>
      </div>

      <section className={SECTION} aria-labelledby="items-title">
        <div className={SECTION_HEAD}>
          <h2 id="items-title" className={H2}>Packing list</h2>
          <span className={cn(HINT, "print:hidden")}>Tick each card as you pack it</span>
        </div>
        {mobile ? (
          <PackingList items={order.items} />
        ) : (
          <DataTable className="min-w-[640px]" columns={columns} data={order.items}
            getRowId={(it) => String(it.id)} empty="No items on this order." />
        )}
        {order.total !== null && (
          <TableFoot>
            <span />
            <span>
              Total to you <strong className="font-mono text-foreground print:text-black">{euro(order.total, 2)}</strong>
            </span>
          </TableFoot>
        )}
      </section>
    </>
  );
}
