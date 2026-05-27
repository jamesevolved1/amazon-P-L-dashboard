import { Trash2 } from "lucide-react";
import { currency, percent } from "../lib/format";
import type { PortfolioSummary, ScenarioAssumptions } from "../types/models";

interface ScenarioComparisonTableProps {
  scenarios: Array<{ scenario: ScenarioAssumptions; summary: PortfolioSummary }>;
  onLoad: (scenario: ScenarioAssumptions) => void;
  onDelete: (name: string) => void;
}

export function ScenarioComparisonTable({ scenarios, onLoad, onDelete }: ScenarioComparisonTableProps) {
  return (
    <section className="overflow-hidden rounded-lg border border-line bg-white shadow-card">
      <div className="border-b border-line p-5">
        <h2 className="text-lg font-extrabold text-ink">Scenario Comparison</h2>
        <p className="mt-1 text-sm leading-5 text-steel">Save scenarios like Push Spend, Conservative TACOS, 10% Coupon, or Prime Day Push.</p>
      </div>
      <div className="no-scrollbar overflow-x-auto">
        <table className="w-full min-w-[900px] text-sm">
          <thead className="bg-warm text-[11px] uppercase tracking-wide text-steel">
            <tr>
              {["Scenario", "Sales", "Ad Spend", "TACOS", "Coupon Cost", "Profit", "Margin", "Unprofitable", "Scale Candidates", ""].map((head) => (
                <th key={head} className="px-4 py-3 text-left font-extrabold">{head}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {scenarios.map(({ scenario, summary }) => (
              <tr key={scenario.name} className="border-t border-line hover:bg-warm/60">
                <td className="px-4 py-3">
                  <button className="font-bold text-brand hover:underline" onClick={() => onLoad(scenario)}>
                    {scenario.name}
                  </button>
                </td>
                <td className="px-4 py-3 text-right">{currency(summary.totalSales)}</td>
                <td className="px-4 py-3 text-right">{currency(summary.totalAdSpend)}</td>
                <td className="px-4 py-3 text-right">{percent(summary.blendedTacos)}</td>
                <td className="px-4 py-3 text-right">{currency(summary.totalCouponCost)}</td>
                <td className={`px-4 py-3 text-right font-semibold ${summary.estimatedProfit < 0 ? "text-red-700" : "text-emerald-700"}`}>{currency(summary.estimatedProfit)}</td>
                <td className="px-4 py-3 text-right">{percent(summary.blendedProfitMargin)}</td>
                <td className="px-4 py-3 text-right">{summary.unprofitableSkus}</td>
                <td className="px-4 py-3 text-right">{summary.scaleCandidates}</td>
                <td className="px-4 py-3 text-right">
                  <button className="rounded p-1.5 text-slate-500 hover:bg-red-50 hover:text-red-700" onClick={() => onDelete(scenario.name)}>
                    <Trash2 className="h-4 w-4" />
                  </button>
                </td>
              </tr>
            ))}
            {!scenarios.length ? (
              <tr>
                <td colSpan={10} className="px-4 py-8 text-center text-slate-500">No saved scenarios yet.</td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </section>
  );
}
