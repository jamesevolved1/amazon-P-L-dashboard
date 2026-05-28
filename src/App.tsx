import { CheckCircle2, FileSpreadsheet, LineChart, PackageCheck, RefreshCw, Target, Trash2, TrendingUp } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { AdPotential } from "./components/AdPotential";
import { DataQualityPanel } from "./components/DataQualityPanel";
import { FileImport } from "./components/FileImport";
import { KpiCard } from "./components/KpiCard";
import { ParentAsinProfitTable } from "./components/ParentAsinProfitTable";
import { ProfitCharts } from "./components/ProfitCharts";
import { ReportingDashboard } from "./components/ReportingDashboard";
import { ScenarioComparisonTable } from "./components/ScenarioComparisonTable";
import { ScenarioControls } from "./components/ScenarioControls";
import { Sidebar } from "./components/Sidebar";
import { SkuDetailDrawer } from "./components/SkuDetailDrawer";
import { SkuProfitTable } from "./components/SkuProfitTable";
import { TacosSnapshot } from "./components/TacosSnapshot";
import { aggregateParentAsinPnl, calculatePortfolio } from "./lib/calculations";
import { createCloudClient, deleteCloudClient, deleteCloudScenario, loadCloudState, saveCloudAdPotentialState, saveCloudReportingState, saveCloudScenario, saveCloudWorkspace, updateCloudClient } from "./lib/cloudStorage";
import { currency, number, percent } from "./lib/format";
import { defaultScenario, sampleSkus } from "./lib/mockData";
import { initialAdPotentialState } from "./lib/adPotentialCalculations";
import { emptyReportingSourceConfig, emptyReportingState, refreshReportingFromSheets } from "./lib/reportingData";
import { loadActiveClientId, loadAdPotentialStates, loadClients, loadClientSkuData, loadReportingStates, loadSavedScenarios, saveActiveClientId, saveAdPotentialStates, saveClients, saveClientSkuData, saveReportingStates, saveScenarios } from "./lib/storage";
import type { SupabaseSession } from "./lib/supabase";
import type { AdPotentialPlannerState, AppSection, CalculatedSkuPnl, ClientAccount, ProductSku, ReportingState, ScenarioAssumptions } from "./types/models";

