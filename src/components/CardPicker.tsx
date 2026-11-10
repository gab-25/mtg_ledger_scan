import { Badge } from "@/components/ui/badge";
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

type OptionProps = { bp: Blueprint; checked: boolean; onPick: () => void; otherCard: boolean };

function Option({ bp, checked, onPick, otherCard }: OptionProps) {
  const details = [bp.version, bp.rarity].filter(Boolean).join(" · ");
  return (
    <label className="scan-option">
      <input type="radio" name="blueprint" value={bp.id} checked={checked} onChange={onPick} />
      {bp.image_url ? <img src={bp.image_url} alt="" loading="lazy" /> : <span className="scan-thumb" aria-hidden="true" />}
      <span className="scan-option-text">
        <span className="scan-option-name">{bp.name}</span>
        {otherCard && <Badge variant="pending" className="min-h-[22px] self-start">Different card · same number</Badge>}
        <span className="mono sub">
          {bp.expansion.code.toUpperCase()} {bp.collector_number}
          {details && ` · ${details}`}
        </span>
      </span>
    </label>
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
    <div className="picker" role="dialog" aria-modal="true" aria-labelledby="picker-title">
      <div className="picker-inner">
        <header className="page-head">
          <div>
            <div className="eyebrow">{confirming ? "Needs confirmation" : "Add by hand"}</div>
            <h1 id="picker-title">{title}</h1>
          </div>
          <div className="actions">
            <button type="button" className="btn btn-ghost" onClick={onClose}>
              {confirming ? "Decide later" : "Back to camera"}
            </button>
          </div>
        </header>

        {line?.frame_url && <img className="scan-frame" src={line.frame_url} alt="Captured photo of the card" />}

        <div className="search" role="search">
          <label htmlFor="picker-q" className="sr-only">Search by name</label>
          <input id="picker-q" value={q} placeholder="Search by name…" onChange={(e) => setQ(e.target.value)} />
          <label htmlFor="picker-set" className="sr-only">Expansion</label>
          <select id="picker-set" className="input" value={set} onChange={(e) => setSet(e.target.value)}>
            <option value="all">All loaded expansions</option>
            {setup.expansions.map((x) => (
              <option key={x.id} value={x.code}>
                {x.code.toUpperCase()} · {x.name}
              </option>
            ))}
          </select>
        </div>
        {warnings.map((w) => (
          <p className="scan-warn" key={w}>{w}</p>
        ))}

        <form className="scan-panel" onSubmit={submit}>
          {noNameMatch && (
            <p className="scan-warn" role="status">No candidate is named “{readName}” — pick one or search.</p>
          )}
          {error && (
            <ul className="errors" role="alert">
              <li>{error}</li>
            </ul>
          )}
          <div className="scan-options">
            {shown.map((bp) => (
              <Option
                key={bp.id}
                bp={bp}
                checked={picked === bp.id}
                onPick={() => setPicked(bp.id)}
                otherCard={readName !== "" && "matches_name" in bp && !bp.matches_name}
              />
            ))}
            {shown.length === 0 && (
              <p className="hint">{q.trim() ? `No cards match “${q.trim()}”.` : "Search the card by name."}</p>
            )}
          </div>
          <div className="scan-row">
            <label className="field">
              Language
              <select className="input" value={language} onChange={(e) => setLanguage(e.target.value)}>
                {setup.languages.map((l) => (
                  <option key={l.code} value={l.code}>{l.label}</option>
                ))}
              </select>
            </label>
            {confirming && (
              <label className="field">
                Condition
                <select className="input" value={condition} onChange={(e) => setCondition(e.target.value)}>
                  {setup.conditions.map((c) => (
                    <option key={c.code} value={c.code}>{c.label}</option>
                  ))}
                </select>
              </label>
            )}
            <label className="scan-check">
              <input type="checkbox" checked={foil} onChange={(e) => setFoil(e.target.checked)} /> Foil
            </label>
          </div>
          <button type="submit" className="btn btn-primary btn-wide" disabled={busy}>
            {confirming ? "Confirm and continue" : "Add card"}
          </button>
        </form>
      </div>
    </div>
  );
}
