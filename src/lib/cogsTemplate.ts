import * as XLSX from "xlsx";

const headers = [
  "SKU",
  "ASIN",
  "UPC",
  "Product Title",
  "Price",
  "COGS",
  "Fulfillment Fee",
  "Ship to AMZ",
  "Storage Fees",
  "Referral Fee",
  "EC Fee @ 3%",
  "Fees Total",
  "COGS Currency",
  "Effective Start Date",
  "Effective End Date",
  "Cost Source",
  "Notes",
];

const example = [
  "RELYTE.LLJAR-FBA",
  "B088G2F4ZJ",
  "199626688548",
  "Re-Lyte Lemon Lime Jar",
  44.99,
  6.15,
  3.92,
  0.34,
  0.44,
  6.75,
  1.35,
  12.8,
  "USD",
  "2026-05-01",
  "",
  "NetSuite",
  "COGS is final landed product cost only. Fees are optional unit-economics columns and should not be included in COGS.",
];

export function downloadCogsTemplate(format: "csv" | "xlsx") {
  const worksheet = XLSX.utils.aoa_to_sheet([headers, example]);
  if (format === "csv") {
    const csv = XLSX.utils.sheet_to_csv(worksheet);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "amazon-cogs-mapping-template.csv";
    link.click();
    URL.revokeObjectURL(url);
    return;
  }

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "COGS Mapping");
  XLSX.writeFile(workbook, "amazon-cogs-mapping-template.xlsx");
}
