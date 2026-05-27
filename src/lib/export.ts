import * as XLSX from "xlsx";
import type { CalculatedSkuPnl, DataQualityIssue, PortfolioSummary } from "../types/models";

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
