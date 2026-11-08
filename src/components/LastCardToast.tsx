import type { Line } from "../api/types";

export type Toast = { state: string; line: Line | null; error?: boolean; helpUrl?: string };

export function lineMeta(line: Line) {
  const bp = line.blueprint;
  const where = bp ? `${bp.expansion.code.toUpperCase()} ${bp.collector_number}` : "";
  return [where, line.condition, line.language, line.foil ? "Foil" : ""].filter(Boolean).join(" · ");
}

/** The camera's "last card" box: what happened to the last photo, with Foil and Undo for the card. */
export default function LastCardToast({ toast, onFoil, onUndo }: { toast: Toast | null; onFoil: () => void; onUndo: () => void }) {
  if (!toast) return <div className="scan-toast" role="status" aria-live="polite" hidden />;
  const { state, line, error, helpUrl } = toast;
  return (
    <div className={`scan-toast${error ? " is-error" : ""}`} role="status" aria-live="polite">
      <div className="scan-toast-text">
        <span className="scan-toast-state">{state}</span>
        {helpUrl && <a className="scan-toast-link" href={helpUrl}>Open Profile and settings</a>}
        {line?.blueprint && (
          <>
            <span className="scan-toast-name">{line.blueprint.name}</span>
            <span className="mono sub">{lineMeta(line)}</span>
          </>
        )}
      </div>
      {line?.blueprint && (
        <div className="scan-toast-actions">
          <button type="button" className="btn btn-sm" aria-pressed={line.foil} onClick={onFoil}>Foil</button>
          <button type="button" className="btn btn-sm btn-ghost" onClick={onUndo}>Undo</button>
        </div>
      )}
    </div>
  );
}
