import { Button } from "@/components/ui/button";
import { SCAN_LINE, SCAN_LINE_TEXT, SUB, THUMB } from "@/lib/styles";
import { cn } from "@/lib/utils";
import { ChoiceSelect } from "./Field";
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

/** One confirmed card of the review: edit and quantity stepper. */
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
    <div className={SCAN_LINE}>
      {line.blueprint?.image_url ? (
        <img className={THUMB} src={line.blueprint.image_url} alt="" loading="lazy" />
      ) : (
        <span className={THUMB} aria-hidden="true" />
      )}
      <div className={SCAN_LINE_TEXT}>
        <span className="text-[15px] font-semibold">{name}</span>
        <span className={cn(SUB, "font-mono")}>{lineMeta(line)}</span>
        <details>
          <summary className="flex min-h-7 cursor-pointer items-center text-xs text-muted-foreground">Edit</summary>
          <form className="m-0" onSubmit={submit}>
            <fieldset className="m-0 flex flex-wrap items-end gap-2.5 border-0 p-0" aria-label={`Edit ${name}`}>
              <ChoiceSelect aria-label="Condition" className="min-h-9 w-auto" value={condition} onChange={setCondition}
                options={conditions.map((c) => [c.code, c.code])} />
              <ChoiceSelect aria-label="Language" className="min-h-9 w-auto" value={language} onChange={setLanguage}
                options={languages.map((l) => [l.code, l.code])} />
              <ChoiceSelect aria-label="Foil" className="min-h-9 w-auto" value={foil} onChange={setFoil}
                options={[["0", "Non-foil"], ["1", "Foil"]]} />
              <Button type="submit" size="sm">Update</Button>
            </fieldset>
          </form>
        </details>
      </div>
      <div className="flex items-center gap-1">
        <Button type="button" size="sm" className="w-10 px-0" aria-label={`Remove one copy of ${name}`} onClick={onUndo}>−</Button>
        <span className="min-w-6 text-center font-mono">{line.quantity}</span>
        <Button type="button" size="sm" className="w-10 px-0" aria-label={`Add one copy of ${name}`} onClick={() => onChange({ quantity: line.quantity + 1 })}>
          +
        </Button>
      </div>
    </div>
  );
}
