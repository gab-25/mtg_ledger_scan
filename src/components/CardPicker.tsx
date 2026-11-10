import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { RadioCard, RadioGroup } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { EYEBROW, HINT, SCAN_PANEL, SCAN_WARN, SUB, THUMB } from "@/lib/styles";
import { cn } from "@/lib/utils";
import Field, { ChoiceSelect } from "./Field";
import { useEffect, useState, type FormEvent } from "react";
import { addManual, confirmLine, search } from "../api/scan";
import type { Blueprint, Candidate, Line, LineResult, Setup } from "../api/types";

type Props = {
  sessionUuid: string;
  /** A line to confirm; null to add a card by hand. */
  line: Line | null;
  setup: Pick<Setup, "languages" | "conditions" | "expansions">;
  /** Expansion code to search in first (the session's), or undefined for all loaded expansions. */
  defaultSet?: string;
  onDone: (result: LineResult) => void;
  onClose: () => void;
};

const SEARCH_DELAY_MS = 250;

type OptionProps = { bp: Blueprint; otherCard: boolean };

function Option({ bp, otherCard }: OptionProps) {
  const details = [bp.version, bp.rarity].filter(Boolean).join(" · ");
  return (
    <RadioCard value={String(bp.id)}>
      {bp.image_url ? <img className={THUMB} src={bp.image_url} alt="" loading="lazy" /> : <span className={THUMB} aria-hidden="true" />}
      <span className="flex min-w-0 flex-1 flex-col gap-[3px]">
        <span className="text-[15px] font-semibold">{bp.name}</span>
        {otherCard && <Badge variant="pending" className="min-h-[22px] self-start">Different card · same number</Badge>}
        <span className={cn(SUB, "font-mono")}>
          {bp.expansion.code.toUpperCase()} {bp.collector_number}
          {details && ` · ${details}`}
        </span>
      </span>
    </RadioCard>
  );
}

/** Full-screen panel to confirm an uncertain card (candidates + search) or to add one by hand. */
export default function CardPicker({ sessionUuid, line, setup, defaultSet, onDone, onClose }: Props) {
  const confirming = line !== null;
  const candidates: Candidate[] = line?.candidates ?? [];
  const readName = line?.read_name?.trim() ?? "";
  // Only a candidate carrying the name read may be preselected: otherwise a quick confirm adds the wrong card.
  const noNameMatch = readName !== "" && !candidates.some((c) => c.matches_name);
  const [picked, setPicked] = useState<number | null>(candidates[0]?.matches_name ? candidates[0].id : null);
  // No candidate has the name read: the right printing may only be found by searching it.
  const [q, setQ] = useState(noNameMatch ? readName : "");
  const [set, setSet] = useState(defaultSet ?? "all");
  const [results, setResults] = useState<Blueprint[]>([]);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [language, setLanguage] = useState(line?.language || setup.languages[0]?.code || "");
  const [condition, setCondition] = useState(line?.condition ?? "");
  const [foil, setFoil] = useState(line?.foil ?? false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const query = q.trim();
    if (!query) {
      setResults([]);
      return;
    }
    let stale = false;
    const timer = setTimeout(() => {
      search(sessionUuid, query, set)
        .then((r) => {
          if (stale) return;
          setResults(r.results);
          setWarnings(r.warnings);
        })
        .catch((e: Error) => !stale && setError(e.message));
    }, SEARCH_DELAY_MS);
    return () => {
      stale = true;
      clearTimeout(timer);
    };
  }, [q, set, sessionUuid]);

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (picked === null || !language) {
      setError("Pick a card and its language.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      const result = confirming
        ? await confirmLine(line.uuid, { blueprintId: picked, language, condition: condition || undefined, foil })
        : await addManual(sessionUuid, picked, language, foil);
      onDone(result);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  const title = confirming ? "Which one is it?" : "Search a card";
  const shown = [...candidates, ...results.filter((r) => !candidates.some((c) => c.id === r.id))];

  return (
    <div className="fixed inset-0 z-20 overflow-y-auto overscroll-contain bg-background" role="dialog" aria-modal="true" aria-labelledby="picker-title">
      <div className="mx-auto flex max-w-[760px] flex-col gap-5 px-4 pt-6 pb-[max(24px,env(safe-area-inset-bottom))]">
        <header className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <div className={EYEBROW}>{confirming ? "Needs confirmation" : "Add by hand"}</div>
            <h1 id="picker-title" className="mt-1 mb-0 font-serif text-[32px] font-semibold">{title}</h1>
          </div>
          <Button type="button" variant="ghost" onClick={onClose}>
            {confirming ? "Decide later" : "Back to camera"}
          </Button>
        </header>

        {line?.frame_url && <img className="w-40 rounded-lg border-2 border-warn" src={line.frame_url} alt="Captured photo of the card" />}

        <div className="flex flex-wrap items-center gap-2" role="search">
          <label htmlFor="picker-q" className="sr-only">Search by name</label>
          <Input id="picker-q" className="min-w-[200px] flex-1" value={q} placeholder="Search by name…" onChange={(e) => setQ(e.target.value)} />
          <label htmlFor="picker-set" className="sr-only">Expansion</label>
          <Select value={set} onValueChange={setSet}>
            <SelectTrigger id="picker-set" className="w-auto"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All loaded expansions</SelectItem>
              {setup.expansions.map((x) => (
                <SelectItem key={x.id} value={x.code}>
                  {x.code.toUpperCase()} · {x.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        {warnings.map((w) => (
          <p className={SCAN_WARN} key={w}>{w}</p>
        ))}

        <form className={SCAN_PANEL} onSubmit={submit}>
          {noNameMatch && (
            <p className={SCAN_WARN} role="status">No candidate is named “{readName}” — pick one or search.</p>
          )}
          {error && (
            <ul className="m-0 list-none p-0 text-[13px] text-danger" role="alert">
              <li>{error}</li>
            </ul>
          )}
          <RadioGroup aria-label="Card" className="flex flex-col gap-2" value={picked === null ? "" : String(picked)}
            onValueChange={(v) => setPicked(Number(v))}>
            {shown.map((bp) => (
              <Option
                key={bp.id}
                bp={bp}
                otherCard={readName !== "" && "matches_name" in bp && !bp.matches_name}
              />
            ))}
            {shown.length === 0 && (
              <p className={cn(HINT, "m-0")}>{q.trim() ? `No cards match “${q.trim()}”.` : "Search the card by name."}</p>
            )}
          </RadioGroup>
          <div className="flex flex-wrap items-end gap-2.5">
            <Field label="Language" id="picker-language">
              <ChoiceSelect id="picker-language" className="w-auto" value={language} onChange={setLanguage}
                options={setup.languages.map((l) => [l.code, l.label])} />
            </Field>
            {confirming && (
              <Field label="Condition" id="picker-condition">
                <ChoiceSelect id="picker-condition" className="w-auto" value={condition} onChange={setCondition}
                  options={setup.conditions.map((c) => [c.code, c.label])} />
              </Field>
            )}
            <Field label="Foil" id="picker-foil" check>
              <Checkbox id="picker-foil" checked={foil} onCheckedChange={(c) => setFoil(c === true)} />
            </Field>
          </div>
          <Button type="submit" variant="primary" size="wide" disabled={busy}>
            {confirming ? "Confirm and continue" : "Add card"}
          </Button>
        </form>
      </div>
    </div>
  );
}
