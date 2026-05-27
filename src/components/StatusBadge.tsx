import type { PnlStatus } from "../types/models";

const classes: Record<PnlStatus, string> = {
  "Scale Candidate": "bg-emerald-100 text-emerald-800 border-emerald-200",
  "Watch Margin": "bg-[#FFF2D0] text-[#865200] border-accent/50",
  Unprofitable: "bg-red-100 text-red-800 border-red-200",
  "Needs Price / Cost Fix": "bg-orange-100 text-orange-800 border-brand/30",
  "Data Missing": "bg-slate-100 text-slate-700 border-slate-200",
};

export function StatusBadge({ status }: { status: PnlStatus }) {
  return (
    <span className={`inline-flex rounded-full border px-2.5 py-1 text-[11px] font-bold leading-tight ${classes[status]}`}>
      {status}
    </span>
  );
}
