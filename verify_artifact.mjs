import { FileBlob, SpreadsheetFile } from "@oai/artifact-tool";

const path = "/Users/jamesmaxwell/Documents/Codex/2026-05-14/files-mentioned-by-the-user-copy/outputs/amazon_sku_pnl/Redmond Amazon SKU P&L Scenario Model.xlsx";
const input = await FileBlob.load(path);
const workbook = await SpreadsheetFile.importXlsx(input);

for (const range of ["Dashboard!A1:J22", "Assumptions!A1:F10", "SKU P&L!A1:AC18", "Sensitivity!A1:G20", "Checks!A1:F6"]) {
  const check = await workbook.inspect({
    kind: "table",
    range,
    include: "values,formulas",
    tableMaxRows: 24,
    tableMaxCols: 30,
  });
  console.log(`--- ${range} ---`);
  console.log(check.ndjson.slice(0, 4000));
}

const errors = await workbook.inspect({
  kind: "match",
  searchTerm: "#REF!|#DIV/0!|#VALUE!|#NAME\\?|#N/A",
  options: { useRegex: true, maxResults: 100 },
  summary: "formula error scan",
});
console.log("--- errors ---");
console.log(errors.ndjson);

for (const sheetName of ["Dashboard", "Assumptions", "SKU P&L", "Sensitivity", "Checks"]) {
  await workbook.render({ sheetName, scale: 1 });
  console.log(`rendered ${sheetName}`);
}
