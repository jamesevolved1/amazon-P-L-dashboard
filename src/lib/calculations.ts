import type {
  CalculatedSkuPnl,
  DataQualityIssue,
  ParentAsinPnl,
  PortfolioSummary,
  ProductSku,
  PnlStatus,
  ScenarioAssumptions,
} from "../types/models";

const n = (value: number | null | undefined) =>
  Number.isFinite(value ?? NaN) ? Number(value) : 0;

const pct = (value: number | null | undefined) => Math.max(-0.95, n(value));

const keyForSku = (sku: ProductSku) => sku.sku || sku.asin;

const missing = (value: number) => !Number.isFinite(value) || value <= 0;

const isParentOnlyRecord = (sku: ProductSku) => {
  const hasSku = Boolean(sku.sku?.trim());
  const asin = sku.asin?.trim();
  const parentAsin = sku.parentAsin?.trim();
  const hasCommercialActivity = n(sku.totalSales) > 0 || n(sku.unitsSold) > 0 || n(sku.adSpend) > 0;
  return !hasSku && Boolean(asin) && Boolean(parentAsin) && asin === parentAsin && !hasCommercialActivity;
};

export function calculateSkuPnl(
  sku: ProductSku,
  scenario: ScenarioAssumptions,
): CalculatedSkuPnl {
  const normalizedScenario = normalizeScenario(scenario);
  const override = scenario.skuOverrides[keyForSku(sku)] ?? scenario.skuOverrides[sku.asin] ?? {};
  const parentTarget = normalizedScenario.parentTargets[sku.parentAsin || sku.asin] ?? {};
  const currentPrice = sku.listedPrice || (sku.unitsSold ? sku.totalSales / sku.unitsSold : 0);
  const scenarioPrice =
    override.price ?? currentPrice * (1 + pct(scenario.globalPriceChangePercent));
  const velocityUnits = (sku.unitsSold / 30) * normalizedScenario.forecastDays * normalizedScenario.velocityMultiplier;
  const scenarioUnits = override.unitsSoldForecast ?? (normalizedScenario.forecastMode === "velocity" ? velocityUnits : sku.unitsSold);
  const scenarioSales = Math.max(0, scenarioPrice * scenarioUnits);
  const couponPercent = override.couponPercent ?? scenario.globalCouponPercent;
  const couponCost = Math.max(0, scenarioSales * couponPercent);

  const referralFeeRate =
    scenario.globalReferralFeePercent ??
    (currentPrice ? sku.referralFeePerUnit / currentPrice : 0);
  const referralFeePerUnit = Math.max(0, scenarioPrice * referralFeeRate);
  const fbaFeePerUnit = Math.max(
    0,
    sku.fbaFeePerUnit * (1 + pct(scenario.globalFbaFeeChangePercent)),
  );
  const storageFeePerUnit = scenario.storageFeePerUnit ?? sku.storageFeePerUnit;
  const shippingToAmazonPerUnit =
    scenario.shippingToAmazonPerUnit ?? sku.shippingToAmazonPerUnit;
  const cogsPerUnit =
    override.cogsPerUnit ?? sku.cogsPerUnit * (1 + pct(scenario.globalCogsChangePercent));

  const scenarioAmazonFees =
    scenarioUnits *
    (referralFeePerUnit +
      fbaFeePerUnit +
      storageFeePerUnit +
      sku.labelingFeePerUnit +
      shippingToAmazonPerUnit);
  const scenarioCogs = scenarioUnits * cogsPerUnit;
  const currentAmazonFees =
    sku.unitsSold *
    (sku.referralFeePerUnit +
      sku.fbaFeePerUnit +
      sku.storageFeePerUnit +
      sku.labelingFeePerUnit +
      sku.shippingToAmazonPerUnit);
  const currentCogs = sku.unitsSold * sku.cogsPerUnit;
  const currentProfit = sku.totalSales - currentAmazonFees - currentCogs - sku.adSpend;
  const currentTacos = sku.totalSales ? sku.adSpend / sku.totalSales : 0;
  const currentProfitMargin = sku.totalSales ? currentProfit / sku.totalSales : 0;

  // Scenario ad spend is deliberately separated from coupon cost so operators can
  // see paid media efficiency and promo investment independently.
  const scenarioAdSpend =
    override.adSpend ??
    (scenario.mode === "tacosGoal"
      ? scenarioSales * (override.tacosGoal ?? parentTarget.tacosGoal ?? scenario.globalTacosGoal ?? currentTacos)
      : sku.adSpend * (1 + pct(scenario.globalAdSpendChangePercent)));

  const estimatedProfit =
    scenarioSales - scenarioAmazonFees - scenarioCogs - scenarioAdSpend - couponCost;
  const profitMargin = scenarioSales ? estimatedProfit / scenarioSales : 0;
  const preAdProfit = scenarioSales - scenarioAmazonFees - scenarioCogs - couponCost;
  const breakEvenTacos = scenarioSales ? preAdProfit / scenarioSales : 0;
  const maxProfitableAdSpend = Math.max(0, preAdProfit);
  const scenarioTacos = scenarioSales ? scenarioAdSpend / scenarioSales : 0;

  const dataIssues = skuDataIssues(sku);
  const status = getStatus({
    dataIssues,
    estimatedProfit,
    profitMargin,
    breakEvenTacos,
    scenarioTacos,
  });

  return {
    asin: sku.asin,
    parentAsin: sku.parentAsin || sku.asin,
    sku: sku.sku,
    title: sku.title,
    currentSales: sku.totalSales,
    scenarioSales,
    unitsSold: sku.unitsSold,
    scenarioUnits,
    currentAdSpend: sku.adSpend,
    scenarioAdSpend,
    currentTacos,
    scenarioTacos,
    couponPercent,
    couponCost,
    currentAmazonFees,
    scenarioAmazonFees,
    currentCogs,
    scenarioCogs,
    currentProfit,
    estimatedProfit,
    profitMargin,
    currentProfitMargin,
    breakEvenTacos,
    maxProfitableAdSpend,
    netPriceAfterCoupon: scenarioPrice * (1 - couponPercent),
    status,
    deltas: {
      sales: scenarioSales - sku.totalSales,
      profit: estimatedProfit - currentProfit,
      margin: profitMargin - currentProfitMargin,
      tacos: scenarioTacos - currentTacos,
      adSpend: scenarioAdSpend - sku.adSpend,
      couponCost,
    },
    unitEconomics: {
      currentPrice,
      scenarioPrice,
      referralFeePerUnit,
      fbaFeePerUnit,
      storageFeePerUnit,
      labelingFeePerUnit: sku.labelingFeePerUnit,
      shippingToAmazonPerUnit,
      cogsPerUnit,
      preAdProfitPerUnit: scenarioUnits ? preAdProfit / scenarioUnits : 0,
    },
    feeAudit: {
      referralFeeSource: sku.feeAudit?.referralFeeSource ?? sku.sourceFields?.fees ?? "Not matched",
      fbaFeeSource: sku.feeAudit?.fbaFeeSource ?? sku.sourceFields?.fees ?? "Not matched",
      storageFeeSource: sku.feeAudit?.storageFeeSource ?? sku.sourceFields?.storage ?? "Not matched",
      cogsSource: sku.feeAudit?.cogsSource ?? sku.sourceFields?.cogs ?? "Not matched",
    },
    dataIssues,
  };
}

