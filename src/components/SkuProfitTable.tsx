import { ChevronDown, ChevronRight, Search } from "lucide-react";
import { Fragment } from "react";
import { useMemo, useState } from "react";
import { currency, currency2, number, percent, signedCurrency } from "../lib/format";
import type { CalculatedSkuPnl, PnlStatus, ScenarioAssumptions, SkuScenarioOverride } from "../types/models";
import { StatusBadge } from "./StatusBadge";

type SortKey =
  | "estimatedProfit"
  | "currentProfit"
  | "profitMargin"
  | "currentTacos"
  | "scenarioTacos"
  | "scenarioAdSpend"
  | "currentAdSpend"
  | "scenarioSales"
  | "scenarioUnits";

interface SkuProfitTableProps {
  rows: CalculatedSkuPnl[];
  scenario: ScenarioAssumptions;
  onScenarioChange: (scenario: ScenarioAssumptions) => void;
  onSelectSku: (row: CalculatedSkuPnl) => void;
}

const statuses: Array<PnlStatus | "All"> = [
  "All",
  "Scale Candidate",
  "Watch Margin",
  "Unprofitable",
  "Needs Price / Cost Fix",
  "Data Missing",
];

export function SkuProfitTable({ rows, scenario, onScenarioChange, onSelectSku }: SkuProfitTableProps) {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<PnlStatus | "All">("All");
  const [sortKey, setSortKey] = useState<SortKey>("estimatedProfit");
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  const filtered = useMemo(() => {
    const term = search.toLowerCase();
    return rows
      .filter((row) => status === "All" || row.status === status)
      .filter((row) => [row.sku, row.asin, row.title].join(" ").toLowerCase().includes(term))
      .sort((a, b) => Number(b[sortKey]) - Number(a[sortKey]));
  }, [rows, search, status, sortKey]);

  const updateOverride = (row: CalculatedSkuPnl, patch: Partial<SkuScenarioOverride>) => {
    const id = row.sku || row.asin;
    onScenarioChange({
      ...scenario,
      skuOverrides: {
        ...scenario.skuOverrides,
        [id]: { ...scenario.skuOverrides[id], ...patch },
      },
    });
  };

  return (
    <section className="min-w-0 overflow-hidden rounded-lg border border-line bg-white shadow-card">
      <div className="flex flex-col gap-4 border-b border-line p-5 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h2 className="text-lg font-extrabold text-ink">SKU P&L Table</h2>
          <p className="mt-1 text-sm leading-5 text-steel">Current columns use uploaded actual ad spend and TACOS. Scenario columns show modeled changes.</p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row lg:max-w-[680px]">
          <label className="relative">
            <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-steel" />
            <input
              className="w-full rounded-md border border-line py-2 pl-9 pr-3 text-sm font-medium outline-none focus:border-brand sm:w-72"
              placeholder="Search SKU, ASIN, title"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </label>
          <select className="rounded-md border border-line px-3 py-2 text-sm font-medium outline-none focus:border-brand" value={status} onChange={(event) => setStatus(event.target.value as PnlStatus | "All")}>
            {statuses.map((item) => <option key={item}>{item}</option>)}
          </select>
          <select className="rounded-md border border-line px-3 py-2 text-sm font-medium outline-none focus:border-brand" value={sortKey} onChange={(event) => setSortKey(event.target.value as SortKey)}>
            <option value="estimatedProfit">Sort by profit</option>
            <option value="currentProfit">Sort by current profit</option>
            <option value="profitMargin">Sort by margin</option>
            <option value="currentTacos">Sort by current TACOS</option>
            <option value="scenarioTacos">Sort by scenario TACOS</option>
            <option value="currentAdSpend">Sort by current ad spend</option>
            <option value="scenarioAdSpend">Sort by scenario ad spend</option>
            <option value="scenarioSales">Sort by sales</option>
            <option value="scenarioUnits">Sort by units</option>
          </select>
        </div>
      </div>

      <div className="no-scrollbar max-h-[690px] overflow-auto">
        <table className="pnl-table w-full min-w-[1780px] border-separate border-spacing-0 text-sm">
          <thead className="text-[11px] uppercase tracking-wide text-steel">
            <tr>
              {["", "SKU", "Parent", "Child ASIN", "Product", "Price", "Units", "Sales", "Fees", "COGS", "Current Spend", "Current TACOS", "Scenario Spend", "Scenario TACOS", "Coupon", "Current Profit", "Scenario Profit", "Margin", "Break-even", "Status"].map((head) => (
                <th key={head} className="whitespace-nowrap border-b border-line px-3 py-3 text-left font-extrabold">{head}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map((row) => {
              const id = row.sku || row.asin;
              const isExpanded = expanded[id];
              const danger = row.estimatedProfit < 0;
              const lowMargin = row.profitMargin >= 0 && row.profitMargin < 0.15;
              return (
                <Fragment key={id}>
                  <tr
                    className={`border-b border-line hover:bg-warm/60 ${danger ? "bg-red-50/60" : lowMargin ? "bg-[#FFF7E5]" : ""}`}
                  >
                    <td className="border-b border-line px-3 py-3">
                      <button onClick={() => setExpanded({ ...expanded, [id]: !isExpanded })} className="rounded-full p-1 hover:bg-warm">
                        {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                      </button>
                    </td>
                    <td onClick={() => onSelectSku(row)} className="whitespace-nowrap border-b border-line px-3 py-3 font-bold text-ink">{row.sku || "—"}</td>
                    <td className="whitespace-nowrap border-b border-line px-3 py-3 text-steel">{row.parentAsin || "—"}</td>
                    <td className="whitespace-nowrap border-b border-line px-3 py-3 text-steel">{row.asin}</td>
                    <td onClick={() => onSelectSku(row)} className="w-[300px] max-w-[300px] cursor-pointer border-b border-line px-3 py-3 font-medium leading-5 text-ink">
                      <div className="title-clamp" title={row.title}>{row.title || "—"}</div>
                    </td>
                    <td className="whitespace-nowrap border-b border-line px-3 py-3 text-right">{currency2(row.unitEconomics.scenarioPrice)}</td>
                    <td className="whitespace-nowrap border-b border-line px-3 py-3 text-right">{number(row.scenarioUnits)}</td>
                    <td className="whitespace-nowrap border-b border-line px-3 py-3 text-right">{currency(row.scenarioSales)}</td>
                    <td className="whitespace-nowrap border-b border-line px-3 py-3 text-right">{currency(row.scenarioAmazonFees)}</td>
                    <td className="whitespace-nowrap border-b border-line px-3 py-3 text-right">{currency(row.scenarioCogs)}</td>
                    <td className="whitespace-nowrap border-b border-line px-3 py-3 text-right">{currency(row.currentAdSpend)}</td>
                    <td className={`whitespace-nowrap border-b border-line px-3 py-3 text-right font-bold ${row.currentTacos > row.breakEvenTacos ? "text-red-700" : "text-ink"}`}>{percent(row.currentTacos)}</td>
                    <td className="whitespace-nowrap border-b border-line px-3 py-3 text-right">{currency(row.scenarioAdSpend)}</td>
                    <td className="whitespace-nowrap border-b border-line px-3 py-3 text-right">{percent(row.scenarioTacos)}</td>
                    <td className="whitespace-nowrap border-b border-line px-3 py-3 text-right">{percent(row.couponPercent)}</td>
                    <td className={`whitespace-nowrap border-b border-line px-3 py-3 text-right font-extrabold ${row.currentProfit < 0 ? "text-red-700" : "text-emerald-700"}`}>{currency(row.currentProfit)}</td>
                    <td className={`whitespace-nowrap border-b border-line px-3 py-3 text-right font-extrabold ${row.estimatedProfit < 0 ? "text-red-700" : "text-emerald-700"}`}>{currency(row.estimatedProfit)}</td>
                    <td className={`whitespace-nowrap border-b border-line px-3 py-3 text-right font-extrabold ${row.profitMargin < 0.15 ? "text-[#9A5C00]" : "text-emerald-700"}`}>{percent(row.profitMargin)}</td>
                    <td className="whitespace-nowrap border-b border-line px-3 py-3 text-right">{percent(row.breakEvenTacos)}</td>
                    <td className="whitespace-nowrap border-b border-line px-3 py-3"><StatusBadge status={row.status} /></td>
                  </tr>
                  {isExpanded ? (
                    <tr className="bg-warm/50">
                      <td className="border-b border-line px-3 py-4" />
                      <td colSpan={19} className="border-b border-line px-3 py-4">
                        <div className="grid gap-4 lg:grid-cols-[1.2fr_1fr]">
                          <div className="grid gap-3">
                            <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                              {[
                                ["Current ad spend", currency(row.currentAdSpend)],
                                ["Current TACOS", percent(row.currentTacos)],
                                ["Current profit", currency(row.currentProfit)],
                                ["Current margin", percent(row.currentProfitMargin)],
                                ["Referral / unit", currency2(row.unitEconomics.referralFeePerUnit)],
                                ["FBA / unit", currency2(row.unitEconomics.fbaFeePerUnit)],
                                ["Storage / unit", currency2(row.unitEconomics.storageFeePerUnit)],
                                ["Shipping / unit", currency2(row.unitEconomics.shippingToAmazonPerUnit)],
                                ["COGS / unit", currency2(row.unitEconomics.cogsPerUnit)],
                                ["Net after coupon", currency2(row.netPriceAfterCoupon)],
                                ["Max ad spend", currency(row.maxProfitableAdSpend)],
                                ["Profit delta", signedCurrency(row.deltas.profit)],
                              ].map(([label, value]) => (
                                <div key={label} className="rounded-md border border-line bg-white p-3">
                                  <div className="text-xs font-semibold text-steel">{label}</div>
                                  <div className="mt-1 font-bold text-ink">{value}</div>
                                </div>
                              ))}
                            </div>
                            <div className="rounded-md border border-line bg-white p-3">
                              <div className="text-xs font-extrabold uppercase tracking-[0.14em] text-steel">Fee matching audit</div>
                              <div className="mt-2 grid gap-2 md:grid-cols-2">
                                {[
                                  ["Referral fee", row.feeAudit.referralFeeSource],
                                  ["FBA fee", row.feeAudit.fbaFeeSource],
                                  ["Storage fee", row.feeAudit.storageFeeSource],
                                  ["COGS", row.feeAudit.cogsSource],
                                ].map(([label, value]) => (
                                  <div key={label} className="rounded-md bg-warm/70 px-3 py-2">
                                    <div className="text-[10px] font-extrabold uppercase tracking-wide text-steel">{label}</div>
                                    <div className="mt-0.5 text-xs font-bold text-ink">{value}</div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          </div>
                          <div className="grid grid-cols-2 gap-2 md:grid-cols-3">
                            <OverrideInput label="TACOS %" value={row.scenarioTacos * 100} onCommit={(value) => updateOverride(row, { tacosGoal: value / 100 })} />
                            <OverrideInput label="Coupon %" value={row.couponPercent * 100} onCommit={(value) => updateOverride(row, { couponPercent: value / 100 })} />
                            <OverrideInput label="Price" value={row.unitEconomics.scenarioPrice} onCommit={(value) => updateOverride(row, { price: value })} />
                            <OverrideInput label="COGS / unit" value={row.unitEconomics.cogsPerUnit} onCommit={(value) => updateOverride(row, { cogsPerUnit: value })} />
                            <OverrideInput label="Ad spend" value={row.scenarioAdSpend} onCommit={(value) => updateOverride(row, { adSpend: value })} />
                            <OverrideInput label="Units forecast" value={row.scenarioUnits} onCommit={(value) => updateOverride(row, { unitsSoldForecast: value })} />
                          </div>
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

function OverrideInput({ label, value, onCommit }: { label: string; value: number; onCommit: (value: number) => void }) {
  const [draft, setDraft] = useState(String(Math.round(value * 100) / 100));
  return (
    <label className="block">
      <span className="text-xs font-semibold text-slate-500">{label}</span>
      <input
        type="number"
        className="mt-1 w-full rounded-md border border-line bg-white px-2 py-1.5 text-sm"
        value={draft}
        onChange={(event) => setDraft(event.target.value)}
        onBlur={() => onCommit(Number(draft) || 0)}
      />
    </label>
  );
}
