import { AlertTriangle, ArrowDownRight, ArrowUpRight, CalendarDays, ChevronDown, Download, FileSpreadsheet, Filter, RefreshCw, Target } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ComposedChart,
  Legend,
  Line,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { currency, number, percent } from "../lib/format";
import { emptyReportingSourceConfig, refreshReportingFromSheets } from "../lib/reportingData";
import type { ReportingCampaignRow, ReportingProductRow, ReportingState, ReportingStrategyMonth } from "../types/models";

const dailyTrend = [
  { day: "May 15", spend: 1880, sales: 6920, impressions: 26096, clicks: 3775 },
  { day: "May 16", spend: 2240, sales: 8210, impressions: 35703, clicks: 3706 },
  { day: "May 17", spend: 1975, sales: 7460, impressions: 26778, clicks: 1825 },
  { day: "May 18", spend: 1830, sales: 7040, impressions: 22015, clicks: 1743 },
  { day: "May 19", spend: 1695, sales: 6180, impressions: 21917, clicks: 3329 },
  { day: "May 20", spend: 2110, sales: 7980, impressions: 14359, clicks: 2909 },
  { day: "May 21", spend: 1390, sales: 5120, impressions: 31464, clicks: 2524 },
  { day: "May 22", spend: 1525, sales: 5560, impressions: 26003, clicks: 2905 },
  { day: "May 23", spend: 2165, sales: 7895, impressions: 22862, clicks: 2487 },
  { day: "May 24", spend: 1815, sales: 6530, impressions: 25711, clicks: 2623 },
  { day: "May 25", spend: 1905, sales: 7025, impressions: 30970, clicks: 2670 },
  { day: "May 26", spend: 1710, sales: 6280, impressions: 35153, clicks: 2683 },
  { day: "May 27", spend: 1630, sales: 5940, impressions: 21624, clicks: 3401 },
  { day: "May 28", spend: 1785, sales: 6550, impressions: 20501, clicks: 2777 },
];

const campaignRows = [
  { campaign: "Brand Defense", type: "Sponsored Products", spend: 4292, sales: 16712, impressions: 971818, clicks: 9608, orders: 486, budget: 5200, status: "Enabled" },
  { campaign: "Nonbrand High Intent", type: "Sponsored Products", spend: 3452, sales: 15164, impressions: 921462, clicks: 7440, orders: 402, budget: 4300, status: "Enabled" },
  { campaign: "Competitor ASIN", type: "Sponsored Display", spend: 3043, sales: 14027, impressions: 900512, clicks: 5158, orders: 288, budget: 3600, status: "Enabled" },
  { campaign: "Category Expansion", type: "Sponsored Brands", spend: 4875, sales: 13207, impressions: 822123, clicks: 6920, orders: 261, budget: 5000, status: "Enabled" },
  { campaign: "Retargeting", type: "Sponsored Display", spend: 3986, sales: 12557, impressions: 555239, clicks: 3368, orders: 247, budget: 4200, status: "Enabled" },
];

const productRows = [
  { product: "Hydration Electrolyte Mix", spend: 82586, sales: 917622, tacos: 0.09, roas: 11.11, status: "Scale" },
  { product: "Electrolyte Mix - Lemon Lime", spend: 62167, sales: 690749, tacos: 0.09, roas: 11.11, status: "Scale" },
  { product: "Watermelon Lime Jar", spend: 59352, sales: 659463, tacos: 0.09, roas: 11.11, status: "Scale" },
  { product: "Camera Stick Foundation", spend: 220, sales: 734, tacos: 0.3, roas: 3.34, status: "Watch" },
];

const sampleState: ReportingState = {
  sourceConfig: emptyReportingSourceConfig,
  lastRefreshedAt: null,
  campaigns: campaignRows,
  products: productRows.map((row) => ({
    product: row.product,
    asin: "",
    sku: "",
    spend: row.spend,
    adSales: row.sales,
    totalSales: row.sales,
    impressions: 0,
    clicks: 0,
    orders: 0,
  })),
  searchTerms: [],
  daily: dailyTrend.map((row) => ({ ...row, orders: 0 })),
  strategyMonths: [],
  errors: [],
};

const channelMix = [
  { name: "Sponsored Products", value: 72, color: "#F47322" },
  { name: "Sponsored Brands", value: 18, color: "#1D6680" },
  { name: "Sponsored Display", value: 10, color: "#FDBA31" },
];

