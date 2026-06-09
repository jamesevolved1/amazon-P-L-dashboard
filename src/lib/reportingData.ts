import * as XLSX from "xlsx";
import type {
  ReportingCampaignRow,
  ReportingDailyRow,
  ReportingProductRow,
  ReportingSearchTermRow,
  ReportingSourceConfig,
  ReportingState,
  ReportingStrategyMonth,
} from "../types/models";

export const emptyReportingSourceConfig: ReportingSourceConfig = {
  masterSheetUrl: "",
  strategySheetUrl: "",
  strategyTabName: "Report",
  profitMatrixTabName: "Profit Matrix",
  bulkCampaignTabName: "Sponsored Products Campaigns, Sponsored Brands Campaigns, SB Multi Ad Group Campaigns, Sponsored Display Campaigns, SP Search Term Report, SB Search Term Report",
  campaignTabName: "Campaign Report",
  productTabName: "Advertised Product Report",
  searchTermTabName: "Search Term Report",
  dailyTabName: "Daily Trend",
  businessTabName: "Business Report",
  feePreviewTabName: "Fee Preview Report",
  storageTabName: "Monthly Storage Fee Report",
  campaignCsvUrl: "",
  productCsvUrl: "",
  searchTermCsvUrl: "",
  dailyCsvUrl: "",
  businessCsvUrl: "",
};

export const emptyReportingState: ReportingState = {
  sourceConfig: emptyReportingSourceConfig,
  lastRefreshedAt: null,
  accountTotalSales: 0,
  campaigns: [],
  products: [],
  searchTerms: [],
  daily: [],
  strategyMonths: [],
  errors: [],
};

type RawRow = Record<string, unknown>;

const strategyReportHeaders = [
  "Month",
  "Total Sales",
  "Sessions",
  "Conv Rate",
  "Organic Sales",
  "Impressions",
  "Clicks",
  "CTR",
  "AD spend",
  "Ad Sales",
  "ACOS",
  "ROAS",
  "TACOS",
  "CPC",
  "Ad Sales %",
  "Organic Sales %",
  "Subscriptions",
];

