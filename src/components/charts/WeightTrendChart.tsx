"use client";

import {
  ResponsiveContainer,
  ComposedChart,
  Line,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ReferenceLine,
  CartesianGrid,
  Legend,
} from "recharts";
import type { WeightChartDatum } from "@/hooks/useAnalyticsData";

interface Props {
  data: WeightChartDatum[];
  goalWeight: number | null;
}

function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  const weight = payload.find((p: any) => p.dataKey === "weight")?.value;
  const sma = payload.find((p: any) => p.dataKey === "sma")?.value;
  return (
    <div className="bg-ivory border border-sand rounded-xl px-3 py-2 shadow-warm text-xs">
      <p className="text-warm-gray mb-1">{label}</p>
      {weight != null && <p className="text-espresso font-medium">{weight.toFixed(1)} kg</p>}
      {sma != null && <p className="text-sage">7d avg: {sma.toFixed(1)} kg</p>}
    </div>
  );
}

export function WeightTrendChart({ data, goalWeight }: Props) {
  if (!data.length) {
    return (
      <div className="h-64 flex items-center justify-center text-sm text-warm-gray">
        Not enough data yet
      </div>
    );
  }

  const weights = data.map((d) => d.weight).filter((w): w is number => w !== null);
  const min = Math.floor(Math.min(...weights) - 1);
  const max = Math.ceil(Math.max(...weights) + 1);

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
          domain={[min, max]}
          tick={{ fontSize: 11, fill: "#9B8E87" }}
          tickLine={false}
          axisLine={false}
          tickFormatter={(v) => `${v}`}
        />
        <Tooltip content={<CustomTooltip />} />
        <Area
          type="monotone"
          dataKey="weight"
          stroke="transparent"
          fill="#8FAF8F"
          fillOpacity={0.08}
          dot={false}
          connectNulls
        />
        <Line
          type="monotone"
          dataKey="weight"
          stroke="#C9A96E"
          strokeWidth={2}
          dot={{ r: 2.5, fill: "#C9A96E", strokeWidth: 0 }}
          activeDot={{ r: 5, fill: "#C9A96E" }}
          connectNulls
          name="Weight"
        />
        <Line
          type="monotone"
          dataKey="sma"
          stroke="#8FAF8F"
          strokeWidth={2}
          strokeDasharray="4 2"
          dot={false}
          connectNulls
          name="7d avg"
        />
        {goalWeight && (
          <ReferenceLine
            y={goalWeight}
            stroke="#C9A96E"
            strokeDasharray="6 3"
            strokeOpacity={0.5}
            label={{
              value: `Goal ${goalWeight}kg`,
              position: "right",
              fontSize: 10,
              fill: "#C9A96E",
            }}
          />
        )}
        <Legend
          wrapperStyle={{ fontSize: 11, paddingTop: 8 }}
          iconType="plainline"
        />
      </ComposedChart>
    </ResponsiveContainer>
  );
}
