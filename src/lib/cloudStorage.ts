import { defaultScenario } from "./mockData";
import { defaultClients } from "./storage";
import { normalizePlannerState } from "./adPotentialCalculations";
import { supabase } from "./supabase";
import type { AdPotentialPlannerState, ClientAccount, ProductSku, ScenarioAssumptions } from "../types/models";

export interface CloudState {
  clients: ClientAccount[];
  activeClientId: string;
  clientSkuData: Record<string, ProductSku[]>;
  workspaceWarnings: Record<string, string[]>;
  adPotentialStates: Record<string, AdPotentialPlannerState>;
  scenarios: ScenarioAssumptions[];
}

interface ClientRow {
  id: string;
  name: string;
  marketplace: string | null;
  tacos_goal: number | null;
  coupon_percent: number | null;
}

interface WorkspaceRow {
  client_id: string;
  sku_data: ProductSku[] | null;
  import_warnings: string[] | null;
  ad_potential_state: AdPotentialPlannerState | null;
}

interface ScenarioRow {
  assumptions: ScenarioAssumptions;
}

function requireSupabase() {
  if (!supabase) throw new Error("Supabase is not configured.");
  return supabase;
}

function fromClientRow(row: ClientRow): ClientAccount {
  return {
    id: row.id,
    name: row.name,
    marketplace: row.marketplace ?? "Amazon US",
    tacosGoal: row.tacos_goal,
    couponPercent: row.coupon_percent ?? 0,
  };
}

export async function loadCloudState(userId: string): Promise<CloudState> {
  const client = requireSupabase();
  const { data: clientRows, error: clientsError } = await client
    .from("clients")
    .select("id,name,marketplace,tacos_goal,coupon_percent")
    .eq("user_id", userId)
    .order("created_at", { ascending: true });

  if (clientsError) throw clientsError;

  let clients = (clientRows as ClientRow[] | null)?.map(fromClientRow) ?? [];
  if (!clients.length) {
    const created = await createCloudClient(userId, defaultClients[0]);
    clients = [created];
  }

  const clientIds = clients.map((item) => item.id);
  const [{ data: workspaceRows, error: workspaceError }, { data: scenarioRows, error: scenariosError }] = await Promise.all([
    client.from("client_workspaces").select("client_id,sku_data,import_warnings,ad_potential_state").in("client_id", clientIds),
    client.from("scenarios").select("assumptions").in("client_id", clientIds).order("created_at", { ascending: true }),
  ]);

  if (workspaceError) throw workspaceError;
  if (scenariosError) throw scenariosError;

  const clientSkuData = ((workspaceRows as WorkspaceRow[] | null) ?? []).reduce<Record<string, ProductSku[]>>((acc, row) => {
    acc[row.client_id] = row.sku_data ?? [];
    return acc;
  }, {});
  const workspaceWarnings = ((workspaceRows as WorkspaceRow[] | null) ?? []).reduce<Record<string, string[]>>((acc, row) => {
    acc[row.client_id] = row.import_warnings ?? [];
    return acc;
  }, {});
  const adPotentialStates = ((workspaceRows as WorkspaceRow[] | null) ?? []).reduce<Record<string, AdPotentialPlannerState>>((acc, row) => {
    if (row.ad_potential_state) acc[row.client_id] = normalizePlannerState(row.ad_potential_state);
    return acc;
  }, {});

  return {
    clients,
    activeClientId: clients[0]?.id ?? "",
    clientSkuData,
    workspaceWarnings,
    adPotentialStates,
    scenarios: ((scenarioRows as ScenarioRow[] | null) ?? []).map((row) => ({ ...defaultScenario, ...row.assumptions })),
  };
}

export async function createCloudClient(userId: string, clientAccount: Omit<ClientAccount, "id"> | ClientAccount) {
  const client = requireSupabase();
  const { data, error } = await client
    .from("clients")
    .insert({
      user_id: userId,
      name: clientAccount.name,
      marketplace: clientAccount.marketplace ?? "Amazon US",
      tacos_goal: clientAccount.tacosGoal ?? null,
      coupon_percent: clientAccount.couponPercent ?? 0,
    })
    .select("id,name,marketplace,tacos_goal,coupon_percent")
    .single();

  if (error) throw error;
  return fromClientRow(data as ClientRow);
}

export async function updateCloudClient(userId: string, clientId: string, patch: Partial<ClientAccount>) {
  const client = requireSupabase();
  const update: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (patch.name !== undefined) update.name = patch.name;
  if (patch.marketplace !== undefined) update.marketplace = patch.marketplace;
  if (patch.tacosGoal !== undefined) update.tacos_goal = patch.tacosGoal;
  if (patch.couponPercent !== undefined) update.coupon_percent = patch.couponPercent;

  const { error } = await client.from("clients").update(update).eq("id", clientId).eq("user_id", userId);
  if (error) throw error;
}

export async function deleteCloudClient(userId: string, clientId: string) {
  const client = requireSupabase();
  const { error } = await client.from("clients").delete().eq("id", clientId).eq("user_id", userId);
  if (error) throw error;
}

export async function saveCloudWorkspace(userId: string, clientId: string, skuData: ProductSku[], importWarnings: string[], adPotentialState?: AdPotentialPlannerState) {
  const client = requireSupabase();
  const payload: Record<string, unknown> = {
    user_id: userId,
    client_id: clientId,
    sku_data: skuData,
    import_warnings: importWarnings,
    updated_at: new Date().toISOString(),
  };
  if (adPotentialState) payload.ad_potential_state = normalizePlannerState(adPotentialState);
  const { error } = await client.from("client_workspaces").upsert(payload, { onConflict: "client_id" });
  if (error) throw error;
}

export async function saveCloudAdPotentialState(userId: string, clientId: string, state: AdPotentialPlannerState) {
  const client = requireSupabase();
  const { error } = await client.from("client_workspaces").upsert(
    {
      user_id: userId,
      client_id: clientId,
      ad_potential_state: normalizePlannerState(state),
      updated_at: new Date().toISOString(),
    },
    { onConflict: "client_id" },
  );
  if (error) throw error;
}

export async function saveCloudScenario(userId: string, clientId: string, scenario: ScenarioAssumptions) {
  const client = requireSupabase();
  const { error } = await client.from("scenarios").upsert(
    {
      user_id: userId,
      client_id: clientId,
      name: scenario.name,
      assumptions: scenario,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "client_id,name" },
  );
  if (error) throw error;
}

export async function deleteCloudScenario(userId: string, clientId: string, name: string) {
  const client = requireSupabase();
  const { error } = await client.from("scenarios").delete().eq("user_id", userId).eq("client_id", clientId).eq("name", name);
  if (error) throw error;
}
