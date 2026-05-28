import { Download, FileSpreadsheet, LineChart, PackageCheck, Target, TrendingUp } from "lucide-react";
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
import { createCloudClient, deleteCloudClient, deleteCloudScenario, loadCloudState, saveCloudAdPotentialState, saveCloudScenario, saveCloudWorkspace, updateCloudClient } from "./lib/cloudStorage";
import { downloadCsv, exportExecutiveSummary, exportWorkbook } from "./lib/export";
import { currency, number, percent } from "./lib/format";
import { defaultScenario, sampleSkus } from "./lib/mockData";
import { initialAdPotentialState } from "./lib/adPotentialCalculations";
import { loadActiveClientId, loadAdPotentialStates, loadClients, loadClientSkuData, loadSavedScenarios, saveActiveClientId, saveAdPotentialStates, saveClients, saveClientSkuData, saveScenarios } from "./lib/storage";
import type { SupabaseSession } from "./lib/supabase";
import type { AdPotentialPlannerState, AppSection, CalculatedSkuPnl, ClientAccount, ProductSku, ScenarioAssumptions } from "./types/models";

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
  const [workspaceWarnings, setWorkspaceWarnings] = useState<Record<string, string[]>>({});
  const [cloudStatus, setCloudStatus] = useState<string>("");
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [scenarioControlsExpanded, setScenarioControlsExpanded] = useState(false);
  const [activeSection, setActiveSection] = useState<AppSection>("dashboard");
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
        setWorkspaceWarnings(state.workspaceWarnings);
        setWarnings(state.workspaceWarnings[state.activeClientId] ?? []);
        setSaved(state.scenarios);
        saveClients(state.clients);
        saveActiveClientId(state.activeClientId);
        saveClientSkuData(state.clientSkuData);
        saveAdPotentialStates(state.adPotentialStates);
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
  const sectionMeta: Record<AppSection, { title: string; eyebrow: string; description: string }> = {
    dashboard: {
      eyebrow: "Amazon SKU Profitability Modeler",
      title: "Per-SKU P&L and Scenario Planning Dashboard",
      description: "Model coupons, TACOS goals, ad spend, price, COGS, Amazon fees, and shipping costs without wrestling the spreadsheet.",
    },
    clients: {
      eyebrow: "Client Workspace",
      title: "Client Account Management",
      description: "Add, remove, and switch between client workspaces from the sidebar.",
    },
    upload: {
      eyebrow: "Source Reports",
      title: "Upload Reports",
      description: "Bring in the source reports that power the SKU profitability model.",
    },
    "sku-pnl": {
      eyebrow: "SKU Detail",
      title: "SKU P&L Table",
      description: "Review unit economics, SKU-level profitability, break-even TACOS, and quick overrides.",
    },
    "parent-asin": {
      eyebrow: "Parent Portfolio",
      title: "Parent ASIN P&L",
      description: "Roll child ASINs and SKUs into parent-level profitability, margin, TACOS, and data health.",
    },
    reporting: {
      eyebrow: "Amazon Ads Reporting",
      title: "Reporting Dashboard",
      description: "Track spend, sales, ACOS, ROAS, budget pacing, campaign performance, and product-level advertising signals.",
    },
    "ad-potential": {
      eyebrow: "Ad Growth Planning",
      title: "Ad Potential",
      description: "Use ROAS, CPC, conversion, and organic lift assumptions to model paid media upside.",
    },
    performance: {
      eyebrow: "Performance Review",
      title: "Profitability Charts",
      description: "Use the charts to spot scale candidates, weak margins, and scenario movement.",
    },
    settings: {
      eyebrow: "Settings",
      title: "Scenario Settings",
      description: "Tune the global assumptions that drive the scenario model.",
    },
  };
  const currentSection = sectionMeta[activeSection];

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
    saveClients(next);
    saveClientSkuData(nextSkuData);
    saveAdPotentialStates(nextAdPotentialStates);
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
      <header className="border-b border-line bg-white">
        <div className="mx-auto flex max-w-[1720px] flex-col gap-5 px-6 py-6 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="flex items-center gap-2 text-xs font-extrabold uppercase tracking-[0.18em] text-brand">
              <FileSpreadsheet className="h-4 w-4" />
              {currentSection.eyebrow}
            </div>
            <h1 className="mt-3 max-w-5xl text-3xl font-extrabold leading-tight tracking-tight text-ink lg:text-4xl">{currentSection.title}</h1>
            <p className="mt-2 max-w-4xl text-sm font-medium leading-6 text-steel">
              {currentSection.description}
            </p>
            <ClientQuickSwitch
              clients={clients}
              activeClientId={activeClientId}
              scenario={scenario}
              onSelectClient={selectClient}
              onScenarioChange={setScenario}
              onUpdateActiveClientGoals={(patch) => updateClient(activeClientId, patch)}
            />
            {session ? (
              <div className="mt-3 inline-flex rounded-full border border-line bg-white px-3 py-1.5 text-xs font-bold text-steel shadow-sm">
                {cloudStatus || "Cloud sync ready"}
              </div>
            ) : null}
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => exportExecutiveSummary(portfolio.rows, parentRows, summary, portfolio.issues)}
              className="inline-flex items-center gap-2 rounded-full border border-line bg-white px-4 py-2 text-sm font-bold uppercase tracking-wide hover:bg-warm"
            >
              <Download className="h-4 w-4" />
              Summary PDF
            </button>
            <button
              onClick={() => downloadCsv(portfolio.rows)}
              className="inline-flex items-center gap-2 rounded-full border border-line bg-white px-4 py-2 text-sm font-bold uppercase tracking-wide hover:bg-warm"
            >
              <Download className="h-4 w-4" />
              CSV
            </button>
            <button
              onClick={() => exportWorkbook(portfolio.rows, savedComparisons.map((item) => ({ name: item.scenario.name, summary: item.summary })), portfolio.issues)}
              className="inline-flex items-center gap-2 rounded-full bg-brand px-4 py-2 text-sm font-bold uppercase tracking-wide text-white hover:bg-deep"
            >
              <Download className="h-4 w-4" />
              Export XLSX
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto grid max-w-[1720px] gap-5 px-6 py-6">
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

        {activeSection === "sku-pnl" ? (
          <SkuProfitTable rows={portfolio.rows} scenario={scenario} onScenarioChange={setScenario} onSelectSku={setSelected} />
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
          <ReportingDashboard />
        ) : null}

        {activeSection === "performance" ? (
          <ProfitCharts rows={portfolio.rows} parentRows={parentRows} />
        ) : null}

        {activeSection === "settings" ? (
          <div className="grid gap-5">
            <ScenarioControls scenario={scenario} onChange={setScenario} onSave={saveActiveScenario} />
            <DataQualityPanel issues={portfolio.issues} warnings={warnings} />
          </div>
        ) : null}

        {activeSection === "clients" ? (
          <section className="rounded-lg border border-line bg-white p-5 shadow-card">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <h2 className="text-xl font-extrabold text-ink">Client Goals</h2>
                <p className="mt-2 max-w-2xl text-sm leading-6 text-steel">
                  Switch accounts and adjust the working TACOS/coupon goals before reviewing the dashboard.
                </p>
              </div>
              <ClientQuickSwitch
                clients={clients}
                activeClientId={activeClientId}
                scenario={scenario}
                onSelectClient={selectClient}
                onScenarioChange={setScenario}
                onUpdateActiveClientGoals={(patch) => updateClient(activeClientId, patch)}
              />
            </div>
            <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {clients.map((client) => {
                const isActive = client.id === activeClientId;
                const clientRows = clientSkuData[client.id]?.length ?? 0;
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
                    </div>
                    <div className="mt-2 text-sm font-semibold text-steel">{clientRows ? `${number(clientRows)} imported SKU rows` : "Using sample data until reports are imported"}</div>
                    <div className="mt-4 grid gap-3 sm:grid-cols-2">
                      <label className="rounded-lg border border-line bg-white px-3 py-2">
                        <span className="text-[10px] font-extrabold uppercase tracking-[0.14em] text-steel">TACOS Goal</span>
                        <div className="mt-1 flex items-center gap-2">
                          <input
                            type="number"
                            className="w-full bg-transparent text-lg font-extrabold text-ink outline-none"
                            value={client.tacosGoal === null || client.tacosGoal === undefined ? "" : Math.round(client.tacosGoal * 1000) / 10}
                            onChange={(event) => updateClient(client.id, { tacosGoal: event.target.value === "" ? null : Number(event.target.value) / 100 })}
                          />
                          <span className="text-sm font-bold text-steel">%</span>
                        </div>
                      </label>
                      <label className="rounded-lg border border-line bg-white px-3 py-2">
                        <span className="text-[10px] font-extrabold uppercase tracking-[0.14em] text-steel">Coupon Goal</span>
                        <div className="mt-1 flex items-center gap-2">
                          <input
                            type="number"
                            className="w-full bg-transparent text-lg font-extrabold text-ink outline-none"
                            value={Math.round((client.couponPercent ?? 0) * 1000) / 10}
                            onChange={(event) => updateClient(client.id, { couponPercent: Number(event.target.value || 0) / 100 })}
                          />
                          <span className="text-sm font-bold text-steel">%</span>
                        </div>
                      </label>
                    </div>
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
