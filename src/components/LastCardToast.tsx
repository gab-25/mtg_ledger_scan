import { Button } from "@/components/ui/button";
import { SUB } from "@/lib/styles";
import { cn } from "@/lib/utils";
import type { Line } from "../api/types";

export type Toast = { state: string; line: Line | null; error?: boolean; helpUrl?: string; retry?: boolean };

const BOX = "mx-3 mb-3 flex items-center gap-3 rounded-xl border border-[#2F4A3A] bg-ok-bg p-3";

export function lineMeta(line: Line) {
  const bp = line.blueprint;
  const where = bp ? `${bp.expansion.code.toUpperCase()} ${bp.collector_number}` : "";
  return [where, line.condition, line.language, line.foil ? "Foil" : ""].filter(Boolean).join(" · ");
}

/** The camera's "last card" box: what happened to the last photo, with Foil and Undo for the card. */
type Props = { toast: Toast | null; onFoil: () => void; onUndo: () => void; onRetry: () => void };

export default function LastCardToast({ toast, onFoil, onUndo, onRetry }: Props) {
  if (!toast) return <div className={BOX} role="status" aria-live="polite" hidden />;
  const { state, line, error, helpUrl, retry } = toast;
  return (
    <div data-tone={error ? "error" : "ok"} className={cn(BOX, error && "border-[#4A3A24] bg-warn-bg")} role="status" aria-live="polite">
      <div className="flex min-w-0 flex-1 flex-col gap-[3px]">
        <span className={cn("text-xs font-semibold", error ? "text-warn" : "text-ok")}>{state}</span>
        {helpUrl && <a className="text-[13px] text-gold-hi" href={helpUrl}>Open Profile and settings</a>}
        {line?.blueprint && (
          <>
            <span className="truncate text-[15px] font-semibold">{line.blueprint.name}</span>
            <span className={cn(SUB, "font-mono")}>{lineMeta(line)}</span>
          </>
        )}
      </div>
      {retry && (
        <div className="flex flex-col gap-1.5">
          <Button type="button" size="sm" onClick={onRetry}>Retry</Button>
        </div>
      )}
      {line?.blueprint && (
        <div className="flex flex-col gap-1.5">
          <Button type="button" size="sm" className="aria-pressed:border-primary aria-pressed:text-gold-hi" aria-pressed={line.foil} onClick={onFoil}>
            Foil
          </Button>
          <Button type="button" size="sm" variant="ghost" onClick={onUndo}>Undo</Button>
        </div>
      )}
    </div>
  );
}
