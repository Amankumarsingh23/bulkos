"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence, useMotionValue, useTransform, animate } from "framer-motion";
import {
  ResponsiveContainer, ComposedChart, Line, Area,
  XAxis, YAxis, Tooltip, CartesianGrid, ReferenceLine,
} from "recharts";
import {
  Target, Plus, X, CheckCircle2, Clock, TrendingUp,
  Flame, Calendar, Trophy, Zap, ChevronRight,
} from "lucide-react";
import { format, differenceInDays, parseISO } from "date-fns";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { useAuth } from "@/hooks/useAuth";
import { createBrowserClient } from "@/lib/supabase";
import {
  buildWeightPointsFromMap, linearProjection, estimateCompletionDate,
  calculateRequiredSurplus, calculateWeeklyStatsFromMap, buildProjectionChartData,
} from "@/lib/projections";
import { buildDailyWeightMap } from "@/lib/weightUtils";
import type { Milestone } from "@/types/database";

// ─── TDEE helper (mirrors useDashboardData) ──────────────────────────────────
const ACT: Record<string, number> = {
  sedentary: 1.2, lightly_active: 1.375, moderately_active: 1.55,
  very_active: 1.725, extra_active: 1.9,
};
function tdeeFromProfile(p: {
  weight_kg: number; height_cm: number | null; age: number | null;
  gender: string | null; activity_level: string | null;
}): number {
  if (!p.height_cm || !p.age) return 2500;
  const off = p.gender === "male" ? 5 : p.gender === "female" ? -161 : -78;
  const bmr = 10 * p.weight_kg + 6.25 * p.height_cm - 5 * p.age + off;
  return Math.round(bmr * (ACT[p.activity_level ?? "moderately_active"] ?? 1.55));
}

// ─── Animated counter ─────────────────────────────────────────────────────────
function AnimatedNumber({ value, decimals = 0 }: { value: number; decimals?: number }) {
  const mv = useMotionValue(0);
  const display = useTransform(mv, (v) => v.toFixed(decimals));
  const [text, setText] = useState("0");

  useEffect(() => {
    display.on("change", (v) => setText(v));
    const ctrl = animate(mv, value, { duration: 1.2, ease: "easeOut" });
    return ctrl.stop;
  }, [value]); // eslint-disable-line

  return <span>{text}</span>;
}

// ─── Goal progress bar ────────────────────────────────────────────────────────
function GoalProgressBar({
  startWeight, currentWeight, targetWeight, pct,
}: {
  startWeight: number; currentWeight: number; targetWeight: number; pct: number;
}) {
  const isGain   = targetWeight > startWeight;
  const clampPct = Math.min(100, Math.max(0, pct));

  return (
    <div className="relative mt-8 mb-2">
      {/* Track */}
      <div className="h-3 bg-sand/50 rounded-full overflow-hidden">
        <motion.div
          className="h-full rounded-full bg-gradient-to-r from-gold/60 to-gold"
          initial={{ width: 0 }}
          animate={{ width: `${clampPct}%` }}
          transition={{ duration: 1.4, ease: [0.25, 0.46, 0.45, 0.94], delay: 0.2 }}
        />
      </div>

      {/* Animated marker */}
      <motion.div
        className="absolute top-1/2 -translate-y-1/2"
        initial={{ left: 0 }}
        animate={{ left: `${clampPct}%` }}
        transition={{ duration: 1.4, ease: [0.25, 0.46, 0.45, 0.94], delay: 0.2 }}
        style={{ transform: "translate(-50%, -50%)" }}
      >
        <div className="relative">
          <div className="h-6 w-6 rounded-full bg-gold border-2 border-white shadow-warm flex items-center justify-center">
            <div className="h-1.5 w-1.5 rounded-full bg-white" />
          </div>
          {/* Floating label */}
          <motion.div
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1.2 }}
            className="absolute -top-8 left-1/2 -translate-x-1/2 whitespace-nowrap bg-espresso text-cream text-[10px] font-medium rounded-lg px-2 py-1 shadow"
          >
            {currentWeight} kg
          </motion.div>
        </div>
      </motion.div>

      {/* Start / end labels */}
      <div className="flex justify-between mt-4 text-xs text-warm-gray">
        <div className="text-left">
          <p className="font-medium text-charcoal">{startWeight} kg</p>
          <p>Start</p>
        </div>
        <div className="text-right">
          <p className="font-medium text-charcoal">{targetWeight} kg</p>
          <p>Target</p>
        </div>
      </div>
    </div>
  );
}

