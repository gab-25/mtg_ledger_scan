import { useQuery } from "@tanstack/react-query";
import { useState, type FormEvent } from "react";
import { Link, useLocation, useParams } from "react-router-dom";
import { fieldErrors, useAction } from "../actions";
import { deleteItem, getChoices, getItem, updateItem, type Item, type ItemFields } from "../api/collection";
import Field, { ChoiceSelect, Errors } from "../components/Field";
import { PageHead } from "../components/Header";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { BUTTON_GROUP, FORM_ACTIONS, FORM_GRID, PANEL } from "@/lib/styles";
import PageState from "../components/PageState";
import NotFoundPage from "./NotFoundPage";
import { useDocumentTitle } from "../hooks/useDocumentTitle";

const fieldsOf = (item: Item): ItemFields => ({
  condition: item.condition, language: item.language, foil: item.foil, quantity: String(item.quantity), price: item.price,
});

/** What the copies are of: "2XM #107 · Magic Single Card" (a product's stand-in number "CT<id>" is not shown). */
export function itemContext(item: Item) {
  const number = item.collector_number && !item.collector_number.startsWith("CT") ? ` #${item.collector_number}` : "";
  return [`${item.set_code}${number}`, item.category_name].filter(Boolean).join(" · ");
}

/** /cards/<pk>/: edits the copies of a collection item, a fresh form on every visit. */
export default function ItemFormPage() {
  const { pk } = useParams();
  const { key } = useLocation();
  const valid = /^\d+$/.test(pk ?? ""); // /cards/add/ (the old free-text form) and the like are not items
  const item = useQuery({ queryKey: ["item", pk], queryFn: () => getItem(Number(pk)), enabled: valid });
  const choices = useQuery({ queryKey: ["choices"], queryFn: getChoices });
  if (!valid) return <NotFoundPage />;
  if (!item.data) return <PageState error={item.error} />;
  if (!choices.data) return <PageState error={choices.error} />;
  return <ItemForm key={key} item={item.data} choices={choices.data} />;
}

type FormProps = { item: Item; choices: Awaited<ReturnType<typeof getChoices>> };

/** ledger/item_form.html, copies only: condition and foil for cards, language, quantity, price. */
function ItemForm({ item, choices }: FormProps) {
  useDocumentTitle(item.name);
  const [fields, setFields] = useState<ItemFields>(fieldsOf(item));
  // A product's condition and foil are hidden but still sent: the server's form needs them and keeps NM/non-foil.
  const save = useAction((data: ItemFields) => updateItem(item.id, data), { navigateTo: "/" });
  const remove = useAction(() => deleteItem(item.id), { navigateTo: "/" });
  const errors = (name: string) => fieldErrors(save.error, name);

  const set = (name: keyof ItemFields) => (e: { target: HTMLInputElement }) => setValue(name, e.target.value);
  const setValue = (name: keyof ItemFields, value: string | boolean) => setFields((f) => ({ ...f, [name]: value }));

  function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    save.mutate(fields);
  }

  function confirmRemove(e: FormEvent) {
    e.preventDefault();
    if (window.confirm(`Remove ${item.name} from the collection?`)) remove.mutate();
  }

  const select = (name: "condition" | "language", label: string, options: [string, string][]) => (
    <Field label={label} id={`id_${name}`} errors={errors(name)}>
      <ChoiceSelect name={name} id={`id_${name}`} value={fields[name]} options={options} onChange={(v) => setValue(name, v)} />
    </Field>
  );

  return (
    <>
      <PageHead
        eyebrow={<Link to="/" className="text-inherit no-underline">Collection</Link>}
        title={item.name}
        meta={itemContext(item)}
        actions={
          <Button asChild>
            <Link to={`/sale/${item.id}/`}>{item.has_listing ? "Edit listing" : "List for sale"}</Link>
          </Button>
        }
      />

      <form method="post" className={PANEL} id="item-form" onSubmit={submit}>
        <Errors errors={errors("non_field_errors")} />
        <div className={FORM_GRID}>
          {!item.is_product && select("condition", "Condition", choices.conditions)}
          {select("language", "Language", choices.languages)}
          <Field label="Quantity" id="id_quantity" errors={errors("quantity")}>
            <Input type="number" name="quantity" id="id_quantity" min={0} required value={fields.quantity}
              onChange={set("quantity")} />
          </Field>
          <Field label="Unit price" id="id_price" errors={errors("price")}>
            <Input type="number" name="price" id="id_price" step="0.01" required value={fields.price} onChange={set("price")} />
          </Field>
          {!item.is_product && (
            <Field label="Foil" id="id_foil" errors={errors("foil")} check>
              <Checkbox name="foil" id="id_foil" checked={fields.foil} onCheckedChange={(c) => setValue("foil", c === true)} />
            </Field>
          )}
        </div>
      </form>
      <div className={FORM_ACTIONS}>
        <div className={BUTTON_GROUP}>
          <Button type="submit" form="item-form" variant="primary" disabled={save.isPending}>Save</Button>
          <Button asChild variant="ghost"><Link to="/">Cancel</Link></Button>
        </div>
        <form method="post" onSubmit={confirmRemove}>
          <Button type="submit" variant="danger" disabled={remove.isPending}>Remove from collection</Button>
        </form>
      </div>
    </>
  );
}
