import { useQuery } from "@tanstack/react-query";
import { useState, type FormEvent } from "react";
import { fieldErrors, useAction } from "../actions";
import { ApiError } from "../api/client";
import { getChoices } from "../api/collection";
import { deleteListing, getListing, saveListing, type ListingDetail, type ListingFields } from "../api/sale";
import Field, { ChoiceSelect, Errors } from "../components/Field";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { BUTTON_GROUP, EMPTY, FORM_GRID, HINT, PRICE_LABEL } from "@/lib/styles";
import { cn } from "@/lib/utils";
import { euro } from "../format";
import { useDialogParam } from "../hooks/useDialogParam";

/** `?sell=<pk>`: the listing of a collection item, created or changed in a dialog (was /sale/<pk>/). */
export default function ListingDialog() {
  const { pk, close } = useDialogParam("sell");
  return (
    <Dialog open={pk !== null} onOpenChange={(open) => !open && close()}>
      {pk !== null && <ListingContent key={pk} itemPk={pk} close={close} />}
    </Dialog>
  );
}

function ListingContent({ itemPk, close }: { itemPk: number; close: () => void }) {
  const detail = useQuery({ queryKey: ["listing", itemPk], queryFn: () => getListing(itemPk) });
  const choices = useQuery({ queryKey: ["choices"], queryFn: getChoices });
  const error = detail.error ?? choices.error;
  const item = detail.data?.item;
  return (
    <DialogContent
      title={item?.name ?? "Listing"}
      description={item && <>{item.set_code} · {item.condition} · {item.language}{item.foil && " · FOIL"} · {item.quantity} owned</>}
    >
      {error ? (
        <LoadError message={error.message} close={close} />
      ) : !detail.isFetchedAfterMount || !detail.data || !choices.data ? (
        // A cached copy may predate a save or a price match: the form starts from this visit's fetch only.
        <p className={cn(EMPTY, "py-6")}>Loading…</p>
      ) : (
        <ListingForm detail={detail.data} statuses={choices.data.listing_statuses} close={close} />
      )}
    </DialogContent>
  );
}

/** A dialog whose data didn't load: the error and a way out. */
export function LoadError({ message, close }: { message: string; close: () => void }) {
  return (
    <>
      <Errors errors={[message]} />
      <div className={BUTTON_GROUP}><Button type="button" variant="ghost" onClick={close}>Cancel</Button></div>
    </>
  );
}

/** A failure other than a field error goes to the page banner, hidden behind the dialog: repeat it inside. */
export function failureOf(error: Error | null) {
  return error && !(error instanceof ApiError && error.fields) ? [error.message] : undefined;
}

/** When the listing reaches CardTrader, by its saved state (not the status being chosen). */
function note(listing: ListingDetail["listing"]) {
  if (!listing.exists) return "The listing is queued as “To publish”: it goes to CardTrader when you press “Publish” on the For sale page.";
  if (listing.status === "to_publish") return "Not on CardTrader yet: it goes there when you press “Publish” on the For sale page.";
  if (listing.status === "published") return "Changes to a published listing are queued as “To publish” until you publish them to CardTrader.";
  return null;
}

type FormProps = { detail: ListingDetail; statuses: [string, string][]; close: () => void };

/** ledger/listing_form.html */
function ListingForm({ detail, statuses, close }: FormProps) {
  const { item, listing, suggested_price: suggestion } = detail;
  const [fields, setFields] = useState<ListingFields>({
    quantity: String(listing.quantity),
    price: (listing.exists ? listing.price : (suggestion ?? listing.price)) ?? "",
    status: listing.status,
  });
  const save = useAction((data: ListingFields) => saveListing(item.id, data), { navigates: true });
  const remove = useAction(() => deleteListing(item.id), { navigates: true });
  const errors = (name: string) => fieldErrors(save.error, name);
  const set = (name: keyof ListingFields) => (e: { target: { value: string } }) =>
    setFields((f) => ({ ...f, [name]: e.target.value }));

  function submit(e: FormEvent) {
    e.preventDefault();
    save.mutate(fields, { onSuccess: close });
  }

  function confirmRemove() {
    if (window.confirm("Remove this listing?")) remove.mutate(undefined, { onSuccess: close });
  }

  return (
    <form method="post" className="flex flex-col gap-5" onSubmit={submit}>
      <Errors errors={failureOf(save.error) ?? failureOf(remove.error) ?? errors("non_field_errors")} />
      <div className={FORM_GRID}>
        <Field label="Quantity" id="sell_quantity" errors={errors("quantity")}>
          <Input type="number" name="quantity" id="sell_quantity" min={1} required value={fields.quantity}
            onChange={set("quantity")} />
        </Field>
        <Field label="Price" id="sell_price" errors={errors("price")}>
          <Input type="number" name="price" id="sell_price" step="0.01" min={0} required value={fields.price}
            onChange={set("price")} />
        </Field>
        <Field label="Status" id="sell_status" errors={errors("status")}>
          <ChoiceSelect name="status" id="sell_status" value={fields.status} options={statuses}
            onChange={(status) => setFields((f) => ({ ...f, status }))} />
        </Field>
      </div>
      <p className={cn(HINT, "m-0")}>
        <span className={PRICE_LABEL}>CardTrader market price</span>{" "}
        <span>{suggestion !== null ? euro(suggestion, 2) : "—"}</span>
      </p>
      {note(listing) && <p className={cn(HINT, "m-0")}>{note(listing)}</p>}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className={BUTTON_GROUP}>
          <Button type="submit" variant="primary" disabled={save.isPending}>
            {listing.exists ? "Save listing" : "Add to sale"}
          </Button>
          <Button type="button" variant="ghost" onClick={close}>Cancel</Button>
        </div>
        {listing.exists && (
          <Button type="button" variant="danger" disabled={remove.isPending} onClick={confirmRemove}>Remove listing</Button>
        )}
      </div>
    </form>
  );
}