export function aggregateParentAsinPnl(rows: CalculatedSkuPnl[], scenario: ScenarioAssumptions): ParentAsinPnl[] {
  const normalizedScenario = normalizeScenario(scenario);
  const groups = new Map<string, CalculatedSkuPnl[]>();
  rows.forEach((row) => {
    const parentAsin = row.parentAsin || row.asin || "Unmapped Parent";
    groups.set(parentAsin, [...(groups.get(parentAsin) ?? []), row]);
  });

  return [...groups.entries()]
    .map(([parentAsin, children]) => {
      const totalSales = children.reduce((sum, row) => sum + row.scenarioSales, 0);
      const currentSales = children.reduce((sum, row) => sum + row.currentSales, 0);
      const adSpend = children.reduce((sum, row) => sum + row.scenarioAdSpend, 0);
      const currentAdSpend = children.reduce((sum, row) => sum + row.currentAdSpend, 0);
      const estimatedProfit = children.reduce((sum, row) => sum + row.estimatedProfit, 0);
      const currentProfit = children.reduce((sum, row) => sum + row.currentProfit, 0);
      const maxProfitableAdSpend = children.reduce((sum, row) => sum + row.maxProfitableAdSpend, 0);
      const childAsins = [...new Set(children.map((row) => row.asin).filter(Boolean))];
      const skuIds = new Set(children.map((row) => row.sku || row.asin).filter(Boolean));
      const topChild = [...children].sort((a, b) => b.scenarioSales - a.scenarioSales)[0];
      const target = normalizedScenario.parentTargets[parentAsin] ?? {};
      const profitMargin = totalSales ? estimatedProfit / totalSales : 0;
      const targetMargin = target.marginGoal ?? null;

      return {
        parentAsin,
        childCount: childAsins.length || children.length,
        skuCount: skuIds.size,
        currentSales,
        currentAdSpend,
        currentTacos: currentSales ? currentAdSpend / currentSales : 0,
        currentProfit,
        currentProfitMargin: currentSales ? currentProfit / currentSales : 0,
        totalSales,
        unitsSold: children.reduce((sum, row) => sum + row.scenarioUnits, 0),
        amazonFees: children.reduce((sum, row) => sum + row.scenarioAmazonFees, 0),
        cogs: children.reduce((sum, row) => sum + row.scenarioCogs, 0),
        adSpend,
        tacos: totalSales ? adSpend / totalSales : 0,
        couponCost: children.reduce((sum, row) => sum + row.couponCost, 0),
        estimatedProfit,
        profitMargin,
        breakEvenTacos: totalSales ? maxProfitableAdSpend / totalSales : 0,
        maxProfitableAdSpend,
        targetTacos: target.tacosGoal ?? null,
        targetMargin,
        targetMarginGap: targetMargin === null ? null : profitMargin - targetMargin,
        profitableChildren: children.filter((row) => row.estimatedProfit >= 0).length,
        unprofitableChildren: children.filter((row) => row.estimatedProfit < 0).length,
        dataMissingChildren: children.filter((row) => row.status === "Data Missing").length,
        topChildTitle: topChild?.title ?? "",
        childAsins,
      } satisfies ParentAsinPnl;
    })
    .sort((a, b) => b.estimatedProfit - a.estimatedProfit);
}

