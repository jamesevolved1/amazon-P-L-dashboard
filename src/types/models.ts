export type PnlStatus =
  | "Scale Candidate"
  | "Watch Margin"
  | "Unprofitable"
  | "Needs Price / Cost Fix"
  | "Data Missing";

export type AdSpendMode = "tacosGoal" | "adSpendAdjustment";
export type ForecastMode = "flat" | "velocity";

export interface FeeMatchAudit {
  referralFeeSource: string;
  fbaFeeSource: string;
  storageFeeSource: string;
  cogsSource: string;
}

export interface ProductSku {
  parentAsin?: string;
  asin: string;
  sku: string;
  title: string;
  listedPrice: number;
  unitsSold: number;
  totalSales: number;
  referralFeePerUnit: number;
  fbaFeePerUnit: number;
  storageFeePerUnit: number;
  labelingFeePerUnit: number;
  shippingToAmazonPerUnit: number;
  cogsPerUnit: number;
  adSpend: number;
  sourceFields?: Partial<Record<"sales" | "units" | "adSpend" | "fees" | "storage" | "cogs", string>>;
  feeAudit?: Partial<FeeMatchAudit>;
  importIssues?: string[];
  importedAt?: string;
}

export interface SkuScenarioOverride {
  tacosGoal: number | null;
  couponPercent: number | null;
  price: number | null;
  cogsPerUnit: number | null;
  adSpend: number | null;
  unitsSoldForecast: number | null;
}

export interface ScenarioAssumptions {
  name: string;
  mode: AdSpendMode;
  forecastMode: ForecastMode;
  forecastDays: number;
  velocityMultiplier: number;
  globalTacosGoal: number | null;
  globalCouponPercent: number;
  globalAdSpendChangePercent: number;
  globalPriceChangePercent: number;
  globalCogsChangePercent: number;
  globalFbaFeeChangePercent: number;
  globalReferralFeePercent: number | null;
  shippingToAmazonPerUnit: number | null;
  storageFeePerUnit: number | null;
  skuOverrides: Record<string, Partial<SkuScenarioOverride>>;
  parentTargets: Record<string, ParentAsinTarget>;
}

export interface ParentAsinTarget {
  tacosGoal: number | null;
  marginGoal: number | null;
}

export interface CalculatedSkuPnl {
  parentAsin: string;
  asin: string;
  sku: string;
  title: string;
  currentSales: number;
  scenarioSales: number;
  unitsSold: number;
  scenarioUnits: number;
  currentAdSpend: number;
  scenarioAdSpend: number;
  currentTacos: number;
  scenarioTacos: number;
  couponPercent: number;
  couponCost: number;
  currentAmazonFees: number;
  scenarioAmazonFees: number;
  currentCogs: number;
  scenarioCogs: number;
  currentProfit: number;
  estimatedProfit: number;
  profitMargin: number;
  currentProfitMargin: number;
  breakEvenTacos: number;
  maxProfitableAdSpend: number;
  netPriceAfterCoupon: number;
  status: PnlStatus;
  deltas: {
    sales: number;
    profit: number;
    margin: number;
    tacos: number;
    adSpend: number;
    couponCost: number;
  };
  unitEconomics: {
    currentPrice: number;
    scenarioPrice: number;
    referralFeePerUnit: number;
    fbaFeePerUnit: number;
    storageFeePerUnit: number;
    labelingFeePerUnit: number;
    shippingToAmazonPerUnit: number;
    cogsPerUnit: number;
    preAdProfitPerUnit: number;
  };
  feeAudit: FeeMatchAudit;
  dataIssues: string[];
}

export interface ParentAsinPnl {
  parentAsin: string;
  childCount: number;
  skuCount: number;
  currentSales: number;
  currentAdSpend: number;
  currentTacos: number;
  currentProfit: number;
  currentProfitMargin: number;
  totalSales: number;
  unitsSold: number;
  amazonFees: number;
  cogs: number;
  adSpend: number;
  tacos: number;
  couponCost: number;
  estimatedProfit: number;
  profitMargin: number;
  breakEvenTacos: number;
  maxProfitableAdSpend: number;
  targetTacos: number | null;
  targetMargin: number | null;
  targetMarginGap: number | null;
  profitableChildren: number;
  unprofitableChildren: number;
  dataMissingChildren: number;
  topChildTitle: string;
  childAsins: string[];
}

export interface PortfolioSummary {
  totalSales: number;
  totalUnitsSold: number;
  totalAdSpend: number;
  blendedTacos: number;
  estimatedProfit: number;
  blendedProfitMargin: number;
  totalCouponCost: number;
  breakEvenTacos: number;
  profitableSkus: number;
  unprofitableSkus: number;
  scaleCandidates: number;
}

