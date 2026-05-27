import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  ResponsiveContainer,
  Scatter,
  ScatterChart,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { currency, percent } from "../lib/format";
import type { CalculatedSkuPnl, ParentAsinPnl } from "../types/models";

export function ProfitCharts({ rows, parentRows = [] }: { rows: CalculatedSkuPnl[]; parentRows?: ParentAsinPnl[] }) {
  const top = [...rows].sort((a, b) => b.estimatedProfit - a.estimatedProfit).slice(0, 10);
  const bottom = [...rows].sort((a, b) => a.estimatedProfit - b.estimatedProfit).slice(0, 10);
  const profitCompare = top.map((row) => ({
    name: trim(row.sku || row.asin),
    current: Math.round(row.currentProfit),
    scenario: Math.round(row.estimatedProfit),
  }));
  const scatter = rows.map((row) => ({
    name: row.sku || row.asin,
    tacos: row.scenarioTacos,
    margin: row.profitMargin,
    profit: row.estimatedProfit,
  }));
  const couponImpact = [...rows]
    .sort((a, b) => b.couponCost - a.couponCost)
    .slice(0, 10)
    .map((row) => ({
      name: trim(row.sku || row.asin),
      coupon: Math.round(row.couponCost),
      profit: Math.round(row.estimatedProfit),
    }));
  const parentProfit = [...parentRows]
    .sort((a, b) => b.estimatedProfit - a.estimatedProfit)
    .slice(0, 10)
    .map((row) => ({ name: trim(row.parentAsin), value: row.estimatedProfit }));
  const parentScatter = parentRows.map((row) => ({
    name: row.parentAsin,
    tacos: row.tacos,
    margin: row.profitMargin,
    profit: row.estimatedProfit,
  }));

  return (
    <section className="grid gap-4 xl:grid-cols-2">
      {parentRows.length ? (
        <>
          <ChartCard title="Top Parent ASIN Profit">
            <SimpleBarChart data={parentProfit} positive />
          </ChartCard>

          <ChartCard title="Parent TACOS vs Profit Margin">
            <ResponsiveContainer width="100%" height={320}>
              <ScatterChart margin={{ left: 10, right: 24, top: 10, bottom: 10 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="tacos" name="TACOS" tickFormatter={(value) => percent(Number(value))} />
                <YAxis dataKey="margin" name="Margin" tickFormatter={(value) => percent(Number(value))} />
                <Tooltip cursor={{ strokeDasharray: "3 3" }} formatter={(value, name) => name === "profit" ? currency(Number(value)) : percent(Number(value))} />
                <Scatter data={parentScatter} fill="#415A68">
                  {parentScatter.map((item) => (
                    <Cell key={item.name} fill={item.profit < 0 ? "#C2413D" : item.margin < 0.15 ? "#FDBA31" : "#11845B"} />
                  ))}
                </Scatter>
              </ScatterChart>
            </ResponsiveContainer>
          </ChartCard>
        </>
      ) : null}

      <ChartCard title="Current vs Scenario Profit">
        <ResponsiveContainer width="100%" height={320}>
          <BarChart data={profitCompare} layout="vertical" margin={{ left: 16, right: 24 }}>
            <CartesianGrid strokeDasharray="3 3" horizontal={false} />
            <XAxis type="number" tickFormatter={(value) => currency(Number(value))} />
            <YAxis type="category" dataKey="name" width={105} />
            <Tooltip formatter={(value) => currency(Number(value))} />
            <Legend />
            <Bar dataKey="current" fill="#8FA2AF" name="Current" radius={[0, 4, 4, 0]} />
            <Bar dataKey="scenario" fill="#F47322" name="Scenario" radius={[0, 4, 4, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>

      <ChartCard title="TACOS vs Profit Margin">
        <ResponsiveContainer width="100%" height={320}>
          <ScatterChart margin={{ left: 10, right: 24, top: 10, bottom: 10 }}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="tacos" name="TACOS" tickFormatter={(value) => percent(Number(value))} />
            <YAxis dataKey="margin" name="Margin" tickFormatter={(value) => percent(Number(value))} />
            <Tooltip
              cursor={{ strokeDasharray: "3 3" }}
              formatter={(value, name) =>
                name === "profit" ? currency(Number(value)) : percent(Number(value))
              }
            />
            <Scatter data={scatter} fill="#415A68">
              {scatter.map((item) => (
                <Cell key={item.name} fill={item.profit < 0 ? "#C2413D" : item.margin < 0.15 ? "#FDBA31" : "#11845B"} />
              ))}
            </Scatter>
          </ScatterChart>
        </ResponsiveContainer>
      </ChartCard>

      <ChartCard title="Top 10 Profit SKUs">
        <SimpleBarChart data={top.map((row) => ({ name: trim(row.sku || row.asin), value: row.estimatedProfit }))} positive />
      </ChartCard>

      <ChartCard title="Bottom 10 Profit SKUs">
        <SimpleBarChart data={bottom.map((row) => ({ name: trim(row.sku || row.asin), value: row.estimatedProfit }))} />
      </ChartCard>

      <ChartCard title="Coupon Impact on Profit">
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={couponImpact} margin={{ left: 12, right: 24 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey="name" interval={0} angle={-20} textAnchor="end" height={70} />
            <YAxis tickFormatter={(value) => currency(Number(value))} />
            <Tooltip formatter={(value) => currency(Number(value))} />
            <Legend />
            <Bar dataKey="coupon" name="Coupon Cost" fill="#FDBA31" radius={[4, 4, 0, 0]} />
            <Bar dataKey="profit" name="Profit" fill="#F47322" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>

      <ChartCard title="Sales vs Profit by SKU">
        <ResponsiveContainer width="100%" height={300}>
          <ScatterChart margin={{ left: 10, right: 24, top: 10, bottom: 10 }}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="sales" name="Sales" tickFormatter={(value) => currency(Number(value))} />
            <YAxis dataKey="profit" name="Profit" tickFormatter={(value) => currency(Number(value))} />
            <Tooltip formatter={(value) => currency(Number(value))} />
            <Scatter data={rows.map((row) => ({ sales: row.scenarioSales, profit: row.estimatedProfit }))} fill="#415A68" />
          </ScatterChart>
        </ResponsiveContainer>
      </ChartCard>
    </section>
  );
}

function ChartCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-line bg-white p-5 shadow-card">
      <h3 className="mb-3 text-xs font-extrabold uppercase tracking-[0.14em] text-steel">{title}</h3>
      {children}
    </div>
  );
}

function SimpleBarChart({ data, positive = false }: { data: Array<{ name: string; value: number }>; positive?: boolean }) {
  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={data} layout="vertical" margin={{ left: 16, right: 24 }}>
        <CartesianGrid strokeDasharray="3 3" horizontal={false} />
        <XAxis type="number" tickFormatter={(value) => currency(Number(value))} />
        <YAxis type="category" dataKey="name" width={105} />
        <Tooltip formatter={(value) => currency(Number(value))} />
        <Bar dataKey="value" fill={positive ? "#11845B" : "#C2413D"} radius={[0, 4, 4, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}

function trim(value: string) {
  return value.length > 16 ? `${value.slice(0, 15)}…` : value;
}
