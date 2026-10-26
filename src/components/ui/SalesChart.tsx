"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { formatBDT } from "@/lib/format";
import type { MonthPoint } from "@/lib/api-types";

interface SalesChartProps {
  data: MonthPoint[];
  series: { key: "gross" | "commission" | "net"; label: string; color: string }[];
}

export default function SalesChart({ data, series }: SalesChartProps) {
  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="currentColor" opacity={0.08} />
          <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fill: "#9CA3AF", fontSize: 12 }} />
          <YAxis
            axisLine={false}
            tickLine={false}
            width={56}
            tick={{ fill: "#9CA3AF", fontSize: 11 }}
            tickFormatter={(v: number) => (v >= 1000 ? `৳${Math.round(v / 1000)}k` : `৳${v}`)}
          />
          <Tooltip
            cursor={{ fill: "rgba(127,127,127,0.08)" }}
            contentStyle={{
              backgroundColor: "#18181b",
              border: "1px solid #27272a",
              borderRadius: 8,
              color: "#fafafa",
              fontSize: 12,
            }}
            formatter={(value) => formatBDT(Number(value))}
          />
          <Legend wrapperStyle={{ fontSize: 12 }} />
          {series.map((s) => (
            <Bar key={s.key} dataKey={s.key} name={s.label} fill={s.color} radius={[4, 4, 0, 0]} />
          ))}
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
