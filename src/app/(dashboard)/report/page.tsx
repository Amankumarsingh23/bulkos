"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import {
  FileText, Download, Loader2, TrendingUp, TrendingDown, Minus,
  Calendar, Flame, Beef, Dumbbell, Trophy, Target, CheckCircle2,
  BarChart3, AlertCircle, Info,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/components/ui/Toast";
import { useReportData } from "@/hooks/useReportData";
import { GRADE_COLOR } from "@/lib/weeklyScore";
import { cn } from "@/lib/utils";

// ── Period selector ────────────────────────────────────────────────────────────

const PERIODS = [
  { label: "30 days",  days: 30  },
  { label: "60 days",  days: 60  },
  { label: "90 days",  days: 90  },
] as const;

// ── Stat preview card ─────────────────────────────────────────────────────────

function PreviewStat({
  icon: Icon, label, value, unit, sub, color = "gold",
}: {
  icon: React.ElementType;
  label: string;
  value: string | number | null;
  unit?: string;
  sub?: string;
  color?: "gold" | "sage" | "terra" | "default";
}) {
  const iconColor = {
    gold: "text-gold bg-gold/10",
    sage: "text-sage bg-sage/10",
    terra: "text-terracotta bg-terracotta/10",
    default: "text-warm-gray bg-sand/30",
  }[color];

  return (
    <div className="rounded-2xl border border-sand/70 bg-white p-4 flex flex-col gap-2">
      <div className="flex items-center gap-2">
        <div className={cn("h-7 w-7 rounded-lg flex items-center justify-center flex-shrink-0", iconColor)}>
          <Icon className="h-3.5 w-3.5" />
        </div>
        <span className="text-[10px] font-semibold text-warm-gray uppercase tracking-wider">{label}</span>
      </div>
      <div>
        <span className="text-2xl font-bold text-espresso font-display">
          {value ?? "—"}
        </span>
        {unit && <span className="text-sm text-warm-gray ml-1">{unit}</span>}
      </div>
      {sub && <p className="text-[10px] text-warm-gray">{sub}</p>}
    </div>
  );
}

// ── Delta badge ───────────────────────────────────────────────────────────────

function Delta({ value, unit = "" }: { value: number | null; unit?: string }) {
  if (value === null) return <span className="text-warm-gray text-xs">—</span>;
  const pos = value > 0;
  const zero = value === 0;
  const Icon = zero ? Minus : pos ? TrendingUp : TrendingDown;
  return (
    <span className={cn(
      "inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full",
      zero ? "text-warm-gray bg-sand/40" : pos ? "text-sage bg-sage/10" : "text-terracotta bg-terracotta/10"
    )}>
      <Icon className="h-3 w-3" />
      {value > 0 ? "+" : ""}{value}{unit}
    </span>
  );
}

// ── Insight type icon ─────────────────────────────────────────────────────────

