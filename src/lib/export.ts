import * as XLSX from "xlsx";
import type { CalculatedSkuPnl, DataQualityIssue, ParentAsinPnl, PortfolioSummary } from "../types/models";

export function exportWorkbook(
  rows: CalculatedSkuPnl[],
  scenarios: Array<{ name: string; summary: PortfolioSummary }>,
  issues: DataQualityIssue[],
) {
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(rows.map(rowToExport)), "Scenario SKU P&L");
  XLSX.utils.book_append_sheet(
    workbook,
    XLSX.utils.json_to_sheet(
      rows.map((row) => ({
        ASIN: row.asin,
        SKU: row.sku,
        Product: row.title,
        "Current Sales": row.currentSales,
        "Current Ad Spend": row.currentAdSpend,
        "Current TACOS": row.currentTacos,
        "Current Profit": row.currentProfit,
        "Current Margin": row.currentProfitMargin,
      })),
    ),
    "Current SKU P&L",
  );
  XLSX.utils.book_append_sheet(
    workbook,
    XLSX.utils.json_to_sheet(
      scenarios.map(({ name, summary }) => ({
        Scenario: name,
        Sales: summary.totalSales,
        "Ad Spend": summary.totalAdSpend,
        TACOS: summary.blendedTacos,
        "Coupon Cost": summary.totalCouponCost,
        Profit: summary.estimatedProfit,
        Margin: summary.blendedProfitMargin,
        "Unprofitable SKUs": summary.unprofitableSkus,
        "Scale Candidates": summary.scaleCandidates,
      })),
    ),
    "Scenario Comparison",
  );
  XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(issues), "Data Quality Issues");
  XLSX.writeFile(workbook, "amazon-sku-profitability-scenarios.xlsx");
}

export function downloadCsv(rows: CalculatedSkuPnl[]) {
  const worksheet = XLSX.utils.json_to_sheet(rows.map(rowToExport));
  const csv = XLSX.utils.sheet_to_csv(worksheet);
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "scenario-sku-pnl.csv";
  link.click();
  URL.revokeObjectURL(url);
}

