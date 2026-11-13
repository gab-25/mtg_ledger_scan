import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { useState, type FormEvent } from "react";
import { fieldErrors, useAction } from "../actions";
import { ApiError } from "../api/client";
import { getChoices, getCollection, type CollectionRow } from "../api/collection";
import { getListing, saveListing, type ListingDetail, type ListingFields } from "../api/sale";
import { badgeVariant } from "@/api/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import Field, { ChoiceSelect, Errors } from "../components/Field";
import FoilTag from "../components/FoilTag";
import SearchBox from "../components/SearchBox";
import { BUTTON_GROUP, EMPTY, FORM_GRID, HINT, META, PRICE_LABEL } from "@/lib/styles";
import { cn } from "@/lib/utils";
import { euro } from "../format";

/** The "List cards" button of the For sale page and its dialog: find a card of the collection, then list it. */
export default function QuickList() {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [q, setQ] = useState("");
  const [picked, setPicked] = useState<CollectionRow | null>(null);
  const [saved, setSaved] = useState<string | null>(null);

  function changeOpen(next: boolean) {
    setOpen(next);
    if (!next) {
      setSearch("");
      setQ("");
      setPicked(null);
      setSaved(null);
    }
  }

  return (
    <Dialog open={open} onOpenChange={changeOpen}>
      <Button type="button" onClick={() => setOpen(true)}>List cards</Button>
      <DialogContent
        title="List cards"
        onEscapeKeyDown={(e) => {
          // Escape first clears the search (as in the SearchBox), then closes.
          if (picked || !search) return;
          e.preventDefault();
          setSearch("");
          setQ("");
        }}
      >
        {open && picked && (
          <ListForm itemId={picked.id} onBack={() => setPicked(null)}
            onSaved={(message) => { setSaved(message); setPicked(null); }} />
        )}
        {open && !picked && (
          <>
            {saved && <p role="status" className="m-0 text-sm text-ok">{saved}</p>}
            <SearchBox id="quick_q" label="Search your collection" value={search} placeholder="Search by name or set…"
              autoFocus onChange={setSearch} onSearch={setQ}
              onSubmit={(e) => { e.preventDefault(); setQ(search.trim()); }} />
            <Results q={q} onPick={setPicked} />
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

function Results({ q, onPick }: { q: string; onPick: (row: CollectionRow) => void }) {
  const query = useQuery({
    queryKey: ["collection", "quick", q], queryFn: () => getCollection(new URLSearchParams({ q })),
    enabled: q !== "", placeholderData: keepPreviousData,
  });
  if (!q) return <p className={cn(EMPTY, "py-6")}>Type at least 3 letters to find a card.</p>;
  if (query.error) return <Errors errors={[query.error.message]} />;
  if (!query.data) return <p className={cn(EMPTY, "py-6")}>Loading…</p>;
  const rows = query.data.results;
  if (rows.length === 0) return <p className={cn(EMPTY, "py-6")}>No cards match.</p>;
  return (
    <ul className="m-0 flex list-none flex-col p-0">
      {rows.map((r) => (
        <li key={r.id} className="border-b border-line last:border-b-0">
          <button type="button" onClick={() => onPick(r)}
            className="flex min-h-14 w-full cursor-pointer items-center gap-3 border-0 bg-transparent px-1 py-2 text-left text-foreground hover:bg-accent">
            <span className="flex min-w-0 flex-1 flex-col gap-0.5">
              <span className="flex items-center gap-1.5">
                <span className="truncate font-medium">{r.name}</span>
                {r.foil && <FoilTag />}
              </span>
              <span className={META}>
                {r.set_code} · {!r.is_product && <>{r.condition} · </>}{r.language} · ×{r.quantity}
              </span>
            </span>
            <Badge variant={badgeVariant(r.badge.tone)}>{r.badge.label}</Badge>
          </button>
        </li>
      ))}
    </ul>
  );
}

/** The listing of one collection item: create it or change it, then back to the search. */
function ListForm({ itemId, onSaved, onBack }: { itemId: number; onSaved: (message: string) => void; onBack: () => void }) {
  const detail = useQuery({ queryKey: ["listing", itemId], queryFn: () => getListing(itemId) });
  const choices = useQuery({ queryKey: ["choices"], queryFn: getChoices });
  const error = detail.error ?? choices.error;
  if (error) {
    return (
      <div className="flex flex-col gap-5">
        <Errors errors={[error.message]} />
        <div className={BUTTON_GROUP}><Button type="button" variant="ghost" onClick={onBack}>Back</Button></div>
      </div>
    );
  }
  // The form copies the listing once: wait for this visit's fetch, a cached copy may predate a save or a price match.
  if (!detail.isFetchedAfterMount || !detail.data || !choices.data) return <p className={cn(EMPTY, "py-6")}>Loading…</p>;
  return <ListFields detail={detail.data} statuses={choices.data.listing_statuses} onSaved={onSaved} onBack={onBack} />;
}

type FieldsProps = {
  detail: ListingDetail;
  statuses: [string, string][];
  onSaved: (message: string) => void;
  onBack: () => void;
};

function ListFields({ detail, statuses, onSaved, onBack }: FieldsProps) {
  const { item, listing, cm_suggestion: suggestion } = detail;
  const [fields, setFields] = useState<ListingFields>({
    quantity: String(listing.quantity),
    price: (listing.exists ? listing.price : (suggestion ?? listing.price)) ?? "",
    market_price: listing.market_price ?? "",
    status: listing.status,
  });
  const save = useAction((data: ListingFields) => saveListing(item.id, data));
  const errors = (name: string) => fieldErrors(save.error, name);
  // Any other failure also goes to the page banner, hidden behind the dialog: repeat it here.
  const failure = save.error && !(save.error instanceof ApiError && save.error.fields) ? [save.error.message] : undefined;
  const set = (name: keyof ListingFields) => (e: { target: { value: string } }) =>
    setFields((f) => ({ ...f, [name]: e.target.value }));

  function submit(e: FormEvent) {
    e.preventDefault();
    save.mutate(fields, { onSuccess: () => onSaved(`${listing.exists ? "Saved" : "Listed"} ${item.name}.`) });
  }

  return (
    <form method="post" className="flex flex-col gap-5" onSubmit={submit}>
      <div>
        <div className="text-[15px] font-semibold">{item.name}</div>
        <div className={META}>
          {item.set_code} · {item.condition} · {item.language}
          {item.foil && " · FOIL"} · {item.quantity} owned
        </div>
      </div>
      <Errors errors={failure ?? errors("non_field_errors")} />
      <div className={FORM_GRID}>
        <Field label="Quantity" id="quick_quantity" errors={errors("quantity")}>
          <Input type="number" name="quantity" id="quick_quantity" min={1} required value={fields.quantity}
            onChange={set("quantity")} />
        </Field>
        <Field label="Price" id="quick_price" errors={errors("price")}>
          <Input type="number" name="price" id="quick_price" step="0.01" min={0} required autoFocus value={fields.price}
            onChange={set("price")} />
        </Field>
        <Field label="Status" id="quick_status" errors={errors("status")}>
          <ChoiceSelect name="status" id="quick_status" value={fields.status} options={statuses}
            onChange={(status) => setFields((f) => ({ ...f, status }))} />
        </Field>
      </div>
      <p className={cn(HINT, "m-0 flex flex-wrap items-center gap-2.5")}>
        <span>
          <span className={PRICE_LABEL}>Cardmarket trend{item.foil && " (foil)"}</span>{" "}
          <span>{suggestion !== null ? euro(suggestion, 2) : "—"}</span>
        </span>
        {suggestion !== null && (
          <Button type="button" variant="ghost" size="sm" onClick={() => setFields((f) => ({ ...f, price: suggestion }))}>
            Use
          </Button>
        )}
      </p>
      <div className={BUTTON_GROUP}>
        <Button type="submit" variant="primary" disabled={save.isPending}>{listing.exists ? "Save listing" : "List"}</Button>
        <Button type="button" variant="ghost" onClick={onBack}>Back</Button>
      </div>
    </form>
  );
}
