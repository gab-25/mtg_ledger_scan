import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { ALL, Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";

/** The filter bar above a table: pills, selects and a "clear" link on one wrapping line. */
/** `scroll`: on a phone the line does not wrap but scrolls sideways (inside a TablePanel's toolbar). */
export function Filters({ children, onSubmit, scroll }: { children: ReactNode; onSubmit?: (e: React.FormEvent) => void; scroll?: boolean }) {
  return (
    <form
      method="get"
      aria-label="Filters"
      className={cn(
        "m-0 flex flex-wrap items-center gap-2",
        scroll && "max-[839px]:-mx-[clamp(16px,3vw,48px)] max-[839px]:flex-nowrap max-[839px]:overflow-x-auto max-[839px]:px-[clamp(16px,3vw,48px)] max-[839px]:[scrollbar-width:none] max-[839px]:[&>*]:flex-none",
      )}
      onSubmit={onSubmit ?? ((e) => e.preventDefault())}
    >
      {children}
    </form>
  );
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
