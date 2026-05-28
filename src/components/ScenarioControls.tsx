import { ChevronDown, ChevronUp, Save, SlidersHorizontal } from "lucide-react";
import { useState } from "react";
import type { ScenarioAssumptions } from "../types/models";

interface ScenarioControlsProps {
  scenario: ScenarioAssumptions;
  onChange: (scenario: ScenarioAssumptions) => void;
  onSave: () => void;
  expanded?: boolean;
  onExpandedChange?: (expanded: boolean) => void;
}

const percentFields: Array<[keyof ScenarioAssumptions, string, string]> = [
  ["globalTacosGoal", "TACOS goal", "Ad spend as % of sales"],
  ["globalCouponPercent", "Coupon %", "Coupon cost as % of sales"],
  ["globalAdSpendChangePercent", "Ad spend change", "Used in adjustment mode"],
  ["globalPriceChangePercent", "Price change", "Changes revenue per unit"],
  ["globalCogsChangePercent", "COGS change", "Changes cost per unit"],
  ["globalFbaFeeChangePercent", "FBA fee change", "Changes fulfillment fee"],
  ["globalReferralFeePercent", "Referral fee %", "Blank uses current rate"],
];

export function ScenarioControls({ scenario, onChange, onSave, expanded: controlledExpanded, onExpandedChange }: ScenarioControlsProps) {
  const [localExpanded, setLocalExpanded] = useState(true);
  const expanded = controlledExpanded ?? localExpanded;
  const setExpanded = (value: boolean | ((current: boolean) => boolean)) => {
    const next = typeof value === "function" ? value(expanded) : value;
    if (controlledExpanded === undefined) setLocalExpanded(next);
    onExpandedChange?.(next);
  };
  const update = <K extends keyof ScenarioAssumptions>(key: K, value: ScenarioAssumptions[K]) => {
    onChange({ ...scenario, [key]: value });
  };

  return (
    <aside className={`rounded-lg border border-line bg-white shadow-card ${expanded ? "p-4" : "p-3"}`}>
      <div className={expanded ? "" : "flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between"}>
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <SlidersHorizontal className="h-5 w-5 text-brand" />
          <h2 className="text-base font-extrabold text-ink">Scenario Controls</h2>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={onSave}
            className="inline-flex items-center gap-1.5 rounded-full border border-slate/30 bg-white px-3 py-1.5 text-xs font-bold uppercase tracking-wide text-ink shadow-sm hover:border-brand hover:bg-warm"
          >
            <Save className="h-3.5 w-3.5" />
            Save
          </button>
          <button
            type="button"
            onClick={() => setExpanded((value) => !value)}
            className="inline-flex items-center gap-1.5 rounded-full border border-slate/30 bg-white px-3 py-1.5 text-xs font-bold uppercase tracking-wide text-ink shadow-sm hover:border-brand hover:bg-warm"
          >
            {expanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
            {expanded ? "Hide" : "Edit"}
          </button>
        </div>
      </div>

      {!expanded ? (
        <div className="grid grid-cols-3 gap-2 lg:min-w-[460px]">
          <MiniMetric label="TACOS" value={scenario.globalTacosGoal === null ? "Current" : `${Math.round(scenario.globalTacosGoal * 1000) / 10}%`} />
          <MiniMetric label="Coupon" value={`${Math.round(scenario.globalCouponPercent * 1000) / 10}%`} />
          <MiniMetric label="Forecast" value={scenario.forecastMode === "velocity" ? `${scenario.forecastDays || 30} days` : "Flat"} />
        </div>
      ) : null}
      </div>

      {expanded ? (
      <>
      <label className="block text-[11px] font-bold uppercase tracking-[0.14em] text-steel">Scenario name</label>
      <input
        className="mt-2 w-full rounded-md border border-line px-3 py-2.5 text-sm font-medium text-ink outline-none focus:border-brand"
        value={scenario.name}
        onChange={(event) => update("name", event.target.value)}
      />

      <div className="mt-5 grid grid-cols-2 gap-2 rounded-full bg-warm p-1 text-sm shadow-inner">
        <button
          onClick={() => update("mode", "tacosGoal")}
          className={`rounded-full border px-3 py-2 font-bold transition ${scenario.mode === "tacosGoal" ? "border-brand bg-white text-ink shadow-sm ring-2 ring-brand/20" : "border-transparent text-steel hover:bg-white/60"}`}
        >
          TACOS Goal
        </button>
        <button
          onClick={() => update("mode", "adSpendAdjustment")}
          className={`rounded-full border px-3 py-2 font-bold transition ${scenario.mode === "adSpendAdjustment" ? "border-brand bg-white text-ink shadow-sm ring-2 ring-brand/20" : "border-transparent text-steel hover:bg-white/60"}`}
        >
          Spend Adj.
        </button>
      </div>

      <div className="mt-5 rounded-lg border border-line bg-warm/50 p-3">
        <div className="flex items-center justify-between gap-3">
          <div>
            <div className="text-sm font-extrabold text-ink">Unit forecast</div>
            <div className="mt-0.5 text-xs text-steel">Flat keeps uploaded units. Velocity projects from average daily units.</div>
          </div>
          <select
            className="rounded-md border border-line bg-white px-3 py-2 text-sm font-bold outline-none focus:border-brand"
            value={scenario.forecastMode ?? "flat"}
            onChange={(event) => update("forecastMode", event.target.value as ScenarioAssumptions["forecastMode"])}
          >
            <option value="flat">Flat units</option>
            <option value="velocity">Velocity forecast</option>
          </select>
        </div>
        <div className="mt-3 grid grid-cols-1 gap-3">
          <label className="block">
            <span className="text-xs font-bold text-steel">Forecast days</span>
            <input
              type="number"
              step="1"
              min="1"
              className="mt-1 w-full rounded-md border border-line bg-white px-3 py-2 text-sm font-medium outline-none focus:border-brand"
              value={scenario.forecastDays ?? 30}
              onChange={(event) => update("forecastDays", Math.max(1, Number(event.target.value || 30)))}
            />
          </label>
        </div>
      </div>

      <div className="mt-5 grid gap-3">
        {percentFields.map(([field, label, helper]) => {
          const value = scenario[field] as number | null;
          return (
            <label key={field} className="block">
              <div>
                <span className="text-sm font-bold text-ink">{label}</span>
                <span className="mt-0.5 block text-xs text-steel">{helper}</span>
              </div>
              <input
                type="number"
                step="0.5"
                className="mt-2 w-full rounded-md border border-line px-3 py-2.5 text-sm font-medium outline-none focus:border-brand"
                value={value === null ? "" : String(Math.round(value * 1000) / 10)}
                onChange={(event) =>
                  update(field, (event.target.value === "" ? null : Number(event.target.value) / 100) as never)
                }
              />
            </label>
          );
        })}

        <div className="grid grid-cols-2 gap-3 pt-1">
          <label className="block">
            <span className="text-sm font-bold text-ink">Shipping / unit</span>
            <input
              type="number"
              step="0.05"
              className="mt-2 w-full rounded-md border border-line px-3 py-2.5 text-sm font-medium outline-none focus:border-brand"
              value={scenario.shippingToAmazonPerUnit ?? ""}
              onChange={(event) => update("shippingToAmazonPerUnit", event.target.value === "" ? null : Number(event.target.value))}
            />
          </label>
          <label className="block">
            <span className="text-sm font-bold text-ink">Storage / unit</span>
            <input
              type="number"
              step="0.01"
              className="mt-2 w-full rounded-md border border-line px-3 py-2.5 text-sm font-medium outline-none focus:border-brand"
              value={scenario.storageFeePerUnit ?? ""}
              onChange={(event) => update("storageFeePerUnit", event.target.value === "" ? null : Number(event.target.value))}
            />
          </label>
        </div>
      </div>
      </>
      ) : null}
    </aside>
  );
}

function MiniMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-line bg-warm/60 px-3 py-2">
      <div className="text-[10px] font-extrabold uppercase tracking-wide text-steel">{label}</div>
      <div className="mt-0.5 text-sm font-extrabold text-ink">{value}</div>
    </div>
  );
}
