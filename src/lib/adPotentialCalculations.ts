import type {
  AdPotentialBaseline,
  AdPotentialBaselineMetrics,
  AdPotentialPlan,
  AdPotentialPlanLabels,
  AdPotentialPlannerState,
  AdPotentialPlanRisk,
  AdPotentialWhatNeedsToBeTrue,
  CalculatedAdPotentialPlan,
} from "../types/models";

export const initialAdPotentialState: AdPotentialPlannerState = {
  baseline: {
    spend: 454,
    paidSales: 1210,
    organicSales: 3290,
    clicks: 4500,
    orders: 550,
    impressions: 100000,
  },
  defaults: {
    plannedBudget: 6000,
    targetRoas: 2.5,
    cpc: 1,
    conversionRate: 0.12,
    averageOrderValue: 22,
    organicLiftPercent: 0.35,
  },
  plans: [
    {
      id: "conservative",
      name: "Conservative",
      budget: 4000,
      targetRoas: 2.5,
      cpc: 1,
      conversionRate: 0.1,
      averageOrderValue: 22,
      organicLiftPercent: 0.2,
    },
    {
      id: "base-push",
      name: "Base Push",
      budget: 7000,
      targetRoas: 2.2,
      cpc: 1.05,
      conversionRate: 0.11,
      averageOrderValue: 22,
      organicLiftPercent: 0.35,
    },
    {
      id: "aggressive",
      name: "Aggressive",
      budget: 10000,
      targetRoas: 1.9,
      cpc: 1.15,
      conversionRate: 0.1,
      averageOrderValue: 22,
      organicLiftPercent: 0.5,
    },
  ],
  selectedPlanId: "base-push",
};

export function safeDivide(numerator: number, denominator: number): number {
  if (!denominator || denominator === 0) return 0;
  const result = numerator / denominator;
  return Number.isFinite(result) ? result : 0;
}

export function calculateBaselineMetrics(baseline: AdPotentialBaseline): AdPotentialBaselineMetrics {
  const baselineTotalSales = n(baseline.paidSales) + n(baseline.organicSales);
  return {
    baselineTotalSales,
    baselineCpc: safeDivide(n(baseline.spend), n(baseline.clicks)),
    baselineCvr: safeDivide(n(baseline.orders), n(baseline.clicks)),
    baselineAov: safeDivide(n(baseline.paidSales), n(baseline.orders)),
    baselinePaidRoas: safeDivide(n(baseline.paidSales), n(baseline.spend)),
    baselineTotalRoas: safeDivide(baselineTotalSales, n(baseline.spend)),
    baselineTacos: safeDivide(n(baseline.spend), baselineTotalSales),
    baselineCtr: safeDivide(n(baseline.clicks), n(baseline.impressions)),
  };
}

export function calculatePlan(plan: AdPotentialPlan, baseline: AdPotentialBaseline): CalculatedAdPotentialPlan {
  const baselineMetrics = calculateBaselineMetrics(baseline);
  const budget = Math.max(0, n(plan.budget));
  const cpc = Math.max(0, n(plan.cpc));
  const conversionRate = clamp(n(plan.conversionRate), 0, 1);
  const averageOrderValue = Math.max(0, n(plan.averageOrderValue));
  const organicLiftPercent = Math.max(0, n(plan.organicLiftPercent));
  const targetRoas = Math.max(0, n(plan.targetRoas));
  const clicks = safeDivide(budget, cpc);
  const orders = clicks * conversionRate;
  const paidSales = orders * averageOrderValue;
  const paidRoas = safeDivide(paidSales, budget);
  const organicLiftSales = paidSales * organicLiftPercent;
  const totalSales = paidSales + organicLiftSales;
  const tacos = safeDivide(budget, totalSales);
  const targetPaidSales = budget * targetRoas;
  const targetGap = paidSales - targetPaidSales;
  const targetGapPercent = safeDivide(targetGap, targetPaidSales);
  const risk = getPlanRisk(
    { ...plan, budget, cpc, conversionRate, averageOrderValue, organicLiftPercent, targetRoas },
    baseline,
    baselineMetrics,
    { paidSales, targetPaidSales, tacos },
  );

  return {
    ...plan,
    budget,
    targetRoas,
    cpc,
    conversionRate,
    averageOrderValue,
    organicLiftPercent,
    clicks,
    orders,
    paidSales,
    paidRoas,
    organicLiftSales,
    totalSales,
    tacos,
    targetPaidSales,
    targetGap,
    targetGapPercent,
    riskLabel: risk.riskLabel,
    warnings: risk.warnings,
    riskScore: risk.riskScore,
  };
}

