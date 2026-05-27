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
  const workbook = XLSX.utils.book_new();
  const currentSales = rows.reduce((sum, row) => sum + row.currentSales, 0);
  const currentAdSpend = rows.reduce((sum, row) => sum + row.currentAdSpend, 0);
  const currentProfit = rows.reduce((sum, row) => sum + row.currentProfit, 0);
  const currentTacos = currentSales ? currentAdSpend / currentSales : 0;
  const currentMargin = currentSales ? currentProfit / currentSales : 0;
  const staleIssues = issues.filter((issue) => issue.title.toLowerCase().includes("fresh") || issue.title.toLowerCase().includes("stale"));

  XLSX.utils.book_append_sheet(
    workbook,
    XLSX.utils.json_to_sheet([
      { Metric: "Current Sales", Value: currentSales },
      { Metric: "Current Ad Spend", Value: currentAdSpend },
      { Metric: "Current Account TACOS", Value: currentTacos },
      { Metric: "Current Profit", Value: currentProfit },
      { Metric: "Current Profit Margin", Value: currentMargin },
      { Metric: "Scenario Sales", Value: summary.totalSales },
      { Metric: "Scenario Ad Spend", Value: summary.totalAdSpend },
      { Metric: "Scenario TACOS", Value: summary.blendedTacos },
      { Metric: "Scenario Profit", Value: summary.estimatedProfit },
      { Metric: "Scenario Profit Margin", Value: summary.blendedProfitMargin },
      { Metric: "Break-even TACOS", Value: summary.breakEvenTacos },
      { Metric: "Unprofitable SKUs", Value: summary.unprofitableSkus },
      { Metric: "Scale Candidates", Value: summary.scaleCandidates },
      { Metric: "Data Quality Items", Value: issues.length },
    ]),
    "Executive Summary",
  );

  XLSX.utils.book_append_sheet(
    workbook,
    XLSX.utils.json_to_sheet(
      rows
        .filter((row) => row.status === "Scale Candidate")
        .sort((a, b) => b.estimatedProfit - a.estimatedProfit)
        .slice(0, 20)
        .map((row) => ({
          SKU: row.sku,
          ASIN: row.asin,
          Product: row.title,
          Sales: row.scenarioSales,
          Profit: row.estimatedProfit,
          Margin: row.profitMargin,
          TACOS: row.scenarioTacos,
          "Break-even TACOS": row.breakEvenTacos,
          "Room to Spend": row.maxProfitableAdSpend - row.scenarioAdSpend,
        })),
    ),
    "Scale Candidates",
  );

  XLSX.utils.book_append_sheet(
    workbook,
    XLSX.utils.json_to_sheet(
      rows
        .filter((row) => row.estimatedProfit < 0 || row.status === "Data Missing")
        .sort((a, b) => a.estimatedProfit - b.estimatedProfit)
        .slice(0, 30)
        .map((row) => ({
          SKU: row.sku,
          ASIN: row.asin,
          Product: row.title,
          Status: row.status,
          Sales: row.scenarioSales,
          Profit: row.estimatedProfit,
          Margin: row.profitMargin,
          "Data Issues": row.dataIssues.join("; "),
        })),
    ),
    "Needs Attention",
  );

  XLSX.utils.book_append_sheet(
    workbook,
    XLSX.utils.json_to_sheet(
      parentRows.map((row) => ({
        "Parent ASIN": row.parentAsin,
        "Product Title": row.topChildTitle,
        Children: `${row.childCount} ASINs / ${row.skuCount} SKUs`,
        Sales: row.totalSales,
        "Ad Spend": row.adSpend,
        TACOS: row.tacos,
        Profit: row.estimatedProfit,
        Margin: row.profitMargin,
        "Break-even TACOS": row.breakEvenTacos,
        "Data Gaps": row.dataMissingChildren,
      })),
    ),
    "Parent ASIN Summary",
  );

  XLSX.utils.book_append_sheet(
    workbook,
    XLSX.utils.json_to_sheet(
      issues.map((issue) => ({
        Severity: issue.severity,
        Title: issue.title,
        SKU: issue.sku,
        ASIN: issue.asin,
        Detail: issue.detail,
        Items: issue.items?.join("; "),
      })),
    ),
    "Data Quality",
  );

  XLSX.utils.book_append_sheet(
    workbook,
    XLSX.utils.json_to_sheet(
      staleIssues.map((issue) => ({
        Severity: issue.severity,
        Check: issue.title,
        Detail: issue.detail,
      })),
    ),
    "Data Freshness",
  );

  XLSX.writeFile(workbook, "amazon-pnl-executive-summary.xlsx");
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
