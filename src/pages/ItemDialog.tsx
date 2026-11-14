import { useQuery } from "@tanstack/react-query";
import { useState, type FormEvent } from "react";
import { fieldErrors, useAction } from "../actions";
import { deleteItem, getChoices, getItem, updateItem, type Choices, type Item, type ItemFields } from "../api/collection";
import Field, { ChoiceSelect, Errors } from "../components/Field";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { BUTTON_GROUP, EMPTY, FORM_GRID } from "@/lib/styles";
import { cn } from "@/lib/utils";
import { useDialogParam } from "../hooks/useDialogParam";
import { failureOf, LoadError } from "./ListingDialog";

const fieldsOf = (item: Item): ItemFields => ({
  condition: item.condition, language: item.language, foil: item.foil, quantity: String(item.quantity),
});

/** What the copies are of: "2XM #107 · Magic Single Card" (a product's stand-in number "CT<id>" is not shown). */
export function itemContext(item: Item) {
  const number = item.collector_number && !item.collector_number.startsWith("CT") ? ` #${item.collector_number}` : "";
  return [`${item.set_code}${number}`, item.category_name].filter(Boolean).join(" · ");
}

/** `?edit=<pk>`: the copies of a collection item, edited in a dialog (was /cards/<pk>/). */
export default function ItemDialog() {
  const { pk, close } = useDialogParam("edit");
  return (
    <Dialog open={pk !== null} onOpenChange={(open) => !open && close()}>
      {pk !== null && <ItemContent key={pk} pk={pk} close={close} />}
    </Dialog>
  );
}

type ContentProps = { pk: number; close: () => void };

function ItemContent({ pk, close }: ContentProps) {
  const item = useQuery({ queryKey: ["item", pk], queryFn: () => getItem(pk) });
  const choices = useQuery({ queryKey: ["choices"], queryFn: getChoices });
  const error = item.error ?? choices.error;
  return (
    <DialogContent title={item.data?.name ?? "Card"} description={item.data && itemContext(item.data)}>
      {error ? (
        <LoadError message={error.message} close={close} />
      ) : !item.isFetchedAfterMount || !item.data || !choices.data ? (
        // A cached copy may predate a save: the form starts from this visit's fetch only.
        <p className={cn(EMPTY, "py-6")}>Loading…</p>
      ) : (
        <ItemForm item={item.data} choices={choices.data} close={close} />
      )}
    </DialogContent>
  );
}

type FormProps = { item: Item; choices: Choices; close: () => void };

/** ledger/item_form.html, copies only: condition and foil for cards, language, quantity (the price is the CardTrader market price). */
function ItemForm({ item, choices, close }: FormProps) {
  const [fields, setFields] = useState<ItemFields>(fieldsOf(item));
  // A product's condition and foil are hidden but still sent: the server's form needs them and keeps NM/non-foil.
  const save = useAction((data: ItemFields) => updateItem(item.id, data), { navigates: true });
  const remove = useAction(() => deleteItem(item.id), { navigates: true });
  const errors = (name: string) => fieldErrors(save.error, name);

  const set = (name: keyof ItemFields) => (e: { target: HTMLInputElement }) => setValue(name, e.target.value);
  const setValue = (name: keyof ItemFields, value: string | boolean) => setFields((f) => ({ ...f, [name]: value }));

  function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    save.mutate(fields, { onSuccess: close });
  }

  function confirmRemove() {
    if (window.confirm(`Remove ${item.name} from the collection?`)) remove.mutate(undefined, { onSuccess: close });
  }

  const select = (name: "condition" | "language", label: string, options: [string, string][]) => (
    <Field label={label} id={`edit_${name}`} errors={errors(name)}>
      <ChoiceSelect name={name} id={`edit_${name}`} value={fields[name]} options={options} onChange={(v) => setValue(name, v)} />
    </Field>
  );

  return (
    <form method="post" className="flex flex-col gap-5" onSubmit={submit}>
      <Errors errors={failureOf(save.error) ?? failureOf(remove.error) ?? errors("non_field_errors")} />
      <div className={FORM_GRID}>
        {!item.is_product && select("condition", "Condition", choices.conditions)}
        {select("language", "Language", choices.languages)}
        <Field label="Quantity" id="edit_quantity" errors={errors("quantity")}>
          <Input type="number" name="quantity" id="edit_quantity" min={0} required value={fields.quantity}
            onChange={set("quantity")} />
        </Field>
        {!item.is_product && (
          <Field label="Foil" id="edit_foil" errors={errors("foil")} check>
            <Checkbox name="foil" id="edit_foil" checked={fields.foil} onCheckedChange={(c) => setValue("foil", c === true)} />
          </Field>
        )}
      </div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className={BUTTON_GROUP}>
          <Button type="submit" variant="primary" disabled={save.isPending}>Save</Button>
          <Button type="button" variant="ghost" onClick={close}>Cancel</Button>
        </div>
        <Button type="button" variant="danger" disabled={remove.isPending} onClick={confirmRemove}>Remove from collection</Button>
      </div>
    </form>
  );
}
