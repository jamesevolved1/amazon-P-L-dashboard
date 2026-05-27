import { ChevronDown, ChevronRight, Search } from "lucide-react";
import { Fragment, useMemo, useState } from "react";
import { currency, number, percent } from "../lib/format";
import type { CalculatedSkuPnl, ParentAsinPnl, ParentAsinTarget, ScenarioAssumptions } from "../types/models";
import { StatusBadge } from "./StatusBadge";

type SortKey = "estimatedProfit" | "currentProfit" | "profitMargin" | "currentTacos" | "tacos" | "adSpend" | "currentAdSpend" | "totalSales" | "unitsSold" | "childCount";

export function ParentAsinProfitTable({
  rows,
  childRows,
  scenario,
  onScenarioChange,
}: {
  rows: ParentAsinPnl[];
  childRows: CalculatedSkuPnl[];
  scenario: ScenarioAssumptions;
  onScenarioChange: (scenario: ScenarioAssumptions) => void;
}) {
  const [search, setSearch] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("estimatedProfit");
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  const childrenByParent = useMemo(() => {
    return childRows.reduce<Record<string, CalculatedSkuPnl[]>>((acc, row) => {
      const parent = row.parentAsin || row.asin || "Unmapped Parent";
      acc[parent] = [...(acc[parent] ?? []), row];
      return acc;
    }, {});
  }, [childRows]);

  const filtered = useMemo(() => {
    const term = search.toLowerCase();
    return rows
      .filter((row) => [row.parentAsin, row.topChildTitle, row.childAsins.join(" ")].join(" ").toLowerCase().includes(term))
      .sort((a, b) => Number(b[sortKey]) - Number(a[sortKey]));
  }, [rows, search, sortKey]);

  const updateParentTarget = (parentAsin: string, patch: Partial<ParentAsinTarget>) => {
    onScenarioChange({
      ...scenario,
      parentTargets: {
        ...(scenario.parentTargets ?? {}),
        [parentAsin]: {
          ...(scenario.parentTargets?.[parentAsin] ?? { tacosGoal: null, marginGoal: null }),
          ...patch,
        },
      },
    });
  };

  return (
    <section className="min-w-0 overflow-hidden rounded-lg border border-line bg-white shadow-card">
      <div className="flex flex-col gap-4 border-b border-line p-5 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h2 className="text-lg font-extrabold text-ink">Parent ASIN P&L</h2>
          <p className="mt-1 text-sm leading-5 text-steel">Rolls child ASINs and SKUs into parent-level economics for portfolio decisions.</p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row">
          <label className="relative">
            <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-steel" />
            <input
              className="w-full rounded-md border border-line py-2 pl-9 pr-3 text-sm font-medium outline-none focus:border-brand sm:w-72"
              placeholder="Search parent, child ASIN, product"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </label>
          <select className="rounded-md border border-line px-3 py-2 text-sm font-medium outline-none focus:border-brand" value={sortKey} onChange={(event) => setSortKey(event.target.value as SortKey)}>
            <option value="estimatedProfit">Sort by profit</option>
            <option value="currentProfit">Sort by current profit</option>
            <option value="profitMargin">Sort by margin</option>
            <option value="currentTacos">Sort by current TACOS</option>
            <option value="tacos">Sort by scenario TACOS</option>
            <option value="currentAdSpend">Sort by current ad spend</option>
            <option value="adSpend">Sort by scenario ad spend</option>
            <option value="totalSales">Sort by sales</option>
            <option value="unitsSold">Sort by units</option>
            <option value="childCount">Sort by children</option>
          </select>
        </div>
      </div>

      <div className="no-scrollbar max-h-[520px] overflow-auto">
        <table className="pnl-table w-full min-w-[1860px] border-separate border-spacing-0 text-sm">
          <thead className="text-[11px] uppercase tracking-wide text-steel">
            <tr>
              {["", "Parent ASIN", "Children", "Product Title", "Targets", "Units", "Sales", "Fees", "COGS", "Current Spend", "Current TACOS", "Scenario Spend", "Scenario TACOS", "Current Profit", "Scenario Profit", "Margin", "Break-even", "Health"].map((head) => (
                <th key={head} className="whitespace-nowrap border-b border-line px-3 py-3 text-left font-extrabold">{head}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map((row) => {
              const risk = row.estimatedProfit < 0 || row.dataMissingChildren > 0;
              const isExpanded = expanded[row.parentAsin];
              const children = [...(childrenByParent[row.parentAsin] ?? [])].sort((a, b) => b.estimatedProfit - a.estimatedProfit);
              return (
                <Fragment key={row.parentAsin}>
                  <tr className={`hover:bg-warm/60 ${risk ? "bg-red-50/50" : ""}`}>
                    <td className="border-b border-line px-3 py-3">
                      <button
                        type="button"
                        onClick={() => setExpanded({ ...expanded, [row.parentAsin]: !isExpanded })}
                        className="rounded-full p-1 hover:bg-warm"
                        aria-label={isExpanded ? "Collapse parent ASIN" : "Expand parent ASIN"}
                      >
                        {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                      </button>
                    </td>
                    <td className="whitespace-nowrap border-b border-line px-3 py-3 font-extrabold text-ink">{row.parentAsin}</td>
                    <td className="whitespace-nowrap border-b border-line px-3 py-3 text-steel">{row.childCount} ASINs / {row.skuCount} SKUs</td>
                    <td className="w-[320px] max-w-[320px] border-b border-line px-3 py-3 font-medium leading-5 text-ink">
                      <div className="title-clamp" title={row.topChildTitle}>{row.topChildTitle || "—"}</div>
                    </td>
                    <td className="min-w-[260px] whitespace-nowrap border-b border-line px-3 py-3">
                      <div className="grid grid-cols-2 gap-2">
                        <TargetInput label="TACOS" value={row.targetTacos} onCommit={(value) => updateParentTarget(row.parentAsin, { tacosGoal: value })} />
                        <TargetInput label="Margin" value={row.targetMargin} onCommit={(value) => updateParentTarget(row.parentAsin, { marginGoal: value })} />
                      </div>
                    </td>
                    <td className="whitespace-nowrap border-b border-line px-3 py-3 text-right">{number(row.unitsSold)}</td>
                    <td className="whitespace-nowrap border-b border-line px-3 py-3 text-right">{currency(row.totalSales)}</td>
                    <td className="whitespace-nowrap border-b border-line px-3 py-3 text-right">{currency(row.amazonFees)}</td>
                    <td className="whitespace-nowrap border-b border-line px-3 py-3 text-right">{currency(row.cogs)}</td>
                    <td className="whitespace-nowrap border-b border-line px-3 py-3 text-right">{currency(row.currentAdSpend)}</td>
                    <td className={`whitespace-nowrap border-b border-line px-3 py-3 text-right font-bold ${row.currentTacos > row.breakEvenTacos ? "text-red-700" : "text-ink"}`}>{percent(row.currentTacos)}</td>
                    <td className="whitespace-nowrap border-b border-line px-3 py-3 text-right">{currency(row.adSpend)}</td>
                    <td className="whitespace-nowrap border-b border-line px-3 py-3 text-right">{percent(row.tacos)}</td>
                    <td className={`whitespace-nowrap border-b border-line px-3 py-3 text-right font-extrabold ${row.currentProfit < 0 ? "text-red-700" : "text-emerald-700"}`}>{currency(row.currentProfit)}</td>
                    <td className={`whitespace-nowrap border-b border-line px-3 py-3 text-right font-extrabold ${row.estimatedProfit < 0 ? "text-red-700" : "text-emerald-700"}`}>{currency(row.estimatedProfit)}</td>
                    <td className={`whitespace-nowrap border-b border-line px-3 py-3 text-right font-extrabold ${row.targetMargin !== null && row.profitMargin < row.targetMargin ? "text-[#9A5C00]" : row.profitMargin < 0.15 ? "text-[#9A5C00]" : "text-emerald-700"}`}>
                      {percent(row.profitMargin)}
                      {row.targetMarginGap !== null ? <div className="text-[10px] font-bold text-steel">{row.targetMarginGap >= 0 ? "+" : ""}{percent(row.targetMarginGap)} vs goal</div> : null}
                    </td>
                    <td className="whitespace-nowrap border-b border-line px-3 py-3 text-right">{percent(row.breakEvenTacos)}</td>
                    <td className="whitespace-nowrap border-b border-line px-3 py-3">
                      <span className={`rounded-full px-2.5 py-1 text-xs font-extrabold ${row.dataMissingChildren ? "bg-red-100 text-red-800" : row.unprofitableChildren ? "bg-amber-100 text-amber-800" : "bg-emerald-100 text-emerald-800"}`}>
                        {row.dataMissingChildren ? `${row.dataMissingChildren} data gaps` : row.unprofitableChildren ? `${row.unprofitableChildren} weak children` : "Healthy"}
                      </span>
                    </td>
                  </tr>
                  {isExpanded ? (
                    <tr className="bg-warm/40">
                      <td className="border-b border-line px-3 py-4" />
                      <td colSpan={17} className="border-b border-line px-3 py-4">
                        <div className="overflow-hidden rounded-lg border border-line bg-white">
                          <div className="border-b border-line bg-warm/70 px-4 py-2 text-xs font-extrabold uppercase tracking-[0.14em] text-steel">
                            Child SKU Profitability
                          </div>
                          <table className="w-full min-w-[980px] text-xs">
                            <thead className="bg-white text-[10px] uppercase tracking-wide text-steel">
                              <tr>
                                {["SKU", "Child ASIN", "Product", "Units", "Sales", "Current Spend", "Current TACOS", "Scenario Spend", "Scenario TACOS", "Profit", "Margin", "Status"].map((head) => (
                                  <th key={head} className="border-b border-line px-3 py-2 text-left font-extrabold">{head}</th>
                                ))}
                              </tr>
                            </thead>
                            <tbody>
                              {children.map((child) => (
                                <tr key={child.sku || child.asin} className="hover:bg-warm/40">
                                  <td className="whitespace-nowrap border-b border-line px-3 py-2 font-bold text-ink">{child.sku || "—"}</td>
                                  <td className="whitespace-nowrap border-b border-line px-3 py-2 text-steel">{child.asin}</td>
                                  <td className="w-[260px] max-w-[260px] border-b border-line px-3 py-2 text-ink">
                                    <div className="title-clamp" title={child.title}>{child.title || "—"}</div>
                                  </td>
                                  <td className="whitespace-nowrap border-b border-line px-3 py-2 text-right">{number(child.scenarioUnits)}</td>
                                  <td className="whitespace-nowrap border-b border-line px-3 py-2 text-right">{currency(child.scenarioSales)}</td>
                                  <td className="whitespace-nowrap border-b border-line px-3 py-2 text-right">{currency(child.currentAdSpend)}</td>
                                  <td className="whitespace-nowrap border-b border-line px-3 py-2 text-right">{percent(child.currentTacos)}</td>
                                  <td className="whitespace-nowrap border-b border-line px-3 py-2 text-right">{currency(child.scenarioAdSpend)}</td>
                                  <td className="whitespace-nowrap border-b border-line px-3 py-2 text-right">{percent(child.scenarioTacos)}</td>
                                  <td className={`whitespace-nowrap border-b border-line px-3 py-2 text-right font-extrabold ${child.estimatedProfit < 0 ? "text-red-700" : "text-emerald-700"}`}>{currency(child.estimatedProfit)}</td>
                                  <td className={`whitespace-nowrap border-b border-line px-3 py-2 text-right font-extrabold ${child.profitMargin < 0.15 ? "text-[#9A5C00]" : "text-emerald-700"}`}>{percent(child.profitMargin)}</td>
                                  <td className="whitespace-nowrap border-b border-line px-3 py-2"><StatusBadge status={child.status} /></td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </td>
                    </tr>
                  ) : null}
                </Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function TargetInput({ label, value, onCommit }: { label: string; value: number | null; onCommit: (value: number | null) => void }) {
  const [draft, setDraft] = useState(value === null ? "" : String(Math.round(value * 1000) / 10));
  return (
    <label className="block rounded-md border border-line bg-white px-2.5 py-2 shadow-sm transition focus-within:border-brand focus-within:ring-2 focus-within:ring-brand/10">
      <span className="block text-[9px] font-extrabold uppercase tracking-wide text-steel">{label} Target</span>
      <span className="mt-1 flex items-center gap-1">
        <input
          type="number"
          step="0.5"
          className="w-full min-w-0 bg-transparent text-right text-sm font-extrabold text-ink outline-none"
          value={draft}
          placeholder="--"
          onChange={(event) => setDraft(event.target.value)}
          onBlur={() => onCommit(draft === "" ? null : Number(draft) / 100)}
        />
        <span className="text-xs font-extrabold text-steel">%</span>
      </span>
    </label>
  );
}
