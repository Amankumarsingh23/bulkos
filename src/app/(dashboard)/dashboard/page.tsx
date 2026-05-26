"use client";

import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  Flame, Beef, Wheat, Droplets, Target,
  ArrowRight, TrendingUp, CalendarCheck, Zap, BookOpen,
} from "lucide-react";
import {
  LineChart, Line, XAxis, YAxis, Tooltip as RechartTooltip,
  ResponsiveContainer, ReferenceLine,
  PieChart, Pie, Cell, Label,
} from "recharts";
import type { TooltipProps } from "recharts";
import { Button } from "@/components/ui/Button";
import { Card, CardContent } from "@/components/ui/Card";
import { SkeletonCard } from "@/components/ui/Skeleton";
import { Badge } from "@/components/ui/Badge";
import { ProgressRing } from "@/components/ui/ProgressRing";
import { useDashboardData, type WeekDay, type WeightChartPoint } from "@/hooks/useDashboardData";
import { cn } from "@/lib/utils";

// ─── Sparkline ────────────────────────────────────────────────────────────────

function Sparkline({ data }: { data: number[] }) {
  if (data.length < 2) return null;
  const W = 68, H = 28;
  const min = Math.min(...data), max = Math.max(...data);
  const rng = max - min || 1;
  const pts = data.map((v, i) =>
    `${(i / (data.length - 1)) * W},${H - ((v - min) / rng) * (H - 4) + 2}`
  );
  return (
    <svg width={W} height={H} className="overflow-visible flex-shrink-0" aria-hidden="true">
      <polyline
        points={pts.join(" ")}
        fill="none" stroke="#C9A96E" strokeWidth="1.5"
        strokeLinejoin="round" strokeLinecap="round"
      />
      {pts.map((pt, i) => {
        const [x, y] = pt.split(",").map(Number);
        return (
          <circle key={i} cx={x} cy={y} r={i === data.length - 1 ? 3 : 2}
            fill={i === data.length - 1 ? "#C9A96E" : "#FAF3E6"}
            stroke="#C9A96E" strokeWidth="1.5"
          />
        );
      })}
    </svg>
  );
}

// ─── Summary cards ────────────────────────────────────────────────────────────

function WeightCard({ weight, weightChange, last7Weights }: {
  weight: number | null; weightChange: number | null; last7Weights: number[];
}) {
  return (
    <Card hover animate>
      <CardContent>
        <div className="flex items-center gap-1.5 mb-3">
          <TrendingUp className="h-3.5 w-3.5 text-warm-gray" />
          <p className="text-[11px] font-semibold text-warm-gray uppercase tracking-widest">Weight</p>
        </div>
        <div className="flex items-end justify-between">
          <div>
            <span className="font-display text-4xl font-bold text-espresso leading-none">
              {weight != null ? weight.toFixed(1) : "--"}
            </span>
            <span className="text-base text-warm-gray ml-1.5">kg</span>
          </div>
          <Sparkline data={last7Weights} />
        </div>
        {weightChange != null ? (
          <div className="mt-2.5">
            <Badge variant={weightChange >= 0 ? "sage" : "terracotta"} dot>
              {weightChange > 0 ? "+" : ""}{weightChange} kg since start
            </Badge>
          </div>
        ) : (
          <p className="text-xs text-warm-gray/60 mt-2.5">No prior data yet</p>
        )}
      </CardContent>
    </Card>
  );
}

