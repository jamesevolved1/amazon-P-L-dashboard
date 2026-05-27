import * as XLSX from "xlsx";
import type { ImportSummary, ProductSku } from "../types/models";

type SourceFields = NonNullable<ProductSku["sourceFields"]>;

type SheetRow = Record<string, unknown>;
type SourceReportRows = {
  business: SheetRow[];
  ads: SheetRow[];
  fees: SheetRow[];
  storage: SheetRow[];
  cogs: SheetRow[];
};

const requiredSheets = [
  "Profit Matrix Per SKU",
  "Profit Matrix Per SKU Last 30 d",
  "RL COGs",
  "FBA Fees",
  "Last 30 day Sales",
  "Ad Spend Per SKU",
];

const masterSheetAliases = {
  business: ["30 Business Report", "Business Report", "Last 30 day Sales", "Last 30 Day Sales", "Sales and Traffic"],
  ads: ["Advertising Product Summary", "Advertised Product Report", "Ad Spend Per SKU", "Sponsored Products Advertised Product Report"],
  fees: ["Fee Preview Report", "FBA Fees", "Fee Preview", "Revenue Calculator"],
  storage: ["Monthly Storage Fee Report", "Storage Fee Report", "Monthly Storage Fees", "FBA Storage Fees"],
  cogs: ["Profit Matrix", "COGS Mapping", "COGS", "Unit Economics", "RL COGs"],
};

const clean = (value: unknown) => String(value ?? "").trim();
const emptyIdentifierTokens = new Set(["", "N/A", "NA", "#N/A", "NULL", "NONE", "-"]);
const idValue = (value: unknown) => {
  const text = clean(value);
  return emptyIdentifierTokens.has(text.toUpperCase()) ? "" : text;
};
const key = (value: unknown) => clean(value).toLowerCase().replace(/[^a-z0-9]+/g, "");
const num = (value: unknown) => {
  if (typeof value === "number") return Number.isFinite(value) ? value : 0;
  const parsed = Number(clean(value).replace(/[$,%(),]/g, ""));
  return Number.isFinite(parsed) ? parsed : 0;
};

const today = new Date();
today.setHours(0, 0, 0, 0);

const dateValue = (value: unknown) => {
  if (!value) return null;
  if (value instanceof Date && !Number.isNaN(value.getTime())) return value;
  const parsed = new Date(clean(value));
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

const canonicalSku = (value: string) => idValue(value).toUpperCase();
const canonicalAsin = (value: string) => idValue(value).toUpperCase();

const get = (row: SheetRow, names: string[]) => {
  const normalized = new Map(Object.entries(row).map(([k, v]) => [key(k), v]));
  for (const name of names) {
    const value = normalized.get(key(name));
    if (value !== undefined) return value;
  }
  return undefined;
};

function sheetToRows(workbook: XLSX.WorkBook, sheetName: string): SheetRow[] {
  const sheet = workbook.Sheets[sheetName];
  if (!sheet) return [];
  const matrix = XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1, defval: "" });
  const headerIndex = matrix.findIndex((row) => {
    const keys = row.map(key);
    return (
      keys.includes("asin") ||
      keys.includes("childasin") ||
      keys.includes("startdate") ||
      keys.includes("seller sku".replace(/[^a-z0-9]+/g, ""))
    );
  });
  if (headerIndex < 0) return [];
  const headers = matrix[headerIndex].map((value, index) => clean(value) || `Column ${index + 1}`);
  return matrix.slice(headerIndex + 1).map((row) =>
    headers.reduce<SheetRow>((acc, header, index) => {
      acc[header] = row[index] ?? "";
      return acc;
    }, {}),
  );
}

function findSheetName(workbook: XLSX.WorkBook, aliases: string[]) {
  const byKey = new Map(workbook.SheetNames.map((name) => [key(name), name]));
  for (const alias of aliases) {
    const exact = byKey.get(key(alias));
    if (exact) return exact;
  }
  return workbook.SheetNames.find((name) => aliases.some((alias) => key(name).includes(key(alias))));
}