const headerAliases = {
  campaign: ["campaign", "campaign name", "campaignname"],
  adType: ["ad product", "ad type", "campaign type", "type"],
  status: ["status", "state", "campaign status"],
  budget: ["budget", "campaign budget", "daily budget"],
  spend: ["spend", "cost", "total spend", "ad spend"],
  sales: ["sales", "ad sales", "attributed sales", "14 day total sales", "sales 14d", "sales within 14 days of ad click", "7 day total sales", "7 day total sales usd", "14 day total sales usd"],
  totalSales: ["total sales", "ordered product sales", "ordered product sales - total", "sales"],
  impressions: ["impressions", "impr"],
  clicks: ["clicks"],
  orders: ["orders", "purchases", "total orders", "14 day total orders", "orders 14d", "7 day total orders", "7 day total orders #", "14 day total orders #"],
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
    const aliasKey = cleanHeader(alias);
    const value = normalized[aliasKey];
    if (value !== undefined && value !== null && String(value).trim() !== "") return value;
  }
  for (const [header, value] of Object.entries(normalized)) {
    if (value === undefined || value === null || String(value).trim() === "") continue;
    if (aliases.some((alias) => {
      const aliasKey = cleanHeader(alias);
      return aliasKey.length > 3 && (header.includes(aliasKey) || aliasKey.includes(header));
    })) {
      return value;
    }
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

function ratio(row: RawRow, aliases: string[]) {
  const value = pick(row, aliases);
  if (typeof value === "number") return Number.isFinite(value) ? (value > 1 ? value / 100 : value) : 0;
  const raw = String(value ?? "").trim();
  const parsed = Number(raw.replace(/[$,%\s,]/g, ""));
  if (!Number.isFinite(parsed)) return 0;
  return raw.includes("%") || parsed > 1 ? parsed / 100 : parsed;
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

export function tabCsvUrl(masterSheetUrl: string, tabName: string) {
  const id = googleSheetId(masterSheetUrl);
  if (!id || !tabName.trim()) return "";
  return `https://docs.google.com/spreadsheets/d/${id}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent(tabName.trim())}`;
}

function sourceUrl(config: ReportingSourceConfig, key: keyof Pick<ReportingSourceConfig, "campaignCsvUrl" | "productCsvUrl" | "searchTermCsvUrl" | "dailyCsvUrl" | "businessCsvUrl">, tabName: string) {
  return config.masterSheetUrl.trim() ? tabCsvUrl(config.masterSheetUrl, tabName) : config[key];
}

function splitTabNames(value: string) {
  return value
    .split(/[,;\n]/)
    .map((name) => name.trim())
    .filter(Boolean);
}

export async function fetchSheetRows(url: string): Promise<RawRow[]> {
  const normalizedUrl = normalizeGoogleSheetUrl(url);
  if (!normalizedUrl) return [];
  const response = await fetch(normalizedUrl);
  if (!response.ok) throw new Error(`Could not load ${normalizedUrl}`);
  const csv = await response.text();
  const workbook = XLSX.read(csv, { type: "string" });
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  return XLSX.utils.sheet_to_json<RawRow>(sheet, { defval: "" });
}

async function fetchRows(url: string): Promise<RawRow[]> {
  return fetchSheetRows(url);
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

function dailyFromAdRows(rows: RawRow[]): ReportingDailyRow[] {
  const groups = new Map<string, ReportingDailyRow>();
  rows.forEach((row) => {
    const day = text(row, headerAliases.date);
    if (!day) return;
    const current = groups.get(day) ?? { day, spend: 0, sales: 0, impressions: 0, clicks: 0, orders: 0 };
    current.spend += amount(row, headerAliases.spend);
    current.sales += amount(row, headerAliases.sales);
    current.impressions += amount(row, headerAliases.impressions);
    current.clicks += amount(row, headerAliases.clicks);
    current.orders += amount(row, headerAliases.orders);
    groups.set(day, current);
  });
  return [...groups.values()].sort((a, b) => new Date(a.day).getTime() - new Date(b.day).getTime());
}

function buildBusinessSalesLookup(rows: RawRow[]) {
  return rows.reduce<Record<string, number>>((acc, row) => {
    const asin = text(row, headerAliases.asin);
    if (asin) acc[asin] = (acc[asin] ?? 0) + amount(row, headerAliases.totalSales);
    return acc;
  }, {});
}

function businessTotalSales(rows: RawRow[]) {
  return rows.reduce((sum, row) => sum + amount(row, headerAliases.totalSales), 0);
}

function sheetRows(workbook: XLSX.WorkBook, sheetName: string): RawRow[] {
  const sheet = workbook.Sheets[sheetName];
  if (!sheet) return [];
  const matrix = XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1, defval: "" });
  const headerIndex = matrix.findIndex((row) => {
    const headers = row.map((value) => cleanHeader(String(value ?? "")));
    return headers.includes("campaign") ||
      headers.includes("campaign name") ||
      headers.includes("advertised asin") ||
      headers.includes("child asin") ||
      headers.includes("search term") ||
      headers.includes("customer search term") ||
      headers.includes("date");
  });
  if (headerIndex < 0) return [];
  const headers = matrix[headerIndex].map((value, index) => String(value || `Column ${index + 1}`));
  return matrix.slice(headerIndex + 1).map((row) =>
    headers.reduce<RawRow>((acc, header, index) => {
      acc[header] = row[index] ?? "";
      return acc;
    }, {}),
  );
}

async function workbookRowsFromFile(file: File): Promise<Array<{ sheetName: string; rows: RawRow[] }>> {
  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: "array", cellDates: true });
  return workbook.SheetNames.map((sheetName) => ({ sheetName, rows: sheetRows(workbook, sheetName) })).filter((sheet) => sheet.rows.length);
}

async function strategyMonthsFromFile(file: File): Promise<ReportingStrategyMonth[]> {
  const workbook = XLSX.read(await file.arrayBuffer(), { type: "array", cellDates: true });
  return strategyMonthsFromWorkbook(workbook);
}

async function strategyMonthsFromUrl(url: string, tabName = "Report"): Promise<ReportingStrategyMonth[]> {
  if (!url.trim()) return [];
  const response = await fetch(tabCsvUrl(url, tabName));
  if (!response.ok) throw new Error("Could not load the strategy document Report tab.");
  const workbook = XLSX.read(await response.text(), { type: "string", cellDates: true });
  return strategyMonthsFromWorkbook(workbook);
}