function CaloriesCard({ calories, target }: { calories: number | null; target: number | undefined }) {
  const val = calories ?? 0;
  const pct = target && target > 0 ? Math.round((val / target) * 100) : 0;
  return (
    <Card hover animate>
      <CardContent>
        <div className="flex items-center gap-1.5 mb-3">
          <Flame className="h-3.5 w-3.5 text-terracotta" />
          <p className="text-[11px] font-semibold text-warm-gray uppercase tracking-widest">Calories</p>
        </div>
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <span className="font-display text-4xl font-bold text-espresso leading-none">
              {val.toLocaleString()}
            </span>
            {target && (
              <p className="text-xs text-warm-gray mt-1.5">
                / {target.toLocaleString()} kcal target
              </p>
            )}
          </div>
          {target ? (
            <ProgressRing value={pct} size={60} strokeWidth={5} animateOnMount />
          ) : (
            <div className="h-14 w-14 rounded-full border-2 border-sand flex items-center justify-center">
              <span className="text-xs text-warm-gray">--</span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function ProteinCard({ protein, target, weight }: {
  protein: number | null; target: number | undefined; weight: number | null;
}) {
  const val = protein ?? 0;
  const pct = target && target > 0 ? Math.round((val / target) * 100) : 0;
  const gPerKg = weight && weight > 0 ? (val / weight).toFixed(1) : null;
  return (
    <Card hover animate>
      <CardContent>
        <div className="flex items-center gap-1.5 mb-3">
          <Beef className="h-3.5 w-3.5 text-gold-dark" />
          <p className="text-[11px] font-semibold text-warm-gray uppercase tracking-widest">Protein</p>
        </div>
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-end gap-1 leading-none">
              <span className="font-display text-4xl font-bold text-espresso">{val}</span>
              <span className="text-base text-warm-gray mb-0.5">g</span>
            </div>
            <p className="text-xs text-warm-gray mt-1.5">
              {target ? `/ ${target}g target` : "Log to see progress"}
              {gPerKg && <span className="ml-1.5 text-gold-dark">{gPerKg} g/kg</span>}
            </p>
          </div>
          {target ? (
            <ProgressRing value={pct} size={60} strokeWidth={5} color="#C9A96E" animateOnMount />
          ) : (
            <div className="h-14 w-14 rounded-full border-2 border-sand flex items-center justify-center">
              <span className="text-xs text-warm-gray">--</span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function StreakCard({ streak }: { streak: number }) {
  return (
    <Card hover animate>
      <CardContent>
        <div className="flex items-center gap-1.5 mb-3">
          <CalendarCheck className="h-3.5 w-3.5 text-sage" />
          <p className="text-[11px] font-semibold text-warm-gray uppercase tracking-widest">Streak</p>
        </div>
        <div className="flex items-end gap-2">
          <span className="font-display text-4xl font-bold text-espresso leading-none">{streak}</span>
          {streak >= 7 && <span className="text-2xl mb-0.5">🔥</span>}
        </div>
        <p className="text-xs text-warm-gray mt-1.5">
          {streak === 0
            ? "Start logging to build a streak"
            : streak === 1
            ? "1 day logged — keep it up!"
            : `${streak} days logged in a row`}
        </p>
      </CardContent>
    </Card>
  );
}

// ─── Log Today CTA ────────────────────────────────────────────────────────────

function LogTodayCTA() {
  const router = useRouter();
  return (
    <motion.div
      initial={{ opacity: 0, y: -6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
      className="flex items-center justify-between gap-4 bg-gold/8 border border-gold/25 rounded-2xl px-6 py-5"
    >
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-full bg-gold/20 flex items-center justify-center flex-shrink-0">
          <Zap className="h-5 w-5 text-gold-dark" strokeWidth={2} />
        </div>
        <div>
          <p className="font-display text-base text-espresso font-semibold">Ready to log today?</p>
          <p className="text-sm text-warm-gray mt-0.5">Stay consistent — track your progress</p>
        </div>
      </div>
      <Button variant="primary" size="sm" onClick={() => router.push("/log")} className="flex-shrink-0">
        Log Today <ArrowRight className="h-3.5 w-3.5" />
      </Button>
    </motion.div>
  );
}

// ─── Week view ────────────────────────────────────────────────────────────────

function WeekView({ weekDays, target }: { weekDays: WeekDay[]; target: number | undefined }) {
  const router = useRouter();
  const maxCal = target ?? Math.max(...weekDays.map((d) => d.calories ?? 0), 1);

  return (
    <Card animate={false}>
      <CardContent>
        <p className="text-[11px] font-semibold text-warm-gray uppercase tracking-widest mb-4">
          This Week
        </p>
        <div className="grid grid-cols-7 gap-1">
          {weekDays.map((day) => {
            const barH = day.calories
              ? Math.round((day.calories / maxCal) * 40)
              : 0;
            return (
              <button
                key={day.date}
                onClick={() => !day.isFuture && router.push(`/log?date=${day.date}`)}
                disabled={day.isFuture}
                className={cn(
                  "flex flex-col items-center gap-1.5 py-2 px-1 rounded-xl transition-all duration-150",
                  day.isToday
                    ? "bg-gold/10 ring-1 ring-gold/30"
                    : day.isFuture
                    ? "opacity-35 cursor-default"
                    : "hover:bg-ivory cursor-pointer",
                )}
              >
                <span className="text-[10px] font-medium text-warm-gray">{day.label}</span>

                {/* Log indicator circle */}
                <div className={cn(
                  "h-6 w-6 rounded-full border-2 flex items-center justify-center transition-all",
                  day.hasLog
                    ? "bg-gold border-gold"
                    : day.isToday
                    ? "border-gold/50"
                    : day.isFuture
                    ? "border-sand/40"
                    : "border-sand"
                )}>
                  {day.hasLog && (
                    <svg viewBox="0 0 12 12" className="h-3 w-3" aria-hidden="true">
                      <polyline points="2,6 5,9 10,3" fill="none" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  )}
                </div>

                {/* Calorie bar */}
                <div className="w-full flex flex-col justify-end" style={{ height: 44 }}>
                  {barH > 0 && (
                    <motion.div
                      initial={{ height: 0 }}
                      animate={{ height: barH }}
                      transition={{ duration: 0.5, delay: 0.1, ease: "easeOut" }}
                      className={cn(
                        "w-full rounded-sm",
                        day.caloriePct >= 0.9 && day.caloriePct <= 1.15
                          ? "bg-sage/60"
                          : day.caloriePct > 1.15
                          ? "bg-terracotta/50"
                          : "bg-gold/40"
                      )}
                    />
                  )}
                  {/* Target line */}
                  {target && !day.isFuture && (
                    <div
                      className="w-full border-t border-dashed border-sand/80 -mt-px"
                      style={{ marginTop: -(barH || 0) - 1 }}
                    />
                  )}
                </div>

                {day.calories && (
                  <span className="text-[10px] text-warm-gray leading-none">
                    {day.calories >= 1000
                      ? `${(day.calories / 1000).toFixed(1)}k`
                      : day.calories}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Weight trend chart ───────────────────────────────────────────────────────

function WeightTooltip({ active, payload }: TooltipProps<number, string>) {
  if (!active || !payload?.length) return null;
  const weight  = payload.find((p) => p.dataKey === "weight")?.value;
  const avg     = payload.find((p) => p.dataKey === "movingAvg")?.value;
  const label   = payload[0]?.payload?.displayDate;
  return (
    <div className="bg-ivory border border-sand rounded-lg px-3 py-2 shadow-warm text-xs space-y-0.5">
      <p className="text-warm-gray">{label}</p>
      {weight  != null && <p className="text-espresso font-medium">{weight} kg</p>}
      {avg     != null && <p className="text-gold">{avg} kg <span className="text-warm-gray">(7d avg)</span></p>}
    </div>
  );
}

function WeightTrendChart({
  data, targetWeight,
}: {
  data: WeightChartPoint[]; targetWeight: number | null | undefined;
}) {
  const weights = data.flatMap((d) => [d.weight, d.movingAvg]).filter((v): v is number => v != null);
  if (weights.length === 0) {
    return (
      <div className="h-full flex flex-col items-center justify-center gap-2">
        <TrendingUp className="h-8 w-8 text-sand" strokeWidth={1} />
        <p className="text-sm text-warm-gray text-center">Start logging weight to see your trend</p>
      </div>
    );
  }

  const domainMin = Math.floor(Math.min(...weights)) - 1;
  const domainMax = Math.ceil(Math.max(...weights, targetWeight ?? 0)) + 1;

  // Only show every 5th tick label
  const tickDates = data.filter((_, i) => i % 5 === 0 || i === data.length - 1).map((d) => d.date);

  return (
    <ResponsiveContainer width="100%" height="100%">
      <LineChart data={data} margin={{ top: 8, right: 12, left: -20, bottom: 0 }}>
        <XAxis
          dataKey="date"
          tickLine={false} axisLine={false}
          tick={{ fill: "#8B8178", fontSize: 10 }}
          ticks={tickDates}
          tickFormatter={(v) => data.find((d) => d.date === v)?.displayDate ?? ""}
          interval={0}
        />
        <YAxis
          domain={[domainMin, domainMax]}
          tickLine={false} axisLine={false}
          tick={{ fill: "#8B8178", fontSize: 10 }}
          tickFormatter={(v) => `${v}`}
          width={36}
        />
        <RechartTooltip
          content={<WeightTooltip />}
          cursor={{ stroke: "#E8DCC8", strokeWidth: 1 }}
        />
        {targetWeight && (
          <ReferenceLine
            y={targetWeight}
            stroke="#E8DCC8"
            strokeDasharray="5 3"
            strokeWidth={1.5}
            label={{ value: `Goal ${targetWeight}kg`, position: "right", fill: "#8B8178", fontSize: 9 }}
          />
        )}
        {/* 7-day moving average — thick gold */}
        <Line
          type="monotone" dataKey="movingAvg"
          stroke="#C9A96E" strokeWidth={2.5}
          dot={false} connectNulls strokeOpacity={0.7}
          activeDot={false}
        />
        {/* Actual weight — dots + thinner line */}
        <Line
          type="monotone" dataKey="weight"
          stroke="#C9A96E" strokeWidth={1.5}
          dot={({ cx, cy, payload }) =>
            payload.weight != null
              ? <circle key={`${cx}-${cy}`} cx={cx} cy={cy} r={3} fill="#C9A96E" stroke="#FAF3E6" strokeWidth={1.5} />
              : <g key={`${cx}-${cy}`} />
          }
          activeDot={{ r: 5, fill: "#C9A96E", stroke: "#FAF3E6", strokeWidth: 2 }}
          connectNulls={false}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}

// ─── Macro donut ──────────────────────────────────────────────────────────────

function MacroTooltip({ active, payload }: TooltipProps<number, string>) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-ivory border border-sand rounded-lg px-3 py-2 shadow-warm text-xs">
      <p className="font-medium text-espresso">{payload[0].name}</p>
      <p className="text-warm-gray">{payload[0].value} kcal</p>
    </div>
  );
}

function MacroDonut({ slices, avgCalories }: {
  slices: { name: string; value: number; fill: string }[];
  avgCalories: number;
}) {
  if (slices.length === 0) {
    return (
      <div className="h-full flex flex-col items-center justify-center gap-2">
        <div className="h-20 w-20 rounded-full border-4 border-dashed border-sand flex items-center justify-center">
          <Wheat className="h-8 w-8 text-sand" strokeWidth={1} />
        </div>
        <p className="text-sm text-warm-gray text-center">Log macros to see your split</p>
      </div>
    );
  }
  return (
    <div className="flex flex-col items-center h-full">
      <div className="flex-1 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={slices}
              innerRadius="58%"
              outerRadius="80%"
              dataKey="value"
              paddingAngle={2}
              startAngle={90}
              endAngle={-270}
            >
              {slices.map((s) => (
                <Cell key={s.name} fill={s.fill} stroke="transparent" />
              ))}
              <Label
                content={({ viewBox }) => {
                  const vb = viewBox as { cx: number; cy: number };
                  return (
                    <>
                      <text x={vb.cx} y={vb.cy - 8} textAnchor="middle"
                        style={{ fill: "#2C2420", fontFamily: "var(--font-playfair, 'Playfair Display', serif)", fontSize: 20, fontWeight: 700 }}>
                        {avgCalories.toLocaleString()}
                      </text>
                      <text x={vb.cx} y={vb.cy + 10} textAnchor="middle"
                        style={{ fill: "#8B8178", fontSize: 10 }}>
                        avg kcal/day
                      </text>
                    </>
                  );
                }}
              />
            </Pie>
            <RechartTooltip content={<MacroTooltip />} />
          </PieChart>
        </ResponsiveContainer>
      </div>

      {/* Legend */}
      <div className="flex items-center justify-center gap-4 pb-1 flex-wrap">
        {[
          { label: "Protein", color: "#C9A96E" },
          { label: "Carbs",   color: "#7BA7C4" },
          { label: "Fats",    color: "#C47C5A" },
        ].map(({ label, color }) => (
          <div key={label} className="flex items-center gap-1.5">
            <div className="h-2 w-2 rounded-full flex-shrink-0" style={{ backgroundColor: color }} />
            <span className="text-[11px] text-warm-gray">{label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

const fadeUp = (delay = 0) => ({
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.35, delay, ease: [0.25, 0.46, 0.45, 0.94] as const },
});

export default function DashboardPage() {
  const router = useRouter();
  const data = useDashboardData();

  if (data.loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => <SkeletonCard key={i} />)}
        </div>
        <SkeletonCard />
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">
          <div className="lg:col-span-3"><SkeletonCard /></div>
          <div className="lg:col-span-2"><SkeletonCard /></div>
        </div>
      </div>
    );
  }

  const { todayLog, targets, profile } = data;

  // ── Empty state: no logs at all ─────────────────────────────────────────────
  const hasNoData = data.startingWeight === null && data.streak === 0 && data.weeklyAvgCalories === 0;
  if (hasNoData) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] }}
        className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4"
      >
        {/* Illustration */}
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.1, duration: 0.5, ease: "easeOut" }}
          className="relative mb-8"
        >
          <div className="h-24 w-24 rounded-3xl bg-gold/10 border-2 border-gold/20 flex items-center justify-center mx-auto">
            <BookOpen className="h-10 w-10 text-gold/60" strokeWidth={1.25} />
          </div>
          {/* Floating dots */}
          {[
            { x: "-2.5rem", y: "-1rem", delay: 0.3 },
            { x: "2rem",    y: "-1.5rem", delay: 0.45 },
            { x: "2.5rem",  y: "1rem", delay: 0.6 },
          ].map((dot, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, scale: 0 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: dot.delay, type: "spring", stiffness: 300 }}
              className="absolute h-3 w-3 rounded-full bg-gold/30"
              style={{ left: dot.x, top: dot.y }}
            />
          ))}
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25, duration: 0.4 }}
        >
          <h2 className="font-display text-2xl sm:text-3xl font-semibold text-espresso mb-3">
            Your journey begins with one log
          </h2>
          <p className="text-warm-gray text-sm sm:text-base max-w-sm mx-auto mb-8 leading-relaxed">
            Track your weight, calories, and macros daily.
            Charts, insights, and projections unlock as your data grows.
          </p>
          <div className="flex flex-col sm:flex-row items-center gap-3 justify-center">
            <Button variant="primary" size="lg" onClick={() => router.push("/log")}>
              Log your first entry <ArrowRight className="h-4 w-4" />
            </Button>
            {!profile?.target_weight_kg && (
              <Button variant="secondary" size="lg" onClick={() => router.push("/onboarding")}>
                Set up my goal
              </Button>
            )}
          </div>
        </motion.div>

        {/* Mini feature hints */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="mt-12 grid grid-cols-3 gap-4 max-w-xs text-center"
        >
          {[
            { icon: TrendingUp, label: "Weight trend" },
            { icon: Target,     label: "Goal tracking" },
            { icon: Zap,        label: "AI insights" },
          ].map(({ icon: Icon, label }) => (
            <div key={label} className="flex flex-col items-center gap-1.5">
              <div className="h-9 w-9 rounded-xl bg-cream border border-sand/60 flex items-center justify-center">
                <Icon className="h-4 w-4 text-warm-gray" strokeWidth={1.5} />
              </div>
              <span className="text-xs text-warm-gray">{label}</span>
            </div>
          ))}
        </motion.div>
      </motion.div>
    );
  }

  return (
    <div className="space-y-6">

      {/* ── Log Today CTA (if not logged) ── */}
      {!todayLog && <LogTodayCTA />}

      {/* ── Today at a Glance ── */}
      <motion.section {...fadeUp(0.05)}>
        <p className="text-[11px] font-semibold text-warm-gray uppercase tracking-widest mb-3">
          Today at a Glance
        </p>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <WeightCard
            weight={data.currentWeight}
            weightChange={data.weightChange}
            last7Weights={data.last7Weights}
          />
          <CaloriesCard
            calories={todayLog?.calories ?? null}
            target={targets?.calories}
          />
          <ProteinCard
            protein={todayLog?.protein_g ?? null}
            target={targets?.proteinG}
            weight={data.currentWeight}
          />
          <StreakCard streak={data.streak} />
        </div>
      </motion.section>

      {/* ── This Week ── */}
      <motion.section {...fadeUp(0.12)}>
        <WeekView weekDays={data.weekDays} target={targets?.calories} />
      </motion.section>

      {/* ── Charts ── */}
      <motion.section {...fadeUp(0.2)}>
        <p className="text-[11px] font-semibold text-warm-gray uppercase tracking-widest mb-3">
          Progress
        </p>
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">

          {/* Weight trend — 60% */}
          <Card animate={false} className="lg:col-span-3">
            <CardContent>
              <div className="flex items-center justify-between mb-1">
                <p className="font-display text-base text-espresso">Weight Trend</p>
                <span className="text-xs text-warm-gray">Last 30 days</span>
              </div>
              <div style={{ height: 220 }}>
                <WeightTrendChart
                  data={data.weightChart}
                  targetWeight={profile?.target_weight_kg}
                />
              </div>
            </CardContent>
          </Card>

          {/* Macro donut — 40% */}
          <Card animate={false} className="lg:col-span-2">
            <CardContent className="flex flex-col h-full">
              <div className="flex items-center justify-between mb-1">
                <p className="font-display text-base text-espresso">Macro Split</p>
                <span className="text-xs text-warm-gray">This week avg</span>
              </div>
              <div style={{ height: 220 }}>
                <MacroDonut
                  slices={data.macroSlices}
                  avgCalories={data.weeklyAvgCalories}
                />
              </div>
            </CardContent>
          </Card>
        </div>
      </motion.section>
    </div>
  );
}