function inferSourceKind(rows: SheetRow[], fileName = ""): keyof SourceReportRows | null {
  const nameKey = key(fileName);
  if (nameKey.includes("businessreport") || nameKey.includes("salesandtraffic")) return "business";
  if (nameKey.includes("advertisingproduct") || nameKey.includes("advertisedproduct") || nameKey.includes("adspend")) return "ads";
  if (nameKey.includes("feepreview") || nameKey.includes("fbafees")) return "fees";
  if (nameKey.includes("storagefee")) return "storage";
  if (nameKey.includes("profitmatrix") || nameKey.includes("cogs") || nameKey.includes("uniteconomics")) return "cogs";

  const headers = new Set(Object.keys(rows[0] ?? {}).map(key));
  const hasAny = (names: string[]) => names.some((name) => headers.has(key(name)));
  if (hasAny(["Ordered Product Sales", "Units Ordered"]) && hasAny(["(Child) ASIN", "Child ASIN"])) return "business";
  if (hasAny(["Spend", "Ad Spend", "Cost"]) && hasAny(["Advertised ASIN", "Advertised SKU"])) return "ads";
  if (hasAny(["Estimated Referral Fee", "Referral Fee", "FBA Fulfillment Fee", "Expected Fulfillment Fee"])) return "fees";
  if (hasAny(["Monthly Storage Fee", "FBA Storage Fee", "Estimated Monthly Storage Fee"])) return "storage";
  if (hasAny(["Unit COGS", "COGS", "Landed Cost"]) && hasAny(["SKU", "ASIN"])) return "cogs";
  return null;
}

function emptySourceRows(): SourceReportRows {
  return { business: [], ads: [], fees: [], storage: [], cogs: [] };
}