const requirements = [
  {
    report: "Sponsored Products Advertised Product Report",
    why: "SKU/ASIN spend, attributed sales, orders, clicks, impressions, CPC, CTR, CVR, and ROAS.",
    cadence: "Last 30 days and prior 30 days",
  },
  {
    report: "Sponsored Products Campaign Report",
    why: "Campaign-level pacing, budget, status, campaign type, spend efficiency, top/bottom performers.",
    cadence: "Last 30 days and prior 30 days",
  },
  {
    report: "Sponsored Brands Campaign + Keyword Reports",
    why: "Brand campaign spend, sales, keyword performance, search funnel visibility.",
    cadence: "Last 30 days and prior 30 days",
  },
  {
    report: "Sponsored Display Campaign + Targeting Reports",
    why: "Retargeting and display performance by campaign, target, and audience.",
    cadence: "Last 30 days and prior 30 days",
  },
  {
    report: "Search Term Report",
    why: "Query-level winners, waste, negatives, rank opportunities, and bid decisions.",
    cadence: "Last 30 days",
  },
  {
    report: "Business Report by Child ASIN",
    why: "Total sales and units so the dashboard can calculate account and product-level TACOS.",
    cadence: "Same date range as ads",
  },
];

export function ReportingDashboard({ state, onStateChange }: { state: ReportingState; onStateChange: (state: ReportingState) => void }) {
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [strategySourceOpen, setStrategySourceOpen] = useState(false);
  const [strategySheetUrl, setStrategySheetUrl] = useState(state.sourceConfig.strategySheetUrl ?? "");
  const autoRefreshedStrategyUrl = useRef("");
  useEffect(() => setStrategySheetUrl(state.sourceConfig.strategySheetUrl ?? ""), [state.sourceConfig.strategySheetUrl]);
  useEffect(() => {
    const url = state.sourceConfig.strategySheetUrl?.trim();
    if (!url || autoRefreshedStrategyUrl.current === url) return;
    autoRefreshedStrategyUrl.current = url;
    refreshReportingFromSheets(state.sourceConfig)
      .then((refreshed) => onStateChange(mergeReportingRefresh(state, refreshed)))
      .catch(() => undefined);
  }, [state.sourceConfig.strategySheetUrl]);
  const rows = useMemo(() => {
    const hasImportedData = state.campaigns.length || state.products.length || state.searchTerms.length || state.daily.length || state.strategyMonths.length;
    return hasImportedData ? state : sampleState;
  }, [state]);
  const hasImportedRows = rows !== sampleState;
  const campaignData = rows.campaigns;
  const productData = rows.products;
  const baseAdRows = campaignData.length
    ? campaignData
    : productData.map((row) => ({
        campaign: row.product,
        type: "Advertised Products",
        spend: row.spend,
        sales: row.adSales,
        impressions: row.impressions,
        clicks: row.clicks,
        orders: row.orders,
        budget: 0,
        status: "Imported",
      }));
  const totals = baseAdRows.reduce(
    (acc, row) => ({
      spend: acc.spend + row.spend,
      sales: acc.sales + row.sales,
      impressions: acc.impressions + row.impressions,
      clicks: acc.clicks + row.clicks,
      orders: acc.orders + row.orders,
    }),
    { spend: 0, sales: 0, impressions: 0, clicks: 0, orders: 0 },
  );
  const totalSales =
    state.accountTotalSales && state.accountTotalSales > 0
      ? state.accountTotalSales
      : productData.length
        ? productData.reduce((sum, row) => sum + (row.totalSales || 0), 0)
        : totals.sales;
  const dailyData = rows.daily.length
    ? rows.daily
    : hasImportedRows
      ? [{ day: "Imported", spend: totals.spend, sales: totals.sales, impressions: totals.impressions, clicks: totals.clicks, orders: totals.orders }]
      : sampleState.daily;
  const roas = totals.spend ? totals.sales / totals.spend : 0;
  const accountTacos = totalSales ? totals.spend / totalSales : 0;
  const ctr = totals.impressions ? totals.clicks / totals.impressions : 0;
  const cpc = totals.clicks ? totals.spend / totals.clicks : 0;
  const conversionRate = totals.clicks ? totals.orders / totals.clicks : 0;
  const hasImportedData = Boolean(state.lastRefreshedAt);
  const refreshedLabel = state.lastRefreshedAt ? new Date(state.lastRefreshedAt).toLocaleString() : "Using sample data";
  const topCampaigns = [...baseAdRows].sort((a, b) => b.sales - a.sales).slice(0, 5);
  const weakCampaigns = [...baseAdRows].sort((a, b) => (b.sales ? b.spend / b.sales : 999) - (a.sales ? a.spend / a.sales : 999)).slice(0, 5);
  const strategyMonths = rows.strategyMonths ?? [];
  const latestStrategyMonth = [...strategyMonths].reverse().find((row) => !row.isProjection) ?? null;
  const previousStrategyMonth = latestStrategyMonth ? strategyMonths[strategyMonths.indexOf(latestStrategyMonth) - 1] ?? null : null;

  const refreshSheets = async () => {
    setIsRefreshing(true);
    try {
      const refreshed = await refreshReportingFromSheets(state.sourceConfig);
      onStateChange(mergeReportingRefresh(state, refreshed));
    } catch (error) {
      onStateChange({ ...state, errors: [error instanceof Error ? error.message : "Could not refresh reporting data."] });
    } finally {
      setIsRefreshing(false);
    }
  };

  const connectStrategyDoc = async () => {
    const nextConfig = { ...state.sourceConfig, strategySheetUrl: strategySheetUrl.trim(), strategyTabName: "Report" };
    setIsRefreshing(true);
    try {
      const refreshed = await refreshReportingFromSheets(nextConfig);
      onStateChange(mergeReportingRefresh(state, { ...refreshed, sourceConfig: nextConfig }));
      setStrategySourceOpen(false);
    } catch (error) {
      onStateChange({ ...state, sourceConfig: nextConfig, errors: [error instanceof Error ? error.message : "Could not load the strategy document Report tab."] });
    } finally {
      setIsRefreshing(false);
    }
  };

  return (
    <section className="grid gap-5">
      <div className="overflow-hidden rounded-lg border border-line bg-white shadow-card">
        <div className="bg-[#102A3A] px-5 py-4 text-white">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <div className="text-xs font-extrabold uppercase tracking-[0.18em] text-accent">Amazon Ads Command Center</div>
              <h2 className="mt-2 text-2xl font-extrabold">Reporting Dashboard</h2>
              <p className="mt-1 max-w-3xl text-sm text-white/75">Impressions, clicks, sales, ROAS, TACOS, campaign performance, and product-level advertising signals.</p>
              <div className="mt-3 inline-flex rounded-full bg-white/10 px-3 py-1 text-xs font-extrabold text-white/80">
                {hasImportedData ? `Last refreshed ${refreshedLabel}` : "Set up this client's sheet in Settings to replace the sample dashboard"}
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <button className="inline-flex items-center gap-2 rounded-md bg-white/10 px-4 py-2 text-sm font-extrabold hover:bg-white/15">
                <CalendarDays className="h-4 w-4" />
                Last 30 days
              </button>
              <button className="inline-flex items-center gap-2 rounded-md bg-white/10 px-4 py-2 text-sm font-extrabold hover:bg-white/15">
                <Filter className="h-4 w-4" />
                All campaigns
              </button>
              <button className="inline-flex items-center gap-2 rounded-md bg-brand px-4 py-2 text-sm font-extrabold text-white hover:bg-deep">
                <Download className="h-4 w-4" />
                Export
              </button>
              <button
                onClick={() => setStrategySourceOpen((open) => !open)}
                className="inline-flex items-center gap-2 rounded-md bg-white/10 px-4 py-2 text-sm font-extrabold hover:bg-white/15"
              >
                <FileSpreadsheet className="h-4 w-4" />
                Strategy Doc
                <ChevronDown className={`h-4 w-4 transition ${strategySourceOpen ? "rotate-180" : ""}`} />
              </button>
              <button
                onClick={refreshSheets}
                disabled={isRefreshing}
                className="inline-flex items-center gap-2 rounded-md bg-white px-4 py-2 text-sm font-extrabold text-[#102A3A] hover:bg-white/90 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <RefreshCw className={`h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`} />
                {isRefreshing ? "Refreshing" : "Refresh Data"}
              </button>
            </div>
          </div>
        </div>

        {!strategyMonths.length ? (
          <div className="grid gap-4 bg-[#F1F4F8] p-5 md:grid-cols-2 xl:grid-cols-6">
            <ReportMetric label="Impressions" value={number(totals.impressions)} delta="+2.3%" tone="neutral" />
            <ReportMetric label="Clicks" value={number(totals.clicks)} delta="+6.6%" tone="good" />
            <ReportMetric label="Total Sales" value={currency(totalSales)} delta="+12.7%" tone="good" />
            <ReportMetric label="Ad Spend" value={currency(totals.spend)} delta="-12.7%" tone="bad" />
            <ReportMetric label="Ad Sales" value={currency(totals.sales)} delta="+12.7%" tone="good" />
            <ReportMetric label="Account TACOS" value={percent(accountTacos)} delta="Spend / total sales" tone="neutral" />
            <ReportMetric label="ROAS" value={`${roas.toFixed(1)}x`} delta="+0.4x" tone="good" />
            <ReportMetric label="CTR" value={percent(ctr)} delta="+0.8pp" tone="good" />
            <ReportMetric label="Orders" value={number(totals.orders)} delta="+4.1%" tone="good" />
            <ReportMetric label="Conv. Rate" value={percent(conversionRate)} delta="+0.5pp" tone="good" />
            <ReportMetric label="CPC" value={`$${cpc.toFixed(2)}`} delta="+6.6%" tone="neutral" />
          </div>
        ) : null}
      </div>

      {strategySourceOpen ? (
        <div className="rounded-lg border border-line bg-white p-5 shadow-card">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div className="min-w-0 flex-1">
              <div className="text-xs font-extrabold uppercase tracking-[0.18em] text-brand">Live Client Scorecard</div>
              <h3 className="mt-2 text-lg font-extrabold text-ink">Connect the Strategy Doc</h3>
              <p className="mt-1 text-sm text-steel">The app reads only the <strong>Report</strong> tab from this Google Sheet.</p>
              <input
                value={strategySheetUrl}
                onChange={(event) => setStrategySheetUrl(event.target.value)}
                placeholder="Paste the Google Sheet link"
                className="mt-4 w-full rounded-md border border-line bg-white px-3 py-2.5 text-sm text-ink outline-none transition focus:border-brand"
              />
            </div>
            <button
              type="button"
              onClick={connectStrategyDoc}
              disabled={!strategySheetUrl.trim() || isRefreshing}
              className="inline-flex items-center justify-center gap-2 rounded-md bg-brand px-5 py-2.5 text-sm font-extrabold text-white transition hover:bg-deep disabled:cursor-not-allowed disabled:opacity-50"
            >
              <RefreshCw className={`h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`} />
              Connect & Refresh
            </button>
          </div>
        </div>
      ) : null}

      {strategyMonths.length ? (
        <StrategyScorecard rows={strategyMonths} latest={latestStrategyMonth} previous={previousStrategyMonth} />
      ) : null}

      {!strategyMonths.length ? <div className="grid gap-5 xl:grid-cols-[minmax(0,1.35fr)_minmax(360px,0.65fr)]">
        <div className="grid gap-5">
          <div className="rounded-lg border border-line bg-white p-5 shadow-card">
            <div className="flex items-center justify-between gap-4">
              <div>
                <h3 className="text-lg font-extrabold text-ink">Spend, Sales, ROAS, Clicks, and Impressions</h3>
                <p className="mt-1 text-sm text-steel">Daily trend view for the selected date range.</p>
              </div>
              <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-extrabold text-emerald-800">Live-ready</span>
            </div>
            <div className="mt-4 h-[340px]">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={dailyData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(143,162,175,0.28)" />
                  <XAxis dataKey="day" tick={{ fontSize: 11 }} />
                  <YAxis yAxisId="money" tickFormatter={(value) => `$${Math.round(value / 1000)}K`} tick={{ fontSize: 11 }} />
                  <YAxis yAxisId="volume" orientation="right" tickFormatter={(value) => `${Math.round(value / 1000)}K`} tick={{ fontSize: 11 }} />
                  <Tooltip formatter={(value: number, name) => (String(name).includes("spend") || String(name).includes("sales") ? currency(value) : number(value))} />
                  <Legend />
                  <Bar yAxisId="money" dataKey="sales" name="Ad sales" fill="#F47322" radius={[4, 4, 0, 0]} />
                  <Bar yAxisId="money" dataKey="spend" name="Spend" fill="#1D6680" radius={[4, 4, 0, 0]} />
                  <Line yAxisId="volume" type="monotone" dataKey="impressions" name="Impressions" stroke="#FDBA31" strokeWidth={2.5} dot={false} />
                  <Line yAxisId="volume" type="monotone" dataKey="clicks" name="Clicks" stroke="#415A68" strokeWidth={2.5} dot={false} />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="grid gap-5 lg:grid-cols-2">
            <CampaignTable title="Top Campaigns" rows={topCampaigns} />
            <CampaignTable title="Needs Attention" rows={weakCampaigns} />
          </div>
        </div>

        <div className="grid gap-5">
          <div className="rounded-lg border border-line bg-white p-5 shadow-card">
            <h3 className="text-lg font-extrabold text-ink">Channel Mix</h3>
            <p className="mt-1 text-sm text-steel">Spend share by Amazon ad product.</p>
            <div className="mt-4 h-[240px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={channelMix} dataKey="value" innerRadius={58} outerRadius={86} paddingAngle={3}>
                    {channelMix.map((entry) => <Cell key={entry.name} fill={entry.color} />)}
                  </Pie>
                  <Tooltip formatter={(value: number) => `${value}%`} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="grid gap-2">
              {channelMix.map((channel) => (
                <div key={channel.name} className="flex items-center justify-between rounded-md bg-warm/60 px-3 py-2 text-sm">
                  <span className="flex items-center gap-2 font-bold text-ink"><span className="h-2.5 w-2.5 rounded-full" style={{ background: channel.color }} />{channel.name}</span>
                  <span className="font-extrabold">{channel.value}%</span>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-lg border border-line bg-white p-5 shadow-card">
            <div className="flex items-start gap-3">
              <div className="rounded-full bg-amber-100 p-2 text-amber-700"><AlertTriangle className="h-5 w-5" /></div>
              <div>
                <h3 className="text-lg font-extrabold text-ink">What Data We Need</h3>
                <p className="mt-1 text-sm leading-5 text-steel">Pull these from Amazon Ads and Seller Central for a real dashboard.</p>
              </div>
            </div>
            <div className="mt-4 grid gap-3">
              {requirements.map((item) => (
                <div key={item.report} className="rounded-lg border border-line bg-white p-3">
                  <div className="flex items-start gap-2">
                    <FileSpreadsheet className="mt-0.5 h-4 w-4 shrink-0 text-brand" />
                    <div>
                      <div className="text-sm font-extrabold text-ink">{item.report}</div>
                      <div className="mt-1 text-xs leading-5 text-steel">{item.why}</div>
                      <div className="mt-2 inline-flex rounded-full bg-warm px-2.5 py-1 text-[11px] font-extrabold text-steel">{item.cadence}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div> : null}

      {!strategyMonths.length ? <div className="grid gap-5 xl:grid-cols-[1fr_1fr]">
        <ProductPerformanceTable rows={productData} />
        <BudgetPacing campaigns={campaignData} />
      </div> : null}
    </section>
  );
}

function StrategyScorecard({
  rows,
  latest,
  previous,
}: {
  rows: ReportingStrategyMonth[];
  latest: ReportingStrategyMonth | null;
  previous: ReportingStrategyMonth | null;
}) {
  const [historyOpen, setHistoryOpen] = useState(false);
  const projection = rows.find((row) => row.isProjection) ?? null;
  const summary = projection ?? latest;
  const comparison = previous;
  const comparisonLabel = comparison ? `${comparison.period.replace(/\.+$/, "")} ${comparison.year}` : "previous month";
  const currentThroughLabel = latest ? strategyDataThroughLabel(latest, projection?.dataThroughDay) : "";
  const chartRows = rows.slice(-13).map((row) => ({ ...row, label: `${row.period.slice(0, 3)} ${String(row.year).slice(-2)}` }));
  return (
    <div className="overflow-hidden rounded-lg border border-line bg-white shadow-card">
      <div className="flex flex-col gap-3 border-b border-line px-5 py-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <div className="text-xs font-extrabold uppercase tracking-[0.18em] text-brand">Client Strategy Scorecard</div>
          <h3 className="mt-2 text-xl font-extrabold text-ink">Monthly Business Performance</h3>
          <p className="mt-1 text-sm text-steel">Live from the Strategy Doc Report tab. This is the client-call view of business and advertising performance together.</p>
        </div>
        {latest ? (
          <div className="flex flex-wrap justify-end gap-2">
            <div className="rounded-md border border-amber-200 bg-amber-50 px-4 py-2 text-sm font-extrabold text-amber-900">
              Data current through {currentThroughLabel}
            </div>
            {projection ? (
              <div className="rounded-md border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm font-extrabold text-emerald-900">
                Projection compared with {comparisonLabel}
              </div>
            ) : null}
          </div>
        ) : null}
      </div>
      {summary ? (
        <div className="grid gap-3 bg-[#F1F4F8] p-5 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-5">
          <StrategyMetric label="Projected Total Sales" value={currency(summary.totalSales)} delta={metricDelta(summary.totalSales, comparison?.totalSales)} />
          <StrategyMetric label="Projected Organic Sales" value={currency(summary.organicSales)} delta={metricDelta(summary.organicSales, comparison?.organicSales)} />
          <StrategyMetric label="Projected Ad Sales" value={currency(summary.adSales)} delta={metricDelta(summary.adSales, comparison?.adSales)} />
          <StrategyMetric label="Projected Ad Spend" value={currency(summary.adSpend)} delta={metricDelta(summary.adSpend, comparison?.adSpend)} />
          <StrategyMetric label="Projected ROAS" value={`${summary.roas.toFixed(2)}x`} delta={metricDelta(summary.roas, comparison?.roas)} />
          <StrategyMetric label="Projected TACOS" value={percent(summary.tacos)} delta={metricDelta(summary.tacos, comparison?.tacos, true)} />
          <StrategyMetric label="Projected Impressions" value={number(summary.impressions)} delta={metricDelta(summary.impressions, comparison?.impressions)} />
          <StrategyMetric label="Projected Clicks" value={number(summary.clicks)} delta={metricDelta(summary.clicks, comparison?.clicks)} />
          <StrategyMetric label="Projected CTR" value={percent(summary.ctr)} delta={metricDelta(summary.ctr, comparison?.ctr)} />
          <StrategyMetric label="Projected CPC" value={currency(summary.cpc)} delta={metricDelta(summary.cpc, comparison?.cpc, true)} />
          <StrategyMetric label="Projected Sessions" value={number(summary.sessions)} delta={metricDelta(summary.sessions, comparison?.sessions)} />
          <StrategyMetric label="Projected Conv. Rate" value={percent(summary.conversionRate)} delta={metricDelta(summary.conversionRate, comparison?.conversionRate)} />
          <StrategyMetric label="Projected Ad Sales Mix" value={percent(summary.adSalesPercent)} delta={metricDelta(summary.adSalesPercent, comparison?.adSalesPercent)} />
          <StrategyMetric label="Projected Organic Mix" value={percent(summary.organicSalesPercent)} delta={metricDelta(summary.organicSalesPercent, comparison?.organicSalesPercent)} />
        </div>
      ) : null}
      <div className="grid gap-5 p-5">
        <div className="rounded-lg border border-line bg-[#FAFAFA] p-5">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h4 className="text-lg font-extrabold text-ink">Sales Mix Trend</h4>
              <p className="mt-1 text-sm text-steel">Total, organic, and ad-attributed sales by month.</p>
            </div>
            <div className="flex flex-wrap gap-2 text-xs font-extrabold">
              <span className="rounded-full bg-white px-3 py-1 text-[#1D6680] ring-1 ring-line">Organic sales</span>
              <span className="rounded-full bg-white px-3 py-1 text-brand ring-1 ring-line">Ad sales</span>
              <span className="rounded-full bg-white px-3 py-1 text-[#102A3A] ring-1 ring-line">Total sales</span>
            </div>
          </div>
          <div className="mt-4 h-[360px]">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={chartRows}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(143,162,175,0.28)" />
                <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                <YAxis tickFormatter={(value) => `$${Math.round(value / 1000)}K`} tick={{ fontSize: 11 }} />
                <Tooltip formatter={(value: number) => currency(value)} />
                <Bar dataKey="organicSales" name="Organic sales" fill="#1D6680" radius={[4, 4, 0, 0]} />
                <Bar dataKey="adSales" name="Ad sales" fill="#F47322" radius={[4, 4, 0, 0]} />
                <Line type="monotone" dataKey="totalSales" name="Total sales" stroke="#102A3A" strokeWidth={2.5} dot={false} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </div>
        <div className="overflow-hidden rounded-lg border border-line">
          <button type="button" onClick={() => setHistoryOpen((open) => !open)} className="flex w-full items-center justify-between gap-4 bg-white px-5 py-4 text-left hover:bg-warm/50">
            <div>
              <h4 className="text-base font-extrabold text-ink">Monthly Performance History</h4>
              <p className="mt-1 text-sm text-steel">{historyOpen ? "Hide the complete monthly scorecard." : "Open the complete monthly scorecard and source metrics."}</p>
            </div>
            <span className="flex shrink-0 items-center gap-2 rounded-md border border-line bg-white px-3 py-2 text-xs font-extrabold text-ink shadow-sm">
              {historyOpen ? "Collapse" : "Review history"}
              <ChevronDown className={`h-4 w-4 transition-transform ${historyOpen ? "rotate-180" : ""}`} />
            </span>
          </button>
          {historyOpen ? <div className="overflow-auto border-t border-line">
          <table className="w-full min-w-[1500px] text-sm">
            <thead className="sticky top-0 bg-white text-[10px] uppercase tracking-wide text-steel">
              <tr>
                {["Period", "Total Sales", "Sessions", "Conv. Rate", "Organic Sales", "Impressions", "Clicks", "CTR", "Ad Spend", "Ad Sales", "ROAS", "TACOS", "CPC", "Ad Sales %", "Organic Sales %", "Subscriptions"].map((head) => (
                  <th key={head} className="border-b border-line px-3 py-3 text-left font-extrabold">{head}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {[...rows].reverse().slice(0, 15).map((row) => (
                <tr key={row.id} className={row.isProjection ? "bg-orange-50" : "hover:bg-warm/50"}>
                  <td className="border-b border-line px-3 py-3 font-extrabold text-ink">{displayStrategyPeriod(row.period)} {row.year}</td>
                  <td className="border-b border-line px-3 py-3">{currency(row.totalSales)}</td>
                  <td className="border-b border-line px-3 py-3">{number(row.sessions)}</td>
                  <td className="border-b border-line px-3 py-3">{percent(row.conversionRate)}</td>
                  <td className="border-b border-line px-3 py-3">{currency(row.organicSales)}</td>
                  <td className="border-b border-line px-3 py-3">{number(row.impressions)}</td>
                  <td className="border-b border-line px-3 py-3">{number(row.clicks)}</td>
                  <td className="border-b border-line px-3 py-3">{percent(row.ctr)}</td>
                  <td className="border-b border-line px-3 py-3">{currency(row.adSpend)}</td>
                  <td className="border-b border-line px-3 py-3">{currency(row.adSales)}</td>
                  <td className="border-b border-line px-3 py-3 font-bold">{row.roas.toFixed(2)}x</td>
                  <td className="border-b border-line px-3 py-3">{percent(row.tacos)}</td>
                  <td className="border-b border-line px-3 py-3">{currency(row.cpc)}</td>
                  <td className="border-b border-line px-3 py-3">{percent(row.adSalesPercent)}</td>
                  <td className="border-b border-line px-3 py-3">{percent(row.organicSalesPercent)}</td>
                  <td className="border-b border-line px-3 py-3">{row.subscriptions ? number(row.subscriptions) : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
          </div> : null}
        </div>
      </div>
    </div>
  );
}

function StrategyMetric({ label, value, delta }: { label: string; value: string; delta: string }) {
  return (
    <div className="rounded-lg border border-line bg-white p-3 shadow-sm">
      <div className="text-[9px] font-extrabold uppercase tracking-[0.15em] text-steel">{label}</div>
      <div className="mt-2 text-xl font-extrabold text-ink">{value}</div>
      <div className="mt-1 text-[11px] font-bold text-steel">{delta}</div>
    </div>
  );
}

function ReportMetric({ label, value, delta, tone }: { label: string; value: string; delta: string; tone: "good" | "bad" | "neutral" }) {
  const positive = tone === "good";
  return (
    <div className="rounded-lg border border-line bg-white p-4 shadow-sm">
      <div className="text-[10px] font-extrabold uppercase tracking-[0.16em] text-steel">{label}</div>
      <div className="mt-3 text-2xl font-extrabold text-ink">{value}</div>
      <div className={`mt-2 inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs font-extrabold ${positive ? "bg-emerald-100 text-emerald-800" : tone === "bad" ? "bg-red-100 text-red-700" : "bg-warm text-steel"}`}>
        {positive ? <ArrowUpRight className="h-3.5 w-3.5" /> : tone === "bad" ? <ArrowDownRight className="h-3.5 w-3.5" /> : null}
        {delta}
      </div>
    </div>
  );
}

function CampaignTable({ title, rows }: { title: string; rows: ReportingCampaignRow[] }) {
  return (
    <div className="overflow-hidden rounded-lg border border-line bg-white shadow-card">
      <div className="border-b border-line px-5 py-4">
        <h3 className="text-lg font-extrabold text-ink">{title}</h3>
      </div>
      <div className="overflow-auto">
        <table className="w-full min-w-[680px] text-sm">
          <thead className="text-[11px] uppercase tracking-wide text-steel">
            <tr>
              {["Campaign", "Spend", "Sales", "ROAS", "CTR"].map((head) => <th key={head} className="border-b border-line px-4 py-3 text-left font-extrabold">{head}</th>)}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.campaign} className="hover:bg-warm/50">
                <td className="border-b border-line px-4 py-3">
                  <div className="font-extrabold text-ink">{row.campaign}</div>
                  <div className="text-xs text-steel">{row.type}</div>
                </td>
                <td className="border-b border-line px-4 py-3">{currency(row.spend)}</td>
                <td className="border-b border-line px-4 py-3 font-bold">{currency(row.sales)}</td>
                <td className="border-b border-line px-4 py-3">{(row.spend ? row.sales / row.spend : 0).toFixed(1)}x</td>
                <td className="border-b border-line px-4 py-3">{percent(row.impressions ? row.clicks / row.impressions : 0)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function ProductPerformanceTable({ rows }: { rows: ReportingProductRow[] }) {
  return (
    <div className="overflow-hidden rounded-lg border border-line bg-white shadow-card">
      <div className="border-b border-line px-5 py-4">
        <h3 className="text-lg font-extrabold text-ink">Product Performance</h3>
        <p className="mt-1 text-sm text-steel">Ad spend and TACOS by advertised product/SKU.</p>
      </div>
      <div className="overflow-auto">
        <table className="w-full min-w-[760px] text-sm">
          <thead className="text-[11px] uppercase tracking-wide text-steel">
            <tr>
              {["Product", "Spend", "Sales", "TACOS", "ROAS", "Signal"].map((head) => <th key={head} className="border-b border-line px-4 py-3 text-left font-extrabold">{head}</th>)}
            </tr>
          </thead>
          <tbody>
            {rows.slice(0, 12).map((row) => {
              const sales = row.totalSales || row.adSales;
              const tacos = sales ? row.spend / sales : 0;
              const roas = row.spend ? row.adSales / row.spend : 0;
              const status = !row.spend ? "No spend" : roas >= 4 ? "Scale" : roas >= 2 ? "Watch" : "Fix";
              return (
              <tr key={`${row.product}-${row.asin}-${row.sku}`} className="hover:bg-warm/50">
                <td className="border-b border-line px-4 py-3 font-extrabold text-ink">{row.product}</td>
                <td className="border-b border-line px-4 py-3">{currency(row.spend)}</td>
                <td className="border-b border-line px-4 py-3">{currency(sales)}</td>
                <td className="border-b border-line px-4 py-3">{percent(tacos)}</td>
                <td className="border-b border-line px-4 py-3">{roas.toFixed(1)}x</td>
                <td className="border-b border-line px-4 py-3"><span className={`rounded-full px-2.5 py-1 text-xs font-extrabold ${status === "Scale" ? "bg-emerald-100 text-emerald-800" : status === "Watch" ? "bg-amber-100 text-amber-800" : "bg-red-100 text-red-700"}`}>{status}</span></td>
              </tr>
            );})}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function BudgetPacing({ campaigns }: { campaigns: ReportingCampaignRow[] }) {
  const spend = campaigns.reduce((sum, row) => sum + row.spend, 0);
  const sales = campaigns.reduce((sum, row) => sum + row.sales, 0);
  const clicks = campaigns.reduce((sum, row) => sum + row.clicks, 0);
  const budget = campaigns.reduce((sum, row) => sum + row.budget, 0) || spend * 1.25;
  const goals = [
    { label: "Spend pacing", actual: spend, target: budget, tone: "good" },
    { label: "Ad sales target", actual: sales, target: sales * 1.15 || 1, tone: "good" },
    { label: "Click volume", actual: clicks, target: clicks * 1.1 || 1, tone: "good" },
  ];
  return (
    <div className="rounded-lg border border-line bg-white p-5 shadow-card">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h3 className="text-lg font-extrabold text-ink">Budget Pacing</h3>
          <p className="mt-1 text-sm text-steel">Goal tracking for the reporting period.</p>
        </div>
        <Target className="h-5 w-5 text-brand" />
      </div>
      <div className="mt-5 grid gap-4">
        {goals.map((goal) => {
          const pct = Math.min(1, goal.actual / goal.target);
          return (
            <div key={goal.label}>
              <div className="mb-2 flex items-center justify-between text-sm">
                <span className="font-extrabold text-ink">{goal.label}</span>
                <span className="font-bold text-steel">{currency(goal.actual)} / {currency(goal.target)}</span>
              </div>
              <div className="h-2.5 overflow-hidden rounded-full bg-warm">
                <div className={`h-full rounded-full ${goal.tone === "bad" ? "bg-danger" : "bg-brand"}`} style={{ width: `${pct * 100}%` }} />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function mergeReportingRefresh(current: ReportingState, refreshed: ReportingState): ReportingState {
  return {
    ...current,
    ...refreshed,
    sourceConfig: refreshed.sourceConfig,
    accountTotalSales: refreshed.accountTotalSales || current.accountTotalSales,
    campaigns: refreshed.campaigns.length ? refreshed.campaigns : current.campaigns,
    products: refreshed.products.length ? refreshed.products : current.products,
    searchTerms: refreshed.searchTerms.length ? refreshed.searchTerms : current.searchTerms,
    daily: refreshed.daily.length ? refreshed.daily : current.daily,
    strategyMonths: refreshed.strategyMonths.length ? refreshed.strategyMonths : current.strategyMonths,
  };
}

function metricDelta(current: number, previous?: number, lowerIsBetter = false) {
  if (!previous) return "No prior-period comparison";
  const change = (current - previous) / Math.abs(previous);
  const direction = change >= 0 ? "+" : "";
  const interpretation = lowerIsBetter ? (change <= 0 ? "better" : "higher") : change >= 0 ? "growth" : "decline";
  return `${direction}${(change * 100).toFixed(1)}% vs prior (${interpretation})`;
}

function displayStrategyPeriod(period: string) {
  return period.replace(/\.+$/, "").trim();
}

function strategyDataThroughLabel(row: ReportingStrategyMonth, dataThroughDay?: number) {
  const period = displayStrategyPeriod(row.period);
  return dataThroughDay ? `${period} ${dataThroughDay}, ${row.year}` : `${period} ${row.year}`;
}
