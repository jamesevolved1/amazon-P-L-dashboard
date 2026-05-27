import { AlertTriangle, CheckCircle2, Download, FileSpreadsheet, FolderOpen, Play, Sparkles, UploadCloud } from "lucide-react";
import { useRef, useState } from "react";
import { downloadCogsTemplate } from "../lib/cogsTemplate";
import { parseAmazonMasterWorkbook, parseAmazonReportBundle } from "../lib/excelParser";
import type { ImportSummary, ProductSku } from "../types/models";

interface FileImportProps {
  onLoaded: (skus: ProductSku[], warnings: string[]) => void;
}

type ReportSlot = {
  id: string;
  title: string;
  description: string;
  required?: boolean;
  accepts: string;
};

const reportSlots: ReportSlot[] = [
  {
    id: "profit-matrix",
    title: "Master Workbook or Legacy Profit Matrix",
    description: "One workbook with source report tabs, or the older combined Profit Matrix workbook.",
    accepts: ".xlsx,.xls,.csv",
  },
  {
    id: "fee-preview",
    title: "Fee Preview Report",
    description: "Amazon fee preview or FBA fees export with ASIN/SKU, referral fees, fulfillment fees, and price.",
    required: true,
    accepts: ".xlsx,.xls,.csv",
  },
  {
    id: "storage-fees",
    title: "Monthly Storage Fee Report",
    description: "Storage fees by ASIN/SKU so storage can be modeled per unit.",
    required: true,
    accepts: ".xlsx,.xls,.csv",
  },
  {
    id: "business-report",
    title: "Business Report",
    description: "Sales and traffic report with units ordered and ordered product sales.",
    required: true,
    accepts: ".xlsx,.xls,.csv",
  },
  {
    id: "advertised-products",
    title: "Advertised Product Report",
    description: "Sponsored ads report with advertised ASIN/SKU, spend, sales, orders, and units.",
    required: true,
    accepts: ".xlsx,.xls,.csv",
  },
  {
    id: "cogs",
    title: "COGS / Unit Economics Mapping",
    description: "A sheet like your Profit Matrix tab: SKU, ASIN, product title, price, COGS, fulfillment, ship-to-AMZ, storage, and referral fees.",
    required: true,
    accepts: ".xlsx,.xls,.csv",
  },
];