export async function parseAmazonWorkbook(file: File): Promise<{
  skus: ProductSku[];
  warnings: string[];
  summary?: ImportSummary;
}> {
  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: "array", cellDates: true });
  const warnings = requiredSheets
    .filter((name) => !workbook.SheetNames.includes(name))
    .map((name) => `Missing sheet: ${name}`);

  const staticRows = sheetToRows(workbook, "Profit Matrix Per SKU");
  const pnlRows = sheetToRows(workbook, "Profit Matrix Per SKU Last 30 d");
  const salesRows = sheetToRows(workbook, "Last 30 day Sales");
  const adRows = sheetToRows(workbook, "Ad Spend Per SKU");

  const staticByAsin = new Map<string, SheetRow>();
  staticRows.forEach((row) => {
    const asin = idValue(get(row, ["ASIN", "(Child) ASIN"]));
    if (asin) staticByAsin.set(asin, row);
  });

  const salesByAsin = new Map<string, SheetRow>();
  salesRows.forEach((row) => {
    const asin = idValue(get(row, ["(Child) ASIN", "ASIN", "Advertised ASIN"]));
    if (asin && !salesByAsin.has(asin)) salesByAsin.set(asin, row);
  });

  const adSpendByAsin = new Map<string, number>();
  adRows.forEach((row) => {
    const asin = idValue(get(row, ["Advertised ASIN", "ASIN"]));
    if (asin) adSpendByAsin.set(asin, (adSpendByAsin.get(asin) ?? 0) + num(get(row, ["Spend"])));
  });

  const skus = pnlRows
    .map((row) => {
      const asin = idValue(get(row, ["ASIN", "(Child) ASIN"]));
      const staticRow = staticByAsin.get(asin) ?? {};
      const salesRow = salesByAsin.get(asin) ?? {};
      const unitsSold = num(get(row, ["Units Sold", "Units Ordered"])) || num(get(salesRow, ["Units Ordered"]));
      const totalSales =
        num(get(row, ["Total Sales", "Ordered Product Sales"])) ||
        num(get(salesRow, ["Ordered Product Sales"]));
      const listedPrice =
        num(get(staticRow, ["Listed Price", "Price"])) || (unitsSold ? totalSales / unitsSold : 0);

      const referralFees = num(get(row, ["Referral Fees", "3P Referral Fees"]));
      const fulfillment = num(get(row, ["Total FBA Fulfillment", "FBA Fulfillment"]));
      const storage = num(get(row, ["FBA Storage Fee"]));
      const shipping = num(get(row, ["Shipping to Amazon"]));
      const cogs = num(get(row, ["COGS"]));
      const adSpend =
        num(get(row, ["Ad Spend", "ad spend"])) || adSpendByAsin.get(asin) || 0;

      return {
        parentAsin: asin,
        asin,
        sku: idValue(get(row, ["SKU"])) || idValue(get(staticRow, ["SKU"])),
        title: clean(get(row, ["Title", "Product Title"])) || clean(get(salesRow, ["Title"])),
        listedPrice,
        unitsSold,
        totalSales,
        referralFeePerUnit:
          (unitsSold ? referralFees / unitsSold : 0) ||
          num(get(staticRow, ["3P Referral Fee", "Referral Fee"])),
        fbaFeePerUnit:
          (unitsSold ? fulfillment / unitsSold : 0) ||
          num(get(staticRow, ["FBA Fulfillment", "FBA Fulfillment Fee"])),
        storageFeePerUnit:
          (unitsSold ? storage / unitsSold : 0) || num(get(staticRow, ["FBA Storage Fee"])),
        labelingFeePerUnit: num(get(staticRow, ["FBA Labeling Fee"])),
        shippingToAmazonPerUnit:
          (unitsSold ? shipping / unitsSold : 0) ||
          num(get(staticRow, ["Shipping to Amazon"])),
        cogsPerUnit: (unitsSold ? cogs / unitsSold : 0) || num(get(staticRow, ["COGS"])),
        adSpend,
        sourceFields: {
          sales: "Combined Profit Matrix",
          units: "Combined Profit Matrix",
          adSpend: adSpend ? "Combined Profit Matrix / Ad Spend Per SKU" : "",
          fees: "Combined Profit Matrix",
          storage: "Combined Profit Matrix",
          cogs: "Combined Profit Matrix",
        },
      } satisfies ProductSku;
    })
    .filter((sku) => sku.asin || sku.sku || sku.title);

  const unmatchedAdAsins = [...adSpendByAsin.keys()].filter(
    (asin) => !skus.some((sku) => sku.asin === asin),
  );
  if (unmatchedAdAsins.length) {
    warnings.push(`${unmatchedAdAsins.length} ASINs appear in ad reports but not in the P&L table.`);
  }

  return {
    skus,
    warnings,
    summary: {
      mode: "legacy-matrix",
      fieldSources: {
        sales: "Combined Profit Matrix",
        units: "Combined Profit Matrix",
        adSpend: "Combined Profit Matrix / Ad Spend Per SKU",
        fees: "Combined Profit Matrix",
        storage: "Combined Profit Matrix",
        cogs: "Combined Profit Matrix",
      },
      rowCounts: {
        "Combined P&L rows": pnlRows.length,
        "Ad Spend rows": adRows.length,
      },
    },
  };
}

