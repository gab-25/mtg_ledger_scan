import type { ReactNode } from "react";

export default function StatTile({ label, value, tone }: { label: string; value: ReactNode; tone?: "accent" | "warn" | "" }) {
  return (
    <div className="stat">
      <div className="stat-label">{label}</div>
      <div className={tone ? `stat-value ${tone}` : "stat-value"}>{value}</div>
    </div>
  );
}