export function exportExecutiveSummary(
  rows: CalculatedSkuPnl[],
  parentRows: ParentAsinPnl[],
  summary: PortfolioSummary,
  issues: DataQualityIssue[],
) {
  const currentSales = rows.reduce((sum, row) => sum + row.currentSales, 0);
  const currentAdSpend = rows.reduce((sum, row) => sum + row.currentAdSpend, 0);
  const currentProfit = rows.reduce((sum, row) => sum + row.currentProfit, 0);
  const currentTacos = currentSales ? currentAdSpend / currentSales : 0;
  const currentMargin = currentSales ? currentProfit / currentSales : 0;
  const scaleCandidates = rows.filter((row) => row.status === "Scale Candidate").sort((a, b) => b.estimatedProfit - a.estimatedProfit).slice(0, 8);
  const attentionRows = rows
    .filter((row) => row.estimatedProfit < 0 || row.status === "Data Missing" || row.profitMargin < 0.12)
    .sort((a, b) => a.estimatedProfit - b.estimatedProfit)
    .slice(0, 8);
  const topParents = [...parentRows].sort((a, b) => b.estimatedProfit - a.estimatedProfit).slice(0, 8);
  const highIssues = issues.filter((issue) => issue.severity === "high");
  const mediumIssues = issues.filter((issue) => issue.severity === "medium");
  const freshnessIssues = issues.filter((issue) => `${issue.title} ${issue.detail}`.toLowerCase().includes("fresh"));
  const reportDate = new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(new Date());
  const profitDelta = summary.estimatedProfit - currentProfit;
  const salesDelta = summary.totalSales - currentSales;
  const strategicNote =
    summary.unprofitableSkus > 0
      ? `${summary.unprofitableSkus} SKU${summary.unprofitableSkus === 1 ? "" : "s"} need margin attention before scaling spend.`
      : summary.scaleCandidates > 0
        ? `${summary.scaleCandidates} SKU${summary.scaleCandidates === 1 ? "" : "s"} look ready for controlled scaling under the current assumptions.`
        : "The portfolio is profitable, but the current scenario does not create many clear scale candidates.";

  const html = `<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <title>Amazon P&L Executive Summary</title>
  <style>
    @page { size: letter; margin: 0.45in; }
    * { box-sizing: border-box; }
    body { margin: 0; background: #eef2f3; color: #24323d; font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; }
    .sheet { width: 100%; max-width: 1100px; margin: 0 auto; background: #fff; padding: 34px; }
    .topbar { display: flex; align-items: flex-start; justify-content: space-between; gap: 24px; border-bottom: 1px solid #d8e1e5; padding-bottom: 20px; }
    .eyebrow { color: #155e75; font-size: 11px; font-weight: 900; letter-spacing: .18em; text-transform: uppercase; }
    h1 { margin: 8px 0 8px; font-size: 34px; line-height: 1.04; letter-spacing: -.02em; }
    .subtle { color: #5f6f79; font-size: 13px; line-height: 1.55; }
    .stamp { min-width: 190px; border: 1px solid #d8e1e5; border-radius: 12px; padding: 12px 14px; text-align: right; }
    .stamp strong { display: block; font-size: 13px; }
    .kpis { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin: 22px 0; }
    .kpi { border: 1px solid #d8e1e5; border-radius: 14px; padding: 14px; min-height: 94px; }
    .kpi.good { background: #ecfdf5; border-color: #9ee7c1; }
    .kpi.warn { background: #fffbeb; border-color: #f6d675; }
    .kpi .label { color: #425563; font-size: 10px; font-weight: 900; letter-spacing: .13em; text-transform: uppercase; }
    .kpi .value { margin-top: 8px; font-size: 25px; font-weight: 900; color: #102f3f; }
    .kpi .helper { margin-top: 3px; color: #49606e; font-size: 12px; }
    .callout { margin: 16px 0 22px; border: 1px solid #94dcb9; background: #effdf6; border-radius: 14px; padding: 16px 18px; }
    .callout h2 { margin: 0 0 6px; font-size: 17px; }
    .section { margin-top: 22px; break-inside: avoid; }
    .section h2 { margin: 0 0 10px; font-size: 18px; }
    .grid2 { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }
    table { width: 100%; border-collapse: collapse; overflow: hidden; border: 1px solid #d8e1e5; border-radius: 12px; font-size: 12px; }
    th { background: #f6f8f9; color: #24323d; font-size: 10px; letter-spacing: .1em; text-transform: uppercase; text-align: left; }
    th, td { border-bottom: 1px solid #d8e1e5; padding: 9px 10px; vertical-align: top; }
    td.num, th.num { text-align: right; white-space: nowrap; }
    tr:last-child td { border-bottom: 0; }
    .profit { color: #087653; font-weight: 900; }
    .loss { color: #b42318; font-weight: 900; }
    .pill { display: inline-block; border-radius: 999px; padding: 4px 8px; font-size: 10px; font-weight: 900; }
    .pill.good { background: #d9f8e8; color: #076a4b; }
    .pill.warn { background: #fff2c2; color: #92400e; }
    .pill.bad { background: #fee2e2; color: #991b1b; }
    .issue-list { display: grid; gap: 8px; }
    .issue { border: 1px solid #f6c3c3; background: #fff4f4; border-radius: 12px; padding: 11px 12px; font-size: 12px; }
    .issue.medium { border-color: #efd47a; background: #fff9df; }
    .issue strong { display: block; margin-bottom: 4px; }
    .foot { margin-top: 28px; color: #6b7b85; font-size: 11px; border-top: 1px solid #d8e1e5; padding-top: 12px; }
    @media print {
      body { background: white; }
      .sheet { max-width: none; padding: 0; }
      .no-print { display: none; }
      .section { page-break-inside: avoid; }
    }
  </style>
</head>
<body>
  <main class="sheet">
    <div class="topbar">
      <div>
        <div class="eyebrow">Amazon Profit Operations</div>
        <h1>Amazon P&L Executive Summary</h1>
        <div class="subtle">Client-ready profitability snapshot across current performance, scenario assumptions, parent ASINs, SKU opportunities, and data quality.</div>
      </div>
      <div class="stamp">
        <strong>Generated</strong>
        <span class="subtle">${escapeHtml(reportDate)}</span>
      </div>
    </div>

    <section class="kpis">
      ${kpiHtml("Current Sales", money(currentSales), `${num(rows.reduce((sum, row) => sum + row.unitsSold, 0))} units`)}
      ${kpiHtml("Current Ad Spend", money(currentAdSpend), `${pct(currentTacos)} account TACOS`)}
      ${kpiHtml("Current Profit", money(currentProfit), `${pct(currentMargin)} current margin`, currentProfit < 0 ? "warn" : "good")}
      ${kpiHtml("Scenario Profit", money(summary.estimatedProfit), `${pct(summary.blendedProfitMargin)} scenario margin`, summary.estimatedProfit < 0 ? "warn" : "good")}
      ${kpiHtml("Scenario Sales", money(summary.totalSales), `${deltaLabel(salesDelta)} vs current`)}
      ${kpiHtml("Scenario Ad Spend", money(summary.totalAdSpend), `${pct(summary.blendedTacos)} scenario TACOS`)}
      ${kpiHtml("Break-even TACOS", pct(summary.breakEvenTacos), "Maximum blended TACOS before profit hits zero")}
      ${kpiHtml("SKU Health", `${summary.profitableSkus}/${rows.length}`, `${summary.unprofitableSkus} unprofitable · ${summary.scaleCandidates} scale candidates`, summary.unprofitableSkus ? "warn" : "good")}
    </section>

    <section class="callout">
      <h2>Executive Readout</h2>
      <div class="subtle">${escapeHtml(strategicNote)} Scenario profit is ${money(summary.estimatedProfit)}, which is ${deltaLabel(profitDelta)} versus current profit.</div>
    </section>

    <section class="grid2">
      <div class="section">
        <h2>Best Scale Candidates</h2>
        ${scaleCandidates.length ? skuTable(scaleCandidates, true) : emptyState("No clear scale candidates under this scenario.")}
      </div>
      <div class="section">
        <h2>Needs Attention</h2>
        ${attentionRows.length ? skuTable(attentionRows, false) : emptyState("No negative or low-margin SKUs surfaced.")}
      </div>
    </section>

    <section class="section">
      <h2>Parent ASIN Summary</h2>
      ${topParents.length ? parentTable(topParents) : emptyState("No parent ASIN rows available.")}
    </section>

    <section class="section">
      <h2>Data Quality and Freshness</h2>
      <div class="subtle" style="margin-bottom:10px;">${highIssues.length} high · ${mediumIssues.length} medium · ${freshnessIssues.length} freshness-related checks</div>
      ${issues.length ? `<div class="issue-list">${issues.slice(0, 8).map(issueHtml).join("")}</div>` : emptyState("No data quality issues detected.")}
    </section>

    <div class="foot">Generated from the Amazon SKU P&L dashboard. Export shows modeled scenario results and depends on the uploaded business, fee, storage, COGS, and advertising data.</div>
  </main>
  <script>
    window.addEventListener("load", () => setTimeout(() => window.print(), 350));
  </script>
</body>
</html>`;

  const printWindow = window.open("", "_blank", "width=1180,height=900");
  if (!printWindow) {
    const blob = new Blob([html], { type: "text/html;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "amazon-pnl-executive-summary.html";
    link.click();
    URL.revokeObjectURL(url);
    return;
  }
  printWindow.document.open();
  printWindow.document.write(html);
  printWindow.document.close();
}

function kpiHtml(label: string, value: string, helper: string, tone: "neutral" | "good" | "warn" = "neutral") {
  return `<div class="kpi ${tone}"><div class="label">${escapeHtml(label)}</div><div class="value">${escapeHtml(value)}</div><div class="helper">${escapeHtml(helper)}</div></div>`;
}

function skuTable(rows: CalculatedSkuPnl[], showRoom: boolean) {
  return `<table><thead><tr><th>SKU</th><th>Product</th><th class="num">Sales</th><th class="num">Profit</th><th class="num">Margin</th>${showRoom ? `<th class="num">Room</th>` : `<th>Status</th>`}</tr></thead><tbody>${rows
    .map(
      (row) =>
        `<tr><td><strong>${escapeHtml(row.sku || row.asin)}</strong></td><td>${escapeHtml(shortText(row.title, 58))}</td><td class="num">${money(row.scenarioSales)}</td><td class="num ${row.estimatedProfit < 0 ? "loss" : "profit"}">${money(row.estimatedProfit)}</td><td class="num">${pct(row.profitMargin)}</td>${
          showRoom
            ? `<td class="num">${money(Math.max(0, row.maxProfitableAdSpend - row.scenarioAdSpend))}</td>`
            : `<td><span class="pill ${row.status === "Data Missing" ? "bad" : "warn"}">${escapeHtml(row.status)}</span></td>`
        }</tr>`,
    )
    .join("")}</tbody></table>`;
}

function parentTable(rows: ParentAsinPnl[]) {
  return `<table><thead><tr><th>Parent ASIN</th><th>Product Title</th><th class="num">Sales</th><th class="num">Ad Spend</th><th class="num">TACOS</th><th class="num">Profit</th><th class="num">Margin</th><th>Health</th></tr></thead><tbody>${rows
    .map(
      (row) =>
        `<tr><td><strong>${escapeHtml(row.parentAsin)}</strong></td><td>${escapeHtml(shortText(row.topChildTitle, 72))}<br><span class="subtle">${row.childCount} ASINs / ${row.skuCount} SKUs</span></td><td class="num">${money(row.totalSales)}</td><td class="num">${money(row.adSpend)}</td><td class="num">${pct(row.tacos)}</td><td class="num ${row.estimatedProfit < 0 ? "loss" : "profit"}">${money(row.estimatedProfit)}</td><td class="num">${pct(row.profitMargin)}</td><td><span class="pill ${row.dataMissingChildren ? "warn" : "good"}">${row.dataMissingChildren ? `${row.dataMissingChildren} gaps` : "Healthy"}</span></td></tr>`,
    )
    .join("")}</tbody></table>`;
}

function issueHtml(issue: DataQualityIssue) {
  const tone = issue.severity === "high" ? "" : "medium";
  return `<div class="issue ${tone}"><strong>${escapeHtml(issue.title)}</strong><span>${escapeHtml(issue.detail || issue.items?.slice(0, 6).join(", ") || "Review source report inputs.")}</span></div>`;
}

function emptyState(message: string) {
  return `<div class="subtle" style="border:1px dashed #d8e1e5;border-radius:12px;padding:16px;">${escapeHtml(message)}</div>`;
}

function money(value: number) {
  return new Intl.NumberFormat(undefined, { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(value || 0);
}

function pct(value: number) {
  return `${((value || 0) * 100).toFixed(1)}%`;
}

function num(value: number) {
  return new Intl.NumberFormat(undefined, { maximumFractionDigits: 0 }).format(value || 0);
}

function deltaLabel(value: number) {
  const sign = value >= 0 ? "+" : "";
  return `${sign}${money(value)}`;
}

function shortText(value: string, max: number) {
  return value.length > max ? `${value.slice(0, max - 1)}...` : value;
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function rowToExport(row: CalculatedSkuPnl) {
  return {
    ASIN: row.asin,
    SKU: row.sku,
    Product: row.title,
    "Current Sales": row.currentSales,
    "Scenario Sales": row.scenarioSales,
    "Current Ad Spend": row.currentAdSpend,
    "Scenario Ad Spend": row.scenarioAdSpend,
    "Current TACOS": row.currentTacos,
    "Scenario TACOS": row.scenarioTacos,
    "Coupon %": row.couponPercent,
    "Coupon Cost": row.couponCost,
    "Amazon Fees": row.scenarioAmazonFees,
    COGS: row.scenarioCogs,
    Profit: row.estimatedProfit,
    Margin: row.profitMargin,
    "Break-even TACOS": row.breakEvenTacos,
    "Max Profitable Ad Spend": row.maxProfitableAdSpend,
    Status: row.status,
  };
}
