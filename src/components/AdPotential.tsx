import { Plus, Trash2, UploadCloud } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import * as XLSX from "xlsx";
import { currency, number, percent } from "../lib/format";
import type { AdPotentialInputs, AdPotentialPlanRow } from "../types/models";

type PlanInput = {
  name: string;
  plannedBudget: number;
  targetRoas: number;
  cpc: number;
  conversionRate: number;
  averageOrderValue: number;
  organicLiftMultiplier: number;
};

const defaultInputs: AdPotentialInputs = {
  name: "Base Ad Potential",
  currentImpressions: 100000,
  currentSpend: 4514,
  currentPaidSales: 12100,
  currentOrganicSales: 0,
  currentClicks: 4500,
  currentOrders: 550,
  cpc: 1,
  targetRoas: 2.5,
  organicLiftMultiplier: 0.35,
  averageOrderValue: 22,
  conversionRate: 0.12,
  planningMode: "budget",
  plannedClicks: 6000,
  plannedBudget: 6000,
};

const defaultPlans: PlanInput[] = [
  { name: "Conservative", plannedBudget: 4000, targetRoas: 2.5, cpc: 1, conversionRate: 0.1, averageOrderValue: 22, organicLiftMultiplier: 0.2 },
  { name: "Base Push", plannedBudget: 7000, targetRoas: 2.2, cpc: 1.05, conversionRate: 0.11, averageOrderValue: 22, organicLiftMultiplier: 0.35 },
  { name: "Aggressive", plannedBudget: 10000, targetRoas: 1.9, cpc: 1.15, conversionRate: 0.1, averageOrderValue: 22, organicLiftMultiplier: 0.5 },
];