// ─── Projection chart ─────────────────────────────────────────────────────────
function ProjectionChart({ data }: { data: ReturnType<typeof buildProjectionChartData> }) {
  if (!data.length) return (
    <div className="h-64 flex items-center justify-center text-sm text-warm-gray">No data yet</div>
  );

  // Thin out x-axis ticks
  const tickEvery = Math.max(1, Math.floor(data.length / 8));
  const ticks = data.filter((_, i) => i % tickEvery === 0).map((d) => d.date);

  const allVals = data.flatMap((d) => [d.actual, d.projected, d.plan].filter((v): v is number => v !== null));
  const yMin = allVals.length ? Math.floor(Math.min(...allVals) - 1) : 60;
  const yMax = allVals.length ? Math.ceil(Math.max(...allVals) + 2) : 90;

  function TooltipContent({ active, payload, label }: any) {
    if (!active || !payload?.length) return null;
    const d = data.find((x) => x.date === label);
    return (
      <div className="bg-ivory border border-sand rounded-xl px-3 py-2 shadow-warm text-xs">
        <p className="text-warm-gray mb-1">{d?.label ?? label}</p>
        {d?.actual    != null && <p className="text-gold font-medium">Actual: {d.actual} kg</p>}
        {d?.projected != null && <p className="text-gold/70">Projected: {d.projected} kg</p>}
        {d?.plan      != null && <p className="text-warm-gray">Plan: {d.plan} kg</p>}
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={280}>
      <ComposedChart data={data} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
        <defs>
          <linearGradient id="confGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#C9A96E" stopOpacity={0.15} />
            <stop offset="100%" stopColor="#C9A96E" stopOpacity={0.03} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="#E8DDD0" strokeOpacity={0.5} />
        <XAxis
          dataKey="date"
          ticks={ticks}
          tickFormatter={(v) => {
            const d = data.find((x) => x.date === v);
            return d?.label ?? v;
          }}
          tick={{ fontSize: 10, fill: "#9B8E87" }}
          tickLine={false}
          axisLine={false}
        />
        <YAxis
          domain={[yMin, yMax]}
          tick={{ fontSize: 10, fill: "#9B8E87" }}
          tickLine={false}
          axisLine={false}
          tickFormatter={(v) => `${v}`}
        />
        <Tooltip content={<TooltipContent />} />

        {/* Confidence band (stacked area trick) */}
        <Area type="monotone" dataKey="projBase"  stroke="none" fill="transparent" stackId="conf" dot={false} legendType="none" connectNulls />
        <Area type="monotone" dataKey="projBand"  stroke="none" fill="url(#confGrad)" fillOpacity={1} stackId="conf" dot={false} legendType="none" connectNulls />

        {/* Plan line */}
        <Line type="monotone" dataKey="plan"      stroke="#9B8E87" strokeWidth={1.5} strokeDasharray="5 4" dot={false} legendType="none" connectNulls name="Plan" />

        {/* Projected line */}
        <Line type="monotone" dataKey="projected" stroke="#C9A96E" strokeWidth={2} strokeDasharray="6 3" dot={false} connectNulls name="Projected" />

        {/* Actual line */}
        <Line
          type="monotone"
          dataKey="actual"
          stroke="#C9A96E"
          strokeWidth={2.5}
          dot={{ r: 2.5, fill: "#C9A96E", strokeWidth: 0 }}
          activeDot={{ r: 5 }}
          connectNulls
          name="Actual"
        />

        {/* Today line */}
        <ReferenceLine
          x={format(new Date(), "yyyy-MM-dd")}
          stroke="#9B8E87"
          strokeDasharray="3 3"
          strokeOpacity={0.5}
          label={{ value: "Today", position: "top", fontSize: 9, fill: "#9B8E87" }}
        />
      </ComposedChart>
    </ResponsiveContainer>
  );
}

// ─── Milestone card ───────────────────────────────────────────────────────────
type MilestoneStatus = "achieved" | "current" | "upcoming";

function milestoneStatus(m: Milestone, currentWeight: number | null, isCurrentTarget: boolean): MilestoneStatus {
  if (m.achieved) return "achieved";
  if (isCurrentTarget) return "current";
  return "upcoming";
}

function MilestoneCard({
  milestone, currentWeight, isCurrentTarget,
}: {
  milestone: Milestone; currentWeight: number | null; isCurrentTarget: boolean;
}) {
  const status = milestoneStatus(milestone, currentWeight, isCurrentTarget);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className={`relative rounded-xl border px-4 py-3.5 transition-colors ${
        status === "achieved"
          ? "bg-sage/10 border-sage/30"
          : status === "current"
          ? "bg-gold/8 border-gold/50"
          : "bg-cream border-sand/60"
      }`}
    >
      {/* Pulsing indicator for current */}
      {status === "current" && (
        <span className="absolute top-3 right-3 flex h-2.5 w-2.5">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-gold opacity-60" />
          <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-gold" />
        </span>
      )}

      <div className="flex items-center gap-3">
        <div className={`h-9 w-9 rounded-lg flex items-center justify-center flex-shrink-0 ${
          status === "achieved" ? "bg-sage/20" : status === "current" ? "bg-gold/15" : "bg-sand/50"
        }`}>
          {status === "achieved"
            ? <CheckCircle2 className="h-4.5 w-4.5 text-sage" />
            : status === "current"
            ? <Target className="h-4.5 w-4.5 text-gold" />
            : <ChevronRight className="h-4.5 w-4.5 text-warm-gray" />
          }
        </div>
        <div className="min-w-0">
          <p className={`text-sm font-medium truncate ${
            status === "achieved" ? "text-sage" : status === "current" ? "text-espresso" : "text-warm-gray"
          }`}>
            {milestone.title}
          </p>
          <p className="text-xs text-warm-gray mt-0.5">
            {milestone.target_weight_kg} kg
            {status === "achieved" && milestone.achieved_at &&
              ` — ${format(parseISO(milestone.achieved_at), "MMM d, yyyy")}`
            }
            {status === "current" && currentWeight !== null &&
              ` — ${Math.round((milestone.target_weight_kg - currentWeight) * 10) / 10} kg to go`
            }
          </p>
        </div>
      </div>
    </motion.div>
  );
}

