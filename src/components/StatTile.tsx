import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export default function StatTile({ label, value, tone }: { label: string; value: ReactNode; tone?: "accent" | "warn" | "" }) {
  return (
    <div className="rounded-[12px] border border-line bg-card p-5">
      <div className="text-[13px] text-muted-foreground">{label}</div>
      <div data-tone={tone || undefined} className={cn("mt-2 font-mono text-[28px]", tone === "accent" && "text-gold", tone === "warn" && "text-warn")}>
        {value}
      </div>
    </div>
  );
}

/** The row of stat tiles at the top of a page. */
export function StatTiles({ label, children }: { label: string; children: ReactNode }) {
  return <section aria-label={label} className="grid grid-cols-[repeat(auto-fit,minmax(190px,1fr))] gap-4">{children}</section>;
}
