import { useQuery } from "@tanstack/react-query";
import { useState, type FormEvent } from "react";
import { Link, useParams } from "react-router-dom";
import { fieldErrors, useAction } from "../actions";
import { getChoices } from "../api/collection";
import { deleteListing, getListing, saveListing, type ListingDetail, type ListingFields } from "../api/sale";
import Field, { ChoiceSelect } from "../components/Field";
import { PageHead } from "../components/Header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { BUTTON_GROUP, FORM_ACTIONS, FORM_GRID, HINT, PANEL, PRICE_LABEL } from "@/lib/styles";
import { cn } from "@/lib/utils";
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
      <PageHead
        eyebrow={<Link to="/sale/" className="text-inherit no-underline">For sale</Link>}
        title={item.name}
        meta={
          <>
            {item.set_code} · {item.condition} · {item.language}
            {item.foil && " · FOIL"} · {item.quantity} owned
          </>
        }
      />

      <form method="post" className={PANEL} id="listing-form" onSubmit={submit}>
        <div className={FORM_GRID}>
          <Field label="Quantity" id="id_quantity" errors={errors("quantity")}>
            <Input type="number" name="quantity" id="id_quantity" min={0} required value={fields.quantity}
              onChange={set("quantity")} />
          </Field>
          <Field label="Price" id="id_price" errors={errors("price")}>
            <Input type="number" name="price" id="id_price" step="0.01" required value={fields.price} onChange={set("price")} />
          </Field>
          <Field label="Market price" id="id_market_price" errors={errors("market_price")}>
            <Input type="number" name="market_price" id="id_market_price" step="0.01" value={fields.market_price}
              onChange={set("market_price")} />
          </Field>
          <Field label="Status" id="id_status" errors={errors("status")}>
            <ChoiceSelect name="status" id="id_status" value={fields.status} options={statuses}
              onChange={(status) => setFields((f) => ({ ...f, status }))} />
          </Field>
        </div>
        <p className={cn(HINT, "mt-0 mb-3 flex flex-wrap items-center gap-2.5")}>
          <span>
            <span className={PRICE_LABEL}>Cardmarket trend{item.foil && " (foil)"}</span>{" "}
            {suggestion !== null ? euro(suggestion, 2) : "—"}
          </span>
          {suggestion !== null && (
            <Button type="button" variant="ghost" size="sm" onClick={() => setFields((f) => ({ ...f, price: suggestion }))}>
              Use
            </Button>
          )}
        </p>
        <p className={cn(HINT, "m-0")}>
          Changes to a published listing are queued as “To publish” until you publish them to CardTrader.
        </p>
      </form>
      <div className={FORM_ACTIONS}>
        <div className={BUTTON_GROUP}>
          <Button type="submit" form="listing-form" variant="primary" disabled={save.isPending}>
            {listing.exists ? "Save listing" : "Create listing"}
          </Button>
          <Button asChild variant="ghost"><Link to="/sale/">Cancel</Link></Button>
        </div>
        {listing.exists && (
          <form method="post" onSubmit={confirmRemove}>
            <Button type="submit" variant="danger" disabled={remove.isPending}>Remove listing</Button>
          </form>
        )}
      </div>
    </>
  );
}
