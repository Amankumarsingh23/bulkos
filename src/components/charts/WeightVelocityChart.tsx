"use client";

import {
  ResponsiveContainer,
  ComposedChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ReferenceArea,
  ReferenceLine,
  CartesianGrid,
  Cell,
} from "recharts";
import type { WeightVelocityPoint } from "@/lib/analytics";

interface Props {
  data: WeightVelocityPoint[];
}

function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  const v = payload[0]?.value;
  const inRange = v != null && v >= 0.25 && v <= 0.5;
  return (
    <div className="bg-ivory border border-sand rounded-xl px-3 py-2 shadow-warm text-xs">
      <p className="text-warm-gray mb-1">Week of {label}</p>
      {v != null && (
        <p className={inRange ? "text-sage font-medium" : v < 0.25 ? "text-warm-gray font-medium" : "text-terracotta font-medium"}>
          {v >= 0 ? "+" : ""}{v.toFixed(2)} kg
          {inRange ? " ✓ optimal" : v > 0.5 ? " — too fast" : v < 0 ? " — cutting?" : " — slow"}
        </p>
      )}
    </div>
  );
}

function barColor(v: number | null): string {
  if (v === null) return "#E8DDD0";
  if (v >= 0.25 && v <= 0.5) return "#8FAF8F";
  if (v > 0.5) return "#C4826A";
  if (v < 0) return "#9B8E87";
  return "#C9A96E";
}

export function WeightVelocityChart({ data }: Props) {
  if (!data.length) {
    return (
      <div className="h-64 flex items-center justify-center text-sm text-warm-gray">
        Not enough data yet
      </div>
    );
  }

  return (
    <div>
      <div className="flex gap-4 text-xs text-warm-gray mb-3">
        <span className="flex items-center gap-1">
          <span className="inline-block h-2 w-2 rounded-sm bg-sage" /> Optimal
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block h-2 w-2 rounded-sm bg-terracotta" /> Too fast
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block h-2 w-2 rounded-sm bg-gold" /> Too slow
        </span>
      </div>
      <ResponsiveContainer width="100%" height={230}>
        <ComposedChart data={data} margin={{ top: 4, right: 4, left: -16, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#E8DDD0" strokeOpacity={0.6} />
          <XAxis
            dataKey="week"
            tick={{ fontSize: 11, fill: "#9B8E87" }}
            tickLine={false}
            axisLine={false}
          />
          <YAxis
            tick={{ fontSize: 11, fill: "#9B8E87" }}
            tickLine={false}
            axisLine={false}
            tickFormatter={(v) => `${v > 0 ? "+" : ""}${v}`}
          />
          <Tooltip content={<CustomTooltip />} />
          <ReferenceLine y={0} stroke="#9B8E87" strokeOpacity={0.4} />
          <ReferenceArea y1={0.25} y2={0.5} fill="#8FAF8F" fillOpacity={0.12} strokeOpacity={0} />
          <Bar dataKey="velocityKg" maxBarSize={36} radius={[4, 4, 0, 0]} name="kg/week">
            {data.map((entry, i) => (
              <Cell key={i} fill={barColor(entry.velocityKg)} fillOpacity={0.9} />
            ))}
          </Bar>
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
