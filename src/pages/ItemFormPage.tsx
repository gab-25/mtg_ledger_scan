import { useQuery } from "@tanstack/react-query";
import { useRef, useState, type FormEvent } from "react";
import { Link, useLocation, useParams } from "react-router-dom";
import { fieldErrors, useAction } from "../actions";
import { createItem, deleteItem, getChoices, getItem, updateItem, type Item, type ItemFields } from "../api/collection";
import Field, { Errors } from "../components/Field";
import PageState from "../components/PageState";
import { useDocumentTitle } from "../hooks/useDocumentTitle";

const EMPTY: ItemFields = {
  name: "", set_code: "", collector_number: "", type_line: "", color: "C", condition: "NM", language: "EN",
  foil: false, quantity: "1", price: "0.00",
};

const fieldsOf = (item: Item): ItemFields => ({
  name: item.name, set_code: item.set_code, collector_number: item.collector_number, type_line: item.type_line,
  color: item.color, condition: item.condition, language: item.language, foil: item.foil,
  quantity: String(item.quantity), price: item.price,
});

/** /cards/add/ and /cards/<pk>/: a fresh form on every visit ("Save and add another" included). */
export default function ItemFormPage() {
  const { pk } = useParams();
  const { key } = useLocation();
  const item = useQuery({ queryKey: ["item", pk], queryFn: () => getItem(Number(pk)), enabled: pk !== undefined });
  const choices = useQuery({ queryKey: ["choices"], queryFn: getChoices });
  if (pk !== undefined && !item.data) return <PageState error={item.error} />;
  if (!choices.data) return <PageState error={choices.error} />;
  return <ItemForm key={key} item={item.data} choices={choices.data} />;
}

type FormProps = { item?: Item; choices: Awaited<ReturnType<typeof getChoices>> };

/** ledger/item_form.html */
function ItemForm({ item, choices }: FormProps) {
  const title = item ? item.name : "Add cards";
  useDocumentTitle(title);
  const [fields, setFields] = useState<ItemFields>(item ? fieldsOf(item) : EMPTY);
  const another = useRef(false); // "Save and add another" was the button
  const save = useAction((data: ItemFields) => (item ? updateItem(item.id, data) : createItem(data)), {
    navigateTo: () => (another.current ? "/cards/add/" : "/"),
  });
  const remove = useAction(() => deleteItem(item!.id), { navigateTo: "/" });
  const errors = (name: string) => fieldErrors(save.error, name);

  const set = (name: keyof ItemFields) => (e: { target: HTMLInputElement | HTMLSelectElement }) =>
    setFields((f) => ({ ...f, [name]: e.target instanceof HTMLInputElement && e.target.type === "checkbox" ? e.target.checked : e.target.value }));

  function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const submitter = (e.nativeEvent as SubmitEvent).submitter as HTMLButtonElement | null;
    another.current = submitter?.name === "add_another";
    save.mutate(fields);
  }

  function confirmRemove(e: FormEvent) {
    e.preventDefault();
    if (window.confirm(`Remove ${item!.name} from the collection?`)) remove.mutate();
  }

  const select = (name: "color" | "condition" | "language", label: string, options: [string, string][]) => (
    <Field label={label} id={`id_${name}`} errors={errors(name)}>
      <select name={name} id={`id_${name}`} value={fields[name]} onChange={set(name)}>
        {options.map(([value, text]) => (
          <option key={value} value={value}>{text}</option>
        ))}
      </select>
    </Field>
  );

  return (
    <>
      <header className="page-head">
        <div>
          <div className="eyebrow">
            <Link to="/" style={{ color: "inherit", textDecoration: "none" }}>Collection</Link>
          </div>
          <h1>{title}</h1>
        </div>
        {item && (
          <div className="actions">
            <Link className="btn" to={`/sale/${item.id}/`}>{item.has_listing ? "Edit listing" : "List for sale"}</Link>
          </div>
        )}
      </header>

      <form method="post" className="panel" id="item-form" onSubmit={submit}>
        <Errors errors={errors("non_field_errors")} />
        <div className="form-grid">
          <Field label="Name" id="id_name" errors={errors("name")} wide>
            <input type="text" name="name" id="id_name" maxLength={200} required value={fields.name} onChange={set("name")} />
          </Field>
          <Field label="Set" id="id_set_code" errors={errors("set_code")}>
            <input type="text" name="set_code" id="id_set_code" maxLength={10} required value={fields.set_code}
              onChange={set("set_code")} />
          </Field>
          <Field label="Collector number" id="id_collector_number" errors={errors("collector_number")}>
            <input type="text" name="collector_number" id="id_collector_number" maxLength={40}
              value={fields.collector_number} onChange={set("collector_number")} />
          </Field>
          {select("color", "Color", choices.colors)}
          <Field label="Type" id="id_type_line" errors={errors("type_line")} wide>
            <input type="text" name="type_line" id="id_type_line" maxLength={200} value={fields.type_line}
              onChange={set("type_line")} />
          </Field>
          {select("condition", "Condition", choices.conditions)}
          {select("language", "Language", choices.languages)}
          <Field label="Quantity" id="id_quantity" errors={errors("quantity")}>
            <input type="number" name="quantity" id="id_quantity" min={0} required value={fields.quantity}
              onChange={set("quantity")} />
          </Field>
          <Field label="Unit price" id="id_price" errors={errors("price")}>
            <input type="number" name="price" id="id_price" step="0.01" required value={fields.price} onChange={set("price")} />
          </Field>
          <Field label="Foil" id="id_foil" errors={errors("foil")} check>
            <input type="checkbox" name="foil" id="id_foil" checked={fields.foil} onChange={set("foil")} />
          </Field>
        </div>
      </form>
      <div className="panel" style={{ padding: 0, border: 0, background: "none" }}>
        <div className="form-actions">
          <div className="group">
            <button type="submit" form="item-form" className="btn btn-primary" disabled={save.isPending}>Save</button>
            {!item && (
              <button type="submit" form="item-form" name="add_another" value="1" className="btn" disabled={save.isPending}>
                Save and add another
              </button>
            )}
            <Link className="btn btn-ghost" to="/">Cancel</Link>
          </div>
          {item && (
            <form method="post" onSubmit={confirmRemove}>
              <button type="submit" className="btn btn-danger" disabled={remove.isPending}>Remove from collection</button>
            </form>
          )}
        </div>
      </div>
    </>
  );
}