export function getPlanRisk(
  plan: AdPotentialPlan,
  baseline: AdPotentialBaseline,
  baselineMetrics: AdPotentialBaselineMetrics = calculateBaselineMetrics(baseline),
  calculated?: { paidSales: number; targetPaidSales: number; tacos: number },
): AdPotentialPlanRisk {
  const warnings: string[] = [];
  const paidSales = calculated?.paidSales ?? calculatePlanWithoutRisk(plan).paidSales;
  const targetPaidSales = calculated?.targetPaidSales ?? plan.budget * plan.targetRoas;
  const tacos = calculated?.tacos ?? calculatePlanWithoutRisk(plan).tacos;

  if (plan.budget > baseline.spend * 2) {
    warnings.push("Budget is more than 2x current spend.");
  }
  if (plan.budget > baseline.spend * 3) {
    warnings.push("Budget is more than 3x current spend. This is a major scaling jump.");
  }
  if (plan.cpc > baselineMetrics.baselineCpc * 1.25) {
    warnings.push("CPC is more than 25% above baseline.");
  }
  if (plan.cpc < baselineMetrics.baselineCpc * 0.75) {
    warnings.push("CPC is more than 25% below baseline. This may be too optimistic.");
  }
  if (plan.conversionRate > baselineMetrics.baselineCvr * 1.2) {
    warnings.push("CVR is more than 20% above baseline. This assumes meaningful conversion improvement.");
  }
  if (plan.conversionRate < baselineMetrics.baselineCvr * 0.8) {
    warnings.push("CVR is more than 20% below baseline.");
  }
  if (plan.averageOrderValue > baselineMetrics.baselineAov * 1.2) {
    warnings.push("AOV is more than 20% above baseline.");
  }
  if (plan.organicLiftPercent > 0.5) {
    warnings.push("Organic lift assumption is above 50% and should be treated as aggressive.");
  }
  if (paidSales < targetPaidSales) {
    warnings.push("Funnel forecast does not support the target ROAS.");
  }
  if (tacos > baselineMetrics.baselineTacos) {
    warnings.push("Projected TACOS is worse than baseline.");
  }

  const riskLabel =
    warnings.length <= 1
      ? "Low Risk"
      : warnings.length <= 3
        ? "Moderate Risk"
        : warnings.length <= 5
          ? "Aggressive"
          : "Unrealistic";

  return { riskLabel, warnings, riskScore: warnings.length };
}

export function calculatePlanLabels(plans: CalculatedAdPotentialPlan[]): AdPotentialPlanLabels[] {
  const labels = plans.map((plan) => ({ planId: plan.id, labels: [] as AdPotentialPlanLabels["labels"] }));
  const assign = (plan: CalculatedAdPotentialPlan | undefined, label: AdPotentialPlanLabels["labels"][number]) => {
    const target = labels.find((item) => item.planId === plan?.id);
    if (target && !target.labels.includes(label)) target.labels.push(label);
  };

  assign(maxBy(plans, (plan) => plan.totalSales), "Best Growth");
  assign(minBy(plans.filter((plan) => plan.tacos > 0), (plan) => plan.tacos), "Best Efficiency");
  assign(maxBy(plans, (plan) => plan.paidRoas), "Best ROAS");
  assign(calculateRecommendedPlan(plans), "Most Realistic");
  return labels;
}

export function calculateRecommendedPlan(plans: CalculatedAdPotentialPlan[]): CalculatedAdPotentialPlan | undefined {
  return [...plans].sort((a, b) => a.riskScore - b.riskScore || b.totalSales - a.totalSales)[0];
}

export function calculateWhatNeedsToBeTrue(plan: CalculatedAdPotentialPlan): AdPotentialWhatNeedsToBeTrue {
  const requiredPaidSales = plan.budget * plan.targetRoas;
  const requiredOrders = safeDivide(requiredPaidSales, plan.averageOrderValue);
  const requiredCvr = safeDivide(requiredOrders, plan.clicks);
  const requiredAov = safeDivide(requiredPaidSales, plan.orders);
  const requiredClicksWithCurrentCvr = safeDivide(requiredPaidSales, plan.averageOrderValue) / (plan.conversionRate || 1);
  const requiredCpc = safeDivide(plan.budget, requiredClicksWithCurrentCvr);

  return {
    requiredPaidSales,
    requiredOrders,
    requiredCvr,
    requiredCpc,
    requiredAov,
  };
}