// ─── Add milestone modal ──────────────────────────────────────────────────────
function AddMilestoneModal({
  onClose, onAdd, currentWeight, targetWeight,
}: {
  onClose: () => void;
  onAdd: (title: string, weight: number) => Promise<void>;
  currentWeight: number | null;
  targetWeight: number | null;
}) {
  const [title, setTitle]   = useState("");
  const [weight, setWeight] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError]   = useState<string | null>(null);

  async function handleSave() {
    const w = parseFloat(weight);
    if (isNaN(w) || w <= 0) { setError("Enter a valid weight"); return; }
    if (currentWeight && w <= currentWeight) { setError("Must be above current weight"); return; }
    if (targetWeight && w > targetWeight) { setError("Must be at or below target weight"); return; }
    setSaving(true);
    try {
      await onAdd(title.trim() || `Reach ${w} kg`, w);
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-espresso/40 backdrop-blur-sm"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95, y: 16 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.95, y: 8 }}
        transition={{ type: "spring", stiffness: 400, damping: 30 }}
        className="bg-ivory rounded-2xl border border-sand/60 shadow-warm-md w-full max-w-sm p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-5">
          <h3 className="font-display text-lg font-semibold text-espresso">Add Milestone</h3>
          <button onClick={onClose} className="text-warm-gray hover:text-charcoal transition-colors">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-4">
          <Input
            label="Label (optional)"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. First 5 kg gained"
          />
          <Input
            label="Target weight (kg)"
            type="number"
            step="0.5"
            value={weight}
            onChange={(e) => { setWeight(e.target.value); setError(null); }}
            required
          />
          {error && <p className="text-xs text-rose">{error}</p>}
        </div>

        <div className="flex gap-2 mt-6">
          <Button variant="secondary" size="md" onClick={onClose} className="flex-1">
            Cancel
          </Button>
          <Button variant="primary" size="md" loading={saving} onClick={handleSave} className="flex-1">
            Add milestone
          </Button>
        </div>
      </motion.div>
    </motion.div>
  );
}

// ─── Stat card ────────────────────────────────────────────────────────────────
function StatCard({ icon, label, value, sub, accent = false }: {
  icon: React.ReactNode; label: string; value: string; sub?: string; accent?: boolean;
}) {
  return (
    <div className={`rounded-xl border px-4 py-3.5 ${accent ? "bg-gold/8 border-gold/40" : "bg-cream border-sand/60"}`}>
      <div className={`mb-2 ${accent ? "text-gold" : "text-warm-gray"}`}>{icon}</div>
      <p className="font-display text-xl font-semibold text-espresso leading-none">{value}</p>
      <p className="text-xs text-warm-gray mt-1">{label}</p>
      {sub && <p className="text-xs text-warm-gray/60 mt-0.5">{sub}</p>}
    </div>
  );
}

