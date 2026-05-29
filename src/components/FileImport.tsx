import { AlertTriangle, CheckCircle2, FileSpreadsheet, FolderOpen, Play, Sparkles, UploadCloud } from "lucide-react";
import { useRef, useState } from "react";
import JSZip from "jszip";
import * as XLSX from "xlsx";
import { parseAmazonMasterWorkbook, parseAmazonReportBundle } from "../lib/excelParser";
import { reportingStateFromUploadedFiles } from "../lib/reportingData";
import type { ImportSummary, ProductSku, ReportingState } from "../types/models";

interface FileImportProps {
  onLoaded: (skus: ProductSku[], warnings: string[]) => void;
  onReportingLoaded?: (state: ReportingState) => void;
}

type ReportSlot = {
  id: string;
  title: string;
  description: string;
  required?: boolean;
  accepts: string;
};

type PackItem = {
  id: string;
  title: string;
  helper: string;
  slotIds: string[];
  required?: boolean;
};

const reportSlots: ReportSlot[] = [
  {
    id: "profit-matrix",
    title: "Client Master Workbook",
    description: "Your Profit Matrix Master with P&L, 30-day business report, advertised product summary, fees, storage, and COGS/unit economics tabs.",
    accepts: ".xlsx,.xls,.csv",
  },
  {
    id: "campaign-export",
    title: "Bulk Campaign Export",
    description: "Large Amazon Ads campaign export with campaign, targeting, keyword/search-term, Sponsored Products, Brands, Display, and placement data.",
    required: false,
    accepts: ".xlsx,.xls,.csv",
  },
];

const packItems: PackItem[] = [
  {
    id: "master",
    title: "Master workbook or COGS/P&L",
    helper: "Profit Matrix / COGS with SKU, ASIN, title, price, unit cost, and manual fee overrides.",
    slotIds: ["profit-matrix", "cogs"],
    required: true,
  },
  {
    id: "business",
    title: "Business Report",
    helper: "Child ASIN, sessions, units ordered, ordered product sales, and total order items.",
    slotIds: ["business-report"],
    required: true,
  },
  {
    id: "bulk",
    title: "Bulk Campaign Export",
    helper: "The full Amazon Ads bulk workbook with campaign, targeting, product ad, and search-term tabs.",
    slotIds: ["campaign-export"],
    required: true,
  },
  {
    id: "ads",
    title: "Advertised Product Summary",
    helper: "Advertised SKU/ASIN, spend, ad sales, impressions, clicks, orders.",
    slotIds: ["advertised-products"],
  },
  {
    id: "fees",
    title: "Fee Preview",
    helper: "Referral fee, FBA fulfillment fee, price, SKU/ASIN.",
    slotIds: ["fee-preview"],
  },
  {
    id: "storage",
    title: "Storage Fees",
    helper: "Monthly storage fee report by ASIN/FNSKU/SKU.",
    slotIds: ["storage-fees"],
  },
];

