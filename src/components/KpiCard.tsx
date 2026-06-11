import type { ReactNode } from "react";
import { ArrowDownRight, ArrowUpRight } from "lucide-react";

type Accent = "indigo" | "brand" | "sky" | "emerald" | "violet" | "amber" | "rose" | "slate";

interface KpiCardProps {
  label: string;
  value: string;
  helper?: string;
  /** Pre-formatted delta string, e.g. "31.6%" — sign is taken from `deltaDirection`. */
  delta?: string;
  deltaDirection?: "up" | "down" | "flat";
  /** Whether an "up" delta is good (default true). Set false for metrics like ACOS where lower is better. */
  upIsGood?: boolean;
  /** Color of the top accent stripe and value emphasis. */
  accent?: Accent;
  tone?: "neutral" | "good" | "warn" | "bad";
  icon?: ReactNode;
  /** When true, the value is rendered in the accent color to match the screenshot's blue numbers. */
  emphasizeValue?: boolean;
}

const accentValueColor: Record<Accent, string> = {
  indigo: "text-[#4F46E5]",
  brand: "text-[#F47322]",
  sky: "text-[#0EA5E9]",
  emerald: "text-[#10B981]",
  violet: "text-[#8B5CF6]",
  amber: "text-[#F59E0B]",
  rose: "text-[#F43F5E]",
  slate: "text-ink",
};

export function KpiCard({
  label,
  value,
  helper,
  delta,
  deltaDirection = "flat",
  upIsGood = true,
  accent = "indigo",
  icon,
  emphasizeValue = false,
}: KpiCardProps) {
  let chipTone: "good" | "bad" | "neutral" = "neutral";
  if (deltaDirection === "up") chipTone = upIsGood ? "good" : "bad";
  if (deltaDirection === "down") chipTone = upIsGood ? "bad" : "good";

  return (
    <div className="kpi-card min-h-[124px]" data-accent={accent}>
      <div className="flex items-start justify-between gap-3">
        <p className="text-[10.5px] font-extrabold uppercase tracking-[0.15em] text-slate">{label}</p>
        {icon ? <div className="icon-tile">{icon}</div> : null}
      </div>
      <div
        className={`mt-3 text-[26px] leading-none font-extrabold tracking-tight ${
          emphasizeValue ? accentValueColor[accent] : "text-ink"
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
        {helper ? <span className="text-xs font-medium text-steel">{helper}</span> : null}
      </div>
    </div>
  );
}