export function AdPotential() {
  const [inputs, setInputs] = useState<AdPotentialInputs>(defaultInputs);
  const [plans, setPlans] = useState<PlanInput[]>(defaultPlans);
  const [imported, setImported] = useState(false);

  const baselineTotalSales = inputs.currentPaidSales + inputs.currentOrganicSales;
  const baselineRoas = inputs.currentSpend ? inputs.currentPaidSales / inputs.currentSpend : 0;
  const baselineTotalRoas = inputs.currentSpend ? baselineTotalSales / inputs.currentSpend : 0;
  const baselineTacos = baselineTotalSales ? inputs.currentSpend / baselineTotalSales : 0;
  const baselineCpc = inputs.currentClicks ? inputs.currentSpend / inputs.currentClicks : inputs.cpc;
  const baselineConversion = inputs.currentClicks ? inputs.currentOrders / inputs.currentClicks : inputs.conversionRate;
  const baselineAov = inputs.currentOrders ? inputs.currentPaidSales / inputs.currentOrders : inputs.averageOrderValue;
  const rows = useMemo(() => plans.map((plan) => buildPlanRow(inputs, plan)), [inputs, plans]);
  const bestProfitSignal = rows.reduce((best, row) => (row.totalSales - row.budget > best.totalSales - best.budget ? row : best), rows[0] ?? buildPlanRow(inputs, defaultPlans[0]));

  const update = <K extends keyof AdPotentialInputs>(key: K, value: AdPotentialInputs[K]) => setInputs((current) => ({ ...current, [key]: value }));
  const updatePlan = (index: number, patch: Partial<PlanInput>) => setPlans((current) => current.map((plan, itemIndex) => (itemIndex === index ? { ...plan, ...patch } : plan)));

  return (
    <section className="grid gap-5">
      <div className="rounded-lg border border-line bg-white p-5 shadow-card">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <div className="text-xs font-extrabold uppercase tracking-[0.18em] text-brand">ROAS Growth Model</div>
            <h2 className="mt-2 text-2xl font-extrabold text-ink">Ad Potential Planner</h2>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-steel">
              Plan spend with ROAS, CPC, conversion rate, AOV, and organic lift. The model shows paid sales, total sales, TACOS, and incremental lift.
            </p>
          </div>
          <label className="inline-flex cursor-pointer items-center gap-2 rounded-full bg-brand px-4 py-2 text-sm font-extrabold uppercase tracking-wide text-white shadow-sm hover:bg-deep">
            <UploadCloud className="h-4 w-4" />
            Upload Model
            <input
              type="file"
              accept=".csv,text/csv,.xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
              className="hidden"
              onChange={async (event) => {
                const file = event.target.files?.[0];
                if (!file) return;
                const parsed = await parseAdPotentialFile(file);
                setInputs(parsed.inputs);
                setPlans(parsed.plans);
                setImported(true);
              }}
            />
          </label>
        </div>

        <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-5">
          <Metric label="Current Paid ROAS" value={`${baselineRoas.toFixed(2)}x`} helper={`${currency(inputs.currentPaidSales)} paid sales`} />
          <Metric label="Current Total ROAS" value={`${baselineTotalRoas.toFixed(2)}x`} helper={`${currency(baselineTotalSales)} total sales`} />
          <Metric label="Current TACOS" value={percent(baselineTacos)} helper={`${currency(inputs.currentSpend)} spend`} />
          <Metric label="Best Plan Total Sales" value={currency(bestProfitSignal.totalSales)} helper={`${bestProfitSignal.totalRoas.toFixed(2)}x total ROAS`} tone="good" />
          <Metric label="Best Plan TACOS" value={percent(bestProfitSignal.tacos)} helper={`${currency(bestProfitSignal.budget)} budget`} tone={bestProfitSignal.tacos <= baselineTacos ? "good" : "neutral"} />
        </div>
      </div>

      <div className="grid gap-5 xl:grid-cols-[440px_minmax(0,1fr)]">
        <div className="grid gap-5">
          <div className="rounded-lg border border-line bg-white p-5 shadow-card">
            <h3 className="text-lg font-extrabold text-ink">Current Baseline</h3>
            <p className="mt-1 text-sm leading-5 text-steel">Use current account or portfolio performance as the starting point.</p>
            <div className="mt-5 grid grid-cols-2 gap-3">
              <NumberInput label="Current spend" value={inputs.currentSpend} step="100" onChange={(value) => update("currentSpend", value)} />
              <NumberInput label="Paid sales" value={inputs.currentPaidSales} step="1000" onChange={(value) => update("currentPaidSales", value)} />
              <NumberInput label="Organic sales" value={inputs.currentOrganicSales} step="1000" onChange={(value) => update("currentOrganicSales", value)} />
              <NumberInput label="Clicks" value={inputs.currentClicks} step="100" onChange={(value) => update("currentClicks", value)} />
              <NumberInput label="Orders" value={inputs.currentOrders} step="10" onChange={(value) => update("currentOrders", value)} />
              <NumberInput label="Impressions" value={inputs.currentImpressions} step="1000" onChange={(value) => update("currentImpressions", value)} />
            </div>
          </div>

          <div className="rounded-lg border border-line bg-white p-5 shadow-card">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h3 className="text-lg font-extrabold text-ink">Default Assumptions</h3>
                <p className="mt-1 text-sm leading-5 text-steel">These seed new plan rows. Each row can still be changed individually.</p>
              </div>
              <button
                type="button"
                className="rounded-full bg-brand p-2 text-white hover:bg-deep"
                onClick={() => setPlans((current) => [...current, { name: `Plan ${current.length + 1}`, plannedBudget: inputs.plannedBudget || inputs.currentSpend, targetRoas: inputs.targetRoas, cpc: inputs.cpc || baselineCpc, conversionRate: inputs.conversionRate || baselineConversion, averageOrderValue: inputs.averageOrderValue || baselineAov, organicLiftMultiplier: inputs.organicLiftMultiplier }])}
              >
                <Plus className="h-4 w-4" />
              </button>
            </div>
            <div className="mt-5 grid grid-cols-2 gap-3">
              <NumberInput label="Target ROAS" value={inputs.targetRoas} step="0.1" onChange={(value) => update("targetRoas", value)} />
              <NumberInput label="CPC" value={inputs.cpc} step="0.05" onChange={(value) => update("cpc", value)} />
              <NumberInput label="Conversion %" value={inputs.conversionRate * 100} step="0.5" onChange={(value) => update("conversionRate", value / 100)} />
              <NumberInput label="Average order value" value={inputs.averageOrderValue} step="1" onChange={(value) => update("averageOrderValue", value)} />
              <NumberInput label="Organic lift %" value={inputs.organicLiftMultiplier * 100} step="5" onChange={(value) => update("organicLiftMultiplier", value / 100)} />
              <NumberInput label="Planned budget" value={inputs.plannedBudget} step="500" onChange={(value) => update("plannedBudget", value)} />
            </div>
            <div className="mt-4 grid grid-cols-3 gap-2 rounded-lg border border-line bg-warm/60 p-3">
              <MiniFormula label="Baseline CPC" value={currency(baselineCpc)} />
              <MiniFormula label="Baseline CVR" value={percent(baselineConversion)} />
              <MiniFormula label="Baseline AOV" value={currency(baselineAov)} />
            </div>
          </div>
        </div>

        <div className="overflow-hidden rounded-lg border border-line bg-white shadow-card">
          <div className="flex flex-col gap-3 border-b border-line p-5 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h3 className="text-lg font-extrabold text-ink">Potential Plans</h3>
              <p className="mt-1 text-sm text-steel">Edit any row. Higher ROAS and organic lift improve efficiency; higher CPC or lower conversion makes the plan harder to justify.</p>
            </div>
            <div className="rounded-full bg-warm px-3 py-1.5 text-xs font-extrabold text-ink">
              {imported ? `${rows.length} imported plans` : `${rows.length} working plans`}
            </div>
          </div>

          <div className="no-scrollbar overflow-auto">
            <table className="pnl-table w-full min-w-[1320px] border-separate border-spacing-0 text-sm">
              <thead className="text-[11px] uppercase tracking-wide text-steel">
                <tr>
                  {["Plan", "Budget", "ROAS", "CPC", "CVR", "AOV", "Organic Lift", "Clicks", "Orders", "Paid Sales", "Organic Lift Sales", "Total Sales", "Total ROAS", "TACOS", "Signal", ""].map((head) => (
                    <th key={head} className="whitespace-nowrap border-b border-line px-3 py-3 text-left font-extrabold">{head}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {plans.map((plan, index) => {
                  const row = rows[index];
                  return (
                    <tr key={`${plan.name}-${index}`} className={index === 0 ? "bg-emerald-50/70" : "hover:bg-warm/50"}>
                      <td className="border-b border-line px-3 py-3">
                        <input className="w-32 rounded-md border border-line bg-white px-2 py-1.5 text-xs font-bold outline-none focus:border-brand" value={plan.name} onChange={(event) => updatePlan(index, { name: event.target.value })} />
                      </td>
                      <EditableCell value={plan.plannedBudget} step="500" onChange={(value) => updatePlan(index, { plannedBudget: value })} />
                      <EditableCell value={plan.targetRoas} step="0.1" suffix="x" onChange={(value) => updatePlan(index, { targetRoas: value })} />
                      <EditableCell value={plan.cpc} step="0.05" onChange={(value) => updatePlan(index, { cpc: value })} />
                      <EditableCell value={plan.conversionRate * 100} step="0.5" suffix="%" onChange={(value) => updatePlan(index, { conversionRate: value / 100 })} />
                      <EditableCell value={plan.averageOrderValue} step="1" onChange={(value) => updatePlan(index, { averageOrderValue: value })} />
                      <EditableCell value={plan.organicLiftMultiplier * 100} step="5" suffix="%" onChange={(value) => updatePlan(index, { organicLiftMultiplier: value / 100 })} />
                      <td className="whitespace-nowrap border-b border-line px-3 py-3 text-right">{number(row.clicks)}</td>
                      <td className="whitespace-nowrap border-b border-line px-3 py-3 text-right">{number(row.orders)}</td>
                      <td className="whitespace-nowrap border-b border-line px-3 py-3 text-right">{currency(row.paidSales)}</td>
                      <td className="whitespace-nowrap border-b border-line px-3 py-3 text-right">{currency(row.organicSales)}</td>
                      <td className="whitespace-nowrap border-b border-line px-3 py-3 text-right font-extrabold text-ink">{currency(row.totalSales)}</td>
                      <td className="whitespace-nowrap border-b border-line px-3 py-3 text-right">{row.totalRoas.toFixed(2)}x</td>
                      <td className="whitespace-nowrap border-b border-line px-3 py-3 text-right font-extrabold">{percent(row.tacos)}</td>
                      <td className="whitespace-nowrap border-b border-line px-3 py-3">
                        <span className={`rounded-full px-2.5 py-1 text-xs font-extrabold ${row.tacos <= baselineTacos ? "bg-emerald-100 text-emerald-800" : row.roas >= baselineRoas ? "bg-amber-100 text-amber-800" : "bg-red-100 text-red-800"}`}>
                          {row.tacos <= baselineTacos ? "Efficient" : row.roas >= baselineRoas ? "Watch TACOS" : "Risky"}
                        </span>
                      </td>
                      <td className="border-b border-line px-3 py-3">
                        <button type="button" className="rounded-full p-1.5 text-steel hover:bg-red-50 hover:text-red-700" onClick={() => setPlans((current) => current.filter((_, itemIndex) => itemIndex !== index))}>
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </section>
  );
}

function buildPlanRow(_inputs: AdPotentialInputs, plan: PlanInput): AdPotentialPlanRow {
  const budget = Math.max(0, plan.plannedBudget);
  const cpc = Math.max(0.01, plan.cpc);
  const clicks = budget / cpc;
  const orders = clicks * Math.max(0, plan.conversionRate);
  const paidSales = budget * Math.max(0, plan.targetRoas);
  const demandSales = orders * Math.max(0, plan.averageOrderValue);
  const modeledPaidSales = paidSales || demandSales;
  const organicSales = modeledPaidSales * Math.max(0, plan.organicLiftMultiplier);
  const totalSales = modeledPaidSales + organicSales;
  return {
    clicks,
    impressions: 0,
    budget,
    paidSales: modeledPaidSales,
    organicSales,
    totalSales,
    roas: budget ? modeledPaidSales / budget : 0,
    totalRoas: budget ? totalSales / budget : 0,
    tacos: totalSales ? budget / totalSales : 0,
    orders,
  };
}

async function parseAdPotentialFile(file: File): Promise<{ inputs: AdPotentialInputs; plans: PlanInput[] }> {
  let matrix: unknown[][];
  if (file.name.toLowerCase().endsWith(".xlsx")) {
    const workbook = XLSX.read(await file.arrayBuffer(), { type: "array", cellDates: true });
    const sheet = workbook.Sheets["AD Potential"] ?? workbook.Sheets[workbook.SheetNames[0]];
    matrix = XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1, defval: "" });
  } else {
    matrix = (await file.text()).split(/\r?\n/).filter(Boolean).map(parseCsvLine);
  }
  return parseMatrix(matrix);
}

function parseMatrix(matrix: unknown[][]): { inputs: AdPotentialInputs; plans: PlanInput[] } {
  const headersIndex = matrix.findIndex((row) => row.some((cell) => clean(cell).toLowerCase().includes("budget")) && row.some((cell) => clean(cell).toLowerCase().includes("roas")));
  const headers = headersIndex >= 0 ? matrix[headersIndex].map(clean) : [];
  const valueAt = (row: unknown[], names: string[]) => {
    const index = headers.findIndex((header) => names.some((name) => header.toLowerCase().includes(name)));
    return index >= 0 ? parseNumber(row[index]) : 0;
  };
  const planRows = headersIndex >= 0 ? matrix.slice(headersIndex + 1) : [];
  const plans = planRows
    .filter((row) => valueAt(row, ["budget", "spend"]) > 0)
    .map((row, index) => ({
      name: clean(row[0]) || `Imported ${index + 1}`,
      plannedBudget: valueAt(row, ["budget", "spend"]),
      targetRoas: valueAt(row, ["roas"]) || defaultInputs.targetRoas,
      cpc: valueAt(row, ["cpc"]) || defaultInputs.cpc,
      conversionRate: normalizePercent(valueAt(row, ["conversion", "cvr"])) || defaultInputs.conversionRate,
      averageOrderValue: valueAt(row, ["aov", "average order"]) || defaultInputs.averageOrderValue,
      organicLiftMultiplier: normalizePercent(valueAt(row, ["organic lift", "lift"])) || defaultInputs.organicLiftMultiplier,
    }));

  return {
    inputs: {
      ...defaultInputs,
      name: clean(matrix[0]?.[0]) || "Imported Ad Potential",
    },
    plans: plans.length ? plans : defaultPlans,
  };
}

function normalizePercent(value: number) {
  if (!value) return 0;
  return value > 1 ? value / 100 : value;
}

function parseCsvLine(line: string) {
  const cells: string[] = [];
  let current = "";
  let quoted = false;
  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];
    const next = line[index + 1];
    if (char === '"' && quoted && next === '"') {
      current += '"';
      index += 1;
    } else if (char === '"') {
      quoted = !quoted;
    } else if (char === "," && !quoted) {
      cells.push(current.trim());
      current = "";
    } else {
      current += char;
    }
  }
  cells.push(current.trim());
  return cells;
}

function clean(value: unknown) {
  return String(value ?? "").trim();
}

function parseNumber(value: unknown) {
  if (!value) return 0;
  if (typeof value === "number") return Number.isFinite(value) ? value : 0;
  const text = clean(value);
  const isPercent = text.includes("%");
  const parsed = Number(text.replace(/[$,%"]/g, "").replace(/,/g, ""));
  if (!Number.isFinite(parsed)) return 0;
  return isPercent ? parsed / 100 : parsed;
}

function NumberInput({ label, value, step, onChange }: { label: string; value: number; step: string; onChange: (value: number) => void }) {
  const [draft, setDraft] = useState(value === 0 ? "" : String(Math.round(value * 100) / 100));
  useEffect(() => {
    setDraft(value === 0 ? "" : String(Math.round(value * 100) / 100));
  }, [value]);
  return (
    <label className="block">
      <span className="text-sm font-bold text-ink">{label}</span>
      <input
        type="number"
        step={step}
        className="mt-2 w-full rounded-md border border-line px-3 py-2.5 text-sm font-medium outline-none focus:border-brand"
        value={draft}
        onChange={(event) => {
          setDraft(event.target.value);
          onChange(event.target.value === "" ? 0 : Number(event.target.value));
        }}
      />
    </label>
  );
}

function EditableCell({ value, step, suffix = "", onChange }: { value: number; step: string; suffix?: string; onChange: (value: number) => void }) {
  return (
    <td className="border-b border-line px-3 py-3">
      <div className="flex items-center gap-1">
        <input
          type="number"
          step={step}
          className="w-24 rounded-md border border-line bg-white px-2 py-1.5 text-right text-xs font-bold outline-none focus:border-brand"
          value={Math.round(value * 100) / 100 || ""}
          onChange={(event) => onChange(event.target.value === "" ? 0 : Number(event.target.value))}
        />
        {suffix ? <span className="text-xs font-bold text-steel">{suffix}</span> : null}
      </div>
    </td>
  );
}

function MiniFormula({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md bg-white px-2 py-2">
      <div className="text-[10px] font-extrabold uppercase tracking-wide text-steel">{label}</div>
      <div className="mt-1 text-sm font-extrabold text-ink">{value}</div>
    </div>
  );
}

function Metric({ label, value, helper, tone = "neutral" }: { label: string; value: string; helper: string; tone?: "neutral" | "good" }) {
  return (
    <div className={`rounded-lg border p-4 shadow-sm ${tone === "good" ? "border-emerald-200 bg-emerald-50" : "border-line bg-white"}`}>
      <div className="text-[11px] font-extrabold uppercase tracking-[0.14em] text-steel">{label}</div>
      <div className="mt-3 text-2xl font-extrabold text-ink">{value}</div>
      <div className="mt-1 text-xs font-medium text-steel">{helper}</div>
    </div>
  );
}
