import { initialAdPotentialState, normalizePlannerState } from "./adPotentialCalculations";
import { normalizeReportingState } from "./reportingData";
import type { AdPotentialPlannerState, ClientAccount, ProductSku, ReportingState, ScenarioAssumptions } from "../types/models";

const key = "amazon-sku-profitability-scenarios";
const clientsKey = "amazon-sku-profitability-clients";
const activeClientKey = "amazon-sku-profitability-active-client";
const clientSkuDataKey = "amazon-sku-profitability-client-sku-data";
const adPotentialKey = "amazon-sku-profitability-ad-potential";
const reportingKey = "amazon-sku-profitability-reporting";

export const defaultClients: ClientAccount[] = [
  {
    id: "demo-redmond",
    name: "Demo Account",
    marketplace: "Amazon US",
    tacosGoal: 0.35,
    couponPercent: 0,
    businessGoals: {
      monthlyAdBudget: 800,
      primaryTacosGoal: 0.35,
      acceptableTacosCeiling: 0.4,
      targetRoas: 1.5,
      minimumRoas: 1,
      currentProjectedSales: 2713.51,
      desiredSalesNextPeriod: 3000,
    },
  },
];

function normalizeClient(client: ClientAccount): ClientAccount {
  return {
    marketplace: "Amazon US",
    tacosGoal: 0.35,
    couponPercent: 0,
    businessGoals: {},
    ...client,
  };
}

export function loadSavedScenarios(): ScenarioAssumptions[] {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as ScenarioAssumptions[]) : [];
  } catch {
    return [];
  }
}

export function saveScenarios(scenarios: ScenarioAssumptions[]) {
  localStorage.setItem(key, JSON.stringify(scenarios));
}

export function loadClients(): ClientAccount[] {
  try {
    const raw = localStorage.getItem(clientsKey);
    const parsed = raw ? (JSON.parse(raw) as ClientAccount[]) : [];
    return parsed.length ? parsed.map(normalizeClient) : defaultClients;
  } catch {
    return defaultClients;
  }
}

export function saveClients(clients: ClientAccount[]) {
  localStorage.setItem(clientsKey, JSON.stringify(clients));
}

export function loadActiveClientId(clients: ClientAccount[]) {
  const stored = localStorage.getItem(activeClientKey);
  return clients.some((client) => client.id === stored) ? stored! : clients[0]?.id ?? "";
}

export function saveActiveClientId(clientId: string) {
  localStorage.setItem(activeClientKey, clientId);
}

export function loadClientSkuData(): Record<string, ProductSku[]> {
  try {
    const raw = localStorage.getItem(clientSkuDataKey);
    return raw ? (JSON.parse(raw) as Record<string, ProductSku[]>) : {};
  } catch {
    return {};
  }
}

export function saveClientSkuData(data: Record<string, ProductSku[]>) {
  localStorage.setItem(clientSkuDataKey, JSON.stringify(data));
}

export function loadAdPotentialStates(): Record<string, AdPotentialPlannerState> {
  try {
    const raw = localStorage.getItem(adPotentialKey);
    const parsed = raw ? (JSON.parse(raw) as Record<string, AdPotentialPlannerState>) : {};
    return Object.entries(parsed).reduce<Record<string, AdPotentialPlannerState>>((acc, [clientId, state]) => {
      acc[clientId] = normalizePlannerState(state);
      return acc;
    }, {});
  } catch {
    return {};
  }
}

export function loadAdPotentialState(clientId: string): AdPotentialPlannerState {
  return loadAdPotentialStates()[clientId] ?? initialAdPotentialState;
}

export function saveAdPotentialStates(data: Record<string, AdPotentialPlannerState>) {
  localStorage.setItem(adPotentialKey, JSON.stringify(data));
}

export function saveAdPotentialState(clientId: string, state: AdPotentialPlannerState) {
  const next = { ...loadAdPotentialStates(), [clientId]: normalizePlannerState(state) };
  saveAdPotentialStates(next);
}

export function loadReportingStates(): Record<string, ReportingState> {
  try {
    const raw = localStorage.getItem(reportingKey);
    const parsed = raw ? (JSON.parse(raw) as Record<string, ReportingState>) : {};
    return Object.entries(parsed).reduce<Record<string, ReportingState>>((acc, [clientId, state]) => {
      acc[clientId] = normalizeReportingState(state);
      return acc;
    }, {});
  } catch {
    return {};
  }
}

export function saveReportingStates(data: Record<string, ReportingState>) {
  localStorage.setItem(reportingKey, JSON.stringify(data));
}
