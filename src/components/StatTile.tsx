import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export default function StatTile({ label, value, tone }: { label: string; value: ReactNode; tone?: "accent" | "warn" | "" }) {
  return (
    <div className="bg-card px-4 py-3.5 min-[840px]:px-5 min-[840px]:py-[18px]">
      <div className="text-xs text-muted-foreground min-[840px]:text-[13px]">{label}</div>
      <div
        data-tone={tone || undefined}
        className={cn("mt-1 font-mono text-[22px] min-[840px]:mt-1.5 min-[840px]:text-[28px]", tone === "accent" && "text-gold", tone === "warn" && "text-warn")}
      >
        {value}
      </div>
    </div>
  );
}

/** The strip of stat tiles at the top of a page: one bordered box split in cells, two per row on a phone. */
export function StatTiles({ label, children }: { label: string; children: ReactNode }) {
  return (
    <section
      aria-label={label}
      className="grid grid-cols-2 gap-px overflow-hidden rounded-xl border border-line bg-line min-[1000px]:grid-cols-[repeat(auto-fit,minmax(190px,1fr))] max-[999px]:[&>:last-child:nth-child(odd)]:col-span-2"
    >
      {children}
    </section>
  );
}
