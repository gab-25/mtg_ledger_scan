import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { ALL, Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";

/** The filter bar above a table: pills, selects and a "clear" link on one wrapping line. */
export function Filters({ children, onSubmit }: { children: ReactNode; onSubmit?: (e: React.FormEvent) => void }) {
  return (
    <form method="get" aria-label="Filters" className="m-0 flex flex-wrap items-center gap-2" onSubmit={onSubmit ?? ((e) => e.preventDefault())}>
      {children}
    </form>
  );
}

/** A small round colour swatch inside a pill or badge. */
export function PillDot({ color, className }: { color?: string; className?: string }) {
  return <span aria-hidden="true" className={cn("size-3 flex-none rounded-full", className)} style={color ? { background: color } : undefined} />;
}

/** The thin vertical line between groups of pills. */
export function FilterDivider() {
  return <span aria-hidden="true" className="mx-1 h-6 w-px bg-line-2" />;
}

/** "Clear filters" after the pills. */
export function ClearLink({ to, children }: { to: string; children: ReactNode }) {
  return (
    <Link className="text-[13px] text-muted-foreground hover:text-gold-hi" to={to}>
      {children}
    </Link>
  );
}

type FilterSelectProps = {
  id: string;
  label: string;
  /** What the pill shows with no filter, e.g. "Set". */
  placeholder: string;
  /** The item that clears the filter, e.g. "All sets". */
  allLabel: string;
  value: string;
  options: [value: string, label: string][];
  onChange: (value: string | null) => void;
};

/** A select shaped as a filter pill, gold when a value is set; its first item clears the filter. */
export function FilterSelect({ id, label, placeholder, allLabel, value, options, onChange }: FilterSelectProps) {
  return (
    <>
      <label htmlFor={id} className="sr-only">{label}</label>
      <Select value={value} onValueChange={(v) => onChange(v === ALL ? null : v)}>
        <SelectTrigger
          id={id}
          size="sm"
          className={cn(
            "w-fit gap-1.5 rounded-full bg-transparent px-3 text-[13px] text-text-2 data-[placeholder]:text-text-2 hover:border-line-hover hover:text-foreground",
            value && "border-primary bg-gold-bg text-foreground",
          )}
        >
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL}>{allLabel}</SelectItem>
          {options.map(([v, l]) => (
            <SelectItem key={v} value={v}>{l}</SelectItem>
          ))}
        </SelectContent>
      </Select>
    </>
  );
}