function strategyMonthsFromWorkbook(workbook: XLSX.WorkBook): ReportingStrategyMonth[] {
  return workbook.SheetNames.flatMap((sheetName) => {
    const sheet = workbook.Sheets[sheetName];
    const matrix = XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1, defval: "" });
    let activeYear = new Date().getFullYear();
    let headers: string[] = [];
    return matrix.flatMap<ReportingStrategyMonth>((values) => {
      const first = String(values[0] ?? "").trim();
      if (/^20\d{2}$/.test(first)) {
        activeYear = Number(first);
        return [];
      }
      if (cleanHeader(first) === "month") {
        const detectedHeaders = values.map((value, index) => String(value || `Column ${index + 1}`));
        headers = detectedHeaders.filter((header) => !header.startsWith("Column ")).length >= 8
          ? detectedHeaders
          : values.map((_, index) => strategyReportHeaders[index] ?? `Column ${index + 1}`);
        return [];
      }
      if (!headers.length || !isStrategyPeriod(first)) return [];
      const row = headers.reduce<RawRow>((acc, header, index) => {
        acc[header] = values[index] ?? "";
        return acc;
      }, {});
      const totalSales = amount(row, ["total sales"]);
      const adSpend = amount(row, ["ad spend"]);
      const adSales = amount(row, ["ad sales"]);
      const organicSales = amount(row, ["organic sales"]) || Math.max(0, totalSales - adSales);
      return [{
        id: `${activeYear}-${cleanHeader(first)}`,
        year: activeYear,
        period: first,
        totalSales,
        sessions: amount(row, ["sessions"]),
        conversionRate: ratio(row, ["conv rate", "conversion rate"]),
        organicSales,
        impressions: amount(row, ["impressions"]),
        clicks: amount(row, ["clicks"]),
        ctr: ratio(row, ["ctr"]),
        adSpend,
        adSales,
        roas: amount(row, ["roas"]) || (adSpend ? adSales / adSpend : 0),
        tacos: ratio(row, ["tacos"]) || (totalSales ? adSpend / totalSales : 0),
        cpc: amount(row, ["cpc"]) || (rowHas(row, ["clicks"]) && amount(row, ["clicks"]) ? adSpend / amount(row, ["clicks"]) : 0),
        adSalesPercent: ratio(row, ["ad sales %"]) || (totalSales ? adSales / totalSales : 0),
        organicSalesPercent: ratio(row, ["organic sales %"]) || (totalSales ? organicSales / totalSales : 0),
        subscriptions: amount(row, ["subscriptions"]),
        isProjection: cleanHeader(first) === "projection",
      }];
    });
  });
}

function isStrategyPeriod(value: string) {
  const normalized = cleanHeader(value);
  return [
    "january", "february", "march", "april", "may", "june", "june", "july", "august",
    "september", "septemer", "october", "november", "december", "projection",
  ].includes(normalized.replace(/\.+$/, ""));
}

function rowHas(row: RawRow, aliases: string[]) {
  return pick(row, aliases) !== "";
}

function classifyRows(sheets: Array<{ sheetName: string; rows: RawRow[] }>) {
  const campaignRows: RawRow[] = [];
  const productRows: RawRow[] = [];
  const searchTermRows: RawRow[] = [];
  const dailyRows: RawRow[] = [];
  const businessRows: RawRow[] = [];

  sheets.forEach(({ sheetName, rows }) => {
    const name = cleanHeader(sheetName);
    const isSearchTermSheet = name.includes("search term");
    const isAdvertisedProductSheet = name.includes("advertis") && name.includes("product") && !name.includes("campaign");
    const isBulkCampaignSheet = name.includes("campaign");
    rows.forEach((row) => {
      const hasSpend = rowHas(row, headerAliases.spend);
      const hasSales = rowHas(row, headerAliases.sales) || rowHas(row, headerAliases.totalSales);
      const hasCampaign = rowHas(row, headerAliases.campaign);
      const hasAsin = rowHas(row, headerAliases.asin);
      const hasSearchTerm = rowHas(row, headerAliases.searchTerm);
      const hasDate = rowHas(row, headerAliases.date);
      const hasBusinessSignal = rowHas(row, headerAliases.totalSales) && (name.includes("business") || name.includes("sales traffic") || hasAsin);
      const entity = cleanHeader(text(row, ["Entity"]));
      const isCampaignEntity = !isBulkCampaignSheet || entity === "campaign";
      const isProductEntity = !isBulkCampaignSheet || entity === "product ad";

      if (hasBusinessSignal && !hasSpend) businessRows.push(row);
      if ((isSearchTermSheet || hasSearchTerm) && hasSpend) {
        searchTermRows.push(row);
      } else if (hasCampaign && hasSpend && isCampaignEntity && !isAdvertisedProductSheet) {
        campaignRows.push(row);
      }
      if (hasAsin && hasSpend && (isAdvertisedProductSheet || isProductEntity)) productRows.push(row);
      if (hasDate && (hasSpend || hasSales)) dailyRows.push(row);
    });
  });

  return { campaignRows, productRows, searchTermRows, dailyRows, businessRows };
}