export async function parseAmazonMasterWorkbook(file: File): Promise<{
  skus: ProductSku[];
  warnings: string[];
  summary?: ImportSummary;
}> {
  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: "array", cellDates: true });
  const sheetNames = {
    business: findSheetName(workbook, masterSheetAliases.business),
    ads: findSheetName(workbook, masterSheetAliases.ads),
    fees: findSheetName(workbook, masterSheetAliases.fees),
    storage: findSheetName(workbook, masterSheetAliases.storage),
    cogs: findSheetName(workbook, masterSheetAliases.cogs),
  };

  const hasSourceTabs = Object.values(sheetNames).some(Boolean);
  if (!hasSourceTabs) {
    const firstSheet = workbook.SheetNames[0];
    const rows = firstSheet ? sheetToRows(workbook, firstSheet) : [];
    const sourceKind = inferSourceKind(rows, file.name);
    if (sourceKind) {
      const sourceRows = emptySourceRows();
      sourceRows[sourceKind] = rows;
      const result = buildSkusFromSourceRows(sourceRows);
      return {
        ...result,
        warnings: [
          `Single-sheet upload detected as ${sourceKind === "ads" ? "advertised product" : sourceKind} data. Add the other report tabs or uploads for a complete P&L.`,
          ...result.warnings,
        ],
        summary: result.summary
          ? {
              ...result.summary,
              mode: "master-workbook",
              rowCounts: {
                ...result.summary.rowCounts,
                [`Detected single sheet: ${firstSheet ?? file.name}`]: rows.length,
              },
            }
          : result.summary,
      };
    }
    return parseAmazonWorkbook(file);
  }

  const result = buildSkusFromSourceRows({
    business: sheetNames.business ? sheetToRows(workbook, sheetNames.business) : [],
    ads: sheetNames.ads ? sheetToRows(workbook, sheetNames.ads) : [],
    fees: sheetNames.fees ? sheetToRows(workbook, sheetNames.fees) : [],
    storage: sheetNames.storage ? sheetToRows(workbook, sheetNames.storage) : [],
    cogs: sheetNames.cogs ? sheetToRows(workbook, sheetNames.cogs) : [],
  });

  const missingSheets = Object.entries(sheetNames)
    .filter(([, sheetName]) => !sheetName)
    .map(([slot]) => `Master workbook is missing a ${slot} tab.`);

  return {
    ...result,
    warnings: [...missingSheets, ...result.warnings],
    summary: result.summary
      ? {
          ...result.summary,
          mode: "master-workbook",
          rowCounts: {
            ...result.summary.rowCounts,
            ...(sheetNames.business ? { [`Business tab: ${sheetNames.business}`]: result.summary.rowCounts["Business Report"] ?? 0 } : {}),
            ...(sheetNames.ads ? { [`Ads tab: ${sheetNames.ads}`]: result.summary.rowCounts["Advertised Product Report"] ?? 0 } : {}),
            ...(sheetNames.fees ? { [`Fees tab: ${sheetNames.fees}`]: result.summary.rowCounts["Fee Preview Report"] ?? 0 } : {}),
            ...(sheetNames.storage ? { [`Storage tab: ${sheetNames.storage}`]: result.summary.rowCounts["Monthly Storage Fee Report"] ?? 0 } : {}),
            ...(sheetNames.cogs ? { [`COGS tab: ${sheetNames.cogs}`]: result.summary.rowCounts["COGS Mapping"] ?? 0 } : {}),
          },
        }
      : result.summary,
  };
}

export async function parseAmazonReportBundle(filesBySlot: Record<string, File[]>): Promise<{
  skus: ProductSku[];
  warnings: string[];
  summary?: ImportSummary;
}> {
  const business = await rowsForSlot(filesBySlot, "business-report");
  const ads = await rowsForSlot(filesBySlot, "advertised-products");
  const fees = await rowsForSlot(filesBySlot, "fee-preview");
  const storage = await rowsForSlot(filesBySlot, "storage-fees");
  const cogs = await rowsForSlot(filesBySlot, "cogs");
  return buildSkusFromSourceRows({ business, ads, fees, storage, cogs });
}

