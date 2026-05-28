import { AlertTriangle, ArrowDownRight, ArrowUpRight, CalendarDays, Download, FileSpreadsheet, Filter, Target } from "lucide-react";
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
  { campaign: "Brand Defense", type: "Sponsored Products", spend: 4292, sales: 16712, impressions: 971818, clicks: 9608, orders: 486, acos: 0.257, roas: 3.89, ctr: 0.0099, cpc: 0.45 },
  { campaign: "Nonbrand High Intent", type: "Sponsored Products", spend: 3452, sales: 15164, impressions: 921462, clicks: 7440, orders: 402, acos: 0.228, roas: 4.39, ctr: 0.0081, cpc: 0.46 },
  { campaign: "Competitor ASIN", type: "Sponsored Display", spend: 3043, sales: 14027, impressions: 900512, clicks: 5158, orders: 288, acos: 0.217, roas: 4.61, ctr: 0.0057, cpc: 0.59 },
  { campaign: "Category Expansion", type: "Sponsored Brands", spend: 4875, sales: 13207, impressions: 822123, clicks: 6920, orders: 261, acos: 0.369, roas: 2.71, ctr: 0.0084, cpc: 0.70 },
  { campaign: "Retargeting", type: "Sponsored Display", spend: 3986, sales: 12557, impressions: 555239, clicks: 3368, orders: 247, acos: 0.317, roas: 3.15, ctr: 0.0061, cpc: 1.18 },
];

const productRows = [
  { product: "Hydration Electrolyte Mix", spend: 82586, sales: 917622, tacos: 0.09, roas: 11.11, status: "Scale" },
  { product: "Electrolyte Mix - Lemon Lime", spend: 62167, sales: 690749, tacos: 0.09, roas: 11.11, status: "Scale" },
  { product: "Watermelon Lime Jar", spend: 59352, sales: 659463, tacos: 0.09, roas: 11.11, status: "Scale" },
  { product: "Camera Stick Foundation", spend: 220, sales: 734, tacos: 0.3, roas: 3.34, status: "Watch" },
];

const channelMix = [
  { name: "Sponsored Products", value: 72, color: "#F47322" },
  { name: "Sponsored Brands", value: 18, color: "#1D6680" },
  { name: "Sponsored Display", value: 10, color: "#FDBA31" },
];

const requirements = [
  {
    report: "Sponsored Products Advertised Product Report",
    why: "SKU/ASIN spend, attributed sales, orders, clicks, impressions, CPC, CTR, CVR, ACOS, ROAS.",
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
    why: "Total sales and units so the dashboard can calculate TACOS, not just ACOS.",
    cadence: "Same date range as ads",
  },
];

export function ReportingDashboard() {
  const totals = campaignRows.reduce(
    (acc, row) => ({
      spend: acc.spend + row.spend,
      sales: acc.sales + row.sales,
      impressions: acc.impressions + row.impressions,
      clicks: acc.clicks + row.clicks,
      orders: acc.orders + row.orders,
    }),
    { spend: 0, sales: 0, impressions: 0, clicks: 0, orders: 0 },
  );
  const acos = totals.sales ? totals.spend / totals.sales : 0;
  const roas = totals.spend ? totals.sales / totals.spend : 0;
  const ctr = totals.impressions ? totals.clicks / totals.impressions : 0;
  const cpc = totals.clicks ? totals.spend / totals.clicks : 0;

  return (
    <section className="grid gap-5">
      <div className="overflow-hidden rounded-lg border border-line bg-white shadow-card">
        <div className="bg-[#102A3A] px-5 py-4 text-white">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <div className="text-xs font-extrabold uppercase tracking-[0.18em] text-accent">Amazon Ads Command Center</div>
              <h2 className="mt-2 text-2xl font-extrabold">Reporting Dashboard</h2>
              <p className="mt-1 max-w-3xl text-sm text-white/75">Campaign, product, search-term, and budget-pacing views for client reporting.</p>
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
            </div>
          </div>
        </div>

        <div className="grid gap-4 bg-[#F1F4F8] p-5 md:grid-cols-2 xl:grid-cols-6">
          <ReportMetric label="Total Spend" value={currency(totals.spend)} delta="-12.7%" tone="bad" />
          <ReportMetric label="Ad Sales" value={currency(totals.sales)} delta="+12.7%" tone="good" />
          <ReportMetric label="ACOS" value={percent(acos)} delta="-2.1pp" tone="good" />
          <ReportMetric label="ROAS" value={`${roas.toFixed(1)}x`} delta="+0.4x" tone="good" />
          <ReportMetric label="CTR" value={percent(ctr)} delta="+0.8pp" tone="good" />
          <ReportMetric label="CPC" value={`$${cpc.toFixed(2)}`} delta="+6.6%" tone="neutral" />
        </div>
      </div>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1.35fr)_minmax(360px,0.65fr)]">
        <div className="grid gap-5">
          <div className="rounded-lg border border-line bg-white p-5 shadow-card">
            <div className="flex items-center justify-between gap-4">
              <div>
                <h3 className="text-lg font-extrabold text-ink">Spend, Sales, Clicks, and Impressions</h3>
                <p className="mt-1 text-sm text-steel">Daily trend view for the selected date range.</p>
              </div>
              <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-extrabold text-emerald-800">Live-ready</span>
            </div>
            <div className="mt-4 h-[340px]">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={dailyTrend}>
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
            <CampaignTable title="Top Campaigns" rows={campaignRows.slice(0, 5)} />
            <CampaignTable title="Needs Attention" rows={[...campaignRows].sort((a, b) => b.acos - a.acos).slice(0, 5)} />
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
      </div>

      <div className="grid gap-5 xl:grid-cols-[1fr_1fr]">
        <ProductPerformanceTable />
        <BudgetPacing />
      </div>
    </section>
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