function mergeCampaignRows(rows: ReportingCampaignRow[]) {
  const groups = new Map<string, ReportingCampaignRow>();
  rows.forEach((row) => {
    const key = `${row.campaign}__${row.type}`;
    const current = groups.get(key) ?? { ...row, spend: 0, sales: 0, impressions: 0, clicks: 0, orders: 0, budget: row.budget };
    current.spend += row.spend;
    current.sales += row.sales;
    current.impressions += row.impressions;
    current.clicks += row.clicks;
    current.orders += row.orders;
    current.budget = current.budget || row.budget;
    current.status = row.status || current.status;
    groups.set(key, current);
  });
  return [...groups.values()].filter((row) => row.spend || row.sales || row.impressions || row.clicks);
}

function mergeProductRows(rows: ReportingProductRow[]) {
  const groups = new Map<string, ReportingProductRow>();
  rows.forEach((row) => {
    const key = row.sku || row.asin || row.product;
    const current = groups.get(key) ?? { ...row, spend: 0, adSales: 0, totalSales: row.totalSales, impressions: 0, clicks: 0, orders: 0 };
    current.spend += row.spend;
    current.adSales += row.adSales;
    current.totalSales = Math.max(current.totalSales, row.totalSales);
    current.impressions += row.impressions;
    current.clicks += row.clicks;
    current.orders += row.orders;
    groups.set(key, current);
  });
  return [...groups.values()].filter((row) => row.spend || row.adSales || row.totalSales || row.impressions || row.clicks);
}

export async function reportingStateFromUploadedFiles(filesBySlot: Record<string, File[]>, skuRows: Array<{ asin: string; sku: string; title: string; totalSales: number; adSpend: number; unitsSold: number }>): Promise<ReportingState> {
  const files = [...(filesBySlot["profit-matrix"] ?? []), ...(filesBySlot["campaign-export"] ?? [])];
  const strategyFiles = filesBySlot["strategy-report"] ?? [];
  const sheets = (await Promise.all(files.map(workbookRowsFromFile))).flat();
  const strategyMonths = (await Promise.all(strategyFiles.map(strategyMonthsFromFile))).flat();
  const { campaignRows, productRows, searchTermRows, dailyRows, businessRows } = classifyRows(sheets);
  const totalSalesByAsin = {
    ...skuRows.reduce<Record<string, number>>((acc, sku) => {
      if (sku.asin) acc[sku.asin] = (acc[sku.asin] ?? 0) + sku.totalSales;
      return acc;
    }, {}),
    ...buildBusinessSalesLookup(businessRows),
  };
  const accountTotalSales = businessTotalSales(businessRows) || skuRows.reduce((sum, sku) => sum + sku.totalSales, 0);

  const productsFromSkuRows = skuRows.map<ReportingProductRow>((sku) => ({
    product: sku.title || sku.asin || sku.sku || "Unnamed product",
    asin: sku.asin,
    sku: sku.sku,
    spend: sku.adSpend,
    adSales: 0,
    totalSales: sku.totalSales,
    impressions: 0,
    clicks: 0,
    orders: sku.unitsSold,
  }));
  const products = mergeProductRows([
    ...productRows.map((row) => productFromRow(row, totalSalesByAsin)),
    ...productsFromSkuRows,
  ]);
  const campaigns = mergeCampaignRows(campaignRows.map(campaignFromRow));
  const searchTerms = searchTermRows.map(searchTermFromRow).filter((row) => row.spend || row.sales || row.impressions || row.clicks);
  const daily = dailyRows.length
    ? dailyRows.map(dailyFromRow).filter((row) => row.day !== "No date" || row.spend || row.sales)
    : dailyFromAdRows([...campaignRows, ...productRows, ...searchTermRows]);

  return {
    sourceConfig: emptyReportingSourceConfig,
    lastRefreshedAt: new Date().toISOString(),
    accountTotalSales,
    campaigns,
    products,
    searchTerms,
    daily,
    strategyMonths,
    errors: sheets.length || strategyMonths.length ? [] : ["No reporting rows were found in the uploaded master workbook, campaign export, or strategy report."],
  };
}