export function calculatePortfolio(
  skus: ProductSku[],
  scenario: ScenarioAssumptions,
): { rows: CalculatedSkuPnl[]; summary: PortfolioSummary; issues: DataQualityIssue[] } {
  const normalizedScenario = normalizeScenario(scenario);
  const modelSkus = skus.filter((sku) => !isParentOnlyRecord(sku));
  const rows = modelSkus.map((sku) => calculateSkuPnl(sku, normalizedScenario));
  const totalSales = sum(rows, "scenarioSales");
  const estimatedProfit = sum(rows, "estimatedProfit");
  const totalAdSpend = sum(rows, "scenarioAdSpend");
  const totalCouponCost = sum(rows, "couponCost");
  const breakEvenAdSpend = sum(rows, "maxProfitableAdSpend");

  return {
    rows,
    summary: {
      totalSales,
      totalUnitsSold: rows.reduce((acc, row) => acc + row.scenarioUnits, 0),
      totalAdSpend,
      blendedTacos: totalSales ? totalAdSpend / totalSales : 0,
      estimatedProfit,
      blendedProfitMargin: totalSales ? estimatedProfit / totalSales : 0,
      totalCouponCost,
      breakEvenTacos: totalSales ? breakEvenAdSpend / totalSales : 0,
      profitableSkus: rows.filter((row) => row.estimatedProfit >= 0).length,
      unprofitableSkus: rows.filter((row) => row.estimatedProfit < 0).length,
      scaleCandidates: rows.filter((row) => row.status === "Scale Candidate").length,
    },
    issues: buildQualityIssues(modelSkus, rows),
  };
}

function normalizeScenario(scenario: ScenarioAssumptions): ScenarioAssumptions {
  return {
    ...scenario,
    forecastMode: scenario.forecastMode ?? "flat",
    forecastDays: scenario.forecastDays || 30,
    velocityMultiplier: scenario.velocityMultiplier || 1,
    parentTargets: scenario.parentTargets ?? {},
  };
}

function sum(rows: CalculatedSkuPnl[], key: keyof CalculatedSkuPnl) {
  return rows.reduce((acc, row) => acc + Number(row[key] || 0), 0);
}

function skuDataIssues(sku: ProductSku) {
  if (isParentOnlyRecord(sku)) return [];
  const issues: string[] = [...(sku.importIssues ?? [])];
  if (!sku.asin && !sku.sku) issues.push("Missing ASIN/SKU");
  if (!sku.asin && sku.sku) issues.push("Missing ASIN");
  if (missing(sku.totalSales)) issues.push("Missing sales data");
  if (missing(sku.unitsSold)) issues.push("Missing units sold");
  if (missing(sku.cogsPerUnit)) issues.push("Missing COGS");
  if (missing(sku.fbaFeePerUnit)) issues.push("Missing FBA fees");
  if (sku.adSpend < 0 || sku.totalSales < 0 || sku.unitsSold < 0) {
    issues.push("Negative or impossible values");
  }
  return issues;
}