export function validatePlannerState(state: AdPotentialPlannerState): Record<string, string> {
  const errors: Record<string, string> = {};
  if (state.baseline.spend < 0) errors["baseline.spend"] = "Spend must be 0 or greater.";
  if (state.baseline.clicks < 0) errors["baseline.clicks"] = "Clicks must be 0 or greater.";
  if (state.baseline.orders < 0) errors["baseline.orders"] = "Orders must be 0 or greater.";
  if (state.baseline.impressions < 0) errors["baseline.impressions"] = "Impressions must be 0 or greater.";
  if (state.defaults.plannedBudget < 0) errors["defaults.plannedBudget"] = "Budget must be 0 or greater.";
  if (state.defaults.targetRoas <= 0) errors["defaults.targetRoas"] = "Target ROAS must be greater than 0.";
  if (state.defaults.cpc <= 0) errors["defaults.cpc"] = "CPC must be greater than 0.";
  if (state.defaults.conversionRate < 0 || state.defaults.conversionRate > 1) errors["defaults.conversionRate"] = "CVR must be between 0% and 100%.";
  if (state.defaults.averageOrderValue <= 0) errors["defaults.averageOrderValue"] = "AOV must be greater than 0.";
  if (state.defaults.organicLiftPercent < 0) errors["defaults.organicLiftPercent"] = "Organic lift must be 0% or greater.";
  state.plans.forEach((plan) => {
    const prefix = `plans.${plan.id}`;
    if (plan.budget < 0) errors[`${prefix}.budget`] = "Budget must be 0 or greater.";
    if (plan.targetRoas <= 0) errors[`${prefix}.targetRoas`] = "Target ROAS must be greater than 0.";
    if (plan.cpc <= 0) errors[`${prefix}.cpc`] = "CPC must be greater than 0.";
    if (plan.conversionRate < 0 || plan.conversionRate > 1) errors[`${prefix}.conversionRate`] = "CVR must be between 0% and 100%.";
    if (plan.averageOrderValue <= 0) errors[`${prefix}.averageOrderValue`] = "AOV must be greater than 0.";
    if (plan.organicLiftPercent < 0) errors[`${prefix}.organicLiftPercent`] = "Organic lift must be 0% or greater.";
  });
  return errors;
}

export function normalizePlannerState(state: Partial<AdPotentialPlannerState> | null | undefined): AdPotentialPlannerState {
  const base = initialAdPotentialState;
  const plans = state?.plans?.length ? state.plans : base.plans;
  return {
    baseline: { ...base.baseline, ...state?.baseline },
    defaults: { ...base.defaults, ...state?.defaults },
    plans: plans.map((plan, index) => ({
      id: plan.id || `plan-${index + 1}`,
      name: plan.name || `Plan ${index + 1}`,
      budget: n(plan.budget),
      targetRoas: n(plan.targetRoas) || base.defaults.targetRoas,
      cpc: n(plan.cpc) || base.defaults.cpc,
      conversionRate: clamp(n(plan.conversionRate), 0, 1),
      averageOrderValue: n(plan.averageOrderValue) || base.defaults.averageOrderValue,
      organicLiftPercent: Math.max(0, n(plan.organicLiftPercent)),
    })),
    selectedPlanId: state?.selectedPlanId || plans[0]?.id || base.selectedPlanId,
  };
}

function calculatePlanWithoutRisk(plan: AdPotentialPlan) {
  const clicks = safeDivide(plan.budget, plan.cpc);
  const orders = clicks * plan.conversionRate;
  const paidSales = orders * plan.averageOrderValue;
  const organicLiftSales = paidSales * plan.organicLiftPercent;
  const totalSales = paidSales + organicLiftSales;
  return {
    paidSales,
    targetPaidSales: plan.budget * plan.targetRoas,
    tacos: safeDivide(plan.budget, totalSales),
  };
}

function n(value: number | null | undefined) {
  return Number.isFinite(value ?? NaN) ? Number(value) : 0;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function maxBy<T>(items: T[], selector: (item: T) => number) {
  return [...items].sort((a, b) => selector(b) - selector(a))[0];
}

function minBy<T>(items: T[], selector: (item: T) => number) {
  return [...items].sort((a, b) => selector(a) - selector(b))[0];
}
