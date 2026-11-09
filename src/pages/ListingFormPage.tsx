import { useQuery } from "@tanstack/react-query";
import { useState, type FormEvent } from "react";
import { Link, useParams } from "react-router-dom";
import { fieldErrors, useAction } from "../actions";
import { getChoices } from "../api/collection";
import { deleteListing, getListing, saveListing, type ListingDetail, type ListingFields } from "../api/sale";
import Field from "../components/Field";
import PageState from "../components/PageState";
import { euro } from "../format";
import { useDocumentTitle } from "../hooks/useDocumentTitle";

/** /sale/<item pk>/ */
export default function ListingFormPage() {
  const itemPk = Number(useParams().itemPk);
  const detail = useQuery({ queryKey: ["listing", itemPk], queryFn: () => getListing(itemPk) });
  const choices = useQuery({ queryKey: ["choices"], queryFn: getChoices });
  if (!detail.data) return <PageState error={detail.error} />;
  if (!choices.data) return <PageState error={choices.error} />;
  return <ListingForm detail={detail.data} statuses={choices.data.listing_statuses} />;
}

/** ledger/listing_form.html */
function ListingForm({ detail, statuses }: { detail: ListingDetail; statuses: [string, string][] }) {
  const { item, listing, cm_suggestion: suggestion } = detail;
  useDocumentTitle(`Listing · ${item.name}`);
  const [fields, setFields] = useState<ListingFields>({
    quantity: String(listing.quantity), price: listing.price ?? "", market_price: listing.market_price ?? "",
    status: listing.status,
  });
  const save = useAction((data: ListingFields) => saveListing(item.id, data), { navigateTo: "/sale/" });
  const remove = useAction(() => deleteListing(item.id), { navigateTo: "/sale/" });
  const errors = (name: string) => fieldErrors(save.error, name);
  const set = (name: keyof ListingFields) => (e: { target: { value: string } }) =>
    setFields((f) => ({ ...f, [name]: e.target.value }));

  function submit(e: FormEvent) {
    e.preventDefault();
    save.mutate(fields);
  }

  function confirmRemove(e: FormEvent) {
    e.preventDefault();
    if (window.confirm("Remove this listing?")) remove.mutate();
  }

  return (
    <>
      <header className="page-head">
        <div>
          <div className="eyebrow">
            <Link to="/sale/" style={{ color: "inherit", textDecoration: "none" }}>For sale</Link>
          </div>
          <h1>{item.name}</h1>
          <div className="sale-meta" style={{ marginTop: 6 }}>
            {item.set_code} · {item.condition} · {item.language}
            {item.foil && " · FOIL"} · {item.quantity} owned
          </div>
        </div>
      </header>

      <form method="post" className="panel" id="listing-form" onSubmit={submit}>
        <div className="form-grid">
          <Field label="Quantity" id="id_quantity" errors={errors("quantity")}>
            <input type="number" name="quantity" id="id_quantity" min={0} required value={fields.quantity}
              onChange={set("quantity")} />
          </Field>
          <Field label="Price" id="id_price" errors={errors("price")}>
            <input type="number" name="price" id="id_price" step="0.01" required value={fields.price} onChange={set("price")} />
          </Field>
          <Field label="Market price" id="id_market_price" errors={errors("market_price")}>
            <input type="number" name="market_price" id="id_market_price" step="0.01" value={fields.market_price}
              onChange={set("market_price")} />
          </Field>
          <Field label="Status" id="id_status" errors={errors("status")}>
            <select name="status" id="id_status" value={fields.status} onChange={set("status")}>
              {statuses.map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
          </Field>
        </div>
        <p className="hint" style={{ margin: "0 0 12px", display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
          <span>
            <span className="price-label">Cardmarket trend{item.foil && " (foil)"}</span>{" "}
            {suggestion !== null ? euro(suggestion, 2) : "—"}
          </span>
          {suggestion !== null && (
            <button type="button" className="btn btn-ghost btn-sm" onClick={() => setFields((f) => ({ ...f, price: suggestion }))}>
              Use
            </button>
          )}
        </p>
        <p className="hint" style={{ margin: 0 }}>
          Changes to a published listing are queued as “To publish” until you publish them to CardTrader.
        </p>
      </form>
      <div className="panel" style={{ padding: 0, border: 0, background: "none" }}>
        <div className="form-actions">
          <div className="group">
            <button type="submit" form="listing-form" className="btn btn-primary" disabled={save.isPending}>
              {listing.exists ? "Save listing" : "Create listing"}
            </button>
            <Link className="btn btn-ghost" to="/sale/">Cancel</Link>
          </div>
          {listing.exists && (
            <form method="post" onSubmit={confirmRemove}>
              <button type="submit" className="btn btn-danger" disabled={remove.isPending}>Remove listing</button>
            </form>
          )}
        </div>
      </div>
    </>
  );
}
