"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { BarChart3, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/Button";
import {
  ChartCard,
  WeightTrendChart,
  CalorieSurplusChart,
  MacroStackedAreaChart,
  ProteinPerKgChart,
  WeightVelocityChart,
  BMIProgressChart,
  ConsistencyHeatmap,
  CorrelationScatter,
} from "@/components/charts";
import { useAnalyticsData } from "@/hooks/useAnalyticsData";
import type { TimeRange } from "@/lib/analytics";
import { Skeleton } from "@/components/ui/Skeleton";

const RANGES: { label: string; value: TimeRange }[] = [
  { label: "7D", value: "7D" },
  { label: "30D", value: "30D" },
  { label: "90D", value: "90D" },
  { label: "All Time", value: "ALL" },
];

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  show: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.45, delay: i * 0.07, ease: [0.25, 0.46, 0.45, 0.94] as [number, number, number, number] },
  }),
};

function SkeletonChart() {
  return (
    <div className="bg-ivory rounded-2xl border border-sand/60 shadow-warm-md p-5 md:p-6">
      <div className="h-4 w-40 rounded-full bg-sand/60 shimmer mb-4" />
      <div className="h-64 rounded-xl bg-sand/30 shimmer" />
    </div>
  );
}

function AnalyticsEmptyState({ loggedDays }: { loggedDays: number }) {
  const router = useRouter();
  const needed = 7;
  const pct = Math.min(100, Math.round((loggedDays / needed) * 100));

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] }}
      className="flex flex-col items-center justify-center py-20 text-center px-4"
    >
      <motion.div
        initial={{ scale: 0.85, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: 0.1, duration: 0.4 }}
        className="h-20 w-20 rounded-2xl bg-gold/10 border-2 border-gold/20 flex items-center justify-center mx-auto mb-6"
      >
        <BarChart3 className="h-9 w-9 text-gold/50" strokeWidth={1.25} />
      </motion.div>

      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
        <h2 className="font-display text-2xl font-semibold text-espresso mb-2">
          Keep logging!
        </h2>
        <p className="text-warm-gray text-sm max-w-xs mx-auto mb-6 leading-relaxed">
          Charts unlock after <strong className="text-espresso">7 days</strong> of data.
          You&apos;re {loggedDays} day{loggedDays !== 1 ? "s" : ""} in — almost there.
        </p>
      </motion.div>

      {/* Progress bar */}
      <motion.div
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="w-full max-w-xs mb-6"
      >
        <div className="flex justify-between text-xs text-warm-gray mb-2">
          <span>{loggedDays} / {needed} days</span>
          <span>{pct}%</span>
        </div>
        <div className="h-2.5 bg-sand/50 rounded-full overflow-hidden">
          <motion.div
            className="h-full bg-gold rounded-full"
            initial={{ width: 0 }}
            animate={{ width: `${pct}%` }}
            transition={{ delay: 0.4, duration: 0.8, ease: "easeOut" }}
          />
        </div>
        {/* Day dots */}
        <div className="flex justify-between mt-3">
          {Array.from({ length: needed }).map((_, i) => (
            <div
              key={i}
              className={`h-2.5 w-2.5 rounded-full transition-colors ${
                i < loggedDays ? "bg-gold" : "bg-sand/60"
              }`}
            />
          ))}
        </div>
      </motion.div>

      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.45 }}>
        <Button variant="primary" size="md" onClick={() => router.push("/log")}>
          Log today <ArrowRight className="h-3.5 w-3.5" />
        </Button>
      </motion.div>
    </motion.div>
  );
}

