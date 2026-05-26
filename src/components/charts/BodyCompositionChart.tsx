"use client";

import { useState } from "react";
import {
  ResponsiveContainer,
  ComposedChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";
import { Info } from "lucide-react";
import { getFFMIBands, type BodyCompPoint } from "@/lib/analytics";

interface Props {
  data: BodyCompPoint[];
  gender: string | null;
}

function StatCard({
  label,
  value,
  unit,
  sub,
  color,
  tooltip,
}: {
  label: string;
  value: string | null;
  unit: string;
  sub?: string;
  color: string;
  tooltip: string;
}) {
  const [show, setShow] = useState(false);
  return (
    <div className="relative bg-cream rounded-2xl border border-sand/60 px-4 py-3 flex flex-col gap-0.5">
      <div className="flex items-center gap-1.5 mb-1">
        <span className="text-xs text-warm-gray font-medium">{label}</span>
        <button
          onMouseEnter={() => setShow(true)}
          onMouseLeave={() => setShow(false)}
          onFocus={() => setShow(true)}
          onBlur={() => setShow(false)}
          className="text-warm-gray/50 hover:text-warm-gray transition-colors"
          aria-label="info"
        >
          <Info className="h-3 w-3" />
        </button>
        {show && (
          <div className="absolute top-full left-0 mt-1 z-10 w-56 bg-espresso text-ivory text-xs rounded-xl px-3 py-2 shadow-lg leading-relaxed">
            {tooltip}
          </div>
        )}
      </div>
      {value !== null ? (
        <div className="flex items-baseline gap-1">
          <span className="font-display text-2xl font-semibold" style={{ color }}>
            {value}
          </span>
          <span className="text-xs text-warm-gray">{unit}</span>
        </div>
      ) : (
        <span className="text-sm text-warm-gray/60 italic">—</span>
      )}
      {sub && <span className="text-xs text-warm-gray/70">{sub}</span>}
    </div>
  );
}

function FFMIGauge({ ffmi, gender }: { ffmi: number | null; gender: string | null }) {
  const bands = getFFMIBands(gender);
  const totalSpan = bands[bands.length - 1].max - bands[0].min;
  const globalMin = bands[0].min;

  const currentBand = ffmi !== null
    ? bands.find((b) => ffmi >= b.min && ffmi < b.max) ?? bands[bands.length - 1]
    : null;

  const pct = ffmi !== null
    ? Math.min(100, Math.max(0, ((ffmi - globalMin) / totalSpan) * 100))
    : null;

  return (
    <div className="mt-4">
      <div className="flex justify-between items-center mb-2">
        <span className="text-xs font-medium text-warm-gray">FFMI Scale</span>
        {currentBand && (
          <span className="text-xs font-semibold px-2 py-0.5 rounded-full" style={{ background: currentBand.color + "22", color: currentBand.color }}>
            {currentBand.label} — {currentBand.description}
          </span>
        )}
      </div>

      {/* Segmented bar */}
      <div className="h-4 rounded-full overflow-hidden flex">
        {bands.map((b) => {
          const widthPct = ((b.max - b.min) / totalSpan) * 100;
          return (
            <div
              key={b.label}
              className="h-full relative"
              style={{ width: `${widthPct}%`, backgroundColor: b.color, opacity: 0.25 }}
            />
          );
        })}
      </div>

      {/* Filled progress overlay */}
      <div className="relative -mt-4 h-4 rounded-full overflow-hidden pointer-events-none">
        {pct !== null && (
          <div
            className="h-full rounded-full transition-all duration-700"
            style={{
              width: `${pct}%`,
              background: `linear-gradient(90deg, #C9A96E 0%, ${currentBand?.color ?? "#C9A96E"} 100%)`,
              opacity: 0.75,
            }}
          />
        )}
      </div>

      {/* Band labels */}
      <div className="flex mt-1.5">
        {bands.map((b) => {
          const widthPct = ((b.max - b.min) / totalSpan) * 100;
          return (
            <div key={b.label} className="text-center" style={{ width: `${widthPct}%` }}>
              <span className="text-[10px] text-warm-gray/60 truncate block">{b.label}</span>
            </div>
          );
        })}
      </div>

      {/* Needle marker */}
      {pct !== null && (
        <div className="relative h-0 -mt-7">
          <div
            className="absolute -translate-x-1/2 w-0.5 h-4 rounded-full bg-espresso transition-all duration-700"
            style={{ left: `${pct}%` }}
          />
        </div>
      )}
    </div>
  );
}

function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  const bf = payload.find((p: any) => p.dataKey === "bodyFatPct");
  const lean = payload.find((p: any) => p.dataKey === "leanMassKg");
  const ffmiV = payload.find((p: any) => p.dataKey === "ffmi");
  return (
    <div className="bg-ivory border border-sand rounded-xl px-3 py-2 shadow-warm text-xs space-y-0.5">
      <p className="text-warm-gray mb-1">{label}</p>
      {lean && lean.value != null && <p className="text-espresso font-medium">Lean mass: {lean.value} kg</p>}
      {bf && bf.value != null && <p style={{ color: "#C4826A" }}>Body fat: {bf.value}%</p>}
      {ffmiV && ffmiV.value != null && <p style={{ color: "#C9A96E" }}>FFMI: {ffmiV.value}</p>}
    </div>
  );
}

