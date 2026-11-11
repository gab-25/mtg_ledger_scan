import { useQuery } from "@tanstack/react-query";
import { useRef, useState, type FormEvent } from "react";
import { fieldErrors, useAction } from "../actions";
import type { Printing } from "../api/catalog";
import { ApiError } from "../api/client";
import { addToCollection, getChoices, type CatalogItemFields, type Choices } from "../api/collection";
import Field, { ChoiceSelect, Errors } from "../components/Field";
import { PlusIcon } from "../components/icons";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogClose, DialogContent } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { BUTTON_GROUP, FORM_GRID } from "@/lib/styles";

type Props = { printing: Printing; onAdded: () => void };

/** Where a product comes from, as the catalog shows it: "M21 #1 · Showcase". */
export function printingLabel(p: Printing) {
  return [`${p.expansion_code.toUpperCase()}${p.collector_number ? ` #${p.collector_number}` : ""}`, p.version]
    .filter(Boolean)
    .join(" · ");
}

/** The "Add" button of a catalog row and its dialog, which adds copies of the product to the collection. */
export default function AddFromCatalog({ printing, onAdded }: Props) {
  const [open, setOpen] = useState(false);
  const added = useRef(false); // closed by a successful add: focus goes to the search, not back to the button
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <Button type="button" size="sm" onClick={() => { added.current = false; setOpen(true); }}>
        <PlusIcon />Add
      </Button>
      <DialogContent
        title={printing.name}
        description={printingLabel(printing)}
        onCloseAutoFocus={(e) => {
          if (!added.current) return;
          e.preventDefault();
          onAdded();
        }}
      >
        {open && (
          <AddForm printing={printing} onDone={() => { added.current = true; setOpen(false); }} />
        )}
      </DialogContent>
    </Dialog>
  );
}

function AddForm({ printing, onDone }: { printing: Printing; onDone: () => void }) {
  const choices = useQuery({ queryKey: ["choices"], queryFn: getChoices });
  const card = !printing.is_product;
  const withLanguage = card || printing.accepts_language;
  const trend = (foil: boolean) => (foil ? printing.prices?.trend_foil : printing.prices?.trend) ?? "0.00";
  const [fields, setFields] = useState({ condition: "NM", language: "EN", foil: false, quantity: "1", price: trend(false) });
  const priceTouched = useRef(false); // a price the user typed is never replaced by the trend
  const save = useAction(addToCollection);
  const errors = (name: string) => fieldErrors(save.error, name);
  // Any other failure also goes to the page banner, hidden behind the dialog: repeat it here.
  const failure = save.error && !(save.error instanceof ApiError && save.error.fields) ? [save.error.message] : undefined;

  const set = (patch: Partial<typeof fields>) => setFields((f) => ({ ...f, ...patch }));
  const setFoil = (foil: boolean) => set(priceTouched.current ? { foil } : { foil, price: trend(foil) });

  function submit(e: FormEvent) {
    e.preventDefault();
    const body: CatalogItemFields = {
      blueprint: printing.ct_id,
      ...(card && { condition: fields.condition, foil: fields.foil }),
      ...(withLanguage && { language: fields.language }),
      quantity: fields.quantity,
      price: fields.price,
    };
    save.mutate(body, { onSuccess: onDone });
  }

  const select = (name: "condition" | "language", label: string, options: Choices["conditions"]) => (
    <Field label={label} id={`add_${name}`} errors={errors(name)}>
      <ChoiceSelect name={name} id={`add_${name}`} value={fields[name]} options={options} onChange={(v) => set({ [name]: v })} />
    </Field>
  );

  return (
    <form method="post" className="flex flex-col gap-5" onSubmit={submit}>
      <Errors errors={failure ?? errors("non_field_errors") ?? errors("blueprint")} />
      <div className={FORM_GRID}>
        {card && select("condition", "Condition", choices.data?.conditions ?? [])}
        {withLanguage && select("language", "Language", choices.data?.languages ?? [])}
        <Field label="Quantity" id="add_quantity" errors={errors("quantity")}>
          <Input type="number" name="quantity" id="add_quantity" min={1} required value={fields.quantity}
            onChange={(e) => set({ quantity: e.target.value })} />
        </Field>
        <Field label="Unit price" id="add_price" errors={errors("price")} help="Cardmarket trend">
          <Input type="number" name="price" id="add_price" step="0.01" min={0} required value={fields.price}
            onChange={(e) => { priceTouched.current = true; set({ price: e.target.value }); }} />
        </Field>
        {card && (
          <Field label="Foil" id="add_foil" errors={errors("foil")} check>
            <Checkbox name="foil" id="add_foil" checked={fields.foil} onCheckedChange={(c) => setFoil(c === true)} />
          </Field>
        )}
      </div>
      <div className={BUTTON_GROUP}>
        <Button type="submit" variant="primary" disabled={save.isPending}>Add to collection</Button>
        <DialogClose asChild><Button type="button" variant="ghost">Cancel</Button></DialogClose>
      </div>
    </form>
  );
}
