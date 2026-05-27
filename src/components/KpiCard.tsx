import type { ReactNode } from "react";

interface KpiCardProps {
  label: string;
  value: string;
  helper?: string;
  tone?: "neutral" | "good" | "warn" | "bad";
  icon?: ReactNode;
}

const tones = {
  neutral: "border-line bg-white text-ink",
  good: "border-emerald-200 bg-emerald-50 text-emerald-900",
  warn: "border-accent/60 bg-[#FFF7E5] text-[#8A4A00]",
  bad: "border-red-200 bg-red-50 text-red-900",
};

export function KpiCard({ label, value, helper, tone = "neutral", icon }: KpiCardProps) {
  return (
    <div className={`min-h-[112px] rounded-lg border p-4 shadow-card ${tones[tone]}`}>
      <div className="flex items-center justify-between gap-3">
        <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-steel">{label}</p>
        {icon ? <div className="text-navy">{icon}</div> : null}
      </div>
      <div className="mt-3 text-2xl font-extrabold tracking-tight">{value}</div>
      {helper ? <div className="mt-1 text-xs font-medium text-steel">{helper}</div> : null}
    </div>
  );
}