export default function App({ session }: { session: SupabaseSession | null }) {
  const [scenario, setScenario] = useState<ScenarioAssumptions>(() => {
    const initialClients = loadClients();
    const initialActiveClientId = loadActiveClientId(initialClients);
    const initialClient = initialClients.find((client) => client.id === initialActiveClientId);
    return {
      ...defaultScenario,
      globalTacosGoal: initialClient?.tacosGoal ?? defaultScenario.globalTacosGoal,
      globalCouponPercent: initialClient?.couponPercent ?? defaultScenario.globalCouponPercent,
    };
  });
  const [warnings, setWarnings] = useState<string[]>([]);
  const [saved, setSaved] = useState<ScenarioAssumptions[]>(() => loadSavedScenarios());
  const [selected, setSelected] = useState<CalculatedSkuPnl | null>(null);
  const [clients, setClients] = useState(() => loadClients());
  const [activeClientId, setActiveClientId] = useState(() => loadActiveClientId(loadClients()));
  const [clientSkuData, setClientSkuData] = useState<Record<string, ProductSku[]>>(() => loadClientSkuData());
  const [adPotentialStates, setAdPotentialStates] = useState<Record<string, AdPotentialPlannerState>>(() => loadAdPotentialStates());
  const [reportingStates, setReportingStates] = useState<Record<string, ReportingState>>(() => loadReportingStates());
  const [workspaceWarnings, setWorkspaceWarnings] = useState<Record<string, string[]>>({});
  const [cloudStatus, setCloudStatus] = useState<string>("");
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [scenarioControlsExpanded, setScenarioControlsExpanded] = useState(false);
  const [activeSection, setActiveSection] = useState<AppSection>("reporting");
  const [clientGoalsOpen, setClientGoalsOpen] = useState<Record<string, boolean>>({});
  const [deleteClientId, setDeleteClientId] = useState<string | null>(null);
  const [deleteClientText, setDeleteClientText] = useState("");
  const userId = session?.user.id ?? null;

  useEffect(() => {
    if (!userId) return;
    let active = true;
    setCloudStatus("Loading cloud workspace...");
    loadCloudState(userId)
      .then((state) => {
        if (!active) return;
        setClients(state.clients);
        setActiveClientId(state.activeClientId);
        setClientSkuData(state.clientSkuData);
        setAdPotentialStates(state.adPotentialStates);
        setReportingStates(state.reportingStates);
        setWorkspaceWarnings(state.workspaceWarnings);
        setWarnings(state.workspaceWarnings[state.activeClientId] ?? []);
        setSaved(state.scenarios);
        saveClients(state.clients);
        saveActiveClientId(state.activeClientId);
        saveClientSkuData(state.clientSkuData);
        saveAdPotentialStates(state.adPotentialStates);
        saveReportingStates(state.reportingStates);
        saveScenarios(state.scenarios);
        setCloudStatus("Cloud saved");
      })
      .catch((error) => {
        if (!active) return;
        setCloudStatus(`Cloud sync issue: ${error.message}`);
      });
    return () => {
      active = false;
    };
  }, [userId]);

  const skus = clientSkuData[activeClientId] ?? sampleSkus;
  const activeAdPotentialState = adPotentialStates[activeClientId] ?? initialAdPotentialState;
  const activeReportingState = reportingStates[activeClientId] ?? emptyReportingState;
  const portfolio = useMemo(() => calculatePortfolio(skus, scenario), [skus, scenario]);
  const parentRows = useMemo(() => aggregateParentAsinPnl(portfolio.rows, scenario), [portfolio.rows, scenario]);
  const savedComparisons = useMemo(
    () => saved.map((savedScenario) => ({ scenario: savedScenario, summary: calculatePortfolio(skus, savedScenario).summary })),
    [saved, skus],
  );

  const saveActiveScenario = () => {
    const next = [...saved.filter((item) => item.name !== scenario.name), scenario];
    setSaved(next);
    saveScenarios(next);
    if (userId && activeClientId) {
      setCloudStatus("Saving scenario...");
      saveCloudScenario(userId, activeClientId, scenario)
        .then(() => setCloudStatus("Cloud saved"))
        .catch((error) => setCloudStatus(`Cloud sync issue: ${error.message}`));
    }
  };

  const deleteScenario = (name: string) => {
    const next = saved.filter((item) => item.name !== name);
    setSaved(next);
    saveScenarios(next);
    if (userId && activeClientId) {
      setCloudStatus("Deleting scenario...");
      deleteCloudScenario(userId, activeClientId, name)
        .then(() => setCloudStatus("Cloud saved"))
        .catch((error) => setCloudStatus(`Cloud sync issue: ${error.message}`));
    }
  };

  const summary = portfolio.summary;
  const currentAdSpend = portfolio.rows.reduce((sum, row) => sum + row.currentAdSpend, 0);
  const currentSales = portfolio.rows.reduce((sum, row) => sum + row.currentSales, 0);
  const currentProfit = portfolio.rows.reduce((sum, row) => sum + row.currentProfit, 0);
  const currentTacos = currentSales ? currentAdSpend / currentSales : 0;
  const currentProfitMargin = currentSales ? currentProfit / currentSales : 0;
  const applyClientGoalsToScenario = (client: ClientAccount, baseScenario: ScenarioAssumptions): ScenarioAssumptions => ({
    ...baseScenario,
    globalTacosGoal: client.tacosGoal ?? baseScenario.globalTacosGoal,
    globalCouponPercent: client.couponPercent ?? baseScenario.globalCouponPercent,
  });

  const selectClient = (clientId: string) => {
    setActiveClientId(clientId);
    saveActiveClientId(clientId);
    setWarnings(workspaceWarnings[clientId] ?? []);
    const client = clients.find((item) => item.id === clientId);
    if (client) {
      setScenario((current) => applyClientGoalsToScenario(client, current));
    }
  };

  const addClient = async (name: string) => {
    const draft = {
      id: `${name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "") || "client"}-${Date.now()}`,
      name,
      marketplace: "Amazon US",
      tacosGoal: scenario.globalTacosGoal,
      couponPercent: scenario.globalCouponPercent,
    };
    const client = userId ? await createCloudClient(userId, draft).catch((error) => {
      setCloudStatus(`Cloud sync issue: ${error.message}`);
      return draft;
    }) : draft;
    const next = [...clients, client];
    setClients(next);
    saveClients(next);
    setActiveClientId(client.id);
    saveActiveClientId(client.id);
    setWarnings([]);
    setCloudStatus(userId ? "Cloud saved" : cloudStatus);
  };

  const removeClient = (clientId: string) => {
    if (clients.length <= 1) return;
    const next = clients.filter((client) => client.id !== clientId);
    const nextActive = activeClientId === clientId ? next[0]?.id ?? "" : activeClientId;
    const nextSkuData = { ...clientSkuData };
    delete nextSkuData[clientId];
    setClients(next);
    setClientSkuData(nextSkuData);
    const nextAdPotentialStates = { ...adPotentialStates };
    delete nextAdPotentialStates[clientId];
    setAdPotentialStates(nextAdPotentialStates);
    const nextReportingStates = { ...reportingStates };
    delete nextReportingStates[clientId];
    setReportingStates(nextReportingStates);
    saveClients(next);
    saveClientSkuData(nextSkuData);
    saveAdPotentialStates(nextAdPotentialStates);
    saveReportingStates(nextReportingStates);
    if (userId) {
      setCloudStatus("Deleting client...");
      deleteCloudClient(userId, clientId)
        .then(() => setCloudStatus("Cloud saved"))
        .catch((error) => setCloudStatus(`Cloud sync issue: ${error.message}`));
    }
    selectClient(nextActive);
  };

  const updateClient = (clientId: string, patch: Partial<ClientAccount>) => {
    const next = clients.map((client) => (client.id === clientId ? { ...client, ...patch } : client));
    setClients(next);
    saveClients(next);
    if (userId) {
      updateCloudClient(userId, clientId, patch)
        .then(() => setCloudStatus("Cloud saved"))
        .catch((error) => setCloudStatus(`Cloud sync issue: ${error.message}`));
    }
    if (clientId === activeClientId) {
      setScenario((current) => ({
        ...current,
        ...(patch.tacosGoal !== undefined ? { globalTacosGoal: patch.tacosGoal ?? current.globalTacosGoal } : {}),
        ...(patch.couponPercent !== undefined ? { globalCouponPercent: patch.couponPercent ?? 0 } : {}),
      }));
    }
  };

  const renameClient = (clientId: string, name: string) => {
    updateClient(clientId, { name });
  };

  const updateAdPotentialState = (state: AdPotentialPlannerState) => {
    const normalizedState = state;
    const next = { ...adPotentialStates, [activeClientId]: normalizedState };
    setAdPotentialStates(next);
    saveAdPotentialStates(next);
    if (userId && activeClientId) {
      saveCloudAdPotentialState(userId, activeClientId, normalizedState)
        .then(() => setCloudStatus("Cloud saved"))
        .catch((error) => setCloudStatus(`Cloud sync issue: ${error.message}`));
    }
  };

  const updateReportingState = (state: ReportingState) => {
    const next = { ...reportingStates, [activeClientId]: state };
    setReportingStates(next);
    saveReportingStates(next);
    if (userId && activeClientId) {
      saveCloudReportingState(userId, activeClientId, state)
        .then(() => setCloudStatus("Cloud saved"))
        .catch((error) => setCloudStatus(`Cloud sync issue: ${error.message}`));
    }
  };

  return (
    <div className="app-shell min-h-screen text-ink">
      <Sidebar
        clients={clients}
        activeClientId={activeClientId}
        collapsed={sidebarCollapsed}
        activeSection={activeSection}
        onToggleCollapsed={() => setSidebarCollapsed((value) => !value)}
        onSectionChange={setActiveSection}
        onSelectClient={selectClient}
        onAddClient={addClient}
        onRemoveClient={removeClient}
        onRenameClient={renameClient}
      />
      <div className={`min-h-screen transition-[padding] duration-200 ${sidebarCollapsed ? "pl-[76px]" : "pl-[284px]"}`}>
      <main className="mx-auto grid max-w-[1720px] gap-5 px-6 py-4">
        {activeSection === "upload" ? (
          <FileImport
            onLoaded={(loadedSkus, importWarnings) => {
              const importedAt = new Date().toISOString();
              const stampedSkus = loadedSkus.map((sku) => ({ ...sku, importedAt }));
              setWarnings(importWarnings);
              setSelected(null);
              if (!stampedSkus.length) return;
              const nextSkuData = { ...clientSkuData, [activeClientId]: stampedSkus };
              const nextWorkspaceWarnings = { ...workspaceWarnings, [activeClientId]: importWarnings };
              setClientSkuData(nextSkuData);
              setWorkspaceWarnings(nextWorkspaceWarnings);
              saveClientSkuData(nextSkuData);
              if (userId && activeClientId) {
                setCloudStatus("Saving workspace...");
                saveCloudWorkspace(userId, activeClientId, stampedSkus, importWarnings, activeAdPotentialState)
                  .then(() => setCloudStatus("Cloud saved"))
                  .catch((error) => setCloudStatus(`Cloud sync issue: ${error.message}`));
              }
            }}
          />
        ) : null}

        {activeSection === "dashboard" ? (
          <>
            <section className="rounded-lg border border-line bg-white p-5 shadow-card">
              <div className="text-xs font-extrabold uppercase tracking-[0.18em] text-brand">Amazon Profit Ops</div>
              <h1 className="mt-2 text-2xl font-extrabold text-ink">P&L Dashboard</h1>
              <p className="mt-1 max-w-4xl text-sm leading-6 text-steel">
                SKU-level profitability, scenario controls, current account TACOS, and break-even ad room in one working view.
              </p>
            </section>
            <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-6">
              <KpiCard label="Total Sales" value={currency(summary.totalSales)} helper={`${number(summary.totalUnitsSold)} units`} icon={<TrendingUp className="h-4 w-4" />} />
              <KpiCard label="Current Ad Spend" value={currency(currentAdSpend)} helper="Actual paid media spend" icon={<Target className="h-4 w-4" />} />
              <KpiCard label="Account TACOS" value={percent(currentTacos)} helper={`${currency(currentAdSpend)} / ${currency(currentSales)} sales`} tone={currentTacos > summary.breakEvenTacos ? "bad" : "neutral"} icon={<Target className="h-4 w-4" />} />
              <KpiCard label="Current Profit" value={currency(currentProfit)} helper={`${percent(currentProfitMargin)} current margin`} tone={currentProfit < 0 ? "bad" : currentProfitMargin < 0.15 ? "warn" : "good"} icon={<LineChart className="h-4 w-4" />} />
              <KpiCard label="Coupon Cost" value={currency(summary.totalCouponCost)} helper="Shown separately from ad spend" />
              <KpiCard label="SKU Health" value={`${summary.profitableSkus}/${portfolio.rows.length}`} helper={`${summary.unprofitableSkus} unprofitable · ${summary.scaleCandidates} scale candidates`} tone={summary.unprofitableSkus ? "warn" : "good"} icon={<PackageCheck className="h-4 w-4" />} />
            </section>

            {scenarioControlsExpanded ? (
              <div className="grid min-w-0 gap-5 2xl:grid-cols-[minmax(0,1fr)_430px]">
                <div className="grid min-w-0 auto-rows-max content-start gap-5">
                  <SkuProfitTable rows={portfolio.rows} scenario={scenario} onScenarioChange={setScenario} onSelectSku={setSelected} />
                  <ScenarioComparisonTable scenarios={savedComparisons} onLoad={setScenario} onDelete={deleteScenario} />
                </div>
                <div className="min-w-0 2xl:sticky 2xl:top-5 2xl:self-start">
                  <ScenarioControls scenario={scenario} onChange={setScenario} onSave={saveActiveScenario} expanded={scenarioControlsExpanded} onExpandedChange={setScenarioControlsExpanded} />
                </div>
              </div>
            ) : (
              <>
                <ScenarioControls scenario={scenario} onChange={setScenario} onSave={saveActiveScenario} expanded={scenarioControlsExpanded} onExpandedChange={setScenarioControlsExpanded} />
                <SkuProfitTable rows={portfolio.rows} scenario={scenario} onScenarioChange={setScenario} onSelectSku={setSelected} />
                <ScenarioComparisonTable scenarios={savedComparisons} onLoad={setScenario} onDelete={deleteScenario} />
              </>
            )}
          </>
        ) : null}

        {activeSection === "parent-asin" ? (
          <>
            <TacosSnapshot
              accountCurrentTacos={currentTacos}
              accountScenarioTacos={summary.blendedTacos}
              currentAdSpend={currentAdSpend}
              scenarioAdSpend={summary.totalAdSpend}
              rows={parentRows}
            />
            <ParentAsinProfitTable rows={parentRows} childRows={portfolio.rows} scenario={scenario} onScenarioChange={setScenario} />
          </>
        ) : null}

        {activeSection === "ad-potential" ? (
          <AdPotential
            accountBaseline={{ currentSpend: currentAdSpend, totalSales: currentSales, currentTacos }}
            state={activeAdPotentialState}
            onStateChange={updateAdPotentialState}
          />
        ) : null}

        {activeSection === "reporting" ? (
          <ReportingDashboard state={activeReportingState} onStateChange={updateReportingState} />
        ) : null}

        {activeSection === "performance" ? (
          <ProfitCharts rows={portfolio.rows} parentRows={parentRows} />
        ) : null}

        {activeSection === "settings" ? (
          <div className="grid gap-5">
            <section className="rounded-lg border border-line bg-white p-5 shadow-card">
              <div className="text-xs font-extrabold uppercase tracking-[0.18em] text-brand">Settings</div>
              <h2 className="mt-2 text-xl font-extrabold text-ink">Workspace Settings</h2>
              <p className="mt-1 text-sm leading-6 text-steel">
                Core setup now lives in Upload Reports and client goals live in Clients, so this page stays intentionally light.
              </p>
              {session ? (
                <div className="mt-4 inline-flex rounded-full border border-line bg-warm px-3 py-1.5 text-xs font-bold text-steel">
                  {cloudStatus || "Cloud sync ready"}
                </div>
              ) : null}
            </section>
          </div>
        ) : null}

        {activeSection === "clients" ? (
          <section className="rounded-lg border border-line bg-white p-5 shadow-card">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <h2 className="text-xl font-extrabold text-ink">Client Goals</h2>
                <p className="mt-2 max-w-2xl text-sm leading-6 text-steel">
                  Keep account goals here so Reporting, P&L, and Ad Potential can judge whether the plan is realistic.
                </p>
              </div>
            </div>
            <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {clients.map((client) => {
                const isActive = client.id === activeClientId;
                const clientRows = clientSkuData[client.id]?.length ?? 0;
                const goalsOpen = clientGoalsOpen[client.id] ?? isActive;
                const goals = client.businessGoals ?? {};
                const currentProjected = goals.currentProjectedSales ?? currentSales;
                const desiredSales = goals.desiredSalesNextPeriod ?? 0;
                const salesGap = desiredSales - currentProjected;
                const realistic = desiredSales > 0 ? salesGap <= Math.max(currentProjected * 0.25, (goals.monthlyAdBudget ?? 0) * (goals.targetRoas ?? 1.5)) : true;
                return (
                  <article
                    key={client.id}
                    className={`rounded-lg border p-4 shadow-sm transition ${isActive ? "border-brand bg-orange-50 ring-2 ring-brand/15" : "border-line bg-white"}`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="text-xs font-extrabold uppercase tracking-[0.14em] text-steel">{client.marketplace ?? "Amazon US"}</div>
                        <input
                          className="mt-2 w-full rounded-md border border-transparent bg-transparent px-0 py-1 text-lg font-extrabold text-ink outline-none transition focus:border-line focus:bg-white focus:px-2"
                          value={client.name}
                          onChange={(event) => updateClient(client.id, { name: event.target.value })}
                          aria-label={`Rename ${client.name}`}
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() => selectClient(client.id)}
                        className={`rounded-full px-3 py-1.5 text-xs font-extrabold uppercase tracking-wide transition ${
                          isActive ? "bg-brand text-white" : "border border-line bg-white text-ink hover:border-brand"
                        }`}
                      >
                        {isActive ? "Active" : "Use"}
                      </button>
                      {clients.length > 1 ? (
                        <button
                          type="button"
                          onClick={() => {
                            setDeleteClientId(client.id);
                            setDeleteClientText("");
                          }}
                          className="rounded-full border border-red-200 bg-white p-2 text-red-700 transition hover:bg-red-50"
                          aria-label={`Delete ${client.name}`}
                          title="Delete client"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      ) : null}
                    </div>
                    {deleteClientId === client.id ? (
                      <div className="mt-4 rounded-lg border border-red-200 bg-red-50 p-3">
                        <div className="text-xs font-extrabold uppercase tracking-wide text-red-800">Confirm Delete</div>
                        <p className="mt-1 text-sm text-red-900">Type DELETE to remove {client.name}.</p>
                        <div className="mt-3 flex flex-col gap-2 sm:flex-row">
                          <input
                            value={deleteClientText}
                            onChange={(event) => setDeleteClientText(event.target.value)}
                            className="min-w-0 flex-1 rounded-md border border-red-200 bg-white px-3 py-2 text-sm font-bold text-ink outline-none focus:border-red-500"
                            placeholder="DELETE"
                            aria-label={`Type DELETE to remove ${client.name}`}
                          />
                          <button
                            type="button"
                            onClick={() => {
                              setDeleteClientId(null);
                              setDeleteClientText("");
                            }}
                            className="rounded-md border border-line bg-white px-4 py-2 text-sm font-extrabold text-ink hover:bg-warm"
                          >
                            Cancel
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              if (deleteClientText !== "DELETE") return;
                              removeClient(client.id);
                              setDeleteClientId(null);
                              setDeleteClientText("");
                            }}
                            disabled={deleteClientText !== "DELETE"}
                            className="rounded-md bg-red-600 px-4 py-2 text-sm font-extrabold text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-40"
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                    ) : null}
                    <div className="mt-2 text-sm font-semibold text-steel">{clientRows ? `${number(clientRows)} imported SKU rows` : "Using sample data until reports are imported"}</div>
                    <button
                      type="button"
                      onClick={() => setClientGoalsOpen({ ...clientGoalsOpen, [client.id]: !goalsOpen })}
                      className="mt-4 flex w-full items-center justify-between rounded-lg border border-line bg-white px-3 py-2 text-sm font-extrabold text-ink hover:border-brand"
                    >
                      <span>{goalsOpen ? "Hide business goals" : "Show business goals"}</span>
                      <span className={realistic ? "text-emerald-700" : "text-red-700"}>{realistic ? "Realistic" : "Stretch"}</span>
                    </button>
                    {goalsOpen ? (
                      <div className="mt-4 grid gap-3">
                        <div className={`rounded-lg border p-3 text-sm ${realistic ? "border-emerald-200 bg-emerald-50 text-emerald-900" : "border-amber-200 bg-amber-50 text-amber-900"}`}>
                          {desiredSales > 0
                            ? realistic
                              ? `Goal looks reasonable: ${currency(desiredSales)} target is within reach from the current projected ${currency(currentProjected)} run rate.`
                              : `This is a stretch: target is ${currency(salesGap)} above the current projected run rate. Check budget, ROAS, conversion rate, and search demand.`
                            : "Add a desired sales target to get a realism read."}
                        </div>
                        <div className="grid gap-3 sm:grid-cols-2">
                          <GoalInput label="Monthly ad budget" value={goals.monthlyAdBudget} prefix="$" onChange={(value) => updateClient(client.id, { businessGoals: { ...goals, monthlyAdBudget: value } })} />
                          <GoalInput label="Primary TACOS goal" value={goals.primaryTacosGoal ?? client.tacosGoal} suffix="%" percent onChange={(value) => updateClient(client.id, { tacosGoal: value, businessGoals: { ...goals, primaryTacosGoal: value } })} />
                          <GoalInput label="Acceptable TACOS ceiling" value={goals.acceptableTacosCeiling} suffix="%" percent onChange={(value) => updateClient(client.id, { businessGoals: { ...goals, acceptableTacosCeiling: value } })} />
                          <GoalInput label="Target ROAS" value={goals.targetRoas} suffix="x" onChange={(value) => updateClient(client.id, { businessGoals: { ...goals, targetRoas: value } })} />
                          <GoalInput label="Minimum ROAS" value={goals.minimumRoas} suffix="x" onChange={(value) => updateClient(client.id, { businessGoals: { ...goals, minimumRoas: value } })} />
                          <GoalInput label="Current projected sales" value={goals.currentProjectedSales ?? currentSales} prefix="$" onChange={(value) => updateClient(client.id, { businessGoals: { ...goals, currentProjectedSales: value } })} />
                          <GoalInput label="Desired next 30-day sales" value={goals.desiredSalesNextPeriod} prefix="$" onChange={(value) => updateClient(client.id, { businessGoals: { ...goals, desiredSalesNextPeriod: value } })} />
                          <GoalInput label="Coupon goal" value={client.couponPercent} suffix="%" percent onChange={(value) => updateClient(client.id, { couponPercent: value ?? 0 })} />
                        </div>
                      </div>
                    ) : null}
                  </article>
                );
              })}
            </div>
          </section>
        ) : null}
      </main>

      <SkuDetailDrawer row={selected} onClose={() => setSelected(null)} />
      </div>
    </div>
  );
}