function buildSkusFromSourceRows({ business, ads, fees, storage, cogs }: SourceReportRows): {
  skus: ProductSku[];
  warnings: string[];
  summary?: ImportSummary;
} {
  const warnings: string[] = [];
  const records = new Map<string, ProductSku>();
  const bySku = new Map<string, ProductSku>();
  const byAsin = new Map<string, ProductSku>();
  const parserIssues: string[] = [];

  const emptyRecord = (asin: string, sku = "", title = "", parentAsin = "") =>
    ({
      parentAsin: parentAsin || asin,
      asin,
      sku,
      title,
      listedPrice: 0,
      unitsSold: 0,
      totalSales: 0,
      referralFeePerUnit: 0,
      fbaFeePerUnit: 0,
      storageFeePerUnit: 0,
      labelingFeePerUnit: 0,
      shippingToAmazonPerUnit: 0,
      cogsPerUnit: 0,
      adSpend: 0,
      sourceFields: {},
      feeAudit: {},
      importIssues: [],
    }) satisfies ProductSku;

  const indexRecord = (record: ProductSku) => {
    const id = canonicalSku(record.sku) || canonicalAsin(record.asin);
    if (!id) return;
    records.set(id, record);
    if (record.sku) bySku.set(canonicalSku(record.sku), record);
    if (record.asin) byAsin.set(canonicalAsin(record.asin), record);
  };

  const getRecord = (asin: string, sku = "", title = "", parentAsin = "") => {
    const skuKey = canonicalSku(sku);
    const asinKey = canonicalAsin(asin);
    const id = skuKey || asinKey;
    if (!id) return null;
    const current = (skuKey && bySku.get(skuKey)) || (asinKey && byAsin.get(asinKey)) || records.get(id) || emptyRecord(asin, sku, title, parentAsin);
    current.parentAsin ||= parentAsin || asin;
    current.asin ||= asin;
    current.sku ||= sku;
    current.title ||= title;
    indexRecord(current);
    return current;
  };

  business.forEach((row) => {
    const parentAsin = idValue(get(row, ["(Parent) ASIN", "Parent ASIN", "ParentASIN"]));
    const asin = idValue(get(row, ["(Child) ASIN", "Child ASIN", "ASIN"]));
    const sku = idValue(get(row, ["SKU", "Seller SKU"]));
    const item = getRecord(asin, sku, clean(get(row, ["Title", "Product Title"])), parentAsin);
    if (!item) return;
    item.unitsSold += num(get(row, ["Units Ordered", "Units Sold"]));
    item.totalSales += num(get(row, ["Ordered Product Sales", "Total Sales", "Sales"]));
    item.listedPrice = item.unitsSold ? item.totalSales / item.unitsSold : item.listedPrice;
    item.sourceFields = { ...item.sourceFields, sales: "Business Report", units: "Business Report" };
  });

  ads.forEach((row) => {
    const asin = idValue(get(row, ["Advertised ASIN", "ASIN"]));
    const sku = idValue(get(row, ["Advertised SKU", "SKU"]));
    const item = getRecord(asin, sku, "");
    if (!item) return;
    item.adSpend += num(get(row, ["Spend", "Ad Spend", "Cost"]));
    item.sourceFields = { ...item.sourceFields, adSpend: "Advertised Product Report" };
  });

  fees.forEach((row) => {
    const asin = idValue(get(row, ["ASIN", "Advertised ASIN", "FNSKU"]));
    const sku = idValue(get(row, ["SKU", "Seller SKU", "Merchant SKU"]));
    const skuKey = canonicalSku(sku);
    const asinKey = canonicalAsin(asin);
    const matchedBySku = skuKey && bySku.get(skuKey);
    const matchedByAsin = asinKey && byAsin.get(asinKey);
    const item = getRecord(asin, sku, clean(get(row, ["Title", "Product Name", "Product"])));
    if (!item) return;
    const feeMatchSource = matchedBySku ? "Fee Preview Report (SKU match)" : matchedByAsin ? "Fee Preview Report (ASIN match)" : "Fee Preview Report (new row)";
    item.listedPrice ||= num(get(row, ["Listed Price", "Your Price", "Price"]));
    const referralFee = num(get(row, ["3P Referral Fee", "Referral Fee", "Estimated Referral Fee", "Referral Fee Per Unit"]));
    const fbaFee = num(get(row, ["FBA Fulfillment", "FBA Fulfillment Fee", "Expected Fulfillment Fee", "Fulfillment Fee"]));
    if (!item.referralFeePerUnit && referralFee > 0) {
      item.referralFeePerUnit = referralFee;
      item.feeAudit = { ...item.feeAudit, referralFeeSource: feeMatchSource };
    }
    if (!item.fbaFeePerUnit && fbaFee > 0) {
      item.fbaFeePerUnit = fbaFee;
      item.feeAudit = { ...item.feeAudit, fbaFeeSource: feeMatchSource };
    }
    item.labelingFeePerUnit ||= num(get(row, ["FBA Labeling Fee", "Labeling Fee"]));
    item.shippingToAmazonPerUnit ||= num(get(row, ["Shipping to Amazon", "Inbound Shipping", "Shipping"]));
    item.sourceFields = { ...item.sourceFields, fees: "Fee Preview Report" };
  });

  storage.forEach((row) => {
    const asin = idValue(get(row, ["ASIN", "FNSKU"]));
    const sku = idValue(get(row, ["SKU", "Merchant SKU"]));
    const item = getRecord(asin, sku, clean(get(row, ["Title", "Product Name"])));
    if (!item) return;
    const storageFee = num(get(row, ["FBA Storage Fee", "Monthly Storage Fee", "Estimated Monthly Storage Fee", "Storage Fee"]));
    if (!item.storageFeePerUnit && storageFee > 0) {
      item.storageFeePerUnit = item.unitsSold ? storageFee / item.unitsSold : storageFee;
      item.feeAudit = { ...item.feeAudit, storageFeeSource: "Monthly Storage Fee Report" };
    }
    item.sourceFields = { ...item.sourceFields, storage: "Monthly Storage Fee Report" };
  });

  const activeCogsRows: Array<{
    asin: string;
    sku: string;
    upc: string;
    title: string;
    price: number;
    cogs: number;
    fulfillmentFee: number;
    shipToAmazon: number;
    storageFee: number;
    referralFee: number;
    ecFee: number;
    feesTotal: number;
    currency: string;
    start: Date | null;
    end: Date | null;
  }> = [];
  const activeCogsBySku = new Map<string, number>();

  cogs.forEach((row, index) => {
    const asin = idValue(get(row, ["ASIN", "Child ASIN"]));
    const sku = idValue(get(row, ["SKU", "Seller SKU", "Item SKU"]));
    const upc = idValue(get(row, ["UPC", "EAN", "GTIN"]));
    const title = clean(get(row, ["Product Title", "Title", "Product"]));
    const price = num(get(row, ["Price", "Listed Price", "Your Price"]));
    const cogsValue = num(get(row, ["Unit COGS", "COGS", "Unit Cost", "Cost", "Landed Cost"]));
    const fulfillmentFeeRaw = num(get(row, ["Fulfillment Fee", "Fulfillment Fees", "FBA Fulfillment Fee", "FBA Fulfillment", "FBA Fee", "FBA Fees", "FulfillmentFee"]));
    const shipToAmazon = num(get(row, ["Ship to AMZ", "Ship to Amazon", "Shipping to Amazon", "Inbound Shipping"]));
    const storageFee = num(get(row, ["Storage Fees", "Storage Fee", "FBA Storage Fee", "Monthly Storage Fee"]));
    const referralFee = num(get(row, ["15% Referral", "Referral Fee", "3P Referral Fee", "Estimated Referral Fee"]));
    const ecFee = num(get(row, ["EC Fee @ 3%", "EC Fee", "ECFee"]));
    const feesTotal = num(get(row, ["Fees Total", "Total Fees", "Total Amazon Fees"]));
    const inferredFulfillmentFee =
      fulfillmentFeeRaw ||
      Math.max(0, feesTotal - cogsValue - shipToAmazon - storageFee - referralFee - ecFee);
    const fulfillmentFee = inferredFulfillmentFee > 0.01 ? inferredFulfillmentFee : 0;
    const currency = clean(get(row, ["COGS Currency", "Currency"])) || "USD";
    const start = dateValue(get(row, ["Effective Start Date", "Start Date"]));
    const end = dateValue(get(row, ["Effective End Date", "End Date"]));
    const label = sku || asin || `row ${index + 2}`;
    const hasMeaningfulData =
      Boolean(asin || sku || title) ||
      price > 0 ||
      cogsValue > 0 ||
      fulfillmentFee > 0 ||
      shipToAmazon > 0 ||
      storageFee > 0 ||
      referralFee > 0 ||
      ecFee > 0 ||
      feesTotal > 0;

    if (!hasMeaningfulData) return;
    if (!sku && !asin) {
      parserIssues.push(`COGS mapping ${label}: missing SKU or ASIN, so the row could not be matched.`);
      return;
    }
    if (cogsValue <= 0) parserIssues.push(`COGS mapping ${label}: Unit COGS must be greater than zero.`);
    if (currency.toUpperCase() !== "USD") parserIssues.push(`COGS mapping ${label}: COGS currency is ${currency}, expected USD.`);
    if (start && start > today) parserIssues.push(`COGS mapping ${label}: effective start date is in the future.`);

    const active = (!start || start <= today) && (!end || end >= today);
    if (!active) return;
    if (sku) {
      const skuKey = canonicalSku(sku);
      activeCogsBySku.set(skuKey, (activeCogsBySku.get(skuKey) ?? 0) + 1);
    }
    activeCogsRows.push({
      asin,
      sku,
      upc,
      title,
      price,
      cogs: cogsValue,
      fulfillmentFee,
      shipToAmazon,
      storageFee,
      referralFee,
      ecFee,
      feesTotal,
      currency,
      start,
      end,
    });
  });

  activeCogsBySku.forEach((count, sku) => {
    if (count > 1) parserIssues.push(`Duplicate active COGS rows for SKU ${sku}. Keep one active row per sellable SKU.`);
  });

  activeCogsRows.forEach((row) => {
    const skuKey = canonicalSku(row.sku);
    const asinKey = canonicalAsin(row.asin);
    const upcKey = canonicalSku(row.upc);
    const matchedBySku = (skuKey && bySku.get(skuKey)) || (upcKey && bySku.get(upcKey));
    const matchedByAsin = asinKey && byAsin.get(asinKey);
    const matchedExisting = matchedBySku || matchedByAsin;
    if (!matchedExisting) {
      parserIssues.push(`COGS mapping ${row.sku || row.asin}: no matching SKU or ASIN in the uploaded sales, ad, fee, or storage reports.`);
      return;
    }
    const item = matchedExisting;
    if (row.sku && item.sku && canonicalSku(row.sku) !== canonicalSku(item.sku) && !matchedByAsin) {
      item.importIssues = [...(item.importIssues ?? []), `ASIN/SKU mismatch in COGS mapping. COGS row SKU ${row.sku} matched item SKU ${item.sku}.`];
    }
    if (row.asin && item.asin && canonicalAsin(row.asin) !== canonicalAsin(item.asin)) {
      item.importIssues = [...(item.importIssues ?? []), `ASIN/SKU mismatch in COGS mapping. COGS row ASIN ${row.asin} matched item ASIN ${item.asin}.`];
    }
    if (row.cogs > 0 && row.currency.toUpperCase() === "USD") {
      item.cogsPerUnit ||= row.cogs;
      const cogsSource = row.sku && bySku.get(skuKey) ? "COGS Mapping (SKU match)" : "COGS Mapping (ASIN match)";
      item.sourceFields = { ...item.sourceFields, cogs: cogsSource };
      item.feeAudit = { ...item.feeAudit, cogsSource };
    }
    if (row.price > 0) item.listedPrice ||= row.price;
    if (row.fulfillmentFee > 0) {
      if (item.fbaFeePerUnit <= 0) {
        item.fbaFeePerUnit = row.fulfillmentFee;
        item.feeAudit = { ...item.feeAudit, fbaFeeSource: "COGS Mapping / Unit Economics (manual mapping)" };
      }
      const currentSources: SourceFields = item.sourceFields ?? {};
      item.sourceFields = { ...currentSources, fees: currentSources.fees || "COGS Mapping / Unit Economics" };
    }
    if (row.shipToAmazon > 0) item.shippingToAmazonPerUnit ||= row.shipToAmazon;
    if (row.storageFee > 0) {
      if (item.storageFeePerUnit <= 0) {
        item.storageFeePerUnit = row.storageFee;
        item.feeAudit = { ...item.feeAudit, storageFeeSource: "COGS Mapping / Unit Economics (manual mapping)" };
      }
      const currentSources: SourceFields = item.sourceFields ?? {};
      item.sourceFields = { ...currentSources, storage: currentSources.storage || "COGS Mapping / Unit Economics" };
    }
    if (row.referralFee > 0) {
      if (item.referralFeePerUnit <= 0) {
        item.referralFeePerUnit = row.referralFee;
        item.feeAudit = { ...item.feeAudit, referralFeeSource: "COGS Mapping / Unit Economics (manual mapping)" };
      }
      const currentSources: SourceFields = item.sourceFields ?? {};
      item.sourceFields = { ...currentSources, fees: currentSources.fees || "COGS Mapping / Unit Economics" };
    }
  });

  const recordsList = [...new Set(records.values())];
  recordsList.forEach((item) => {
    const parentAsin = canonicalAsin(item.parentAsin || "");
    if (!parentAsin || canonicalAsin(item.asin) === parentAsin) return;
    const parentFeeRecord = byAsin.get(parentAsin);
    if (!parentFeeRecord || parentFeeRecord === item) return;
    if (item.referralFeePerUnit <= 0 && parentFeeRecord.referralFeePerUnit > 0) {
      item.referralFeePerUnit = parentFeeRecord.referralFeePerUnit;
      item.feeAudit = { ...item.feeAudit, referralFeeSource: "Fee Preview Report (Parent ASIN fallback)" };
    }
    if (item.fbaFeePerUnit <= 0 && parentFeeRecord.fbaFeePerUnit > 0) {
      item.fbaFeePerUnit = parentFeeRecord.fbaFeePerUnit;
      item.feeAudit = { ...item.feeAudit, fbaFeeSource: "Fee Preview Report (Parent ASIN fallback)" };
    }
  });

  const skus = recordsList.filter((sku) => sku.asin || sku.sku || sku.title);
  const cogsHasFeeData = cogs.some((row) =>
    num(get(row, ["Fulfillment Fee", "Fulfillment Fees", "FBA Fulfillment Fee", "FBA Fulfillment", "FBA Fee", "FBA Fees", "FulfillmentFee"])) > 0 ||
    num(get(row, ["15% Referral", "Referral Fee", "3P Referral Fee", "Estimated Referral Fee"])) > 0 ||
    num(get(row, ["Fees Total", "Total Fees", "Total Amazon Fees"])) > 0,
  );
  const cogsHasStorageData = cogs.some((row) =>
    num(get(row, ["Storage Fees", "Storage Fee", "FBA Storage Fee", "Monthly Storage Fee"])) > 0,
  );
  parserIssues.forEach((issue) => warnings.push(issue));
  if (!business.length) warnings.push("Business Report not uploaded yet, so sales and units may be missing.");
  if (!fees.length && !cogsHasFeeData) warnings.push("Fee Preview report not uploaded yet, so Amazon fees may be missing.");
  if (!cogs.length) warnings.push("COGS mapping not uploaded yet, so product costs may be missing.");
  if (!storage.length && !cogsHasStorageData) warnings.push("Monthly Storage Fee report not uploaded yet, so storage fees may be missing.");
  if (!ads.length) warnings.push("Advertised Product report not uploaded yet, so ad spend may be missing.");
  if (!skus.length) warnings.push("Upload at least one report with ASIN or SKU columns to build the SKU model.");

  return {
    skus,
    warnings,
    summary: {
      mode: "source-reports",
      fieldSources: {
        sales: business.length ? "Business Report" : "Missing",
        units: business.length ? "Business Report" : "Missing",
        adSpend: ads.length ? "Advertised Product Report" : "Missing",
        fees: fees.length ? "Fee Preview Report" : cogsHasFeeData ? "COGS Mapping / Unit Economics" : "Missing",
        storage: storage.length ? "Monthly Storage Fee Report" : cogsHasStorageData ? "COGS Mapping / Unit Economics" : "Missing",
        cogs: cogs.length ? "COGS Mapping" : "Missing",
      },
      rowCounts: {
        "Business Report": business.length,
        "Advertised Product Report": ads.length,
        "Fee Preview Report": fees.length,
        "Monthly Storage Fee Report": storage.length,
        "COGS Mapping": cogs.length,
      },
    },
  };
}

async function rowsForSlot(filesBySlot: Record<string, File[]>, slot: string) {
  const files = filesBySlot[slot] ?? [];
  const nested = await Promise.all(files.map((file) => rowsFromFile(file)));
  return nested.flat();
}

async function rowsFromFile(file: File): Promise<SheetRow[]> {
  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: "array", cellDates: true });
  const firstSheet = workbook.SheetNames[0];
  return sheetToRows(workbook, firstSheet);
}
