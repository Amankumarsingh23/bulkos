"use client";

import { useState } from "react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
} from "recharts";
import type { MacroStackDatum } from "@/hooks/useAnalyticsData";

interface Props {
  data: MacroStackDatum[];
}

function CustomTooltip({ active, payload, label, isPct }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-ivory border border-sand rounded-xl px-3 py-2 shadow-warm text-xs">
      <p className="text-warm-gray mb-1">{label}</p>
      {payload.map((p: any) => (
        <p key={p.dataKey} style={{ color: p.color }} className="font-medium">
          {p.name}: {p.value != null ? (isPct ? `${p.value}%` : `${p.value}g`) : "—"}
        </p>
      ))}
    </div>
  );
}

export function MacroStackedAreaChart({ data }: Props) {
  const [isPct, setIsPct] = useState(false);

  if (!data.length) {
    return (
      <div className="h-64 flex items-center justify-center text-sm text-warm-gray">
        Not enough data yet
      </div>
    );
  }

  const formatted = data.map((d) => ({
    date: new Date(d.date).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
    protein: isPct ? d.proteinPct : d.protein,
    carbs: isPct ? d.carbsPct : d.carbs,
    fats: isPct ? d.fatsPct : d.fats,
  }));

  const toggle = (
    <div className="flex gap-1 text-xs">
      <button
        onClick={() => setIsPct(false)}
        className={`px-2.5 py-1 rounded-full transition-colors ${!isPct ? "bg-gold text-white" : "text-warm-gray hover:text-espresso"}`}
      >
        Grams
      </button>
      <button
        onClick={() => setIsPct(true)}
        className={`px-2.5 py-1 rounded-full transition-colors ${isPct ? "bg-gold text-white" : "text-warm-gray hover:text-espresso"}`}
      >
        %
      </button>
    </div>
  );

  return (
    <div>
      <div className="flex justify-end mb-3">{toggle}</div>
      <ResponsiveContainer width="100%" height={230}>
        <AreaChart data={formatted} margin={{ top: 4, right: 4, left: -16, bottom: 0 }}>
          <defs>
            <linearGradient id="proteinGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#C9A96E" stopOpacity={0.5} />
              <stop offset="95%" stopColor="#C9A96E" stopOpacity={0.1} />
            </linearGradient>
            <linearGradient id="carbsGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#8FAF8F" stopOpacity={0.5} />
              <stop offset="95%" stopColor="#8FAF8F" stopOpacity={0.1} />
            </linearGradient>
            <linearGradient id="fatsGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#C4826A" stopOpacity={0.4} />
              <stop offset="95%" stopColor="#C4826A" stopOpacity={0.05} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#E8DDD0" strokeOpacity={0.6} />
          <XAxis
            dataKey="date"
            tick={{ fontSize: 11, fill: "#9B8E87" }}
            tickLine={false}
            axisLine={false}
            interval="preserveStartEnd"
          />
          <YAxis
            tick={{ fontSize: 11, fill: "#9B8E87" }}
            tickLine={false}
            axisLine={false}
            tickFormatter={(v) => (isPct ? `${v}%` : `${v}g`)}
          />
          <Tooltip content={<CustomTooltip isPct={isPct} />} />
          <Area
            type="monotone"
            dataKey="protein"
            stackId="1"
            stroke="#C9A96E"
            strokeWidth={1.5}
            fill="url(#proteinGrad)"
            name="Protein"
            connectNulls
          />
          <Area
            type="monotone"
            dataKey="carbs"
            stackId="1"
            stroke="#8FAF8F"
            strokeWidth={1.5}
            fill="url(#carbsGrad)"
            name="Carbs"
            connectNulls
          />
          <Area
            type="monotone"
            dataKey="fats"
            stackId="1"
            stroke="#C4826A"
            strokeWidth={1.5}
            fill="url(#fatsGrad)"
            name="Fats"
            connectNulls
          />
          <Legend wrapperStyle={{ fontSize: 11, paddingTop: 8 }} iconType="square" />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
