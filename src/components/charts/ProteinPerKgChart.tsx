"use client";

import {
  ResponsiveContainer,
  ComposedChart,
  Line,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ReferenceArea,
  CartesianGrid,
} from "recharts";
import type { ProteinPerKgPoint } from "@/lib/analytics";

interface Props {
  data: ProteinPerKgPoint[];
}

function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  const val = payload.find((p: any) => p.dataKey === "proteinPerKg")?.value;
  const inRange = val != null && val >= 1.6 && val <= 2.2;
  return (
    <div className="bg-ivory border border-sand rounded-xl px-3 py-2 shadow-warm text-xs">
      <p className="text-warm-gray mb-1">{label}</p>
      {val != null && (
        <p className={inRange ? "text-sage font-medium" : "text-terracotta font-medium"}>
          {val} g/kg {inRange ? "✓" : "↓"}
        </p>
      )}
    </div>
  );
}

export function ProteinPerKgChart({ data }: Props) {
  if (!data.length) {
    return (
      <div className="h-64 flex items-center justify-center text-sm text-warm-gray">
        Not enough data yet
      </div>
    );
  }

  const formatted = data.map((d) => ({
    ...d,
    date: new Date(d.date).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
  }));

  return (
    <ResponsiveContainer width="100%" height={260}>
      <ComposedChart data={formatted} margin={{ top: 4, right: 4, left: -16, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#E8DDD0" strokeOpacity={0.6} />
        <XAxis
          dataKey="date"
          tick={{ fontSize: 11, fill: "#9B8E87" }}
          tickLine={false}
          axisLine={false}
          interval="preserveStartEnd"
        />
        <YAxis
          domain={[0, 3]}
          tick={{ fontSize: 11, fill: "#9B8E87" }}
          tickLine={false}
          axisLine={false}
          tickFormatter={(v) => `${v}`}
        />
        <Tooltip content={<CustomTooltip />} />
        {/* Target band 1.6–2.2 g/kg */}
        <ReferenceArea
          y1={1.6}
          y2={2.2}
          fill="#8FAF8F"
          fillOpacity={0.12}
          strokeOpacity={0}
        />
        <Line
          type="monotone"
          dataKey="proteinPerKg"
          stroke="#C9A96E"
          strokeWidth={2}
          dot={{ r: 2, fill: "#C9A96E", strokeWidth: 0 }}
          activeDot={{ r: 5 }}
          connectNulls
          name="g/kg"
        />
      </ComposedChart>
    </ResponsiveContainer>
  );
}
