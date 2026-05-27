import { AlertTriangle, CheckCircle2, ChevronDown, ChevronUp } from "lucide-react";
import { useState } from "react";
import type { DataQualityIssue } from "../types/models";

export function DataQualityPanel({ issues, warnings }: { issues: DataQualityIssue[]; warnings: string[] }) {
  const [expanded, setExpanded] = useState(false);
  const allClear = !issues.length && !warnings.length;
  const highCount = issues.filter((issue) => issue.severity === "high").length;
  const mediumCount = issues.filter((issue) => issue.severity === "medium").length + warnings.length;
  const lowCount = issues.filter((issue) => issue.severity === "low").length;
  const visibleIssues = expanded ? issues : issues.slice(0, 2);
  const visibleWarnings = expanded ? warnings : warnings.slice(0, Math.max(0, 2 - visibleIssues.length));

  return (
    <section className={`self-start rounded-lg border border-line bg-white shadow-card ${expanded ? "p-4" : "p-3"}`}>
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          {allClear ? <CheckCircle2 className="h-5 w-5 text-emerald-600" /> : <AlertTriangle className="h-5 w-5 text-amber-600" />}
          <div>
            <h2 className={`${expanded ? "text-base" : "text-sm"} font-extrabold text-ink`}>Data Quality Checks</h2>
            {!allClear ? (
              <div className="mt-1 flex flex-wrap gap-2 text-xs font-bold text-steel">
                <span>{highCount} high</span>
                <span>{mediumCount} medium</span>
                <span>{lowCount} low</span>
              </div>
            ) : null}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className={`rounded-full px-3 py-1 text-xs font-semibold ${allClear ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-800"}`}>
            {allClear ? "No issues found" : `${issues.length + warnings.length} items`}
          </span>
          {!allClear ? (
            <button
              type="button"
              onClick={() => setExpanded((value) => !value)}
              className="inline-flex items-center gap-1 rounded-full border border-slate/30 bg-white px-3 py-1.5 text-xs font-extrabold uppercase tracking-wide text-ink shadow-sm hover:border-brand hover:bg-warm"
            >
              {expanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
              {expanded ? "Collapse" : "Review"}
            </button>
          ) : null}
        </div>
      </div>

      {!expanded && !allClear ? (
        <p className="mt-1 text-xs font-medium leading-5 text-steel">
          Showing {visibleIssues.length + visibleWarnings.length} of {issues.length + warnings.length}. Open Review to see every affected SKU/ASIN.
        </p>
      ) : null}

      <div className={`${expanded ? "mt-4 grid gap-3 md:grid-cols-2 max-h-[560px] overflow-auto pr-1" : "mt-2 grid gap-2 lg:grid-cols-2"}`}>
        {visibleWarnings.map((warning) => (
          <Issue key={warning} severity="medium" title="Workbook import warning" detail={warning} expanded={expanded} />
        ))}
        {visibleIssues.map((issue, index) => (
          <Issue key={`${issue.asin}-${issue.title}-${index}`} severity={issue.severity} title={issue.title} detail={`${issue.sku || issue.asin || ""} ${issue.detail}`} items={issue.items} expanded={expanded} />
        ))}
        {!allClear ? null : (
          <p className="text-sm leading-6 text-steel">No missing COGS, missing FBA fee, missing sales, impossible value, or negative break-even issue was detected in the active model.</p>
        )}
      </div>
    </section>
  );
}

function Issue({ severity, title, detail, items, expanded }: { severity: DataQualityIssue["severity"]; title: string; detail: string; items?: string[]; expanded: boolean }) {
  const color = severity === "high" ? "border-red-200 bg-red-50" : severity === "medium" ? "border-accent/50 bg-[#FFF7E5]" : "border-line bg-warm";
  return (
    <div className={`rounded-md border ${expanded ? "p-3" : "px-3 py-2"} ${color}`}>
      <div className={`${expanded ? "text-sm" : "text-xs"} font-bold text-ink`}>{title}</div>
      <div className={`${expanded ? "mt-1 leading-5" : "mt-0.5 truncate"} text-xs text-steel`}>{detail}</div>
      {expanded && items?.length ? (
        <div className="mt-3 grid max-h-44 gap-1 overflow-auto rounded-md border border-white/70 bg-white/70 p-2">
          {items.map((item) => (
            <div key={item} className="text-[11px] font-semibold leading-4 text-ink">
              {item}
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}
