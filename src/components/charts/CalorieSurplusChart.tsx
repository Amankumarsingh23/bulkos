"use client";

import {
  ResponsiveContainer,
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ReferenceLine,
  CartesianGrid,
  Cell,
} from "recharts";
import type { WeeklySurplusPoint } from "@/lib/analytics";

interface Props {
  data: WeeklySurplusPoint[];
  recommendedSurplus?: number;
}

function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  const surplus = payload.find((p: any) => p.dataKey === "surplus")?.value;
  const cumulative = payload.find((p: any) => p.dataKey === "cumulative")?.value;
  return (
    <div className="bg-ivory border border-sand rounded-xl px-3 py-2 shadow-warm text-xs">
      <p className="text-warm-gray mb-1">Week of {label}</p>
      {surplus != null && (
        <p className={surplus >= 0 ? "text-sage font-medium" : "text-terracotta font-medium"}>
          {surplus > 0 ? "+" : ""}{surplus} kcal/day avg
        </p>
      )}
      {cumulative != null && (
        <p className="text-warm-gray mt-0.5">Cumulative: {cumulative > 0 ? "+" : ""}{cumulative.toLocaleString()} kcal</p>
      )}
    </div>
  );
}

export function CalorieSurplusChart({ data, recommendedSurplus = 300 }: Props) {
  if (!data.length) {
    return (
      <div className="h-64 flex items-center justify-center text-sm text-warm-gray">
        Not enough data yet
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={260}>
      <ComposedChart data={data} margin={{ top: 4, right: 4, left: -16, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#E8DDD0" strokeOpacity={0.6} />
        <XAxis
          dataKey="week"
          tick={{ fontSize: 11, fill: "#9B8E87" }}
          tickLine={false}
          axisLine={false}
        />
        <YAxis
          yAxisId="left"
          tick={{ fontSize: 11, fill: "#9B8E87" }}
          tickLine={false}
          axisLine={false}
        />
        <YAxis
          yAxisId="right"
          orientation="right"
          tick={{ fontSize: 10, fill: "#C9A96E" }}
          tickLine={false}
          axisLine={false}
          tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`}
        />
        <Tooltip content={<CustomTooltip />} />
        <ReferenceLine
          yAxisId="left"
          y={0}
          stroke="#9B8E87"
          strokeOpacity={0.4}
        />
        <ReferenceLine
          yAxisId="left"
          y={recommendedSurplus}
          stroke="#C9A96E"
          strokeDasharray="5 3"
          strokeOpacity={0.6}
          label={{ value: `+${recommendedSurplus} target`, position: "right", fontSize: 10, fill: "#C9A96E" }}
        />
        <Bar yAxisId="left" dataKey="surplus" maxBarSize={40} radius={[4, 4, 0, 0]}>
          {data.map((entry, i) => (
            <Cell
              key={i}
              fill={(entry.surplus ?? 0) >= 0 ? "#8FAF8F" : "#C4826A"}
              fillOpacity={0.85}
            />
          ))}
        </Bar>
        <Line
          yAxisId="right"
          type="monotone"
          dataKey="cumulative"
          stroke="#C9A96E"
          strokeWidth={2}
          dot={false}
        />
      </ComposedChart>
    </ResponsiveContainer>
  );
}
