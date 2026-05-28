import { X } from "lucide-react";
import { useEffect } from "react";
import { currency, currency2, percent, signedCurrency, signedPercent } from "../lib/format";
import type { CalculatedSkuPnl } from "../types/models";
import { StatusBadge } from "./StatusBadge";

interface SkuDetailDrawerProps {
  row: CalculatedSkuPnl | null;
  onClose: () => void;
}

export function SkuDetailDrawer({ row, onClose }: SkuDetailDrawerProps) {
  useEffect(() => {
    if (!row) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [row, onClose]);

  if (!row) return null;
  const profitableRoom = row.scenarioTacos < row.breakEvenTacos;
  return (
    <div className="fixed inset-0 z-[90] flex justify-end bg-slate-950/35" onMouseDown={onClose}>
      <div className="relative h-full w-full max-w-2xl overflow-y-auto bg-white p-6 shadow-2xl" onMouseDown={(event) => event.stopPropagation()}>
        <button
          onClick={onClose}
          className="sticky right-0 top-0 z-10 ml-auto flex h-10 w-10 items-center justify-center rounded-full border border-line bg-white text-ink shadow-card transition hover:border-brand hover:bg-warm"
          aria-label="Close SKU detail"
        >
          <X className="h-5 w-5" />
        </button>

        <div className="-mt-10 flex items-start justify-between gap-4 pr-12">
          <div>
            <StatusBadge status={row.status} />
            <h2 className="mt-3 text-2xl font-semibold text-ink">{row.title}</h2>
            <p className="mt-1 text-sm text-slate-500">{row.sku || "No SKU"} · {row.asin}</p>
          </div>
        </div>

        <div className="mt-6 rounded-lg border border-line bg-slate-50 p-4 text-sm text-slate-700">
          At a {percent(row.scenarioTacos)} TACOS and {percent(row.couponPercent)} coupon, this SKU would generate{" "}
          <strong className={row.estimatedProfit >= 0 ? "text-emerald-700" : "text-red-700"}>
            {currency(row.estimatedProfit)}
          </strong>{" "}
          profit at {percent(row.profitMargin)} margin. Break-even TACOS is {percent(row.breakEvenTacos)}, so there{" "}
          {profitableRoom ? "is" : "is not"} enough room to scale ads profitably.
        </div>

        <div className="mt-6 grid grid-cols-2 gap-3 md:grid-cols-3">
          {[
            ["Scenario sales", currency(row.scenarioSales), signedCurrency(row.deltas.sales)],
            ["Scenario profit", currency(row.estimatedProfit), signedCurrency(row.deltas.profit)],
            ["Profit margin", percent(row.profitMargin), signedPercent(row.deltas.margin)],
            ["Ad spend", currency(row.scenarioAdSpend), signedCurrency(row.deltas.adSpend)],
            ["Coupon cost", currency(row.couponCost), signedCurrency(row.deltas.couponCost)],
            ["Break-even TACOS", percent(row.breakEvenTacos), currency(row.maxProfitableAdSpend)],
          ].map(([label, value, helper]) => (
            <div key={label} className="rounded-lg border border-line p-3">
              <div className="text-xs font-semibold uppercase text-slate-500">{label}</div>
              <div className="mt-1 text-lg font-semibold text-ink">{value}</div>
              <div className="text-xs text-slate-500">{helper}</div>
            </div>
          ))}
        </div>

        <h3 className="mt-7 text-sm font-semibold uppercase text-slate-500">Unit Economics</h3>
        <div className="mt-2 overflow-hidden rounded-lg border border-line">
          {[
            ["Current price", currency2(row.unitEconomics.currentPrice)],
            ["Scenario price", currency2(row.unitEconomics.scenarioPrice)],
            ["Net price after coupon", currency2(row.netPriceAfterCoupon)],
            ["Referral fee / unit", currency2(row.unitEconomics.referralFeePerUnit)],
            ["FBA fee / unit", currency2(row.unitEconomics.fbaFeePerUnit)],
            ["Storage / unit", currency2(row.unitEconomics.storageFeePerUnit)],
            ["Shipping to Amazon / unit", currency2(row.unitEconomics.shippingToAmazonPerUnit)],
            ["COGS / unit", currency2(row.unitEconomics.cogsPerUnit)],
            ["Pre-ad profit / unit", currency2(row.unitEconomics.preAdProfitPerUnit)],
          ].map(([label, value]) => (
            <div key={label} className="grid grid-cols-2 border-b border-line px-4 py-2 last:border-b-0">
              <span className="text-sm text-slate-600">{label}</span>
              <span className="text-right text-sm font-semibold text-ink">{value}</span>
            </div>
          ))}
        </div>

        {row.dataIssues.length ? (
          <div className="mt-6 rounded-lg border border-amber-200 bg-amber-50 p-4">
            <h3 className="font-semibold text-amber-900">Data issues</h3>
            <ul className="mt-2 list-disc pl-5 text-sm text-amber-800">
              {row.dataIssues.map((issue) => <li key={issue}>{issue}</li>)}
            </ul>
          </div>
        ) : null}
      </div>
    </div>
  );
}