export function FileImport({ onLoaded, onReportingLoaded }: FileImportProps) {
  const [files, setFiles] = useState<Record<string, File[]>>({});
  const [dragging, setDragging] = useState<string | null>(null);
  const [summary, setSummary] = useState<ImportSummary | null>(null);
  const [isBuilding, setIsBuilding] = useState(false);
  const [isUnpacking, setIsUnpacking] = useState(false);
  const [buildMessage, setBuildMessage] = useState<string | null>(null);
  const [buildState, setBuildState] = useState<"idle" | "success" | "error">("idle");

  const sourceSlotIds = ["business-report", "advertised-products", "fee-preview", "storage-fees", "cogs"];
  const stagedFileCount = Object.values(files).reduce((total, slotFiles) => total + slotFiles.length, 0);
  const hasSourceFiles = sourceSlotIds.some((id) => (files[id] ?? []).length > 0);
  const hasMasterWorkbook = (files["profit-matrix"] ?? []).length > 0;
  const masterFileName = files["profit-matrix"]?.[0]?.name ?? "";
  const masterIsCsv = masterFileName.toLowerCase().endsWith(".csv");
  const canBuild = stagedFileCount > 0 && !isBuilding && !isUnpacking;
  const foundPackItems = packItems.reduce<Record<string, boolean>>((acc, item) => {
    acc[item.id] = item.slotIds.some((slotId) => (files[slotId] ?? []).length > 0);
    return acc;
  }, {});

  const handleReportPackFiles = async (incoming: FileList | File[]) => {
    const rawFiles = Array.from(incoming);
    if (!rawFiles.length) return;
    setIsUnpacking(true);
    setBuildState("idle");
    setSummary(null);
    setBuildMessage("Reading report pack and detecting source reports...");
    try {
      const expandedFiles = (await Promise.all(rawFiles.map(expandFile))).flat();
      const detectedEntries = await Promise.all(expandedFiles.map(async (file) => ({ file, slotId: await detectReportSlot(file) })));
      const nextFiles = detectedEntries.reduce<Record<string, File[]>>((acc, entry) => {
        if (!entry.slotId) return acc;
        acc[entry.slotId] = [...(acc[entry.slotId] ?? []), entry.file];
        return acc;
      }, {});
      setFiles(nextFiles);
      const detectedCount = Object.values(nextFiles).reduce((count, slotFiles) => count + slotFiles.length, 0);
      const undetected = detectedEntries.filter((entry) => !entry.slotId).map((entry) => entry.file.name);
      setBuildMessage(
        undetected.length
          ? `Detected ${detectedCount} report files. Could not classify: ${undetected.slice(0, 4).join(", ")}${undetected.length > 4 ? ", and more" : ""}.`
          : `Detected ${detectedCount} report files. Review the checklist, then click Submit & Build.`,
      );
    } catch (error) {
      setBuildState("error");
      setBuildMessage(error instanceof Error ? error.message : "Could not read the report pack.");
    } finally {
      setIsUnpacking(false);
    }
  };

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
      if (result.skus.length && onReportingLoaded) {
        onReportingLoaded(await reportingStateFromUploadedFiles(files, result.skus));
      }
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
            Drop one zip file or a batch of reports. The app auto-detects the files, checks what it found, then builds the P&L and reporting dashboards.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <div className="mr-1 flex items-center rounded-full bg-warm px-3 py-2 text-xs font-bold text-steel">
            {isUnpacking ? "Reading pack..." : stagedFileCount ? `${stagedFileCount} staged` : "No files staged"}
          </div>
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
            {isBuilding ? "Building" : isUnpacking ? "Reading" : buildState === "success" ? "Imported" : buildState === "error" ? "Review Import" : "Submit & Build"}
          </button>
        </div>
      </div>

      {buildMessage ? <BuildStatusCard state={buildState} message={buildMessage} /> : null}

      <ReportPackDropZone isDragging={dragging === "report-pack"} onDragState={setDragging} onFiles={handleReportPackFiles} />

      <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {packItems.map((item) => {
          const found = foundPackItems[item.id];
          return (
            <div key={item.id} className={`rounded-lg border p-3 ${found ? "border-emerald-200 bg-emerald-50" : item.required ? "border-amber-200 bg-amber-50" : "border-line bg-warm/40"}`}>
              <div className="flex items-start gap-3">
                <div className={`mt-0.5 rounded-full p-1 ${found ? "bg-emerald-600 text-white" : "bg-white text-steel"}`}>
                  {found ? <CheckCircle2 className="h-4 w-4" /> : <FileSpreadsheet className="h-4 w-4" />}
                </div>
                <div>
                  <div className="flex flex-wrap items-center gap-2 text-sm font-extrabold text-ink">
                    {item.title}
                    {item.required ? <span className="rounded-full bg-brand px-2 py-0.5 text-[10px] uppercase tracking-wide text-white">Needed</span> : null}
                  </div>
                  <p className="mt-1 text-xs leading-5 text-steel">{item.helper}</p>
                  {found ? (
                    <div className="mt-2 text-[11px] font-bold text-emerald-800">
                      {item.slotIds.flatMap((slotId) => files[slotId] ?? []).map((file) => file.name).join(", ")}
                    </div>
                  ) : null}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {hasMasterWorkbook ? (
        <div className={`mt-4 rounded-lg border px-4 py-3 text-sm font-semibold ${masterIsCsv ? "border-amber-200 bg-amber-50 text-amber-900" : "border-emerald-200 bg-emerald-50 text-emerald-800"}`}>
          {masterIsCsv
            ? "Single CSV staged. This only includes one sheet tab; upload the master as XLSX to pull Business, COGS, FBA fees, storage, and ads from one file."
            : "Master workbook staged. The individual report uploads below are optional for this build."}
        </div>
      ) : null}

      <details className="mt-5 rounded-lg border border-line bg-white">
        <summary className="cursor-pointer px-4 py-3 text-sm font-extrabold text-ink">Manual upload slots</summary>
      <div className="grid gap-3 border-t border-line p-4 lg:grid-cols-2">
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
      </details>

      {summary ? <ImportSummaryCard summary={summary} /> : null}
    </section>
  );
}

async function expandFile(file: File): Promise<File[]> {
  if (!file.name.toLowerCase().endsWith(".zip")) return [file];
  const zip = await JSZip.loadAsync(await file.arrayBuffer());
  const entries = Object.values(zip.files).filter((entry) => !entry.dir && /\.(xlsx|xls|csv)$/i.test(entry.name));
  const files = await Promise.all(entries.map(async (entry) => {
    const blob = await entry.async("blob");
    const name = entry.name.split("/").pop() || entry.name;
    return new File([blob], name, { type: blob.type || fileTypeFromName(name) });
  }));
  return files;
}

function fileTypeFromName(name: string) {
  if (name.toLowerCase().endsWith(".csv")) return "text/csv";
  return "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
}

async function detectReportSlot(file: File): Promise<string | null> {
  const nameKey = file.name.toLowerCase().replace(/[^a-z0-9]+/g, " ");
  const sheetNames = await readSheetNames(file);
  const sheetKey = sheetNames.join(" ").toLowerCase().replace(/[^a-z0-9]+/g, " ");
  const combined = `${nameKey} ${sheetKey}`;

  if (combined.includes("bulk") || combined.includes("sponsored products campaigns") || combined.includes("sponsored display campaigns") || combined.includes("sp search term report")) return "campaign-export";
  if ((combined.includes("master") || combined.includes("profit matrix")) && (combined.includes("business report") || combined.includes("fee preview") || combined.includes("advertising product"))) return "profit-matrix";
  if (combined.includes("business report") || combined.includes("sales traffic")) return "business-report";
  if (combined.includes("advertised product") || combined.includes("advertising product") || combined.includes("ad spend per sku")) return "advertised-products";
  if (combined.includes("fee preview") || combined.includes("fba fees")) return "fee-preview";
  if (combined.includes("storage fee") || combined.includes("monthly storage")) return "storage-fees";
  if (combined.includes("cogs") || combined.includes("unit economics") || combined.includes("profit matrix")) return "cogs";
  return null;
}

async function readSheetNames(file: File): Promise<string[]> {
  if (file.name.toLowerCase().endsWith(".csv")) return [];
  try {
    const workbook = XLSX.read(await file.arrayBuffer(), { type: "array" });
    return workbook.SheetNames;
  } catch {
    return [];
  }
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

function ReportPackDropZone({
  isDragging,
  onDragState,
  onFiles,
}: {
  isDragging: boolean;
  onDragState: (id: string | null) => void;
  onFiles: (files: FileList | File[]) => void;
}) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const folderInputRef = useRef<HTMLInputElement | null>(null);
  return (
    <div
      onDragOver={(event) => {
        event.preventDefault();
        onDragState("report-pack");
      }}
      onDragLeave={() => onDragState(null)}
      onDrop={(event) => {
        event.preventDefault();
        onDragState(null);
        onFiles(event.dataTransfer.files);
      }}
      className={`mt-5 rounded-xl border-2 border-dashed p-6 transition ${
        isDragging ? "border-brand bg-orange-50" : "border-[rgba(143,162,175,0.45)] bg-[#FAFAFA] hover:border-brand hover:bg-orange-50/40"
      }`}
    >
      <div className="grid gap-5 lg:grid-cols-[1fr_auto] lg:items-center">
        <div className="flex items-start gap-4">
          <div className="rounded-2xl bg-ink p-3 text-white">
            <UploadCloud className="h-6 w-6" />
          </div>
          <div>
            <h3 className="text-lg font-extrabold text-ink">Drop your client report pack here</h3>
            <p className="mt-1 max-w-3xl text-sm leading-6 text-steel">
              Upload one zip, choose the whole report-pack folder, or select the master workbook and bulk campaign workbook together.
            </p>
            <div className="mt-3 flex flex-wrap gap-2 text-xs font-bold text-steel">
              <span className="rounded-full bg-white px-3 py-1 ring-1 ring-line">.zip</span>
              <span className="rounded-full bg-white px-3 py-1 ring-1 ring-line">.xlsx</span>
              <span className="rounded-full bg-white px-3 py-1 ring-1 ring-line">.csv</span>
              <span className="rounded-full bg-white px-3 py-1 ring-1 ring-line">folder</span>
              <span className="rounded-full bg-white px-3 py-1 ring-1 ring-line">multiple files</span>
            </div>
          </div>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row lg:flex-col">
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className="inline-flex items-center justify-center gap-2 rounded-full bg-brand px-5 py-3 text-sm font-extrabold uppercase tracking-wide text-white shadow-sm transition hover:-translate-y-0.5 hover:bg-deep"
          >
            <FileSpreadsheet className="h-4 w-4" />
            Choose Files
          </button>
          <button
            type="button"
            onClick={() => folderInputRef.current?.click()}
            className="inline-flex items-center justify-center gap-2 rounded-full bg-white px-5 py-3 text-sm font-extrabold uppercase tracking-wide text-ink ring-1 ring-line transition hover:-translate-y-0.5 hover:border-brand hover:text-brand"
          >
            <FolderOpen className="h-4 w-4" />
            Choose Folder
          </button>
        </div>
      </div>
      <input
        ref={inputRef}
        className="hidden"
        type="file"
        accept=".zip,.xlsx,.xls,.csv"
        multiple
        onChange={(event) => {
          if (event.target.files) onFiles(event.target.files);
        }}
      />
      <input
        ref={(element) => {
          folderInputRef.current = element;
          element?.setAttribute("webkitdirectory", "");
          element?.setAttribute("directory", "");
        }}
        className="hidden"
        type="file"
        multiple
        onChange={(event) => {
          if (event.target.files) onFiles(event.target.files);
        }}
      />
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