// ─── Legend ───────────────────────────────────────────────────────────────────
function ChartLegend() {
  return (
    <div className="flex flex-wrap gap-4 text-xs text-warm-gray mt-1">
      <span className="flex items-center gap-1.5">
        <span className="inline-block h-0.5 w-5 bg-gold rounded" /> Actual
      </span>
      <span className="flex items-center gap-1.5">
        <span className="inline-block h-0.5 w-5 bg-gold/60 rounded border-t border-dashed border-gold" /> Projected
      </span>
      <span className="flex items-center gap-1.5">
        <span className="inline-block h-0.5 w-5 bg-warm-gray/60 rounded border-t border-dashed border-warm-gray" /> Original plan
      </span>
      <span className="flex items-center gap-1.5">
        <span className="inline-block h-3 w-4 rounded bg-gold/15" /> Confidence band
      </span>
    </div>
  );
}

// ─── MAIN PAGE ────────────────────────────────────────────────────────────────
export default function GoalsPage() {
  const { profile, user } = useAuth();
  const [weightByDate, setWeightByDate] = useState<Record<string, number>>({});
  const [logCount, setLogCount]         = useState(0);
  const [milestones, setMilestones]     = useState<Milestone[]>([]);
  const [loading, setLoading]           = useState(true);
  const [showModal, setShowModal]       = useState(false);

  const fetchData = useCallback(async () => {
    if (!user?.id) return;
    setLoading(true);
    const sb = createBrowserClient();
    const [{ data: weightLogs }, { data: msData }, { data: logDates }] = await Promise.all([
      sb.from("weight_logs")
        .select("id, logged_at, weight_kg, notes")
        .eq("user_id", user.id)
        .order("logged_at", { ascending: true }),
      sb.from("milestones")
        .select("*")
        .eq("user_id", user.id)
        .order("target_weight_kg", { ascending: true }),
      // Just need log count for consistency %
      sb.from("daily_logs")
        .select("log_date")
        .eq("user_id", user.id),
    ]);
    setWeightByDate(buildDailyWeightMap(weightLogs ?? []));
    setMilestones(msData ?? []);
    setLogCount((logDates ?? []).length);
    setLoading(false);
  }, [user?.id]);

  useEffect(() => { fetchData(); }, [fetchData]);

  async function addMilestone(title: string, weight: number) {
    if (!user?.id) return;
    const sb = createBrowserClient();
    const { error } = await sb.from("milestones").insert({
      user_id: user.id, title, target_weight_kg: weight, achieved: false,
    });
    if (error) throw new Error(error.message);
    await fetchData();
  }

  // ── Derived data ────────────────────────────────────────────────────────────
  const weightPoints  = buildWeightPointsFromMap(weightByDate);
  const proj          = linearProjection(weightPoints);
  const currentWeight = weightPoints.at(-1)?.weight ?? null;
  const startWeight   = weightPoints[0]?.weight ?? null;
  const startDate     = weightPoints[0]?.date ?? format(new Date(), "yyyy-MM-dd");

  const targetWeight  = profile?.target_weight_kg ?? null;
  const targetDate    = profile?.target_date ?? null;

  const pct = startWeight !== null && targetWeight !== null && currentWeight !== null && targetWeight !== startWeight
    ? Math.min(100, Math.max(0, Math.round(((currentWeight - startWeight) / (targetWeight - startWeight)) * 100)))
    : 0;

  const dailyRate    = proj?.slope ?? 0;
  const weeklyRate   = Math.round(dailyRate * 7 * 100) / 100;
  const estimatedEnd = targetWeight && currentWeight
    ? estimateCompletionDate(currentWeight, targetWeight, Math.max(0, dailyRate))
    : null;

  const daysSinceStart = startDate ? differenceInDays(new Date(), parseISO(startDate)) : 0;
  const daysToTarget   = targetDate
    ? differenceInDays(parseISO(targetDate), new Date())
    : estimatedEnd
    ? differenceInDays(estimatedEnd, new Date())
    : null;

  const tdee = profile && currentWeight
    ? tdeeFromProfile({ ...profile, weight_kg: currentWeight })
    : 2500;
  const requiredDailyCalories = targetWeight && currentWeight && daysToTarget && daysToTarget > 0
    ? calculateRequiredSurplus(currentWeight, targetWeight, daysToTarget, tdee)
    : null;

  const weeklyStats  = calculateWeeklyStatsFromMap(weightByDate);
  const consistency  = logCount > 0 && daysSinceStart > 0
    ? Math.round((logCount / Math.max(daysSinceStart, logCount)) * 100)
    : 0;

  const chartData = targetWeight && startWeight !== null
    ? buildProjectionChartData({
        weightPoints,
        proj,
        startDate,
        startWeight,
        targetWeight,
        targetDate,
        estimatedEnd,
      })
    : [];

  // Next unachieved milestone (current target)
  const nextMilestone = milestones.find((m) => !m.achieved);

  // ── Render ──────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="space-y-5">
        {[1, 2, 3].map((i) => (
          <div key={i} className="bg-ivory rounded-2xl border border-sand/60 p-6 h-48 shimmer" />
        ))}
      </div>
    );
  }

  if (!targetWeight) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <div className="h-16 w-16 rounded-2xl bg-gold/10 flex items-center justify-center mx-auto mb-4">
          <Target className="h-8 w-8 text-gold/60" />
        </div>
        <h2 className="font-display text-xl font-semibold text-espresso mb-2">No goal set yet</h2>
        <p className="text-sm text-warm-gray max-w-xs">
          Complete onboarding to set your target weight and see your progress here.
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-6 max-w-4xl">
        {/* Page header */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
          <div className="flex items-center gap-2.5 mb-1">
            <div className="h-8 w-8 rounded-xl bg-gold/15 flex items-center justify-center">
              <Target className="h-4 w-4 text-gold" />
            </div>
            <h1 className="font-display text-2xl font-semibold text-espresso">Goals</h1>
          </div>
          <p className="text-sm text-warm-gray">Track your journey to {targetWeight} kg.</p>
        </motion.div>

        {/* ── Main goal card ─────────────────────────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, delay: 0.05 }}
          className="bg-ivory rounded-2xl border border-sand/60 shadow-warm-md px-6 py-5"
        >
          {/* Top row */}
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-2">
            <div>
              <p className="text-xs font-medium text-warm-gray uppercase tracking-wide mb-1">Journey progress</p>
              <div className="flex items-baseline gap-2">
                <span className="font-display text-4xl font-bold text-espresso">
                  <AnimatedNumber value={pct} />%
                </span>
                <span className="text-sm text-warm-gray">of the way there</span>
              </div>
            </div>
            <div className="flex gap-4 text-center sm:text-right">
              <div>
                <p className="font-display text-lg font-semibold text-espresso">{currentWeight ?? "—"} kg</p>
                <p className="text-xs text-warm-gray">Current</p>
              </div>
              <div className="w-px bg-sand/60" />
              <div>
                <p className="font-display text-lg font-semibold text-espresso">
                  {targetWeight !== null && currentWeight !== null
                    ? `${Math.round((targetWeight - currentWeight) * 10) / 10} kg`
                    : "—"}
                </p>
                <p className="text-xs text-warm-gray">To go</p>
              </div>
            </div>
          </div>

          {/* Progress bar */}
          {startWeight !== null && currentWeight !== null && (
            <GoalProgressBar
              startWeight={startWeight}
              currentWeight={currentWeight}
              targetWeight={targetWeight}
              pct={pct}
            />
          )}

          {/* Time info */}
          <div className="mt-4 flex flex-wrap gap-3 text-xs text-warm-gray">
            <span className="flex items-center gap-1.5">
              <Calendar className="h-3 w-3" />
              Day {daysSinceStart} since you started
            </span>
            {daysToTarget !== null && daysToTarget > 0 && (
              <span className="flex items-center gap-1.5">
                <Clock className="h-3 w-3" />
                ~{daysToTarget} days remaining
              </span>
            )}
            {estimatedEnd && (
              <span className="flex items-center gap-1.5">
                <TrendingUp className="h-3 w-3" />
                Projected: {format(estimatedEnd, "MMM d, yyyy")}
              </span>
            )}
            {weeklyRate > 0 && (
              <span className="flex items-center gap-1.5">
                <Zap className="h-3 w-3" />
                +{weeklyRate} kg/week avg
              </span>
            )}
          </div>
        </motion.div>

        {/* ── Projection chart ───────────────────────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, delay: 0.1 }}
          className="bg-ivory rounded-2xl border border-sand/60 shadow-warm-md px-6 py-5"
        >
          <div className="flex items-start justify-between mb-4">
            <div>
              <h2 className="font-display text-base font-semibold text-espresso">Weight Projection</h2>
              <p className="text-xs text-warm-gray mt-0.5">
                Actual pace vs original plan
                {proj && ` · R² ${(proj.r2 * 100).toFixed(0)}% fit`}
              </p>
            </div>
            {proj && (
              <div className={`text-xs font-medium px-2.5 py-1 rounded-full ${
                weeklyRate >= 0.25 && weeklyRate <= 0.5
                  ? "bg-sage/15 text-sage"
                  : weeklyRate > 0.5
                  ? "bg-terracotta/15 text-terracotta"
                  : "bg-sand/60 text-warm-gray"
              }`}>
                {weeklyRate >= 0.25 && weeklyRate <= 0.5 ? "On track" : weeklyRate > 0.5 ? "Ahead" : weeklyRate > 0 ? "Slow" : "Stalled"}
              </div>
            )}
          </div>
          <ProjectionChart data={chartData} />
          <ChartLegend />
        </motion.div>

        {/* ── Milestones ─────────────────────────────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, delay: 0.15 }}
          className="bg-ivory rounded-2xl border border-sand/60 shadow-warm-md px-6 py-5"
        >
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="font-display text-base font-semibold text-espresso">Milestones</h2>
              <p className="text-xs text-warm-gray mt-0.5">
                {milestones.filter((m) => m.achieved).length} of {milestones.length} achieved
              </p>
            </div>
            <Button variant="secondary" size="sm" onClick={() => setShowModal(true)}>
              <Plus className="h-3.5 w-3.5" />
              Add
            </Button>
          </div>

          {milestones.length === 0 ? (
            <div className="text-center py-8 text-sm text-warm-gray">
              No milestones yet — add one or complete onboarding to auto-generate them.
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {milestones.map((m) => (
                <MilestoneCard
                  key={m.id}
                  milestone={m}
                  currentWeight={currentWeight}
                  isCurrentTarget={m.id === nextMilestone?.id}
                />
              ))}
            </div>
          )}
        </motion.div>

        {/* ── Stats grid ─────────────────────────────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, delay: 0.2 }}
        >
          <h2 className="font-display text-base font-semibold text-espresso mb-3">Stats</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <StatCard
              icon={<TrendingUp className="h-4 w-4" />}
              label="Avg weekly gain"
              value={weeklyStats.avgWeeklyGain !== null ? `+${weeklyStats.avgWeeklyGain} kg` : "—"}
              sub="based on all logs"
              accent={weeklyStats.avgWeeklyGain !== null && weeklyStats.avgWeeklyGain >= 0.25}
            />
            <StatCard
              icon={<Trophy className="h-4 w-4" />}
              label="Best week"
              value={weeklyStats.bestWeekGain !== null ? `+${weeklyStats.bestWeekGain} kg` : "—"}
              sub="single week gain"
            />
            <StatCard
              icon={<Flame className="h-4 w-4" />}
              label="Consistency"
              value={`${consistency}%`}
              sub="days logged"
              accent={consistency >= 80}
            />
            <StatCard
              icon={<Calendar className="h-4 w-4" />}
              label="Days active"
              value={`${daysSinceStart}`}
              sub="since first log"
            />
            <StatCard
              icon={<Clock className="h-4 w-4" />}
              label="Days remaining"
              value={daysToTarget !== null && daysToTarget > 0 ? `${daysToTarget}` : "—"}
              sub={targetDate ? `target ${format(parseISO(targetDate), "MMM d")}` : "estimated"}
            />
            <StatCard
              icon={<Zap className="h-4 w-4" />}
              label="Required intake"
              value={requiredDailyCalories ? `${requiredDailyCalories}` : "—"}
              sub="kcal/day to hit target"
              accent={!!requiredDailyCalories}
            />
          </div>
        </motion.div>
      </div>

      {/* Add milestone modal */}
      <AnimatePresence>
        {showModal && (
          <AddMilestoneModal
            onClose={() => setShowModal(false)}
            onAdd={addMilestone}
            currentWeight={currentWeight}
            targetWeight={targetWeight}
          />
        )}
      </AnimatePresence>
    </>
  );
}
