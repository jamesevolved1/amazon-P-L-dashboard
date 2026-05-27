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