export function FileImport({ onLoaded }: FileImportProps) {
  const [files, setFiles] = useState<Record<string, File[]>>({});
  const [dragging, setDragging] = useState<string | null>(null);
  const [summary, setSummary] = useState<ImportSummary | null>(null);
  const [isBuilding, setIsBuilding] = useState(false);
  const [buildMessage, setBuildMessage] = useState<string | null>(null);
  const [buildState, setBuildState] = useState<"idle" | "success" | "error">("idle");

  const sourceSlotIds = reportSlots.filter((slot) => slot.id !== "profit-matrix").map((slot) => slot.id);
  const stagedFileCount = Object.values(files).reduce((total, slotFiles) => total + slotFiles.length, 0);
  const hasSourceFiles = sourceSlotIds.some((id) => (files[id] ?? []).length > 0);
  const hasMasterWorkbook = (files["profit-matrix"] ?? []).length > 0;
  const masterFileName = files["profit-matrix"]?.[0]?.name ?? "";
  const masterIsCsv = masterFileName.toLowerCase().endsWith(".csv");
  const canBuild = stagedFileCount > 0 && !isBuilding;

  const handleFiles = (slot: ReportSlot, incoming: FileList | File[]) => {
    const nextFiles = Array.from(incoming);
    if (!nextFiles.length) return;
    const updatedFiles = { ...files, [slot.id]: nextFiles };
    setFiles(updatedFiles);
    setSummary(null);
    setBuildState("idle");
    setBuildMessage(slot.id === "profit-matrix" && nextFiles[0]?.name.toLowerCase().endsWith(".csv")
      ? "CSV staged. A CSV is one tab only; upload the Google Sheet as XLSX if you want the app to read every tab at once."
      : "Files staged. Click Submit & Build when every report is ready.");
  };

  const buildModel = async () => {
    if (!canBuild) return;
    setIsBuilding(true);
    setBuildState("idle");
    setBuildMessage(null);

    try {
      const result = hasMasterWorkbook
        ? await parseAmazonMasterWorkbook(files["profit-matrix"][0])
        : hasSourceFiles
          ? await parseAmazonReportBundle(files)
          : { skus: [], warnings: ["Stage at least one master workbook or the separate source reports before building the SKU model."], summary: undefined };

      onLoaded(result.skus, result.warnings);
      setSummary(result.summary ?? null);
      if (!result.skus.length) {
        setBuildState("error");
        setBuildMessage("No SKU records were built, so the active client dashboard was left unchanged. Check the import summary and upload a workbook tab or report with ASIN/SKU rows.");
        return;
      }
      setBuildState("success");
      setBuildMessage(`Imported ${result.skus.length.toLocaleString()} SKUs for the active client. Dashboard, SKU P&L, and Performance Review are now updated.`);
    } catch (error) {
      const message = error instanceof Error ? error.message : "The files could not be parsed.";
      onLoaded([], [`Import failed: ${message}`]);
      setBuildState("error");
      setBuildMessage("Import failed. Check that the uploaded files are valid CSV/XLSX reports.");
    } finally {
      setIsBuilding(false);
    }
  };

  return (
    <section className="rounded-lg border border-line bg-white p-5 shadow-card">
      <div className="flex flex-col gap-3 border-b border-line pb-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.16em] text-brand">
            <FolderOpen className="h-4 w-4" />
            Document Intake
          </div>
          <h2 className="mt-2 text-xl font-bold text-ink">Upload the source reports</h2>
          <p className="mt-1 max-w-4xl text-sm leading-6 text-steel">
            Drag in one XLSX master workbook, or stage individual CSV/XLSX reports, then click Submit & Build to normalize everything together.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <div className="mr-1 flex items-center rounded-full bg-warm px-3 py-2 text-xs font-bold text-steel">
            {stagedFileCount ? `${stagedFileCount} staged` : "No files staged"}
          </div>
          <button
            type="button"
            onClick={() => downloadCogsTemplate("csv")}
            className="inline-flex items-center gap-2 rounded-full border border-line bg-white px-3 py-2 text-xs font-bold uppercase tracking-wide text-ink hover:bg-warm"
          >
            <Download className="h-3.5 w-3.5" />
            COGS CSV
          </button>
          <button
            type="button"
            onClick={() => downloadCogsTemplate("xlsx")}
            className="inline-flex items-center gap-2 rounded-full bg-brand px-3 py-2 text-xs font-bold uppercase tracking-wide text-white hover:bg-deep"
          >
            <Download className="h-3.5 w-3.5" />
            COGS XLSX
          </button>
          <button
            type="button"
            onClick={buildModel}
            disabled={!canBuild}
            className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-xs font-extrabold uppercase tracking-wide text-white shadow-sm transition disabled:cursor-not-allowed disabled:bg-slate/40 ${
              buildState === "success"
                ? "bg-healthy hover:bg-emerald-700"
                : buildState === "error"
                  ? "bg-danger hover:bg-red-700"
                  : "bg-brand hover:bg-deep"
            }`}
          >
            {buildState === "success" ? <CheckCircle2 className="h-3.5 w-3.5" /> : buildState === "error" ? <AlertTriangle className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5 fill-current" />}
            {isBuilding ? "Building" : buildState === "success" ? "Imported" : buildState === "error" ? "Review Import" : "Submit & Build"}
          </button>
        </div>
      </div>

      {buildMessage ? <BuildStatusCard state={buildState} message={buildMessage} /> : null}

      {hasMasterWorkbook ? (
        <div className={`mt-4 rounded-lg border px-4 py-3 text-sm font-semibold ${masterIsCsv ? "border-amber-200 bg-amber-50 text-amber-900" : "border-emerald-200 bg-emerald-50 text-emerald-800"}`}>
          {masterIsCsv
            ? "Single CSV staged. This only includes one sheet tab; upload the master as XLSX to pull Business, COGS, FBA fees, storage, and ads from one file."
            : "Master workbook staged. The individual report uploads below are optional for this build."}
        </div>
      ) : null}

      <div className="mt-5 grid gap-3 md:grid-cols-2 2xl:grid-cols-3">
        {reportSlots.map((slot) => (
          <ReportDropZone
            key={slot.id}
            slot={slot}
            files={files[slot.id] ?? []}
            masterWorkbookStaged={hasMasterWorkbook}
            isDragging={dragging === slot.id}
            onDragState={setDragging}
            onFiles={handleFiles}
          />
        ))}
      </div>

      {summary ? <ImportSummaryCard summary={summary} /> : null}
    </section>
  );
}

function BuildStatusCard({ state, message }: { state: "idle" | "success" | "error"; message: string }) {
  const isSuccess = state === "success";
  const isError = state === "error";
  const Icon = isSuccess ? Sparkles : isError ? AlertTriangle : FileSpreadsheet;

  return (
    <div
      className={`build-status-card mt-4 overflow-hidden rounded-lg border px-4 py-4 text-sm font-semibold ${
        isSuccess
          ? "border-emerald-200 bg-emerald-50 text-emerald-900"
          : isError
            ? "border-red-200 bg-red-50 text-red-900"
            : "border-line bg-warm/70 text-steel"
      }`}
    >
      <div className="flex items-center gap-3">
        <div
          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${
            isSuccess ? "bg-emerald-600 text-white" : isError ? "bg-danger text-white" : "bg-white text-steel"
          }`}
        >
          <Icon className="h-5 w-5" />
        </div>
        <div className="min-w-0">
          <div className="text-base font-extrabold text-ink">
            {isSuccess ? "Import complete" : isError ? "Import needs attention" : "Ready to build"}
          </div>
          <div className="mt-0.5 leading-5">{message}</div>
        </div>
      </div>
      {isSuccess ? (
        <div className="pointer-events-none mt-3 grid grid-cols-6 gap-1">
          {Array.from({ length: 6 }).map((_, index) => (
            <div key={index} className="h-1 rounded-full bg-emerald-300 build-status-spark" style={{ animationDelay: `${index * 75}ms` }} />
          ))}
        </div>
      ) : null}
    </div>
  );
}