export default function AnalyticsPage() {
  const [range, setRange] = useState<TimeRange>("30D");
  const data = useAnalyticsData(range);

  // Count unique days with any weight data across ALL time (not just current range)
  const totalWeightDays = data.rawLogs.filter((l) => l.weight_kg !== null).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3"
      >
        <div>
          <h1 className="font-display text-2xl font-semibold text-espresso">Analytics</h1>
          <p className="text-sm text-warm-gray mt-0.5">Deep-dive into your progress data.</p>
        </div>

        {/* Time range pills */}
        <div className="flex items-center gap-1 bg-cream rounded-xl p-1 border border-sand/60 self-start sm:self-auto">
          {RANGES.map(({ label, value }) => (
            <button
              key={value}
              onClick={() => setRange(value)}
              className={`relative px-3.5 py-1.5 text-sm rounded-lg font-medium transition-all duration-200 ${
                range === value
                  ? "text-espresso"
                  : "text-warm-gray hover:text-charcoal"
              }`}
            >
              {range === value && (
                <motion.div
                  layoutId="range-pill"
                  className="absolute inset-0 bg-gold/20 rounded-lg border border-gold/40"
                  transition={{ type: "spring", stiffness: 400, damping: 30 }}
                />
              )}
              <span className="relative">{label}</span>
            </button>
          ))}
        </div>
      </motion.div>

      {/* Empty state — less than 7 logged weight days */}
      {!data.loading && totalWeightDays < 7 && (
        <AnalyticsEmptyState loggedDays={totalWeightDays} />
      )}

      {/* Chart grid — only when enough data */}
      {!data.loading && totalWeightDays < 7 ? null : data.loading ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {Array.from({ length: 8 }).map((_, i) => (
            <SkeletonChart key={i} />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {/* Weight Trend — full width */}
          <motion.div
            className="lg:col-span-2"
            custom={0}
            initial="hidden"
            animate="show"
            variants={fadeUp}
          >
            <ChartCard
              title="Weight Trend"
              subtitle="Daily readings with 7-day moving average"
              tooltip="The dashed line is a 7-day simple moving average — smooths out daily fluctuations so you can see true progress. The gold dashed line is your goal weight."
            >
              <WeightTrendChart data={data.weightChart} goalWeight={data.goalWeight} />
            </ChartCard>
          </motion.div>

          {/* Calorie Surplus */}
          <motion.div custom={1} initial="hidden" animate="show" variants={fadeUp}>
            <ChartCard
              title="Calorie Surplus"
              subtitle="Weekly average vs. target"
              tooltip="Bars show average daily surplus per week (green = above target, red = below). The gold line shows cumulative surplus — 7,700 kcal ≈ 1 kg of tissue gained."
            >
              <CalorieSurplusChart data={data.surplusChart} recommendedSurplus={300} />
            </ChartCard>
          </motion.div>

          {/* Macro Breakdown */}
          <motion.div custom={2} initial="hidden" animate="show" variants={fadeUp}>
            <ChartCard
              title="Macro Breakdown"
              subtitle="Protein · Carbs · Fats over time"
              tooltip="Toggle between absolute grams and percentage of total calories. Stacked areas sum to your daily total."
            >
              <MacroStackedAreaChart data={data.macroStack} />
            </ChartCard>
          </motion.div>

          {/* Protein per kg */}
          <motion.div custom={3} initial="hidden" animate="show" variants={fadeUp}>
            <ChartCard
              title="Protein Intake"
              subtitle="g per kg bodyweight"
              tooltip="The green shaded band (1.6–2.2 g/kg) is the evidence-based range for maximising muscle protein synthesis during a bulk."
            >
              <ProteinPerKgChart data={data.proteinKgChart} />
            </ChartCard>
          </motion.div>

          {/* Weight Velocity */}
          <motion.div custom={4} initial="hidden" animate="show" variants={fadeUp}>
            <ChartCard
              title="Weight Velocity"
              subtitle="Weekly rate of gain"
              tooltip="Optimal bulk pace is 0.25–0.5 kg/week (green). Faster risks excess fat gain; slower suggests a larger surplus is needed."
            >
              <WeightVelocityChart data={data.velocityChart} />
            </ChartCard>
          </motion.div>

          {/* BMI — conditional on having height */}
          {data.heightCm && (
            <motion.div custom={5} initial="hidden" animate="show" variants={fadeUp}>
              <ChartCard
                title="BMI Over Time"
                subtitle="Body mass index trajectory"
                tooltip="Background bands show WHO BMI categories. BMI is a rough population metric — use it as one signal, not a target."
              >
                <BMIProgressChart data={data.bmiChart} />
              </ChartCard>
            </motion.div>
          )}

          {/* Consistency Heatmap — full width */}
          <motion.div
            className={data.heightCm ? "lg:col-span-2" : "lg:col-span-2"}
            custom={6}
            initial="hidden"
            animate="show"
            variants={fadeUp}
          >
            <ChartCard
              title="Logging Consistency"
              subtitle="12-week activity heatmap"
              tooltip="Darker = more complete log. Level 1: weight or calories only. Level 2: weight + calories. Level 3: all macros logged."
            >
              <ConsistencyHeatmap data={data.consistencyGrid} />
            </ChartCard>
          </motion.div>

          {/* Correlation Scatter — full width */}
          <motion.div
            className="lg:col-span-2"
            custom={7}
            initial="hidden"
            animate="show"
            variants={fadeUp}
          >
            <ChartCard
              title="Surplus vs. Weight Change"
              subtitle="Weekly correlation — does eating more actually move the scale?"
              tooltip="Each dot is one week. The dashed trend line shows the estimated linear relationship. A steep positive slope means your calorie tracking is accurate and your body responds predictably."
            >
              <CorrelationScatter data={data.correlationPoints} />
            </ChartCard>
          </motion.div>
        </div>
      )}
    </div>
  );
}
