import { currency, percent } from "../lib/format";
import type { ParentAsinPnl } from "../types/models";

export function TacosSnapshot({
  accountCurrentTacos,
  accountScenarioTacos,
  currentAdSpend,
  scenarioAdSpend,
  rows,
}: {
  accountCurrentTacos: number;
  accountScenarioTacos: number;
  currentAdSpend: number;
  scenarioAdSpend: number;
  rows: ParentAsinPnl[];
}) {
  const ranked = [...rows]
    .filter((row) => row.currentSales > 0 || row.totalSales > 0)
    .sort((a, b) => b.currentAdSpend - a.currentAdSpend)
    .slice(0, 5);

  return (
    <section className="overflow-hidden rounded-lg border border-line bg-white shadow-card">
      <div className="flex flex-col gap-2 border-b border-line p-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h2 className="text-base font-extrabold text-ink">TACOS Snapshot</h2>
          <p className="mt-1 text-xs font-medium text-steel">Account and parent-level TACOS before you drill into child SKUs.</p>
        </div>
        <div className="grid grid-cols-2 gap-2 sm:min-w-[360px]">
          <Mini label="Account Current" value={percent(accountCurrentTacos)} helper={currency(currentAdSpend)} />
          <Mini label="Account Scenario" value={percent(accountScenarioTacos)} helper={currency(scenarioAdSpend)} />
        </div>
      </div>
      <div className="overflow-auto">
        <table className="w-full min-w-[980px] text-sm">
          <thead className="bg-warm/60 text-[10px] uppercase tracking-wide text-steel">
            <tr>
              {["Parent ASIN", "Product Title", "Current Spend", "Current TACOS", "Scenario Spend", "Scenario TACOS", "Signal"].map((head) => (
                <th key={head} className="border-b border-line px-3 py-2 text-left font-extrabold">{head}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {ranked.map((row) => {
              const overBreakeven = row.currentTacos > row.breakEvenTacos && row.currentAdSpend > 0;
              return (
                <tr key={row.parentAsin} className="hover:bg-warm/40">
                  <td className="whitespace-nowrap border-b border-line px-3 py-2 font-extrabold text-ink">{row.parentAsin}</td>
                  <td className="w-[340px] max-w-[340px] border-b border-line px-3 py-2 text-sm font-semibold text-ink">
                    <div className="title-clamp" title={row.topChildTitle}>{row.topChildTitle || "—"}</div>
                  </td>
                  <td className="border-b border-line px-3 py-2 text-right">{currency(row.currentAdSpend)}</td>
                  <td className={`border-b border-line px-3 py-2 text-right font-extrabold ${overBreakeven ? "text-red-700" : "text-ink"}`}>{percent(row.currentTacos)}</td>
                  <td className="border-b border-line px-3 py-2 text-right">{currency(row.adSpend)}</td>
                  <td className="border-b border-line px-3 py-2 text-right">{percent(row.tacos)}</td>
                  <td className="border-b border-line px-3 py-2">
                    <span className={`rounded-full px-2 py-1 text-xs font-extrabold ${overBreakeven ? "bg-red-100 text-red-800" : "bg-emerald-100 text-emerald-800"}`}>
                      {overBreakeven ? "Above break-even" : "Room to spend"}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function Mini({ label, value, helper }: { label: string; value: string; helper: string }) {
  return (
    <div className="rounded-md border border-line bg-warm/50 px-3 py-2">
      <div className="text-[10px] font-extrabold uppercase tracking-wide text-steel">{label}</div>
      <div className="mt-1 text-lg font-extrabold text-ink">{value}</div>
      <div className="text-[11px] font-semibold text-steel">{helper}</div>
    </div>
  );
}