function ReportingSourcesSettings({ state, onStateChange }: { state: ReportingState; onStateChange: (state: ReportingState) => void }) {
  const [draft, setDraft] = useState({ ...emptyReportingSourceConfig, ...state.sourceConfig });
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [submitState, setSubmitState] = useState<"idle" | "loading" | "success" | "error">("idle");
  const tabFields: Array<{ key: keyof typeof draft; label: string }> = [
    { key: "campaignTabName", label: "Campaign report tab" },
    { key: "productTabName", label: "Advertised product tab" },
    { key: "searchTermTabName", label: "Search term tab" },
    { key: "dailyTabName", label: "Daily trend tab" },
    { key: "businessTabName", label: "Business report tab" },
  ];

  const refresh = async () => {
    setIsRefreshing(true);
    setSubmitState("loading");
    try {
      onStateChange(await refreshReportingFromSheets(draft));
      setSubmitState("success");
      window.setTimeout(() => setSubmitState("idle"), 1800);
    } catch (error) {
      setSubmitState("error");
      onStateChange({ ...state, sourceConfig: draft, errors: [error instanceof Error ? error.message : "Could not refresh reporting data."] });
    } finally {
      setIsRefreshing(false);
    }
  };

  return (
    <section className="overflow-hidden rounded-lg border border-line bg-white shadow-card">
      <div className={`h-1.5 transition-all duration-700 ${submitState === "loading" ? "bg-brand" : submitState === "success" ? "bg-emerald-500" : submitState === "error" ? "bg-danger" : "bg-warm"}`} />
      <div className="p-5">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <div className="text-xs font-extrabold uppercase tracking-[0.18em] text-brand">Client Data Sources</div>
          <h2 className="mt-2 text-xl font-extrabold text-ink">One master Google Sheet</h2>
          <p className="mt-1 max-w-3xl text-sm leading-6 text-steel">
            Paste one spreadsheet link for this client, confirm the tab names, then refresh the Reporting Dashboard whenever you update the sheet.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => {
              onStateChange({ ...state, sourceConfig: draft });
              setSubmitState("success");
              window.setTimeout(() => setSubmitState("idle"), 1400);
            }}
            className="rounded-full border border-line bg-white px-4 py-2 text-sm font-extrabold uppercase tracking-wide hover:bg-warm"
          >
            Save Source
          </button>
          <button
            onClick={refresh}
            disabled={isRefreshing}
            className={`inline-flex items-center gap-2 rounded-full px-5 py-2 text-sm font-extrabold uppercase tracking-wide text-white shadow-lg transition-all duration-300 disabled:opacity-70 ${
              submitState === "success" ? "scale-[1.03] bg-emerald-600 shadow-emerald-200" : "bg-brand shadow-brand/20 hover:-translate-y-0.5 hover:bg-deep"
            }`}
          >
            {submitState === "success" ? <CheckCircle2 className="h-4 w-4" /> : <RefreshCw className={`h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`} />}
            {submitState === "success" ? "Dashboard Updated" : isRefreshing ? "Building..." : "Submit & Build"}
          </button>
        </div>
      </div>
      <label className="mt-5 grid gap-2 rounded-lg border border-line bg-warm/40 p-4">
        <span className="text-sm font-extrabold text-ink">Master Google Sheet link</span>
        <input
          value={draft.masterSheetUrl}
          onChange={(event) => setDraft({ ...draft, masterSheetUrl: event.target.value })}
          placeholder="https://docs.google.com/spreadsheets/d/.../edit"
          className="rounded-md border border-line bg-white px-3 py-3 text-sm outline-none focus:border-brand focus:ring-2 focus:ring-brand/15"
        />
        <span className="text-xs leading-5 text-steel">Use one workbook per client. The app reads the tabs below from this sheet.</span>
      </label>
      <div className="mt-5 grid gap-3 lg:grid-cols-5">
        {tabFields.map((field) => (
          <label key={field.key} className="grid gap-2">
            <span className="text-sm font-extrabold text-ink">{field.label}</span>
            <input
              value={draft[field.key]}
              onChange={(event) => setDraft({ ...draft, [field.key]: event.target.value })}
              placeholder="Tab name"
              className="rounded-md border border-line bg-white px-3 py-2 text-sm outline-none focus:border-brand focus:ring-2 focus:ring-brand/15"
            />
          </label>
        ))}
      </div>
      <div className={`mt-5 rounded-lg border p-4 text-sm transition-all duration-500 ${
        submitState === "success" ? "border-emerald-200 bg-emerald-50 text-emerald-900" : submitState === "error" ? "border-red-200 bg-red-50 text-red-800" : "border-line bg-warm/50 text-steel"
      }`}>
        <div className="flex items-center gap-2 font-extrabold">
          {submitState === "success" ? <CheckCircle2 className="h-5 w-5" /> : <FileSpreadsheet className="h-5 w-5" />}
          {submitState === "success" ? "Sheet accepted. Reporting dashboard rebuilt." : "Ready for one-sheet reporting."}
        </div>
        <div className="mt-1">
        Last refreshed: <strong className="text-ink">{state.lastRefreshedAt ? new Date(state.lastRefreshedAt).toLocaleString() : "Not refreshed yet"}</strong>
        </div>
        {state.errors.length ? <div className="mt-2 font-semibold">{state.errors.join(" ")}</div> : null}
      </div>
      </div>
    </section>
  );
}

