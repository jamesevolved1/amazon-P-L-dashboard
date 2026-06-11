import type { ReactNode } from "react";
import { ArrowDownRight, ArrowUpRight } from "lucide-react";

type Accent =
  | "indigo"
  | "lavender"
  | "royal"
  | "brand"
  | "sky"
  | "emerald"
  | "violet"
  | "amber"
  | "rose"
  | "slate";

interface KpiCardProps {
  label: string;
  value: string;
  helper?: string;
  /** Pre-formatted delta string, e.g. "31.6%" — sign is taken from `deltaDirection`. */
  delta?: string;
  deltaDirection?: "up" | "down" | "flat";
  /** Whether an "up" delta is good (default true). Set false for metrics like ACOS where lower is better. */
  upIsGood?: boolean;
  /** Color of the top accent stripe and icon tile tint. */
  accent?: Accent;
  tone?: "neutral" | "good" | "warn" | "bad";
  icon?: ReactNode;
  /** When true, the value is rendered in a deep royal blue — matches the screenshot's ACOS / ROAS numbers. */
  emphasizeValue?: boolean;
}

export function KpiCard({
  label,
  value,
  helper,
  delta,
  deltaDirection = "flat",
  upIsGood = true,
  accent = "lavender",
  icon,
  emphasizeValue = false,
}: KpiCardProps) {
  let chipTone: "good" | "bad" | "neutral" = "neutral";
  if (deltaDirection === "up") chipTone = upIsGood ? "good" : "bad";
  if (deltaDirection === "down") chipTone = upIsGood ? "bad" : "good";

  return (
    <div className="kpi-card min-h-[128px]" data-accent={accent}>
      <div className="flex items-start justify-between gap-3">
        <p className="text-[10.5px] font-extrabold uppercase tracking-[0.16em] text-slate">{label}</p>
        {icon ? <div className="icon-tile">{icon}</div> : null}
      </div>
      <div
        className={`mt-3 text-[30px] leading-none font-bold tracking-tight ${
          emphasizeValue ? "text-[#1F4FE0]" : "text-ink"
        }`}
      >
        {value}
      </div>
      <div className="mt-3 flex items-center gap-2">
        {delta ? (
          <span className="delta-chip" data-tone={chipTone}>
            {deltaDirection === "up" ? (
              <ArrowUpRight className="h-3 w-3" strokeWidth={3} />
            ) : deltaDirection === "down" ? (
              <ArrowDownRight className="h-3 w-3" strokeWidth={3} />
            ) : null}
            {delta}
          </span>
        ) : null}
        {helper ? <span className="text-xs font-semibold text-slate">{helper}</span> : null}
      </div>
    </div>
  );
}