function CampaignTable({ title, rows }: { title: string; rows: typeof campaignRows }) {
  return (
    <div className="overflow-hidden rounded-lg border border-line bg-white shadow-card">
      <div className="border-b border-line px-5 py-4">
        <h3 className="text-lg font-extrabold text-ink">{title}</h3>
      </div>
      <div className="overflow-auto">
        <table className="w-full min-w-[680px] text-sm">
          <thead className="text-[11px] uppercase tracking-wide text-steel">
            <tr>
              {["Campaign", "Spend", "Sales", "ACOS", "ROAS", "CTR"].map((head) => <th key={head} className="border-b border-line px-4 py-3 text-left font-extrabold">{head}</th>)}
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
                <td className="border-b border-line px-4 py-3">{percent(row.acos)}</td>
                <td className="border-b border-line px-4 py-3">{row.roas.toFixed(1)}x</td>
                <td className="border-b border-line px-4 py-3">{percent(row.ctr)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function ProductPerformanceTable() {
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
            {productRows.map((row) => (
              <tr key={row.product} className="hover:bg-warm/50">
                <td className="border-b border-line px-4 py-3 font-extrabold text-ink">{row.product}</td>
                <td className="border-b border-line px-4 py-3">{currency(row.spend)}</td>
                <td className="border-b border-line px-4 py-3">{currency(row.sales)}</td>
                <td className="border-b border-line px-4 py-3">{percent(row.tacos)}</td>
                <td className="border-b border-line px-4 py-3">{row.roas.toFixed(1)}x</td>
                <td className="border-b border-line px-4 py-3"><span className={`rounded-full px-2.5 py-1 text-xs font-extrabold ${row.status === "Scale" ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-800"}`}>{row.status}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function BudgetPacing() {
  const goals = [
    { label: "Spend pacing", actual: 19650, target: 25000, tone: "good" },
    { label: "Ad sales target", actual: 71670, target: 90000, tone: "good" },
    { label: "ACOS ceiling", actual: 0.389, target: 0.32, tone: "bad" },
    { label: "Click volume", actual: 39400, target: 42000, tone: "good" },
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
          const pct = goal.label.includes("ACOS") ? Math.min(1, goal.target / goal.actual) : Math.min(1, goal.actual / goal.target);
          return (
            <div key={goal.label}>
              <div className="mb-2 flex items-center justify-between text-sm">
                <span className="font-extrabold text-ink">{goal.label}</span>
                <span className="font-bold text-steel">
                  {goal.label.includes("ACOS") ? `${percent(goal.actual)} / ${percent(goal.target)}` : `${currency(goal.actual)} / ${currency(goal.target)}`}
                </span>
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