function getStatus(input: {
  dataIssues: string[];
  estimatedProfit: number;
  profitMargin: number;
  breakEvenTacos: number;
  scenarioTacos: number;
}): PnlStatus {
  if (input.dataIssues.some((issue) => issue.startsWith("Missing"))) return "Data Missing";
  if (input.estimatedProfit < 0) return "Unprofitable";
  if (input.breakEvenTacos < 0.08) return "Needs Price / Cost Fix";
  if (input.profitMargin < 0.15) return "Watch Margin";
  if (input.scenarioTacos < input.breakEvenTacos * 0.72 && input.profitMargin >= 0.2) {
    return "Scale Candidate";
  }
  return "Watch Margin";
}

function buildQualityIssues(skus: ProductSku[], rows: CalculatedSkuPnl[]) {
  const issues: DataQualityIssue[] = [];
  const seenAsins = new Set<string>();
  const grouped = new Map<string, CalculatedSkuPnl[]>();
  const importedAtDates = skus
    .map((sku) => (sku.importedAt ? new Date(sku.importedAt) : null))
    .filter((date): date is Date => Boolean(date && !Number.isNaN(date.getTime())));
  const oldestImport = importedAtDates.length ? new Date(Math.min(...importedAtDates.map((date) => date.getTime()))) : null;
  const newestImport = importedAtDates.length ? new Date(Math.max(...importedAtDates.map((date) => date.getTime()))) : null;

  if (oldestImport) {
    const ageDays = Math.floor((Date.now() - oldestImport.getTime()) / 86_400_000);
    if (ageDays > 45) {
      issues.push({
        severity: "medium",
        title: "Report data may be stale",
        detail: `Oldest imported data is ${ageDays} days old. Re-upload source reports before making spend or pricing decisions.`,
      });
    } else if (ageDays > 30) {
      issues.push({
        severity: "low",
        title: "Report freshness reminder",
        detail: `Oldest imported data is ${ageDays} days old. Consider refreshing reports soon.`,
      });
    }
  } else if (skus.length) {
    issues.push({
      severity: "low",
      title: "Report freshness unknown",
      detail: "This workspace was created before upload timestamps were tracked. Re-upload reports to enable freshness checks.",
    });
  }

  if (oldestImport && newestImport) {
    const spreadDays = Math.floor((newestImport.getTime() - oldestImport.getTime()) / 86_400_000);
    if (spreadDays > 14) {
      issues.push({
        severity: "medium",
        title: "Mixed report freshness",
        detail: `Uploaded source data spans ${spreadDays} days. Rebuild from reports from the same reporting period when possible.`,
      });
    }
  }

  skus.forEach((sku) => {
    if (sku.asin && seenAsins.has(sku.asin)) {
      issues.push({
        severity: "low",
        asin: sku.asin,
        sku: sku.sku,
        title: "Duplicate ASIN",
        detail: "Multiple rows share the same ASIN. Confirm parent/child SKU mapping.",
      });
    }
    if (sku.asin) seenAsins.add(sku.asin);
  });

  rows.forEach((row) => {
    row.dataIssues.forEach((issue) => {
      const group = grouped.get(issue) ?? [];
      group.push(row);
      grouped.set(issue, group);
    });
    if (row.breakEvenTacos < 0) {
      issues.push({
        severity: "high",
        asin: row.asin,
        sku: row.sku,
        title: "Negative break-even TACOS",
        detail: "This SKU is unprofitable before advertising.",
      });
    }
  });

  grouped.forEach((affectedRows, issue) => {
    const severity = issue.includes("COGS") || issue.includes("fees") || issue.includes("Duplicate active") || issue.includes("currency") ? "high" : "medium";
    const examples = affectedRows
      .slice(0, 4)
      .map((row) => row.sku || row.asin || row.title)
      .filter(Boolean)
      .join(", ");
    const items = affectedRows.map((row) => [row.sku, row.asin, row.title].filter(Boolean).join(" · "));
    issues.push({
      severity,
      asin: affectedRows.length === 1 ? affectedRows[0].asin : undefined,
      sku: affectedRows.length === 1 ? affectedRows[0].sku : undefined,
      title: affectedRows.length === 1 ? issue : `${issue} for ${affectedRows.length} SKUs`,
      detail:
        affectedRows.length === 1
          ? affectedRows[0].title
          : `${examples}${affectedRows.length > 4 ? `, and ${affectedRows.length - 4} more` : ""}`,
      items,
    });
  });

  return issues;
}