export function BodyCompositionChart({ data, gender }: Props) {
  const withData = data.filter((d) => d.leanMassKg !== null);
  const latest = withData[withData.length - 1] ?? null;

  const formatted = data.map((d) => ({
    ...d,
    date: new Date(d.date + "T00:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" }),
  }));

  const currentBand = latest?.ffmi !== null && latest?.ffmi !== undefined
    ? getFFMIBands(gender).find((b) => latest.ffmi! >= b.min && latest.ffmi! < b.max) ?? getFFMIBands(gender)[getFFMIBands(gender).length - 1]
    : null;

  if (!withData.length) {
    return (
      <div className="h-64 flex items-center justify-center text-sm text-warm-gray">
        Log weight with your height and age set in Settings to see body composition.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Stat cards */}
      <div className="grid grid-cols-3 gap-3">
        <StatCard
          label="Body Fat"
          value={latest?.bodyFatPct?.toString() ?? null}
          unit="%"
          sub="Estimated"
          color="#C4826A"
          tooltip="Estimated using the Deurenberg formula from your BMI and age. This is an approximation — use it to track trends, not as an absolute number."
        />
        <StatCard
          label="Lean Mass"
          value={latest?.leanMassKg?.toString() ?? null}
          unit="kg"
          sub="Muscle + bone"
          color="#5B8A5B"
          tooltip="Your total bodyweight minus estimated fat mass. Growing this number during a bulk means your gains are mostly muscle — great sign!"
        />
        <StatCard
          label="FFMI"
          value={latest?.ffmi?.toString() ?? null}
          unit=""
          sub={currentBand?.label ?? "—"}
          color="#C9A96E"
          tooltip="Fat-Free Mass Index — measures how muscular you are relative to your height. Think of it as a body-builder's BMI. A score above 20 means you're building real size."
        />
      </div>

      {/* FFMI gauge */}
      {latest?.ffmi != null && <FFMIGauge ffmi={latest.ffmi} gender={gender} />}

      {/* Dual-line trend chart */}
      <div className="mt-2">
        <div className="flex gap-4 text-xs text-warm-gray mb-2 flex-wrap">
          <span className="flex items-center gap-1.5">
            <span className="inline-block h-2 w-4 rounded-full bg-[#5B8A5B]" />
            Lean mass (kg) — left axis
          </span>
          <span className="flex items-center gap-1.5">
            <span className="inline-block h-2 w-4 rounded-full bg-[#C4826A]" />
            Body fat (%) — right axis
          </span>
        </div>
        <ResponsiveContainer width="100%" height={220}>
          <ComposedChart data={formatted} margin={{ top: 4, right: 24, left: -16, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#E8DDD0" strokeOpacity={0.6} />
            <XAxis
              dataKey="date"
              tick={{ fontSize: 11, fill: "#9B8E87" }}
              tickLine={false}
              axisLine={false}
              interval="preserveStartEnd"
            />
            {/* Left Y: lean mass */}
            <YAxis
              yAxisId="lean"
              orientation="left"
              tick={{ fontSize: 11, fill: "#9B8E87" }}
              tickLine={false}
              axisLine={false}
              tickFormatter={(v) => `${v}kg`}
            />
            {/* Right Y: body fat % */}
            <YAxis
              yAxisId="bf"
              orientation="right"
              tick={{ fontSize: 11, fill: "#9B8E87" }}
              tickLine={false}
              axisLine={false}
              tickFormatter={(v) => `${v}%`}
            />
            <Tooltip content={(props: any) => <CustomTooltip {...props} />} />
            <Line
              yAxisId="lean"
              type="monotone"
              dataKey="leanMassKg"
              stroke="#5B8A5B"
              strokeWidth={2.5}
              dot={false}
              activeDot={{ r: 4, fill: "#5B8A5B" }}
              connectNulls
            />
            <Line
              yAxisId="bf"
              type="monotone"
              dataKey="bodyFatPct"
              stroke="#C4826A"
              strokeWidth={2}
              strokeDasharray="5 3"
              dot={false}
              activeDot={{ r: 4, fill: "#C4826A" }}
              connectNulls
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      <p className="text-[11px] text-warm-gray/60 leading-relaxed">
        Body fat % is estimated from weight, height, and age using the Deurenberg formula. For precise measurements, use body calipers or a DEXA scan.
      </p>
    </div>
  );
}