function GoalInput({
  label,
  value,
  prefix,
  suffix,
  percent: isPercent,
  onChange,
}: {
  label: string;
  value?: number | null;
  prefix?: string;
  suffix?: string;
  percent?: boolean;
  onChange: (value: number | null) => void;
}) {
  const displayValue = value === null || value === undefined ? "" : isPercent ? Math.round(value * 1000) / 10 : value;
  return (
    <label className="rounded-lg border border-line bg-white px-3 py-2">
      <span className="text-[10px] font-extrabold uppercase tracking-[0.14em] text-steel">{label}</span>
      <div className="mt-1 flex items-center gap-2">
        {prefix ? <span className="text-sm font-bold text-steel">{prefix}</span> : null}
        <input
          type="number"
          className="w-full bg-transparent text-lg font-extrabold text-ink outline-none"
          value={displayValue}
          onChange={(event) => {
            const raw = event.target.value;
            onChange(raw === "" ? null : isPercent ? Number(raw) / 100 : Number(raw));
          }}
        />
        {suffix ? <span className="text-sm font-bold text-steel">{suffix}</span> : null}
      </div>
    </label>
  );
}

function ClientQuickSwitch({
  clients,
  activeClientId,
  scenario,
  onSelectClient,
  onScenarioChange,
  onUpdateActiveClientGoals,
}: {
  clients: Array<{ id: string; name: string }>;
  activeClientId: string;
  scenario: ScenarioAssumptions;
  onSelectClient: (clientId: string) => void;
  onScenarioChange: (scenario: ScenarioAssumptions) => void;
  onUpdateActiveClientGoals?: (patch: Partial<ClientAccount>) => void;
}) {
  return (
    <div className="mt-4 flex flex-wrap items-center gap-2">
      <label className="inline-flex items-center gap-2 rounded-full border border-line bg-warm px-3 py-1.5 text-xs font-bold text-steel">
        Active client
        <select
          className="max-w-[180px] bg-transparent font-extrabold text-ink outline-none"
          value={activeClientId}
          onChange={(event) => onSelectClient(event.target.value)}
        >
          {clients.map((client) => (
            <option key={client.id} value={client.id}>
              {client.name}
            </option>
          ))}
        </select>
      </label>
      <label className="inline-flex items-center gap-2 rounded-full border border-line bg-white px-3 py-1.5 text-xs font-bold text-steel shadow-sm">
        TACOS goal
        <input
          type="number"
          className="w-14 bg-transparent text-right font-extrabold text-ink outline-none"
          value={scenario.globalTacosGoal === null ? "" : Math.round(scenario.globalTacosGoal * 1000) / 10}
          onChange={(event) => {
            const value = event.target.value === "" ? null : Number(event.target.value) / 100;
            onScenarioChange({ ...scenario, globalTacosGoal: value });
            onUpdateActiveClientGoals?.({ tacosGoal: value });
          }}
        />
        %
      </label>
      <label className="inline-flex items-center gap-2 rounded-full border border-line bg-white px-3 py-1.5 text-xs font-bold text-steel shadow-sm">
        Coupon
        <input
          type="number"
          className="w-14 bg-transparent text-right font-extrabold text-ink outline-none"
          value={Math.round(scenario.globalCouponPercent * 1000) / 10}
          onChange={(event) => {
            const value = Number(event.target.value || 0) / 100;
            onScenarioChange({ ...scenario, globalCouponPercent: value });
            onUpdateActiveClientGoals?.({ couponPercent: value });
          }}
        />
        %
      </label>
    </div>
  );
}
