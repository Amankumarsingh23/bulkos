"use client";

import {
  ResponsiveContainer,
  ComposedChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ReferenceArea,
  CartesianGrid,
} from "recharts";
import type { BMIPoint } from "@/lib/analytics";

interface Props {
  data: BMIPoint[];
}

function bmiCategory(bmi: number): { label: string; color: string } {
  if (bmi < 18.5) return { label: "Underweight", color: "#9B8E87" };
  if (bmi < 25) return { label: "Normal", color: "#8FAF8F" };
  if (bmi < 30) return { label: "Overweight", color: "#C9A96E" };
  return { label: "Obese", color: "#C4826A" };
}

function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  const val = payload[0]?.value;
  const cat = val != null ? bmiCategory(val) : null;
  return (
    <div className="bg-ivory border border-sand rounded-xl px-3 py-2 shadow-warm text-xs">
      <p className="text-warm-gray mb-1">{label}</p>
      {val != null && (
        <>
          <p className="text-espresso font-medium">BMI {val}</p>
          {cat && <p style={{ color: cat.color }}>{cat.label}</p>}
        </>
      )}
    </div>
  );
}

export function BMIProgressChart({ data }: Props) {
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
    <div>
      <div className="flex gap-4 text-xs text-warm-gray mb-3 flex-wrap">
        <span><span className="font-medium text-warm-gray/60">&lt;18.5</span> Underweight</span>
        <span><span className="font-medium text-sage">18.5–24.9</span> Normal</span>
        <span><span className="font-medium text-gold">25–29.9</span> Overweight</span>
        <span><span className="font-medium text-terracotta">&gt;30</span> Obese</span>
      </div>
      <ResponsiveContainer width="100%" height={220}>
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
            domain={[15, 35]}
            tick={{ fontSize: 11, fill: "#9B8E87" }}
            tickLine={false}
            axisLine={false}
          />
          <Tooltip content={<CustomTooltip />} />
          {/* BMI bands */}
          <ReferenceArea y1={15} y2={18.5} fill="#9B8E87" fillOpacity={0.06} strokeOpacity={0} />
          <ReferenceArea y1={18.5} y2={25} fill="#8FAF8F" fillOpacity={0.1} strokeOpacity={0} />
          <ReferenceArea y1={25} y2={30} fill="#C9A96E" fillOpacity={0.08} strokeOpacity={0} />
          <ReferenceArea y1={30} y2={35} fill="#C4826A" fillOpacity={0.08} strokeOpacity={0} />
          <Line
            type="monotone"
            dataKey="bmi"
            stroke="#2C2420"
            strokeWidth={2.5}
            dot={{ r: 2.5, fill: "#2C2420", strokeWidth: 0 }}
            activeDot={{ r: 5, fill: "#C9A96E" }}
            connectNulls
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
