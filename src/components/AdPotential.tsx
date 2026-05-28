import { AlertTriangle, Copy, RotateCcw, Sparkles, Table2, Trash2, UploadCloud } from "lucide-react";
import { useMemo, useState } from "react";
import {
  calculateBaselineMetrics,
  calculatePlan,
  calculatePlanLabels,
  calculateRecommendedPlan,
  calculateWhatNeedsToBeTrue,
  initialAdPotentialState,
  normalizePlannerState,
  validatePlannerState,
} from "../lib/adPotentialCalculations";
import { formatCurrency, formatNumber, formatPercent, formatRoas, signedCurrency, signedPercent } from "../lib/format";
import type { AdPotentialBaseline, AdPotentialDefaults, AdPotentialPlan, AdPotentialPlannerState, CalculatedAdPotentialPlan } from "../types/models";

type AccountBaseline = {
  currentSpend: number;
  totalSales: number;
  currentTacos: number;
};

type ViewMode = "cards" | "table";

export function AdPotential({
  accountBaseline,
  state,
  onStateChange,
}: {
  accountBaseline?: AccountBaseline;
  state: AdPotentialPlannerState;
  onStateChange: (state: AdPotentialPlannerState) => void;
}) {
  const [viewMode, setViewMode] = useState<ViewMode>("cards");
  const [uploadNote, setUploadNote] = useState("");
  const planner = useMemo(() => normalizePlannerState(state), [state]);
  const baselineMetrics = useMemo(() => calculateBaselineMetrics(planner.baseline), [planner.baseline]);
  const calculatedPlans = useMemo(() => planner.plans.map((plan) => calculatePlan(plan, planner.baseline)), [planner.baseline, planner.plans]);
  const labels = useMemo(() => calculatePlanLabels(calculatedPlans), [calculatedPlans]);
  const recommended = calculateRecommendedPlan(calculatedPlans) ?? calculatedPlans[0];
  const selectedPlan = calculatedPlans.find((plan) => plan.id === planner.selectedPlanId) ?? recommended;
  const whatNeedsToBeTrue = selectedPlan ? calculateWhatNeedsToBeTrue(selectedPlan) : null;
  const errors = validatePlannerState(planner);

  const commit = (patch: Partial<AdPotentialPlannerState>) => onStateChange(normalizePlannerState({ ...planner, ...patch }));
  const updateBaseline = (patch: Partial<AdPotentialBaseline>) => commit({ baseline: { ...planner.baseline, ...patch } });
  const updateDefaults = (patch: Partial<AdPotentialDefaults>) => commit({ defaults: { ...planner.defaults, ...patch } });
  const updatePlan = (planId: string, patch: Partial<AdPotentialPlan>) =>
    commit({ plans: planner.plans.map((plan) => (plan.id === planId ? { ...plan, ...patch } : plan)) });
  const addPlanFromDefaults = () => {
    const id = `plan-${Date.now()}`;
    commit({
      plans: [
        ...planner.plans,
        {
          id,
          name: `Plan ${planner.plans.length + 1}`,
          budget: planner.defaults.plannedBudget,
          targetRoas: planner.defaults.targetRoas,
          cpc: planner.defaults.cpc,
          conversionRate: planner.defaults.conversionRate,
          averageOrderValue: planner.defaults.averageOrderValue,
          organicLiftPercent: planner.defaults.organicLiftPercent,
        },
      ],
      selectedPlanId: id,
    });
  };
  const duplicatePlan = (plan: AdPotentialPlan) => {
    const id = `${plan.id}-copy-${Date.now()}`;
    commit({ plans: [...planner.plans, { ...plan, id, name: `${plan.name} Copy` }], selectedPlanId: id });
  };
  const deletePlan = (planId: string) => {
    const nextPlans = planner.plans.filter((plan) => plan.id !== planId);
    commit({ plans: nextPlans, selectedPlanId: nextPlans[0]?.id ?? "" });
  };
  const resetPlanToBaseline = (planId: string) =>
    updatePlan(planId, {
      cpc: baselineMetrics.baselineCpc || planner.defaults.cpc,
      conversionRate: baselineMetrics.baselineCvr || planner.defaults.conversionRate,
      averageOrderValue: baselineMetrics.baselineAov || planner.defaults.averageOrderValue,
    });
  const useBaselineFunnelMetrics = () =>
    updateDefaults({
      cpc: baselineMetrics.baselineCpc || planner.defaults.cpc,
      conversionRate: baselineMetrics.baselineCvr || planner.defaults.conversionRate,
      averageOrderValue: baselineMetrics.baselineAov || planner.defaults.averageOrderValue,
    });
  const usePnlBaseline = () => {
    if (!accountBaseline) return;
    updateBaseline({
      spend: accountBaseline.currentSpend,
      paidSales: accountBaseline.totalSales,
      organicSales: 0,
    });
  };

  return (
    <section className="grid gap-5">
      <div className="rounded-lg border border-line bg-white p-5 shadow-card">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
          <div>
            <div className="text-xs font-extrabold uppercase tracking-[0.18em] text-brand">Amazon Ads Forecasting</div>
            <h2 className="mt-2 text-2xl font-extrabold text-ink">Ad Potential Planner</h2>
            <p className="mt-2 max-w-4xl text-sm leading-6 text-steel">
              Forecast from the funnel first, then compare the result against the Target ROAS benchmark. The model shows whether the plan is realistic enough for a client strategy call.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {accountBaseline ? (
              <button type="button" className="pill-button" onClick={usePnlBaseline}>
                <Sparkles className="h-4 w-4" />
                Use P&L Baseline
              </button>
            ) : null}
            <button
              type="button"
              className="pill-button bg-brand text-white hover:bg-deep"
              onClick={() => setUploadNote("Spreadsheet import is staged for a later pass. This planner now saves your manual baseline and plan assumptions.")}
            >
              <UploadCloud className="h-4 w-4" />
              Upload Model
            </button>
          </div>
        </div>
        {uploadNote ? <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-900">{uploadNote}</div> : null}
      </div>

      <section className="grid gap-4 md:grid-cols-3 xl:grid-cols-9">
        <Metric label="Current Paid ROAS" value={formatRoas(baselineMetrics.baselinePaidRoas)} helper={formatCurrency(planner.baseline.paidSales)} />
        <Metric label="Current TACOS" value={formatPercent(baselineMetrics.baselineTacos)} helper={formatCurrency(planner.baseline.spend)} />
        <Metric label="Baseline CPC" value={formatCurrency(baselineMetrics.baselineCpc)} helper={`${formatNumber(planner.baseline.clicks)} clicks`} />
        <Metric label="Baseline CVR" value={formatPercent(baselineMetrics.baselineCvr)} helper={`${formatNumber(planner.baseline.orders)} orders`} />
        <Metric label="Baseline AOV" value={formatCurrency(baselineMetrics.baselineAov)} helper="Paid sales / orders" />
        <Metric label="Recommended Plan" value={recommended?.name ?? "—"} helper="Most realistic" tone="good" />
        <Metric label="Projected Total Sales" value={formatCurrency(recommended?.totalSales ?? 0)} helper="Recommended plan" tone="good" />
        <Metric label="Projected TACOS" value={formatPercent(recommended?.tacos ?? 0)} helper={riskText(recommended)} tone={recommended?.tacos && recommended.tacos <= baselineMetrics.baselineTacos ? "good" : "neutral"} />
        <Metric label="Projected Paid ROAS" value={formatRoas(recommended?.paidRoas ?? 0)} helper="Funnel forecast" />
      </section>

      <div className="grid gap-5 2xl:grid-cols-[430px_minmax(0,1fr)]">
        <aside className="grid gap-5">
          <Panel title="Current Baseline" description="Enter current account performance. These metrics become the reality check for each plan.">
            <div className="grid grid-cols-2 gap-3">
              <NumberInput label="Spend" value={planner.baseline.spend} error={errors["baseline.spend"]} onChange={(value) => updateBaseline({ spend: value })} />
              <NumberInput label="Paid Sales" value={planner.baseline.paidSales} onChange={(value) => updateBaseline({ paidSales: value })} />
              <NumberInput label="Organic Sales" value={planner.baseline.organicSales} onChange={(value) => updateBaseline({ organicSales: value })} />
              <NumberInput label="Clicks" value={planner.baseline.clicks} error={errors["baseline.clicks"]} onChange={(value) => updateBaseline({ clicks: value })} />
              <NumberInput label="Orders" value={planner.baseline.orders} error={errors["baseline.orders"]} onChange={(value) => updateBaseline({ orders: value })} />
              <NumberInput label="Impressions" value={planner.baseline.impressions} error={errors["baseline.impressions"]} onChange={(value) => updateBaseline({ impressions: value })} />
            </div>
          </Panel>

          <Panel title="Baseline Metrics" description="Read-only funnel metrics from the baseline inputs.">
            <div className="grid grid-cols-2 gap-3">
              <ReadOnly label="CPC" value={formatCurrency(baselineMetrics.baselineCpc)} />
              <ReadOnly label="CVR" value={formatPercent(baselineMetrics.baselineCvr)} />
              <ReadOnly label="AOV" value={formatCurrency(baselineMetrics.baselineAov)} />
              <ReadOnly label="CTR" value={formatPercent(baselineMetrics.baselineCtr)} />
              <ReadOnly label="Paid ROAS" value={formatRoas(baselineMetrics.baselinePaidRoas)} />
              <ReadOnly label="Total ROAS" value={formatRoas(baselineMetrics.baselineTotalRoas)} />
              <ReadOnly label="TACOS" value={formatPercent(baselineMetrics.baselineTacos)} />
              <ReadOnly label="Total Sales" value={formatCurrency(baselineMetrics.baselineTotalSales)} />
            </div>
          </Panel>

          <Panel title="Default Plan Assumptions" description="Use these as the seed values when creating a new plan.">
            <div className="grid grid-cols-2 gap-3">
              <NumberInput label="Planned Budget" value={planner.defaults.plannedBudget} error={errors["defaults.plannedBudget"]} onChange={(value) => updateDefaults({ plannedBudget: value })} />
              <NumberInput label="Target ROAS" value={planner.defaults.targetRoas} step="0.1" error={errors["defaults.targetRoas"]} onChange={(value) => updateDefaults({ targetRoas: value })} />
              <NumberInput label="CPC" value={planner.defaults.cpc} step="0.05" error={errors["defaults.cpc"]} onChange={(value) => updateDefaults({ cpc: value })} />
              <PercentInput label="Conversion Rate" value={planner.defaults.conversionRate} error={errors["defaults.conversionRate"]} onChange={(value) => updateDefaults({ conversionRate: value })} />
              <NumberInput label="Average Order Value" value={planner.defaults.averageOrderValue} error={errors["defaults.averageOrderValue"]} onChange={(value) => updateDefaults({ averageOrderValue: value })} />
              <PercentInput label="Organic Lift" value={planner.defaults.organicLiftPercent} error={errors["defaults.organicLiftPercent"]} onChange={(value) => updateDefaults({ organicLiftPercent: value })} />
            </div>
            <div className="mt-4 grid gap-2 sm:grid-cols-2">
              <button type="button" className="pill-button justify-center" onClick={useBaselineFunnelMetrics}>Use Baseline Funnel Metrics</button>
              <button type="button" className="pill-button justify-center bg-brand text-white hover:bg-deep" onClick={addPlanFromDefaults}>Add Plan From Defaults</button>
            </div>
          </Panel>
        </aside>

        <section className="grid gap-5">
          <div className="overflow-hidden rounded-lg border border-line bg-white shadow-card">
            <div className="flex flex-col gap-3 border-b border-line p-5 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <h3 className="text-lg font-extrabold text-ink">Plan Comparison</h3>
                <p className="mt-1 text-sm text-steel">Funnel forecast versus Target ROAS requirement, with risk pressure-testing on every plan.</p>
              </div>
              <div className="inline-flex rounded-full border border-line bg-warm p-1">
                <button className={viewButton(viewMode === "cards")} type="button" onClick={() => setViewMode("cards")}>Cards</button>
                <button className={viewButton(viewMode === "table")} type="button" onClick={() => setViewMode("table")}><Table2 className="h-4 w-4" /> Table</button>
              </div>
            </div>

            {viewMode === "cards" ? (
              <div className="grid gap-4 p-5 xl:grid-cols-2">
                {calculatedPlans.map((plan) => (
                  <PlanCard
                    key={plan.id}
                    plan={plan}
                    labels={labels.find((item) => item.planId === plan.id)?.labels ?? []}
                    isSelected={selectedPlan?.id === plan.id}
                    errors={errors}
                    onSelect={() => commit({ selectedPlanId: plan.id })}
                    onUpdate={(patch) => updatePlan(plan.id, patch)}
                    onDuplicate={() => duplicatePlan(plan)}
                    onDelete={() => deletePlan(plan.id)}
                    onReset={() => resetPlanToBaseline(plan.id)}
                  />
                ))}
              </div>
            ) : (
              <PlanTable
                plans={calculatedPlans}
                labels={labels}
                selectedPlanId={selectedPlan?.id}
                errors={errors}
                onSelect={(id) => commit({ selectedPlanId: id })}
                onUpdate={updatePlan}
                onDuplicate={(plan) => duplicatePlan(plan)}
                onDelete={deletePlan}
                onReset={resetPlanToBaseline}
              />
            )}
          </div>

          {selectedPlan && whatNeedsToBeTrue ? (
            <section className="rounded-lg border border-line bg-white p-5 shadow-card">
              <div className="flex flex-col gap-2 lg:flex-row lg:items-start lg:justify-between">
                <div>
                  <div className="text-xs font-extrabold uppercase tracking-[0.16em] text-brand">What Needs To Be True</div>
                  <h3 className="mt-2 text-xl font-extrabold text-ink">{selectedPlan.name}</h3>
                  <p className="mt-2 max-w-3xl text-sm leading-6 text-steel">
                    To hit {formatRoas(selectedPlan.targetRoas)} ROAS at a {formatCurrency(selectedPlan.budget)} budget, the funnel needs the assumptions below to hold.
                  </p>
                </div>
                <RiskBadge label={selectedPlan.riskLabel} />
              </div>
              <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-5">
                <ReadOnly label="Required Paid Sales" value={formatCurrency(whatNeedsToBeTrue.requiredPaidSales)} helper={`Current forecast ${formatCurrency(selectedPlan.paidSales)}`} />
                <ReadOnly label="Required Orders" value={formatNumber(whatNeedsToBeTrue.requiredOrders)} helper={`Projected ${formatNumber(selectedPlan.orders)}`} />
                <ReadOnly label="Required CVR" value={formatPercent(whatNeedsToBeTrue.requiredCvr)} helper={`Plan ${formatPercent(selectedPlan.conversionRate)} · Baseline ${formatPercent(baselineMetrics.baselineCvr)}`} />
                <ReadOnly label="Required AOV" value={formatCurrency(whatNeedsToBeTrue.requiredAov)} helper={`Plan ${formatCurrency(selectedPlan.averageOrderValue)}`} />
                <ReadOnly label="Required CPC" value={formatCurrency(whatNeedsToBeTrue.requiredCpc)} helper={`Plan ${formatCurrency(selectedPlan.cpc)}`} />
              </div>
              <div className={`mt-5 rounded-lg border p-4 ${selectedPlan.targetGap >= 0 ? "border-emerald-200 bg-emerald-50 text-emerald-900" : "border-red-200 bg-red-50 text-red-900"}`}>
                <div className="font-extrabold">
                  Gap: {signedCurrency(selectedPlan.targetGap)} / {signedPercent(selectedPlan.targetGapPercent)}
                </div>
                <div className="mt-1 text-sm font-semibold">
                  {selectedPlan.targetGap >= 0 ? "The funnel forecast supports the Target ROAS benchmark." : `${formatCurrency(Math.abs(selectedPlan.targetGap))} below target. Improve CPC, CVR, AOV, or lower the target/budget.`}
                </div>
              </div>
            </section>
          ) : null}
        </section>
      </div>
    </section>
  );
}

function PlanCard({
  plan,
  labels,
  isSelected,
  errors,
  onSelect,
  onUpdate,
  onDuplicate,
  onDelete,
  onReset,
}: {
  plan: CalculatedAdPotentialPlan;
  labels: string[];
  isSelected: boolean;
  errors: Record<string, string>;
  onSelect: () => void;
  onUpdate: (patch: Partial<AdPotentialPlan>) => void;
  onDuplicate: () => void;
  onDelete: () => void;
  onReset: () => void;
}) {
  return (
    <article className={`rounded-lg border p-4 shadow-sm transition ${isSelected ? "border-brand bg-brand/5 ring-2 ring-brand/10" : "border-line bg-white"}`}>
      <div className="flex items-start justify-between gap-3">
        <input className="min-w-0 flex-1 rounded-md border border-transparent bg-transparent px-1 py-1 text-lg font-extrabold text-ink outline-none focus:border-line focus:bg-white" value={plan.name} onChange={(event) => onUpdate({ name: event.target.value })} onFocus={onSelect} />
        <RiskBadge label={plan.riskLabel} />
      </div>
      <div className="mt-2 flex flex-wrap gap-2">
        {labels.map((label) => <span key={label} className="rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-extrabold text-emerald-800">{label}</span>)}
      </div>
      <button type="button" className="mt-4 w-full rounded-lg border border-line bg-warm/50 p-3 text-left hover:border-brand" onClick={onSelect}>
        <div className="text-sm font-extrabold text-ink">Funnel Forecast: {formatCurrency(plan.paidSales)} paid sales / {formatRoas(plan.paidRoas)} ROAS</div>
        <div className="mt-1 text-sm text-steel">Target Needed: {formatCurrency(plan.targetPaidSales)} paid sales / {formatRoas(plan.targetRoas)} ROAS</div>
        <div className={`mt-1 text-sm font-extrabold ${plan.targetGap >= 0 ? "text-emerald-700" : "text-red-700"}`}>
          Gap: {signedCurrency(plan.targetGap)} / {signedPercent(plan.targetGapPercent)}
        </div>
        <div className="mt-1 text-sm text-steel">Projected Total Sales: {formatCurrency(plan.totalSales)} · TACOS: {formatPercent(plan.tacos)}</div>
      </button>
      <div className="mt-4 grid grid-cols-2 gap-3">
        <NumberInput label="Budget" value={plan.budget} error={errors[`plans.${plan.id}.budget`]} onChange={(value) => onUpdate({ budget: value })} />
        <NumberInput label="Target ROAS" value={plan.targetRoas} step="0.1" error={errors[`plans.${plan.id}.targetRoas`]} onChange={(value) => onUpdate({ targetRoas: value })} />
        <NumberInput label="CPC" value={plan.cpc} step="0.05" error={errors[`plans.${plan.id}.cpc`]} onChange={(value) => onUpdate({ cpc: value })} />
        <PercentInput label="CVR" value={plan.conversionRate} error={errors[`plans.${plan.id}.conversionRate`]} onChange={(value) => onUpdate({ conversionRate: value })} />
        <NumberInput label="AOV" value={plan.averageOrderValue} error={errors[`plans.${plan.id}.averageOrderValue`]} onChange={(value) => onUpdate({ averageOrderValue: value })} />
        <PercentInput label="Organic Lift" value={plan.organicLiftPercent} error={errors[`plans.${plan.id}.organicLiftPercent`]} onChange={(value) => onUpdate({ organicLiftPercent: value })} />
      </div>
      <div className="mt-4 grid grid-cols-2 gap-2 rounded-lg border border-line bg-warm/50 p-3 text-sm">
        <Mini label="Clicks" value={formatNumber(plan.clicks)} />
        <Mini label="Orders" value={formatNumber(plan.orders)} />
        <Mini label="Organic Lift Sales" value={formatCurrency(plan.organicLiftSales)} />
        <Mini label="Projected TACOS" value={formatPercent(plan.tacos)} />
      </div>
      {plan.warnings.length ? (
        <div className="mt-4 grid gap-2">
          {plan.warnings.map((warning) => (
            <div key={warning} className="flex gap-2 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-900">
              <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              {warning}
            </div>
          ))}
        </div>
      ) : null}
      <PlanActions onDuplicate={onDuplicate} onDelete={onDelete} onReset={onReset} />
    </article>
  );
}

function PlanTable({
  plans,
  labels,
  selectedPlanId,
  errors,
  onSelect,
  onUpdate,
  onDuplicate,
  onDelete,
  onReset,
}: {
  plans: CalculatedAdPotentialPlan[];
  labels: Array<{ planId: string; labels: string[] }>;
  selectedPlanId?: string;
  errors: Record<string, string>;
  onSelect: (id: string) => void;
  onUpdate: (id: string, patch: Partial<AdPotentialPlan>) => void;
  onDuplicate: (plan: AdPotentialPlan) => void;
  onDelete: (id: string) => void;
  onReset: (id: string) => void;
}) {
  return (
    <div className="no-scrollbar overflow-auto">
      <table className="pnl-table w-full min-w-[1720px] border-separate border-spacing-0 text-sm">
        <thead className="text-[11px] uppercase tracking-wide text-steel">
          <tr>
            {["Plan", "Budget", "Target", "CPC", "CVR", "AOV", "Lift", "Clicks", "Orders", "Paid Sales", "Paid ROAS", "Total Sales", "TACOS", "Gap", "Risk", "Badges", "Actions"].map((head) => (
              <th key={head} className="whitespace-nowrap border-b border-line bg-white px-3 py-3 text-left font-extrabold">{head}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {plans.map((plan) => (
            <tr key={plan.id} className={selectedPlanId === plan.id ? "bg-brand/5" : "hover:bg-warm/50"} onClick={() => onSelect(plan.id)}>
              <td className="border-b border-line px-3 py-3"><input className="w-40 rounded-md border border-line px-2 py-1.5 text-xs font-bold" value={plan.name} onChange={(event) => onUpdate(plan.id, { name: event.target.value })} /></td>
              <TableInput value={plan.budget} error={errors[`plans.${plan.id}.budget`]} onChange={(value) => onUpdate(plan.id, { budget: value })} />
              <TableInput value={plan.targetRoas} error={errors[`plans.${plan.id}.targetRoas`]} onChange={(value) => onUpdate(plan.id, { targetRoas: value })} />
              <TableInput value={plan.cpc} error={errors[`plans.${plan.id}.cpc`]} onChange={(value) => onUpdate(plan.id, { cpc: value })} />
              <TableInput value={plan.conversionRate * 100} error={errors[`plans.${plan.id}.conversionRate`]} onChange={(value) => onUpdate(plan.id, { conversionRate: normalizePercentInput(value) })} />
              <TableInput value={plan.averageOrderValue} error={errors[`plans.${plan.id}.averageOrderValue`]} onChange={(value) => onUpdate(plan.id, { averageOrderValue: value })} />
              <TableInput value={plan.organicLiftPercent * 100} error={errors[`plans.${plan.id}.organicLiftPercent`]} onChange={(value) => onUpdate(plan.id, { organicLiftPercent: normalizePercentInput(value) })} />
              <td className="border-b border-line px-3 py-3 text-right">{formatNumber(plan.clicks)}</td>
              <td className="border-b border-line px-3 py-3 text-right">{formatNumber(plan.orders)}</td>
              <td className="border-b border-line px-3 py-3 text-right font-extrabold">{formatCurrency(plan.paidSales)}</td>
              <td className="border-b border-line px-3 py-3 text-right">{formatRoas(plan.paidRoas)}</td>
              <td className="border-b border-line px-3 py-3 text-right font-extrabold">{formatCurrency(plan.totalSales)}</td>
              <td className="border-b border-line px-3 py-3 text-right">{formatPercent(plan.tacos)}</td>
              <td className={`border-b border-line px-3 py-3 text-right font-extrabold ${plan.targetGap >= 0 ? "text-emerald-700" : "text-red-700"}`}>{signedCurrency(plan.targetGap)}</td>
              <td className="border-b border-line px-3 py-3"><RiskBadge label={plan.riskLabel} /></td>
              <td className="border-b border-line px-3 py-3">{labels.find((item) => item.planId === plan.id)?.labels.join(", ") || "—"}</td>
              <td className="border-b border-line px-3 py-3"><PlanActions compact onDuplicate={() => onDuplicate(plan)} onDelete={() => onDelete(plan.id)} onReset={() => onReset(plan.id)} /></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Panel({ title, description, children }: { title: string; description: string; children: React.ReactNode }) {
  return (
    <section className="rounded-lg border border-line bg-white p-5 shadow-card">
      <h3 className="text-lg font-extrabold text-ink">{title}</h3>
      <p className="mt-1 text-sm leading-5 text-steel">{description}</p>
      <div className="mt-5">{children}</div>
    </section>
  );
}

function NumberInput({ label, value, step = "100", error, onChange }: { label: string; value: number; step?: string; error?: string; onChange: (value: number) => void }) {
  return (
    <label className="block">
      <span className="text-sm font-bold text-ink">{label}</span>
      <input type="number" step={step} className={`mt-2 w-full rounded-md border px-3 py-2.5 text-sm font-medium outline-none focus:border-brand ${error ? "border-red-300 bg-red-50" : "border-line bg-white"}`} value={inputValue(value)} onChange={(event) => onChange(event.target.value === "" ? 0 : Number(event.target.value))} />
      {error ? <span className="mt-1 block text-xs font-semibold text-red-700">{error}</span> : null}
    </label>
  );
}

function PercentInput({ label, value, error, onChange }: { label: string; value: number; error?: string; onChange: (value: number) => void }) {
  return (
    <label className="block">
      <span className="text-sm font-bold text-ink">{label}</span>
      <div className={`mt-2 flex items-center rounded-md border bg-white px-3 py-2.5 focus-within:border-brand ${error ? "border-red-300 bg-red-50" : "border-line"}`}>
        <input type="number" step="1" className="w-full bg-transparent text-sm font-medium outline-none" value={inputValue(value * 100)} onChange={(event) => onChange(normalizePercentInput(event.target.value === "" ? 0 : Number(event.target.value)))} />
        <span className="text-sm font-bold text-steel">%</span>
      </div>
      {error ? <span className="mt-1 block text-xs font-semibold text-red-700">{error}</span> : null}
    </label>
  );
}

function TableInput({ value, error, onChange }: { value: number; error?: string; onChange: (value: number) => void }) {
  return (
    <td className="border-b border-line px-3 py-3">
      <input className={`w-24 rounded-md border px-2 py-1.5 text-right text-xs font-bold outline-none focus:border-brand ${error ? "border-red-300 bg-red-50" : "border-line bg-white"}`} type="number" value={inputValue(value)} onClick={(event) => event.stopPropagation()} onChange={(event) => onChange(event.target.value === "" ? 0 : Number(event.target.value))} />
    </td>
  );
}

function ReadOnly({ label, value, helper }: { label: string; value: string; helper?: string }) {
  return (
    <div className="rounded-lg border border-line bg-warm/60 px-3 py-3">
      <div className="text-[10px] font-extrabold uppercase tracking-[0.14em] text-steel">{label}</div>
      <div className="mt-1 text-lg font-extrabold text-ink">{value || "—"}</div>
      {helper ? <div className="mt-1 text-xs font-medium text-steel">{helper}</div> : null}
    </div>
  );
}

function Metric({ label, value, helper, tone = "neutral" }: { label: string; value: string; helper: string; tone?: "neutral" | "good" }) {
  return (
    <div className={`rounded-lg border p-4 shadow-sm ${tone === "good" ? "border-emerald-200 bg-emerald-50" : "border-line bg-white"}`}>
      <div className="text-[10px] font-extrabold uppercase tracking-[0.14em] text-steel">{label}</div>
      <div className="mt-3 truncate text-xl font-extrabold text-ink" title={value}>{value || "—"}</div>
      <div className="mt-1 truncate text-xs font-medium text-steel" title={helper}>{helper}</div>
    </div>
  );
}

function Mini({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-[10px] font-extrabold uppercase tracking-wide text-steel">{label}</div>
      <div className="mt-1 font-extrabold text-ink">{value}</div>
    </div>
  );
}

function PlanActions({ compact = false, onDuplicate, onDelete, onReset }: { compact?: boolean; onDuplicate: () => void; onDelete: () => void; onReset: () => void }) {
  return (
    <div className={`flex flex-wrap gap-2 ${compact ? "" : "mt-4"}`}>
      <button type="button" className="pill-button px-3 py-1.5 text-xs" onClick={(event) => { event.stopPropagation(); onDuplicate(); }}><Copy className="h-3.5 w-3.5" /> Duplicate</button>
      <button type="button" className="pill-button px-3 py-1.5 text-xs" onClick={(event) => { event.stopPropagation(); onReset(); }}><RotateCcw className="h-3.5 w-3.5" /> Reset</button>
      <button type="button" className="pill-button px-3 py-1.5 text-xs hover:border-red-300 hover:bg-red-50 hover:text-red-700" onClick={(event) => { event.stopPropagation(); onDelete(); }}><Trash2 className="h-3.5 w-3.5" /> Delete</button>
    </div>
  );
}

function RiskBadge({ label }: { label: CalculatedAdPotentialPlan["riskLabel"] }) {
  const className =
    label === "Low Risk"
      ? "bg-emerald-100 text-emerald-800"
      : label === "Moderate Risk"
        ? "bg-amber-100 text-amber-800"
        : label === "Aggressive"
          ? "bg-orange-100 text-orange-800"
          : "bg-red-100 text-red-800";
  return <span className={`whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-extrabold ${className}`}>{label}</span>;
}

function viewButton(active: boolean) {
  return `inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-extrabold uppercase tracking-wide transition ${active ? "bg-white text-ink shadow-sm" : "text-steel hover:text-ink"}`;
}

function riskText(plan?: CalculatedAdPotentialPlan) {
  return plan ? plan.riskLabel : "No plan selected";
}

function normalizePercentInput(value: number) {
  return value > 1 ? value / 100 : value;
}

function inputValue(value: number) {
  if (!Number.isFinite(value) || value === 0) return "";
  return String(Math.round(value * 100) / 100);
}