function ImportSummaryCard({ summary }: { summary: ImportSummary }) {
  const modeLabel =
    summary.mode === "master-workbook"
      ? "master workbook"
      : summary.mode === "source-reports"
        ? "source reports"
        : "legacy combined matrix";
  const fields = [
    ["Sales", summary.fieldSources.sales],
    ["Units", summary.fieldSources.units],
    ["Ad Spend", summary.fieldSources.adSpend],
    ["Fees", summary.fieldSources.fees],
    ["Storage", summary.fieldSources.storage],
    ["COGS", summary.fieldSources.cogs],
  ];

  return (
    <div className="mt-5 rounded-lg border border-line bg-warm/60 p-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h3 className="text-sm font-extrabold text-ink">Import Summary</h3>
          <p className="mt-1 text-xs leading-5 text-steel">
            Build mode: {modeLabel}
          </p>
        </div>
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {fields.map(([label, source]) => (
            <div key={label} className="rounded-md border border-line bg-white px-3 py-2">
              <div className="text-[10px] font-bold uppercase tracking-wide text-steel">{label}</div>
              <div className="mt-1 text-xs font-bold text-ink">{source}</div>
            </div>
          ))}
        </div>
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        {Object.entries(summary.rowCounts).map(([label, count]) => (
          <span key={label} className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-steel">
            {label}: {count}
          </span>
        ))}
      </div>
    </div>
  );
}

function ReportDropZone({
  slot,
  files,
  masterWorkbookStaged,
  isDragging,
  onDragState,
  onFiles,
}: {
  slot: ReportSlot;
  files: File[];
  masterWorkbookStaged: boolean;
  isDragging: boolean;
  onDragState: (id: string | null) => void;
  onFiles: (slot: ReportSlot, files: FileList | File[]) => void;
}) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const hasFile = files.length > 0;
  const isRequired = Boolean(slot.required && !masterWorkbookStaged);
  const isSourceSlot = slot.id !== "profit-matrix";

  return (
    <div
      onDragOver={(event) => {
        event.preventDefault();
        onDragState(slot.id);
      }}
      onDragLeave={() => onDragState(null)}
      onDrop={(event) => {
        event.preventDefault();
        onDragState(null);
        onFiles(slot, event.dataTransfer.files);
      }}
      className={`group min-h-[154px] rounded-lg border border-dashed p-4 transition ${
        isDragging
          ? "border-brand bg-orange-50"
          : hasFile
            ? "border-emerald-300 bg-emerald-50/70"
            : "border-[rgba(143,162,175,0.45)] bg-[#FAFAFA] hover:border-brand hover:bg-orange-50/40"
      }`}
    >
      <div className="flex h-full flex-col justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className={`rounded-md p-2 ${hasFile ? "bg-emerald-100 text-emerald-700" : "bg-warm text-navy"}`}>
            {hasFile ? <CheckCircle2 className="h-5 w-5" /> : <FileSpreadsheet className="h-5 w-5" />}
          </div>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-sm font-bold text-ink">{slot.title}</h3>
              {isRequired ? <span className="rounded-full bg-brand px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white">Required</span> : null}
              {masterWorkbookStaged && isSourceSlot ? (
                <span className="rounded-full bg-warm px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-steel">Optional</span>
              ) : null}
            </div>
            <p className="mt-1 text-xs leading-5 text-steel">{slot.description}</p>
          </div>
        </div>

        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0 text-xs font-semibold text-slate">
            {hasFile ? files.map((file) => file.name).join(", ") : "Drop file here or browse"}
          </div>
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className="inline-flex shrink-0 items-center gap-2 rounded-full bg-ink px-3 py-2 text-xs font-bold uppercase tracking-wide text-white transition hover:bg-brand"
          >
            <UploadCloud className="h-3.5 w-3.5" />
            Browse
          </button>
        </div>
      </div>
      <input
        ref={inputRef}
        className="hidden"
        type="file"
        accept={slot.accepts}
        multiple={slot.id !== "profit-matrix"}
        onChange={(event) => {
          if (event.target.files) onFiles(slot, event.target.files);
        }}
      />
    </div>
  );
}