export interface DataQualityIssue {
  severity: "high" | "medium" | "low";
  asin?: string;
  sku?: string;
  title: string;
  detail: string;
  items?: string[];
}

export interface ImportSummary {
  mode: "legacy-matrix" | "source-reports" | "master-workbook";
  fieldSources: Record<"sales" | "units" | "adSpend" | "fees" | "storage" | "cogs", string>;
  rowCounts: Record<string, number>;
}

export interface ClientAccount {
  id: string;
  name: string;
  marketplace?: string;
  tacosGoal?: number | null;
  couponPercent?: number;
  businessGoals?: ClientBusinessGoals;
}

export interface ClientBusinessGoals {
  monthlyAdBudget?: number | null;
  primaryTacosGoal?: number | null;
  acceptableTacosCeiling?: number | null;
  targetRoas?: number | null;
  minimumRoas?: number | null;
  currentProjectedSales?: number | null;
  desiredSalesNextPeriod?: number | null;
}

export interface AdPotentialBaseline {
  spend: number;
  paidSales: number;
  organicSales: number;
  clicks: number;
  orders: number;
  impressions: number;
}

export interface AdPotentialDefaults {
  plannedBudget: number;
  targetRoas: number;
  cpc: number;
  conversionRate: number;
  averageOrderValue: number;
  organicLiftPercent: number;
}

export interface AdPotentialPlan {
  id: string;
  name: string;
  budget: number;
  targetRoas: number;
  cpc: number;
  conversionRate: number;
  averageOrderValue: number;
  organicLiftPercent: number;
}

export interface AdPotentialPlannerState {
  baseline: AdPotentialBaseline;
  defaults: AdPotentialDefaults;
  plans: AdPotentialPlan[];
  selectedPlanId: string;
}

export interface AdPotentialBaselineMetrics {
  baselineTotalSales: number;
  baselineCpc: number;
  baselineCvr: number;
  baselineAov: number;
  baselinePaidRoas: number;
  baselineTotalRoas: number;
  baselineTacos: number;
  baselineCtr: number;
}

export type AdPotentialRiskLabel = "Low Risk" | "Moderate Risk" | "Aggressive" | "Unrealistic";

export interface AdPotentialPlanRisk {
  riskLabel: AdPotentialRiskLabel;
  warnings: string[];
  riskScore: number;
}

export interface CalculatedAdPotentialPlan extends AdPotentialPlan {
  clicks: number;
  orders: number;
  paidSales: number;
  paidRoas: number;
  organicLiftSales: number;
  totalSales: number;
  tacos: number;
  targetPaidSales: number;
  targetGap: number;
  targetGapPercent: number;
  riskLabel: AdPotentialRiskLabel;
  warnings: string[];
  riskScore: number;
}

export interface AdPotentialPlanLabels {
  planId: string;
  labels: Array<"Best Growth" | "Best Efficiency" | "Best ROAS" | "Most Realistic">;
}

export interface AdPotentialWhatNeedsToBeTrue {
  requiredPaidSales: number;
  requiredOrders: number;
  requiredCvr: number;
  requiredCpc: number;
  requiredAov: number;
}

export interface ReportingSourceConfig {
  masterSheetUrl: string;
  profitMatrixTabName: string;
  bulkCampaignTabName: string;
  campaignTabName: string;
  productTabName: string;
  searchTermTabName: string;
  dailyTabName: string;
  businessTabName: string;
  feePreviewTabName: string;
  storageTabName: string;
  campaignCsvUrl: string;
  productCsvUrl: string;
  searchTermCsvUrl: string;
  dailyCsvUrl: string;
  businessCsvUrl: string;
}

export interface ReportingCampaignRow {
  campaign: string;
  type: string;
  spend: number;
  sales: number;
  impressions: number;
  clicks: number;
  orders: number;
  budget: number;
  status: string;
}

export interface ReportingProductRow {
  product: string;
  asin: string;
  sku: string;
  spend: number;
  adSales: number;
  totalSales: number;
  impressions: number;
  clicks: number;
  orders: number;
}

export interface ReportingSearchTermRow {
  searchTerm: string;
  campaign: string;
  spend: number;
  sales: number;
  impressions: number;
  clicks: number;
  orders: number;
}

export interface ReportingDailyRow {
  day: string;
  spend: number;
  sales: number;
  impressions: number;
  clicks: number;
  orders: number;
}

export interface ReportingState {
  sourceConfig: ReportingSourceConfig;
  lastRefreshedAt: string | null;
  accountTotalSales?: number;
  campaigns: ReportingCampaignRow[];
  products: ReportingProductRow[];
  searchTerms: ReportingSearchTermRow[];
  daily: ReportingDailyRow[];
  errors: string[];
}

export type AppSection = "dashboard" | "clients" | "upload" | "sku-pnl" | "parent-asin" | "reporting" | "ad-potential" | "performance" | "settings";
