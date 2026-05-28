export const currency = (value: number) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(Number.isFinite(value) ? value : 0);

export const currency2 = (value: number) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  }).format(Number.isFinite(value) ? value : 0);

export const percent = (value: number) =>
  `${((Number.isFinite(value) ? value : 0) * 100).toFixed(1)}%`;

export const number = (value: number) =>
  new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 }).format(
    Number.isFinite(value) ? value : 0,
  );

export const signedCurrency = (value: number) => {
  const formatted = currency(Math.abs(value));
  return `${value >= 0 ? "+" : "-"}${formatted}`;
};

export const signedPercent = (value: number) =>
  `${value >= 0 ? "+" : ""}${percent(value)}`;

export const formatCurrency = currency;
export const formatNumber = number;
export const formatPercent = (value: number) =>
  `${((Number.isFinite(value) ? value : 0) * 100).toFixed(Math.abs(value) >= 0.1 ? 0 : 1)}%`;
export const formatRoas = (value: number) =>
  `${(Number.isFinite(value) ? value : 0).toFixed(2)}x`;
