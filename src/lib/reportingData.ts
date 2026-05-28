import * as XLSX from "xlsx";
import type {
  ReportingCampaignRow,
  ReportingDailyRow,
  ReportingProductRow,
  ReportingSearchTermRow,
  ReportingSourceConfig,
  ReportingState,
} from "../types/models";

export const emptyReportingSourceConfig: ReportingSourceConfig = {
  masterSheetUrl: "",
  campaignTabName: "Campaign Report",
  productTabName: "Advertised Product Report",
  searchTermTabName: "Search Term Report",
  dailyTabName: "Daily Trend",
  businessTabName: "Business Report",
  campaignCsvUrl: "",
  productCsvUrl: "",
  searchTermCsvUrl: "",
  dailyCsvUrl: "",
  businessCsvUrl: "",
};

export const emptyReportingState: ReportingState = {
  sourceConfig: emptyReportingSourceConfig,
  lastRefreshedAt: null,
  campaigns: [],
  products: [],
  searchTerms: [],
  daily: [],
  errors: [],
};

type RawRow = Record<string, unknown>;

const headerAliases = {
  campaign: ["campaign", "campaign name", "campaignname"],
  adType: ["ad product", "ad type", "campaign type", "type"],
  status: ["status", "state", "campaign status"],
  budget: ["budget", "campaign budget", "daily budget"],
  spend: ["spend", "cost", "total spend", "ad spend"],
  sales: ["sales", "ad sales", "attributed sales", "14 day total sales", "sales within 14 days of ad click", "7 day total sales"],
  totalSales: ["total sales", "ordered product sales", "ordered product sales - total", "sales"],
  impressions: ["impressions", "impr"],
  clicks: ["clicks"],
  orders: ["orders", "purchases", "total orders", "14 day total orders", "7 day total orders"],
  date: ["date", "day", "start date"],
  product: ["product", "product title", "advertised product", "title"],
  asin: ["asin", "advertised asin", "child asin"],
  sku: ["sku", "advertised sku", "seller sku"],
  searchTerm: ["search term", "customer search term", "query"],
};

