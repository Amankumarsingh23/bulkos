"use client";

import {
  ResponsiveContainer,
  ComposedChart,
  Scatter,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ReferenceLine,
  CartesianGrid,
} from "recharts";
import { linearRegression } from "@/lib/analytics";
import type { CorrelationPoint } from "@/lib/analytics";

interface Props {
  data: CorrelationPoint[];
}

function CustomTooltip({ active, payload }: any) {
  if (!active || !payload?.length) return null;
  const d = payload[0]?.payload as CorrelationPoint;
  return (
    <div className="bg-ivory border border-sand rounded-xl px-3 py-2 shadow-warm text-xs">
      <p className="text-warm-gray mb-1">Week of {d.week}</p>
      <p className="text-espresso">
        Surplus: {d.weeklyCalSurplus != null ? `${d.weeklyCalSurplus > 0 ? "+" : ""}${d.weeklyCalSurplus.toLocaleString()} kcal` : "—"}
      </p>
      <p className="text-espresso">
        Weight: {d.weightChange != null ? `${d.weightChange >= 0 ? "+" : ""}${d.weightChange} kg` : "—"}
      </p>
    </div>
  );
}

export function CorrelationScatter({ data }: Props) {
  if (data.length < 3) {
    return (
      <div className="h-64 flex items-center justify-center text-sm text-warm-gray">
        Need at least 3 weeks of data
      </div>
    );
  }

  const points = data
    .filter((d) => d.weeklyCalSurplus !== null && d.weightChange !== null)
    .map((d) => ({ x: d.weeklyCalSurplus!, y: d.weightChange!, week: d.week }));

  const reg = linearRegression(points);

  const xs = points.map((p) => p.x);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const trendData: { tx: number; ty: number }[] = reg
    ? [
        { tx: minX, ty: reg.slope * minX + reg.intercept },
        { tx: maxX, ty: reg.slope * maxX + reg.intercept },
      ]
    : [];

  return (
    <ResponsiveContainer width="100%" height={260}>
      <ComposedChart margin={{ top: 4, right: 4, left: -16, bottom: 16 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#E8DDD0" strokeOpacity={0.6} />
        <XAxis
          dataKey="x"
          type="number"
          name="Weekly surplus"
          tick={{ fontSize: 11, fill: "#9B8E87" }}
          tickLine={false}
          axisLine={false}
          tickFormatter={(v) => `${v > 0 ? "+" : ""}${(v / 1000).toFixed(0)}k`}
          label={{ value: "Weekly cal surplus (kcal)", position: "insideBottom", offset: -8, fontSize: 10, fill: "#9B8E87" }}
        />
        <YAxis
          dataKey="y"
          type="number"
          name="Weight change"
          tick={{ fontSize: 11, fill: "#9B8E87" }}
          tickLine={false}
          axisLine={false}
          tickFormatter={(v) => `${v >= 0 ? "+" : ""}${v}`}
        />
        <Tooltip content={<CustomTooltip />} />
        <ReferenceLine x={0} stroke="#9B8E87" strokeOpacity={0.3} />
        <ReferenceLine y={0} stroke="#9B8E87" strokeOpacity={0.3} />
        <Scatter data={points} fill="#C9A96E" fillOpacity={0.8} name="Week" />
        {reg && (
          <Line
            data={trendData}
            dataKey="ty"
            stroke="#8FAF8F"
            strokeWidth={2}
            strokeDasharray="4 2"
            dot={false}
            legendType="none"
            type="linear"
          />
        )}
      </ComposedChart>
    </ResponsiveContainer>
  );
}
