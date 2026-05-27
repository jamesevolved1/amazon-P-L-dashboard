import { UploadCloud } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import * as XLSX from "xlsx";
import { currency, number, percent } from "../lib/format";
import type { AdPotentialInputs, AdPotentialPlanRow } from "../types/models";

type PotentialScenarioInput = {
  clicks: number;
  impressions: number;
};

const defaultInputs: AdPotentialInputs = {
  name: "Base Ad Potential",
  currentImpressions: 100,
  currentSpend: 100,
  currentPaidSales: 100000,
  currentOrganicSales: 200000,
  currentClicks: 100,
  currentOrders: 100,
  cpc: 1,
  targetRoas: 1.43,
  organicLiftMultiplier: 2,
  averageOrderValue: 1,
  conversionRate: 1,
  planningMode: "budget",
  plannedClicks: 23000,
  plannedBudget: 23000,
};

const defaultScenarioInputs: PotentialScenarioInput[] = [
  { clicks: 2500, impressions: 100000 },
  { clicks: 25000, impressions: 25000 },
  { clicks: 35000, impressions: 35000 },
];

export function AdPotential() {
  const [inputs, setInputs] = useState<AdPotentialInputs>(defaultInputs);
  const [scenarioInputs, setScenarioInputs] = useState<PotentialScenarioInput[]>(defaultScenarioInputs);
  const [imported, setImported] = useState(false);

  const currentPaidRoas = inputs.currentSpend ? inputs.currentPaidSales / inputs.currentSpend : 0;
  const currentTotalSales = inputs.currentPaidSales + inputs.currentOrganicSales;
  const currentTotalRoas = inputs.currentSpend ? currentTotalSales / inputs.currentSpend : 0;
  const currentTacos = currentTotalSales ? inputs.currentSpend / currentTotalSales : 0;
  const currentAcos = inputs.currentPaidSales ? inputs.currentSpend / inputs.currentPaidSales : 0;
  const paidShare = currentTotalSales ? inputs.currentPaidSales / currentTotalSales : 0;
  const organicShare = currentTotalSales ? inputs.currentOrganicSales / currentTotalSales : 0;
  const impressionsPerClick = inputs.currentClicks ? inputs.currentImpressions / inputs.currentClicks : 0;
  const costPerImpression = inputs.currentImpressions ? inputs.currentSpend / inputs.currentImpressions : 0;
  const ordersPerImpression = inputs.currentImpressions ? inputs.currentOrders / inputs.currentImpressions : 0;

  const rows = useMemo(() => buildScenarioRows(inputs, scenarioInputs), [inputs, scenarioInputs]);
  const plan = rows[0] ?? buildScenarioRow(inputs, defaultScenarioInputs[0]);

  const update = <K extends keyof AdPotentialInputs>(key: K, value: AdPotentialInputs[K]) => {
    setInputs((current) => ({ ...current, [key]: value }));
  };

  return (
    <section className="grid gap-5">
      <div className="rounded-lg border border-line bg-white p-5 shadow-card">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <h2 className="text-xl font-extrabold text-ink">Ad Potential Planner</h2>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-steel">
              Model how much incremental sales you could create from ad spend using ROAS, CPC, conversion rate, and organic lift.
            </p>
          </div>
          <label className="inline-flex cursor-pointer items-center gap-2 rounded-full bg-brand px-4 py-2 text-sm font-extrabold uppercase tracking-wide text-white shadow-sm hover:bg-deep">
            <UploadCloud className="h-4 w-4" />
            Upload AD Potential
            <input
              type="file"
              accept=".csv,text/csv,.xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
              className="hidden"
              onChange={async (event) => {
                const file = event.target.files?.[0];
                if (!file) return;
                const parsed = await parseAdPotentialFile(file);
                setInputs(parsed.inputs);
                setScenarioInputs(parsed.scenarioInputs);
                setImported(true);
              }}
            />
          </label>
        </div>

        <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-5">
          <Metric label="Current Paid ROAS" value={`${currentPaidRoas.toFixed(2)}x`} helper={`${currency(inputs.currentPaidSales)} paid sales`} />
          <Metric label="Current Total ROAS" value={`${currentTotalRoas.toFixed(2)}x`} helper={`${currency(currentTotalSales)} total sales`} />
          <Metric label="Current ACOS / TACOS" value={`${percent(currentAcos)} / ${percent(currentTacos)}`} helper={`${currency(inputs.currentSpend)} spend`} />
          <Metric label="Target ROAS" value={`${inputs.targetRoas.toFixed(2)}x`} helper={`Equivalent ACOS ${percent(inputs.targetRoas ? 1 / inputs.targetRoas : 0)}`} tone="good" />
          <Metric label="Scenario Total Sales" value={currency(plan.totalSales)} helper={`${percent(plan.tacos)} TACOS`} tone="good" />
        </div>
      </div>

      <div className="grid gap-5 xl:grid-cols-[420px_minmax(0,1fr)]">
        <div className="rounded-lg border border-line bg-white p-5 shadow-card">
          <h3 className="text-lg font-extrabold text-ink">ROAS Variables</h3>
          <p className="mt-1 text-sm leading-5 text-steel">Change the assumptions that control the potential model.</p>

          <div className="mt-5 grid gap-4">
            <label className="block">
              <span className="text-sm font-bold text-ink">Scenario name</span>
              <input className="mt-2 w-full rounded-md border border-line px-3 py-2.5 text-sm font-medium outline-none focus:border-brand" value={inputs.name} onChange={(event) => update("name", event.target.value)} />
            </label>

            <div className="rounded-lg border border-amber-200 bg-[#FFF7E5] px-3 py-2 text-xs font-semibold leading-5 text-steel">
              Budget is driven by impressions x cost per impression. Editing CPC updates spend; editing row clicks updates impressions, so the outputs move immediately.
            </div>

            <div className="grid grid-cols-2 gap-3">
              <NumberInput
                label="Impressions"
                value={inputs.currentImpressions}
                step="100"
                onChange={(value) => setInputs((current) => ({ ...current, currentImpressions: value }))}
              />
              <NumberInput
                label="Clicks"
                value={inputs.currentClicks}
                step="100"
                onChange={(value) => setInputs((current) => ({
                  ...current,
                  currentClicks: value,
                  cpc: value ? current.currentSpend / value : current.cpc,
                }))}
              />
              <NumberInput
                label="Spend"
                value={inputs.currentSpend}
                step="100"
                onChange={(value) => setInputs((current) => ({
                  ...current,
                  currentSpend: value,
                  cpc: current.currentClicks ? value / current.currentClicks : current.cpc,
                }))}
              />
              <NumberInput
                label="CPC"
                value={inputs.cpc}
                step="0.05"
                onChange={(value) => setInputs((current) => ({
                  ...current,
                  cpc: value,
                  currentSpend: value * current.currentClicks,
                }))}
              />
              <NumberInput label="Orders" value={inputs.currentOrders} step="10" onChange={(value) => update("currentOrders", value)} />
              <NumberInput label="Paid sales" value={inputs.currentPaidSales} step="1000" onChange={(value) => update("currentPaidSales", value)} />
              <NumberInput label="Total sales" value={inputs.currentPaidSales + inputs.currentOrganicSales} step="1000" onChange={(value) => update("currentOrganicSales", Math.max(0, value - inputs.currentPaidSales))} />
              <NumberInput label="Target ROAS" value={inputs.targetRoas} step="0.05" onChange={(value) => update("targetRoas", value)} />
            </div>

            <div className="grid grid-cols-3 gap-2 rounded-lg border border-line bg-warm/60 p-3">
              <MiniFormula label="Impr. / click" value={number(impressionsPerClick)} />
              <MiniFormula label="Cost / impr." value={currency(costPerImpression)} />
              <MiniFormula label="Orders / impr." value={String(Math.round(ordersPerImpression * 10000) / 10000)} />
              <MiniFormula label="Paid share" value={percent(paidShare)} />
              <MiniFormula label="Organic share" value={percent(organicShare)} />
              <MiniFormula label="Target ACOS" value={percent(inputs.targetRoas ? 1 / inputs.targetRoas : 0)} />
            </div>

            <div className="rounded-lg border border-line bg-white p-3">
              <div className="text-sm font-extrabold text-ink">Potential rows</div>
              <div className="mt-1 text-xs leading-5 text-steel">Edit clicks and/or impressions needed. Blank impressions will calculate from clicks x impressions per click.</div>
              <div className="mt-3 grid gap-2">
                {scenarioInputs.map((row, index) => (
                  <div key={index} className="grid grid-cols-[auto_1fr_1fr] items-end gap-2">
                    <div className="pb-2 text-xs font-extrabold text-steel">#{index + 1}</div>
                    <NumberInput
                      label="Clicks"
                      value={row.clicks}
                      step="100"
                      onChange={(value) => setScenarioInputs((current) => current.map((item, itemIndex) => itemIndex === index ? { clicks: value, impressions: value * impressionsPerClick } : item))}
                    />
                    <NumberInput
                      label="Impressions"
                      value={row.impressions}
                      step="100"
                      onChange={(value) => setScenarioInputs((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, impressions: value } : item))}
                    />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="overflow-hidden rounded-lg border border-line bg-white shadow-card">
          <div className="flex flex-col gap-3 border-b border-line p-5 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h3 className="text-lg font-extrabold text-ink">ROAS Potential Table</h3>
              <p className="mt-1 text-sm text-steel">ROAS replaces ACOS here: higher ROAS means more sales per ad dollar.</p>
            </div>
            <div className="rounded-full bg-warm px-3 py-1.5 text-xs font-extrabold text-ink">
              {imported ? `${rows.length} imported rows` : "Workbook-style scenarios"}
            </div>
          </div>
          <div className="no-scrollbar overflow-auto">
            <table className="pnl-table w-full min-w-[980px] border-separate border-spacing-0 text-sm">
              <thead className="text-[11px] uppercase tracking-wide text-steel">
                <tr>
                {["Clicks", "Impressions", "Budget", "Potential Units", "Sales Increase", "Organic Sales", "Total Sales", "ROAS", "Total ROAS", "TACOS"].map((head) => (
                    <th key={head} className="whitespace-nowrap border-b border-line px-3 py-3 text-left font-extrabold">{head}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((row, index) => (
                  <tr key={`${row.clicks}-${row.budget}-${index}`} className={index === 0 ? "bg-emerald-50/70" : "hover:bg-warm/50"}>
                    <td className="whitespace-nowrap border-b border-line px-3 py-3 text-right">{number(row.clicks)}</td>
                    <td className="whitespace-nowrap border-b border-line px-3 py-3 text-right">{number(row.impressions)}</td>
                    <td className="whitespace-nowrap border-b border-line px-3 py-3 text-right">{currency(row.budget)}</td>
                    <td className="whitespace-nowrap border-b border-line px-3 py-3 text-right">{number(row.orders)}</td>
                    <td className="whitespace-nowrap border-b border-line px-3 py-3 text-right">{currency(row.paidSales)}</td>
                    <td className="whitespace-nowrap border-b border-line px-3 py-3 text-right">{currency(row.organicSales)}</td>
                    <td className="whitespace-nowrap border-b border-line px-3 py-3 text-right font-extrabold text-ink">{currency(row.totalSales)}</td>
                    <td className="whitespace-nowrap border-b border-line px-3 py-3 text-right font-extrabold text-emerald-700">{row.roas.toFixed(2)}x</td>
                    <td className="whitespace-nowrap border-b border-line px-3 py-3 text-right">{row.totalRoas.toFixed(2)}x</td>
                    <td className="whitespace-nowrap border-b border-line px-3 py-3 text-right">{percent(row.tacos)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </section>
  );
}

function buildScenarioRows(inputs: AdPotentialInputs, rows: PotentialScenarioInput[]): AdPotentialPlanRow[] {
  return rows.map((row) => buildScenarioRow(inputs, row));
}

function buildScenarioRow(inputs: AdPotentialInputs, row: PotentialScenarioInput): AdPotentialPlanRow {
  const impressionsPerClick = inputs.currentClicks ? inputs.currentImpressions / inputs.currentClicks : 0;
  const costPerImpression = inputs.currentImpressions ? inputs.currentSpend / inputs.currentImpressions : inputs.cpc;
  const ordersPerImpression = inputs.currentImpressions ? inputs.currentOrders / inputs.currentImpressions : 0;
  const currentTotalSales = inputs.currentPaidSales + inputs.currentOrganicSales;
  const paidShare = currentTotalSales ? inputs.currentPaidSales / currentTotalSales : 1;
  const effectiveImpressions = row.impressions || row.clicks * impressionsPerClick;
  const budget = effectiveImpressions * costPerImpression;
  const clicks = row.clicks;
  const paidSales = budget * inputs.targetRoas;
  const totalSales = paidShare ? paidSales / paidShare : paidSales;
  const organicSales = Math.max(0, totalSales - paidSales);
  const orders = effectiveImpressions * ordersPerImpression;
  return {
    clicks,
    impressions: effectiveImpressions,
    budget,
    paidSales,
    organicSales,
    totalSales,
    roas: budget ? paidSales / budget : 0,
    totalRoas: budget ? totalSales / budget : 0,
    tacos: totalSales ? budget / totalSales : 0,
    orders,
  };
}

async function parseAdPotentialFile(file: File): Promise<{ inputs: AdPotentialInputs; scenarioInputs: PotentialScenarioInput[] }> {
  if (file.name.toLowerCase().endsWith(".xlsx")) {
    const workbook = XLSX.read(await file.arrayBuffer(), { type: "array", cellDates: true });
    const sheet = workbook.Sheets["AD Potential"] ?? workbook.Sheets[workbook.SheetNames[0]];
    const matrix = XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1, defval: "" });
    return parseAdPotentialMatrix(matrix);
  }
  return parseAdPotentialMatrix((await file.text()).split(/\r?\n/).filter(Boolean).map(parseCsvLine));
}

function parseAdPotentialMatrix(matrix: unknown[][]): { inputs: AdPotentialInputs; scenarioInputs: PotentialScenarioInput[] } {
  const name = clean(matrix[0]?.[0]) || "Imported AD Potential";
  const metricHeaderIndex = matrix.findIndex((row) => row.some((cell) => clean(cell) === "Impressions") && row.some((cell) => clean(cell) === "Spend"));
  const metricHeaders = metricHeaderIndex >= 0 ? matrix[metricHeaderIndex] : [];
  const metricValues = metricHeaderIndex >= 0 ? matrix[metricHeaderIndex + 1] ?? [] : [];
  const metric = (label: string) => parseNumber(metricValues[metricHeaders.findIndex((head) => clean(head) === label)]);
  const currentSpend = metric("Spend") || defaultInputs.currentSpend;
  const currentImpressions = metric("Impressions") || defaultInputs.currentImpressions;
  const currentPaidSales = metric("Sales") || defaultInputs.currentPaidSales;
  const currentOrganicSales = metric("Organic Sales") || defaultInputs.currentOrganicSales;
  const currentClicks = metric("Clicks") || defaultInputs.currentClicks;
  const currentOrders = metric("Orders") || defaultInputs.currentOrders;
  const cpc = metric("CPC") || (currentClicks ? currentSpend / currentClicks : defaultInputs.cpc);
  const targetAcosRow = matrix.find((row) => row.some((cell) => clean(cell).toLowerCase().includes("target acos")));
  const targetAcosIndex = targetAcosRow?.findIndex((cell) => clean(cell).toLowerCase().includes("target acos")) ?? -1;
  const targetAcos = targetAcosRow && targetAcosIndex >= 0 ? parseNumber(targetAcosRow[targetAcosIndex + 1]) : 0.7;
  const targetRoas = targetAcos ? 1 / targetAcos : defaultInputs.targetRoas;

  const planHeaderIndex = matrix.findIndex((row) => row.some((cell) => clean(cell) === "Clicks") && row.some((cell) => clean(cell) === "Budget") && row.some((cell) => clean(cell) === "Total Sales"));
  const planHeaders = planHeaderIndex >= 0 ? matrix[planHeaderIndex] : [];
  const planRows = planHeaderIndex >= 0 ? matrix.slice(planHeaderIndex + 1) : [];
  const scenarioInputs = planRows
    .filter((row) => parseNumber(row[0]) > 0)
    .map((row) => {
      const value = (label: string) => parseNumber(row[planHeaders.findIndex((head) => clean(head) === label)]);
      return {
        clicks: value("Clicks"),
        impressions: value("Impressions needed"),
      };
    });

  return {
    inputs: {
      ...defaultInputs,
      name,
      currentImpressions,
      currentSpend,
      currentPaidSales,
      currentOrganicSales,
      currentClicks,
      currentOrders,
      cpc,
      targetRoas,
      organicLiftMultiplier: currentPaidSales ? currentOrganicSales / currentPaidSales : defaultInputs.organicLiftMultiplier,
      averageOrderValue: currentOrders ? currentPaidSales / currentOrders : defaultInputs.averageOrderValue,
      conversionRate: currentClicks && currentImpressions ? currentClicks / currentImpressions : defaultInputs.conversionRate,
      plannedClicks: scenarioInputs[0]?.clicks ?? defaultInputs.plannedClicks,
      plannedBudget: scenarioInputs[0]?.impressions ? scenarioInputs[0].impressions * cpc : defaultInputs.plannedBudget,
    },
    scenarioInputs: scenarioInputs.length ? scenarioInputs : defaultScenarioInputs,
  };
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
        onBlur={() => {
          if (draft !== "" && Number.isFinite(Number(draft))) {
            setDraft(String(Math.round(Number(draft) * 100) / 100));
          }
        }}
      />
    </label>
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