function InsightIcon({ type }: { type: "success" | "warning" | "info" }) {
  if (type === "success") return <CheckCircle2 className="h-4 w-4 text-sage flex-shrink-0 mt-0.5" />;
  if (type === "warning") return <AlertCircle className="h-4 w-4 text-terracotta flex-shrink-0 mt-0.5" />;
  return <Info className="h-4 w-4 text-warm-gray flex-shrink-0 mt-0.5" />;
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function ReportPage() {
  const [period, setPeriod] = useState<30 | 60 | 90>(90);
  const [generating, setGenerating] = useState(false);
  const { data, loading, error } = useReportData(period);
  const toast = useToast();

  async function handleDownload() {
    if (!data) return;
    setGenerating(true);
    try {
      const [{ pdf }, { BulkOSReport }] = await Promise.all([
        import("@react-pdf/renderer"),
        import("@/lib/report/pdfDoc"),
      ]);
      // react-pdf's pdf() requires a Document element — cast via any to satisfy strict types
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const blob = await (pdf as any)((BulkOSReport as any)({ data })).toBlob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `BulkOS-Report-${new Date().toISOString().slice(0, 10)}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success("Report downloaded!");
    } catch (e) {
      console.error(e);
      toast.error("Failed to generate PDF. Please try again.");
    } finally {
      setGenerating(false);
    }
  }

  return (
    <div className="min-h-screen bg-ivory">
      {/* Header */}
      <div className="sticky top-0 z-30 bg-ivory/95 backdrop-blur-md border-b border-sand/60 px-4 sm:px-6 lg:px-8 py-4">
        <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-lg font-semibold text-espresso font-display">Performance Report</h1>
            <p className="text-xs text-warm-gray mt-0.5">
              Branded PDF · Data analysis · Personalised insights
            </p>
          </div>
          <div className="flex items-center gap-3 flex-shrink-0">
            {/* Period selector */}
            <div className="flex gap-1 bg-cream border border-sand/70 rounded-xl p-1">
              {PERIODS.map(({ label, days }) => (
                <button
                  key={days}
                  onClick={() => setPeriod(days as 30 | 60 | 90)}
                  className={cn(
                    "px-3 py-1.5 rounded-lg text-xs font-semibold transition-all",
                    period === days
                      ? "bg-gold text-espresso shadow-warm"
                      : "text-warm-gray hover:text-espresso"
                  )}
                >
                  {label}
                </button>
              ))}
            </div>
            <Button
              onClick={handleDownload}
              disabled={!data || loading || generating}
              className="flex items-center gap-2"
            >
              {generating ? (
                <><Loader2 className="h-4 w-4 animate-spin" /> Generating…</>
              ) : (
                <><Download className="h-4 w-4" /> Download PDF</>
              )}
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">

        {/* Error */}
        {error && (
          <div className="rounded-xl bg-rose/10 border border-rose/20 px-4 py-3 text-sm text-rose">
            {error}
          </div>
        )}

        {/* Loading */}
        {loading && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="h-24 rounded-2xl bg-sand/30 animate-pulse" />
            ))}
          </div>
        )}

        {/* ── Report preview ─────────────────────────────────────────────── */}
        {!loading && data && (
          <>
            {/* PDF preview banner */}
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              className="rounded-2xl bg-espresso p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
            >
              <div className="flex items-start gap-4">
                <div className="h-12 w-12 rounded-xl bg-gold flex items-center justify-center flex-shrink-0">
                  <FileText className="h-6 w-6 text-espresso" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-white font-display">
                    {data.periodDays}-Day Performance Report
                  </h2>
                  <p className="text-xs text-warm-gray mt-1">
                    Generated {data.generatedAt} · 6 pages · Branded PDF · {data.userName}
                  </p>
                  <p className="text-xs text-gold/80 mt-1">
                    Covers: body composition · nutrition · training · weekly scores · insights
                  </p>
                </div>
              </div>
              <Button
                onClick={handleDownload}
                disabled={generating}
                className="flex items-center gap-2 flex-shrink-0"
              >
                {generating ? (
                  <><Loader2 className="h-4 w-4 animate-spin" /> Building PDF…</>
                ) : (
                  <><Download className="h-4 w-4" /> Download PDF</>
                )}
              </Button>
            </motion.div>

            {/* ── Section 1: Key metrics ─── */}
            <div>
              <h3 className="text-xs font-semibold text-warm-gray uppercase tracking-widest mb-3">
                Key Metrics · {data.periodDays}-Day Summary
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                <PreviewStat
                  icon={TrendingUp}
                  label="Current Weight"
                  value={data.currentWeight ? data.currentWeight.toFixed(1) : null}
                  unit="kg"
                  sub={data.weightChange !== null ? `${data.weightChange >= 0 ? "+" : ""}${data.weightChange} kg change` : undefined}
                  color="gold"
                />
                <PreviewStat
                  icon={Flame}
                  label="Avg Calories"
                  value={data.avgCalories ? data.avgCalories.toLocaleString() : null}
                  unit="kcal"
                  sub={data.targetCalories ? `Target: ${data.targetCalories.toLocaleString()}` : undefined}
                  color="terra"
                />
                <PreviewStat
                  icon={Beef}
                  label="Avg Protein"
                  value={data.avgProtein}
                  unit="g/day"
                  sub={data.currentWeight ? `${((data.avgProtein ?? 0) / data.currentWeight).toFixed(1)}g/kg bodyweight` : undefined}
                  color="sage"
                />
                <PreviewStat
                  icon={Calendar}
                  label="Logging Days"
                  value={data.loggingDays}
                  unit={`/ ${data.periodDays}`}
                  sub={`${Math.round(data.loggingConsistency * 100)}% consistency`}
                  color="default"
                />
                <PreviewStat
                  icon={BarChart3}
                  label="Avg Weekly Score"
                  value={data.avgWeeklyScore}
                  unit="/100"
                  color="gold"
                />
                <PreviewStat
                  icon={Dumbbell}
                  label="Workouts"
                  value={data.totalWorkouts}
                  sub={data.totalWorkouts > 0 ? `${(data.totalWorkouts / (data.periodDays / 7)).toFixed(1)}/week` : "None logged"}
                  color="default"
                />
                <PreviewStat
                  icon={Trophy}
                  label="Personal Records"
                  value={data.prs.length}
                  color="gold"
                />
                <PreviewStat
                  icon={Target}
                  label="Goal Progress"
                  value={data.targetProgressPct !== null ? data.targetProgressPct : null}
                  unit="%"
                  sub={data.targetWeightKg ? `Target: ${data.targetWeightKg} kg` : "No goal set"}
                  color="sage"
                />
              </div>
            </div>

            {/* ── Section 2: Body composition ─── */}
            {(data.bmi !== null || data.currentWeight !== null) && (
              <div>
                <h3 className="text-xs font-semibold text-warm-gray uppercase tracking-widest mb-3">
                  Body Composition
                </h3>
                <div className="rounded-2xl border border-sand/70 bg-white p-5">
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    {[
                      { label: "Weight", value: data.currentWeight ? `${data.currentWeight.toFixed(1)} kg` : "—", delta: data.weightChange, unit: " kg" },
                      { label: "BMI", value: data.bmi ? `${data.bmi}` : "—", delta: null },
                      { label: "Body Fat", value: data.bodyFatPct ? `${data.bodyFatPct.toFixed(1)}%` : "—", delta: null },
                      { label: "Lean Mass", value: data.leanMassKg ? `${data.leanMassKg.toFixed(1)} kg` : "—", delta: null },
                      { label: "FFMI", value: data.ffmi ? `${data.ffmi.toFixed(1)}` : "—", delta: null },
                    ].map(({ label, value, delta, unit }) => (
                      <div key={label} className="space-y-1">
                        <p className="text-[10px] font-semibold text-warm-gray uppercase tracking-wider">{label}</p>
                        <p className="text-lg font-bold text-espresso font-display">{value}</p>
                        {delta !== null && <Delta value={delta} unit={unit} />}
                      </div>
                    ))}
                  </div>
                  {!data.bmi && (
                    <p className="text-xs text-warm-gray mt-3 italic">
                      Add height, age & gender in Settings to unlock FFMI, body fat %, and lean mass.
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* ── Section 3: Weekly scores ─── */}
            {data.weeklyScores.some((w) => w.hasData) && (
              <div>
                <h3 className="text-xs font-semibold text-warm-gray uppercase tracking-widest mb-3">
                  Weekly Performance History
                </h3>
                <div className="rounded-2xl border border-sand/70 bg-white overflow-hidden">
                  <div className="flex items-center gap-4 overflow-x-auto px-5 py-4">
                    {data.weeklyScores.filter((w) => w.hasData).map((ws) => (
                      <div key={ws.weekStart} className="flex flex-col items-center gap-1.5 flex-shrink-0">
                        <div
                          className="h-8 w-8 rounded-xl flex items-center justify-center text-white text-sm font-bold"
                          style={{ backgroundColor: GRADE_COLOR[ws.grade] }}
                        >
                          {ws.grade}
                        </div>
                        <div className="text-center">
                          <p className="text-[10px] font-semibold text-espresso">{ws.score}</p>
                          <p className="text-[9px] text-warm-gray">{ws.weekLabel}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* ── Section 4: PRs ─── */}
            {data.prs.length > 0 && (
              <div>
                <h3 className="text-xs font-semibold text-warm-gray uppercase tracking-widest mb-3">
                  Personal Records
                </h3>
                <div className="rounded-2xl border border-sand/70 bg-white overflow-hidden">
                  <div className="divide-y divide-sand/40">
                    {data.prs.slice(0, 6).map((pr) => (
                      <div key={pr.exercise} className="flex items-center justify-between px-5 py-3">
                        <div className="flex items-center gap-3">
                          <Trophy className="h-3.5 w-3.5 text-gold flex-shrink-0" />
                          <span className="text-sm font-semibold text-espresso">{pr.exercise}</span>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="text-sm font-bold text-gold">{pr.weight_kg} kg</span>
                          {pr.reps > 0 && (
                            <span className="text-xs text-warm-gray">× {pr.reps} reps</span>
                          )}
                          <span className="text-[10px] text-warm-gray">{pr.date}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* ── Section 5: Insights preview ─── */}
            <div>
              <h3 className="text-xs font-semibold text-warm-gray uppercase tracking-widest mb-3">
                Data-Driven Insights (included in PDF)
              </h3>
              <div className="space-y-2.5">
                {/* Logging */}
                <div className={cn(
                  "rounded-xl border px-4 py-3 flex items-start gap-3",
                  data.loggingConsistency >= 0.85
                    ? "bg-sage/5 border-sage/20"
                    : data.loggingConsistency < 0.6
                    ? "bg-terracotta/5 border-terracotta/20"
                    : "bg-sand/30 border-sand/60"
                )}>
                  <InsightIcon type={data.loggingConsistency >= 0.85 ? "success" : data.loggingConsistency < 0.6 ? "warning" : "info"} />
                  <div>
                    <p className="text-sm font-semibold text-espresso">
                      Logging Consistency — {Math.round(data.loggingConsistency * 100)}%
                    </p>
                    <p className="text-xs text-warm-gray mt-0.5">
                      {data.loggingDays} of {data.periodDays} days tracked.{" "}
                      {data.loggingConsistency >= 0.85
                        ? "Excellent — your data is highly reliable."
                        : data.loggingConsistency < 0.6
                        ? "Aim for 80%+ to get accurate trend data."
                        : "Good — closing the gaps improves accuracy."}
                    </p>
                  </div>
                </div>

                {/* Weight rate */}
                {data.weeklyWeightChange !== null && (
                  <div className={cn(
                    "rounded-xl border px-4 py-3 flex items-start gap-3",
                    Math.abs(data.weeklyWeightChange) <= 0.5 && data.weeklyWeightChange >= 0.1
                      ? "bg-sage/5 border-sage/20"
                      : data.weeklyWeightChange > 0.7 || data.weeklyWeightChange < 0.05
                      ? "bg-terracotta/5 border-terracotta/20"
                      : "bg-sand/30 border-sand/60"
                  )}>
                    <InsightIcon type={
                      data.weeklyWeightChange >= 0.1 && data.weeklyWeightChange <= 0.5 ? "success" :
                      data.weeklyWeightChange > 0.7 ? "warning" : "info"
                    } />
                    <div>
                      <p className="text-sm font-semibold text-espresso">
                        Weight Rate — {data.weeklyWeightChange >= 0 ? "+" : ""}{data.weeklyWeightChange.toFixed(2)} kg/week
                      </p>
                      <p className="text-xs text-warm-gray mt-0.5">
                        {data.weeklyWeightChange >= 0.1 && data.weeklyWeightChange <= 0.5
                          ? "Ideal lean bulk pace — gaining muscle without excess fat."
                          : data.weeklyWeightChange > 0.5
                          ? "Pace is high — consider reducing intake by 200 kcal to slow fat gain."
                          : "Too slow for a bulk — consider adding 200 kcal to your daily intake."}
                      </p>
                    </div>
                  </div>
                )}

                {/* Protein */}
                {data.avgProtein !== null && data.currentWeight !== null && (
                  <div className={cn(
                    "rounded-xl border px-4 py-3 flex items-start gap-3",
                    (data.avgProtein / data.currentWeight) >= 2.0
                      ? "bg-sage/5 border-sage/20"
                      : (data.avgProtein / data.currentWeight) < 1.6
                      ? "bg-terracotta/5 border-terracotta/20"
                      : "bg-sand/30 border-sand/60"
                  )}>
                    <InsightIcon type={
                      (data.avgProtein / data.currentWeight) >= 2.0 ? "success" :
                      (data.avgProtein / data.currentWeight) < 1.6 ? "warning" : "info"
                    } />
                    <div>
                      <p className="text-sm font-semibold text-espresso">
                        Protein — {data.avgProtein}g/day ({((data.avgProtein / data.currentWeight)).toFixed(1)}g/kg)
                      </p>
                      <p className="text-xs text-warm-gray mt-0.5">
                        {(data.avgProtein / data.currentWeight) >= 2.0
                          ? "Excellent protein intake — fully supporting muscle protein synthesis."
                          : (data.avgProtein / data.currentWeight) < 1.6
                          ? `Below optimal. Target: ${Math.round(data.currentWeight * 2)}g/day (2g/kg) for peak muscle growth.`
                          : "Adequate protein. Nudging toward 2g/kg would maximise muscle retention."}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* ── Download CTA ─── */}
            <div className="rounded-2xl border-2 border-dashed border-gold/30 bg-gold/5 px-6 py-8 text-center space-y-3">
              <FileText className="h-10 w-10 text-gold mx-auto" />
              <h3 className="text-base font-semibold text-espresso">
                Get your full {data.periodDays}-day report as a branded PDF
              </h3>
              <p className="text-sm text-warm-gray max-w-md mx-auto">
                6-page premium document — all body metrics, nutrition breakdown, training PRs,
                weekly scores, and personalised recommendations. Designed to match BulkOS.
              </p>
              <Button onClick={handleDownload} disabled={generating} className="mx-auto">
                {generating ? (
                  <><Loader2 className="h-4 w-4 animate-spin mr-2" /> Building PDF…</>
                ) : (
                  <><Download className="h-4 w-4 mr-2" /> Download PDF Report</>
                )}
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