export function normalizeReportingState(state?: Partial<ReportingState> | null): ReportingState {
  return {
    ...emptyReportingState,
    ...state,
    sourceConfig: { ...emptyReportingSourceConfig, ...(state?.sourceConfig ?? {}) },
    accountTotalSales: state?.accountTotalSales ?? 0,
    campaigns: state?.campaigns ?? [],
    products: state?.products ?? [],
    searchTerms: state?.searchTerms ?? [],
    daily: state?.daily ?? [],
    strategyMonths: state?.strategyMonths ?? [],
    errors: state?.errors ?? [],
  };
}

export async function refreshReportingFromSheets(config: ReportingSourceConfig): Promise<ReportingState> {
  const errors: string[] = [];
  const bulkTabNames = splitTabNames(config.bulkCampaignTabName);
  const strategyMonthsPromise = strategyMonthsFromUrl(config.strategySheetUrl, "Report").catch((error) => {
    if (config.strategySheetUrl.trim()) errors.push(`Strategy document: ${error instanceof Error ? error.message : "Could not refresh."}`);
    return [] as ReportingStrategyMonth[];
  });
  const [campaignRows, bulkSheets, productRows, searchTermRows, dailyRows, businessRows] = await Promise.all(
    ([
      ["Campaign report", sourceUrl(config, "campaignCsvUrl", config.campaignTabName)],
      ["Bulk campaign export", ""],
      ["Advertised product report", sourceUrl(config, "productCsvUrl", config.productTabName)],
      ["Search term report", sourceUrl(config, "searchTermCsvUrl", config.searchTermTabName)],
      ["Daily trend report", sourceUrl(config, "dailyCsvUrl", config.dailyTabName)],
      ["Business report", sourceUrl(config, "businessCsvUrl", config.businessTabName)],
    ] as const).map(async ([label, url]) => {
      if (label === "Bulk campaign export") {
        if (!config.masterSheetUrl.trim() || !bulkTabNames.length) return [];
        const tabResults = await Promise.all(
          bulkTabNames.map(async (tabName) => {
            try {
              return { sheetName: tabName, rows: await fetchRows(tabCsvUrl(config.masterSheetUrl, tabName)) };
            } catch (error) {
              errors.push(`${tabName}: ${error instanceof Error ? error.message : "Could not refresh."}`);
              return { sheetName: tabName, rows: [] };
            }
          }),
        );
        return tabResults;
      }
      try {
        return await fetchRows(url);
      } catch (error) {
        if (url.trim()) errors.push(`${label}: ${error instanceof Error ? error.message : "Could not refresh."}`);
        return [];
      }
    }),
  );

  const totalSalesByAsin = buildBusinessSalesLookup(businessRows);
  const daily = dailyRows.map(dailyFromRow).filter((row) => row.day !== "No date" || row.spend || row.sales);
  const bulkSheetList = Array.isArray(bulkSheets) ? (bulkSheets as Array<{ sheetName: string; rows: RawRow[] }>) : [];
  const bulkCampaignRows = bulkSheetList.flatMap((sheet) => sheet.rows);
  const classifiedBulk = classifyRows(bulkSheetList);
  const normalizedCampaignRows = bulkCampaignRows.length ? classifiedBulk.campaignRows : campaignRows;
  const normalizedProductRows = [...productRows, ...classifiedBulk.productRows];
  const normalizedSearchRows = [...searchTermRows, ...classifiedBulk.searchTermRows];
  const strategyMonths = await strategyMonthsPromise;
  return {
    sourceConfig: config,
    lastRefreshedAt: new Date().toISOString(),
    accountTotalSales: businessTotalSales(businessRows),
    campaigns: mergeCampaignRows(normalizedCampaignRows.map(campaignFromRow).filter((row) => row.campaign !== "Unnamed campaign" || row.spend || row.sales)),
    products: mergeProductRows(normalizedProductRows.map((row) => productFromRow(row, totalSalesByAsin)).filter((row) => row.product !== "Unnamed product" || row.spend || row.adSales)),
    searchTerms: normalizedSearchRows.map(searchTermFromRow).filter((row) => row.searchTerm !== "Unnamed search term" || row.spend || row.sales),
    daily: daily.length ? daily : dailyFromAdRows([...normalizedCampaignRows, ...normalizedProductRows, ...normalizedSearchRows]),
    strategyMonths,
    errors,
  };
}
