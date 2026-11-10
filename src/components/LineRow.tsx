import { Badge } from "@/components/ui/badge";
import { useState, type FormEvent } from "react";
import type { Choice, Line, LineChanges } from "../api/types";
import { lineMeta } from "./LastCardToast";

type Props = {
  line: Line;
  conditions: Choice[];
  languages: Choice[];
  onChange: (changes: LineChanges) => void;
  onUndo: () => void;
};

/** One confirmed card of the review: price, sale toggle, edit and quantity stepper. */
export default function LineRow({ line, conditions, languages, onChange, onUndo }: Props) {
  const name = line.blueprint?.name ?? "";
  const [condition, setCondition] = useState(line.condition);
  const [language, setLanguage] = useState(line.language);
  const [foil, setFoil] = useState(line.foil ? "1" : "0");

  function submit(e: FormEvent) {
    e.preventDefault();
    onChange({ condition, language, foil: foil === "1" });
  }

  return (
    <div className="scan-line">
      {line.blueprint?.image_url ? (
        <img src={line.blueprint.image_url} alt="" loading="lazy" />
      ) : (
        <span className="scan-thumb" aria-hidden="true" />
      )}
      <div className="scan-line-text">
        <span className="scan-option-name">{name}</span>
        <span className="mono sub">{lineMeta(line)}</span>
        <span className="scan-line-meta">
          <span className="mono">{line.price !== null ? `€ ${line.price}` : "no price"}</span>
          <Badge asChild variant={line.listed ? "gold" : "neutral"}>
          <button
            type="button"
            className="cursor-pointer border-0 disabled:cursor-not-allowed disabled:opacity-60"
            aria-pressed={line.listed}
            disabled={line.price === null}
            title={line.price === null ? "No market price: cannot be listed" : undefined}
            onClick={() => onChange({ for_sale: !line.listed })}
          >
            {line.listed ? "For sale" : "Collection only"}
          </button>
          </Badge>
        </span>
        <details className="scan-edit">
          <summary>Edit</summary>
          <form onSubmit={submit}>
            <fieldset className="scan-row scan-edit-fields" aria-label={`Edit ${name}`}>
              <select className="input" aria-label="Condition" value={condition} onChange={(e) => setCondition(e.target.value)}>
                {conditions.map((c) => <option key={c.code} value={c.code}>{c.code}</option>)}
              </select>
              <select className="input" aria-label="Language" value={language} onChange={(e) => setLanguage(e.target.value)}>
                {languages.map((l) => <option key={l.code} value={l.code}>{l.code}</option>)}
              </select>
              <select className="input" aria-label="Foil" value={foil} onChange={(e) => setFoil(e.target.value)}>
                <option value="0">Non-foil</option>
                <option value="1">Foil</option>
              </select>
              <button type="submit" className="btn btn-sm">Update</button>
            </fieldset>
          </form>
        </details>
      </div>
      <div className="stepper">
        <button type="button" className="btn btn-sm" aria-label={`Remove one copy of ${name}`} onClick={onUndo}>−</button>
        <span className="mono">{line.quantity}</span>
        <button type="button" className="btn btn-sm" aria-label={`Add one copy of ${name}`} onClick={() => onChange({ quantity: line.quantity + 1 })}>
          +
        </button>
      </div>
    </div>
  );
}