function cleanHeader(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

function rowLookup(row: RawRow) {
  return Object.entries(row).reduce<Record<string, unknown>>((acc, [key, value]) => {
    acc[cleanHeader(key)] = value;
    return acc;
  }, {});
}

function pick(row: RawRow, aliases: string[]) {
  const normalized = rowLookup(row);
  for (const alias of aliases) {
    const value = normalized[cleanHeader(alias)];
    if (value !== undefined && value !== null && String(value).trim() !== "") return value;
  }
  return "";
}

function text(row: RawRow, aliases: string[], fallback = "") {
  const value = pick(row, aliases);
  return value === undefined || value === null ? fallback : String(value).trim();
}

function amount(row: RawRow, aliases: string[]) {
  const value = pick(row, aliases);
  if (typeof value === "number") return Number.isFinite(value) ? value : 0;
  const parsed = Number(String(value).replace(/[$,%\s,]/g, ""));
  return Number.isFinite(parsed) ? parsed : 0;
}

function normalizeGoogleSheetUrl(url: string) {
  const trimmed = url.trim();
  if (!trimmed) return "";
  if (trimmed.includes("docs.google.com/spreadsheets") && !trimmed.includes("output=csv") && !trimmed.includes("format=csv")) {
    const idMatch = trimmed.match(/\/spreadsheets\/d\/([^/]+)/);
    const gidMatch = trimmed.match(/[?#&]gid=([^&]+)/);
    if (idMatch?.[1]) {
      return `https://docs.google.com/spreadsheets/d/${idMatch[1]}/export?format=csv&gid=${gidMatch?.[1] ?? "0"}`;
    }
  }
  return trimmed;
}

function googleSheetId(url: string) {
  return url.trim().match(/\/spreadsheets\/d\/([^/]+)/)?.[1] ?? "";
}

function tabCsvUrl(masterSheetUrl: string, tabName: string) {
  const id = googleSheetId(masterSheetUrl);
  if (!id || !tabName.trim()) return "";
  return `https://docs.google.com/spreadsheets/d/${id}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent(tabName.trim())}`;
}

function sourceUrl(config: ReportingSourceConfig, key: keyof Pick<ReportingSourceConfig, "campaignCsvUrl" | "productCsvUrl" | "searchTermCsvUrl" | "dailyCsvUrl" | "businessCsvUrl">, tabName: string) {
  return config.masterSheetUrl.trim() ? tabCsvUrl(config.masterSheetUrl, tabName) : config[key];
}

async function fetchRows(url: string): Promise<RawRow[]> {
  const normalizedUrl = normalizeGoogleSheetUrl(url);
  if (!normalizedUrl) return [];
  const response = await fetch(normalizedUrl);
  if (!response.ok) throw new Error(`Could not load ${normalizedUrl}`);
  const csv = await response.text();
  const workbook = XLSX.read(csv, { type: "string" });
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  return XLSX.utils.sheet_to_json<RawRow>(sheet, { defval: "" });
}

function campaignFromRow(row: RawRow): ReportingCampaignRow {
  const spend = amount(row, headerAliases.spend);
  const sales = amount(row, headerAliases.sales);
  const clicks = amount(row, headerAliases.clicks);
  const impressions = amount(row, headerAliases.impressions);
  return {
    campaign: text(row, headerAliases.campaign, "Unnamed campaign"),
    type: text(row, headerAliases.adType, "Amazon Ads"),
    spend,
    sales,
    impressions,
    clicks,
    orders: amount(row, headerAliases.orders),
    budget: amount(row, headerAliases.budget),
    status: text(row, headerAliases.status, "Enabled"),
  };
}

function productFromRow(row: RawRow, totalSalesByAsin: Record<string, number>): ReportingProductRow {
  const asin = text(row, headerAliases.asin);
  const adSales = amount(row, headerAliases.sales);
  return {
    product: text(row, headerAliases.product, asin || "Unnamed product"),
    asin,
    sku: text(row, headerAliases.sku),
    spend: amount(row, headerAliases.spend),
    adSales,
    totalSales: totalSalesByAsin[asin] ?? amount(row, headerAliases.totalSales) ?? adSales,
    impressions: amount(row, headerAliases.impressions),
    clicks: amount(row, headerAliases.clicks),
    orders: amount(row, headerAliases.orders),
  };
}

function searchTermFromRow(row: RawRow): ReportingSearchTermRow {
  return {
    searchTerm: text(row, headerAliases.searchTerm, "Unnamed search term"),
    campaign: text(row, headerAliases.campaign, "Unmapped campaign"),
    spend: amount(row, headerAliases.spend),
    sales: amount(row, headerAliases.sales),
    impressions: amount(row, headerAliases.impressions),
    clicks: amount(row, headerAliases.clicks),
    orders: amount(row, headerAliases.orders),
  };
}

function dailyFromRow(row: RawRow): ReportingDailyRow {
  return {
    day: text(row, headerAliases.date, "No date"),
    spend: amount(row, headerAliases.spend),
    sales: amount(row, headerAliases.sales),
    impressions: amount(row, headerAliases.impressions),
    clicks: amount(row, headerAliases.clicks),
    orders: amount(row, headerAliases.orders),
  };
}

function buildBusinessSalesLookup(rows: RawRow[]) {
  return rows.reduce<Record<string, number>>((acc, row) => {
    const asin = text(row, headerAliases.asin);
    if (asin) acc[asin] = (acc[asin] ?? 0) + amount(row, headerAliases.totalSales);
    return acc;
  }, {});
}

export function normalizeReportingState(state?: Partial<ReportingState> | null): ReportingState {
  return {
    ...emptyReportingState,
    ...state,
    sourceConfig: { ...emptyReportingSourceConfig, ...(state?.sourceConfig ?? {}) },
    campaigns: state?.campaigns ?? [],
    products: state?.products ?? [],
    searchTerms: state?.searchTerms ?? [],
    daily: state?.daily ?? [],
    errors: state?.errors ?? [],
  };
}

export async function refreshReportingFromSheets(config: ReportingSourceConfig): Promise<ReportingState> {
  const errors: string[] = [];
  const [campaignRows, productRows, searchTermRows, dailyRows, businessRows] = await Promise.all(
    ([
      ["Campaign report", sourceUrl(config, "campaignCsvUrl", config.campaignTabName)],
      ["Advertised product report", sourceUrl(config, "productCsvUrl", config.productTabName)],
      ["Search term report", sourceUrl(config, "searchTermCsvUrl", config.searchTermTabName)],
      ["Daily trend report", sourceUrl(config, "dailyCsvUrl", config.dailyTabName)],
      ["Business report", sourceUrl(config, "businessCsvUrl", config.businessTabName)],
    ] as const).map(async ([label, url]) => {
      try {
        return await fetchRows(url);
      } catch (error) {
        if (url.trim()) errors.push(`${label}: ${error instanceof Error ? error.message : "Could not refresh."}`);
        return [];
      }
    }),
  );

  const totalSalesByAsin = buildBusinessSalesLookup(businessRows);
  return {
    sourceConfig: config,
    lastRefreshedAt: new Date().toISOString(),
    campaigns: campaignRows.map(campaignFromRow).filter((row) => row.campaign !== "Unnamed campaign" || row.spend || row.sales),
    products: productRows.map((row) => productFromRow(row, totalSalesByAsin)).filter((row) => row.product !== "Unnamed product" || row.spend || row.adSales),
    searchTerms: searchTermRows.map(searchTermFromRow).filter((row) => row.searchTerm !== "Unnamed search term" || row.spend || row.sales),
    daily: dailyRows.map(dailyFromRow).filter((row) => row.day !== "No date" || row.spend || row.sales),
    errors,
  };
}
