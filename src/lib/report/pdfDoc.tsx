// PDF rendered with @react-pdf/renderer — client-only, loaded via dynamic import
import React from "react";
import {
  Document, Page, Text, View, StyleSheet,
} from "@react-pdf/renderer";
import type { ReportData } from "@/hooks/useReportData";
import type { Grade } from "@/lib/weeklyScore";

// ── Palette ───────────────────────────────────────────────────────────────────
const C = {
  espresso:  "#2C1810",
  gold:      "#C9A96E",
  goldLight: "#E8D5A8",
  goldDark:  "#A87E4A",
  ivory:     "#FAF8F5",
  cream:     "#F2EDE6",
  sand:      "#E8E0D4",
  warmGray:  "#9B8E87",
  charcoal:  "#3D3530",
  sage:      "#5B8A5B",
  terracotta:"#C4826A",
  rose:      "#C05252",
  white:     "#FFFFFF",
};

const GRADE_COLOR: Record<Grade, string> = {
  A: C.gold, B: C.sage, C: C.warmGray, D: C.terracotta, F: C.rose,
};

// ── Styles ────────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  page: {
    fontFamily: "Helvetica",
    backgroundColor: C.ivory,
    padding: 0,
  },
  coverPage: {
    fontFamily: "Helvetica",
    backgroundColor: C.espresso,
    padding: 0,
  },

  // Cover
  coverContent: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 60,
  },
  coverLogo: {
    width: 52,
    height: 52,
    backgroundColor: C.gold,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 20,
  },
  coverLogoText: {
    fontSize: 26,
    fontFamily: "Helvetica-Bold",
    color: C.espresso,
  },
  coverBrand: {
    fontSize: 28,
    fontFamily: "Helvetica-Bold",
    color: C.white,
    letterSpacing: 1,
    marginBottom: 6,
  },
  coverBrandGold: {
    color: C.gold,
  },
  coverDivider: {
    width: 60,
    height: 2,
    backgroundColor: C.gold,
    marginVertical: 24,
  },
  coverTitle: {
    fontSize: 13,
    fontFamily: "Helvetica",
    color: C.goldLight,
    letterSpacing: 3,
    textTransform: "uppercase",
    marginBottom: 36,
  },
  coverName: {
    fontSize: 22,
    fontFamily: "Helvetica-Bold",
    color: C.white,
    marginBottom: 8,
  },
  coverMeta: {
    fontSize: 10,
    color: C.warmGray,
    marginBottom: 4,
    letterSpacing: 0.5,
  },
  coverFooter: {
    position: "absolute",
    bottom: 36,
    left: 0,
    right: 0,
    alignItems: "center",
  },
  coverFooterText: {
    fontSize: 8,
    color: "#6B5E55",
    letterSpacing: 1,
  },

  // Layout
  body: {
    flex: 1,
    paddingHorizontal: 44,
    paddingVertical: 40,
  },
  row: {
    flexDirection: "row",
    gap: 12,
  },
  col: {
    flex: 1,
  },

  // Section header
  sectionLabel: {
    fontSize: 7.5,
    fontFamily: "Helvetica-Bold",
    color: C.warmGray,
    letterSpacing: 2,
    textTransform: "uppercase",
    marginBottom: 4,
  },
  sectionTitle: {
    fontSize: 18,
    fontFamily: "Helvetica-Bold",
    color: C.espresso,
    marginBottom: 6,
  },
  sectionDivider: {
    height: 2,
    backgroundColor: C.gold,
    width: 40,
    marginBottom: 20,
  },

  // Page header band
  pageHeaderBand: {
    backgroundColor: C.espresso,
    paddingHorizontal: 44,
    paddingVertical: 18,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 0,
  },
  pageHeaderTitle: {
    fontSize: 11,
    fontFamily: "Helvetica-Bold",
    color: C.gold,
    letterSpacing: 1.5,
    textTransform: "uppercase",
  },
  pageHeaderSub: {
    fontSize: 8,
    color: C.warmGray,
  },

  // Stat cards
  statCard: {
    flex: 1,
    backgroundColor: C.white,
    borderRadius: 10,
    padding: 14,
    borderWidth: 1,
    borderColor: C.sand,
  },
  statCardGold: {
    flex: 1,
    backgroundColor: C.gold,
    borderRadius: 10,
    padding: 14,
  },
  statLabel: {
    fontSize: 7,
    fontFamily: "Helvetica-Bold",
    color: C.warmGray,
    letterSpacing: 1.5,
    textTransform: "uppercase",
    marginBottom: 6,
  },
  statLabelGold: {
    fontSize: 7,
    fontFamily: "Helvetica-Bold",
    color: C.espresso,
    letterSpacing: 1.5,
    textTransform: "uppercase",
    marginBottom: 6,
  },
  statValue: {
    fontSize: 22,
    fontFamily: "Helvetica-Bold",
    color: C.espresso,
  },
  statValueGold: {
    fontSize: 22,
    fontFamily: "Helvetica-Bold",
    color: C.espresso,
  },
  statUnit: {
    fontSize: 10,
    color: C.warmGray,
    fontFamily: "Helvetica",
  },
  statUnitGold: {
    fontSize: 10,
    color: C.espresso,
    fontFamily: "Helvetica",
  },
  statSub: {
    fontSize: 8,
    color: C.warmGray,
    marginTop: 2,
  },

  // Progress bar
  progressTrack: {
    height: 7,
    backgroundColor: C.sand,
    borderRadius: 4,
    overflow: "hidden",
  },
  progressFill: {
    height: 7,
    backgroundColor: C.gold,
    borderRadius: 4,
  },
  progressFillSage: {
    height: 7,
    backgroundColor: C.sage,
    borderRadius: 4,
  },
  progressFillTerra: {
    height: 7,
    backgroundColor: C.terracotta,
    borderRadius: 4,
  },

  // Table
  tableHeader: {
    flexDirection: "row",
    backgroundColor: C.cream,
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 7,
    marginBottom: 2,
  },
  tableRow: {
    flexDirection: "row",
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderBottomWidth: 1,
    borderBottomColor: C.sand,
  },
  tableCell: {
    flex: 1,
    fontSize: 8.5,
    color: C.charcoal,
  },
  tableCellBold: {
    flex: 1,
    fontSize: 8.5,
    fontFamily: "Helvetica-Bold",
    color: C.espresso,
  },
  tableCellHeader: {
    flex: 1,
    fontSize: 7,
    fontFamily: "Helvetica-Bold",
    color: C.warmGray,
    letterSpacing: 1,
    textTransform: "uppercase",
  },
  tableCellGold: {
    flex: 1,
    fontSize: 9,
    fontFamily: "Helvetica-Bold",
    color: C.goldDark,
  },

  // Insight block
  insightBlock: {
    borderRadius: 10,
    padding: 14,
    marginBottom: 10,
    flexDirection: "row",
    gap: 10,
  },
  insightBullet: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginTop: 3,
    flexShrink: 0,
  },
  insightTitle: {
    fontSize: 9.5,
    fontFamily: "Helvetica-Bold",
    color: C.espresso,
    marginBottom: 2,
  },
  insightDetail: {
    fontSize: 8.5,
    color: C.charcoal,
    lineHeight: 1.5,
  },

  // Footer
  pageFooter: {
    position: "absolute",
    bottom: 20,
    left: 44,
    right: 44,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  pageFooterText: {
    fontSize: 7.5,
    color: C.warmGray,
  },
  pageFooterGold: {
    fontSize: 7.5,
    color: C.gold,
    fontFamily: "Helvetica-Bold",
  },

  // Mini bar chart item
  barChartRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 4,
    height: 50,
  },
  barChartBar: {
    width: 14,
    backgroundColor: C.gold,
    borderRadius: 2,
  },
  barChartLabel: {
    fontSize: 7,
    color: C.warmGray,
    textAlign: "center",
    marginTop: 3,
  },

  // Grade badge
  gradeBadge: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  gradeBadgeText: {
    fontSize: 14,
    fontFamily: "Helvetica-Bold",
    color: C.white,
  },

  // Measurement change
  measureRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 7,
    borderBottomWidth: 1,
    borderBottomColor: C.sand,
  },
  measureLabel: {
    fontSize: 8.5,
    color: C.charcoal,
  },
  measureChange: {
    fontSize: 9,
    fontFamily: "Helvetica-Bold",
  },
});

// ── Helper components ─────────────────────────────────────────────────────────

function PageFooter({ page, total, name }: { page: number; total: number; name: string }) {
  return (
    <View style={s.pageFooter} fixed>
      <Text style={s.pageFooterText}>{name} · BulkOS Performance Report</Text>
      <Text style={s.pageFooterGold}>
        {page} / {total}
      </Text>
    </View>
  );
}

function PageHeader({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <View style={s.pageHeaderBand}>
      <Text style={s.pageHeaderTitle}>{title}</Text>
      <Text style={s.pageHeaderSub}>{subtitle}</Text>
    </View>
  );
}

function SectionHeading({ label, title }: { label: string; title: string }) {
  return (
    <View style={{ marginBottom: 18 }}>
      <Text style={s.sectionLabel}>{label}</Text>
      <Text style={s.sectionTitle}>{title}</Text>
      <View style={s.sectionDivider} />
    </View>
  );
}

function ProgressBar({ pct, color = "gold" }: { pct: number; color?: "gold" | "sage" | "terra" }) {
  const fillStyle = color === "sage" ? s.progressFillSage : color === "terra" ? s.progressFillTerra : s.progressFill;
  const safePct = Math.min(100, Math.max(0, pct));
  return (
    <View style={s.progressTrack}>
      <View style={[fillStyle, { width: `${safePct}%` as unknown as number }]} />
    </View>
  );
}

function StatCard({
  label, value, unit, sub, gold = false,
}: {
  label: string; value: string; unit?: string; sub?: string; gold?: boolean;
}) {
  return (
    <View style={gold ? s.statCardGold : s.statCard}>
      <Text style={gold ? s.statLabelGold : s.statLabel}>{label}</Text>
      <Text style={gold ? s.statValueGold : s.statValue}>
        {value}
        {unit && <Text style={gold ? s.statUnitGold : s.statUnit}> {unit}</Text>}
      </Text>
      {sub && <Text style={s.statSub}>{sub}</Text>}
    </View>
  );
}

function MacroRow({
  label, value, target, color = "gold",
}: {
  label: string; value: number | null; target?: number | null; color?: "gold" | "sage" | "terra";
}) {
  if (value === null) return null;
  const pct = target ? Math.round((value / target) * 100) : null;
  return (
    <View style={{ marginBottom: 12 }}>
      <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 4 }}>
        <Text style={{ fontSize: 9, color: C.charcoal }}>{label}</Text>
        <Text style={{ fontSize: 9, fontFamily: "Helvetica-Bold", color: C.espresso }}>
          {value.toLocaleString()}{pct !== null ? `  (${pct}% of target)` : ""}
        </Text>
      </View>
      <ProgressBar pct={pct ?? 80} color={color} />
    </View>
  );
}

// ── Insight generation ────────────────────────────────────────────────────────

interface Insight {
  type: "success" | "warning" | "info";
  title: string;
  detail: string;
}

function generateInsights(data: ReportData): Insight[] {
  const insights: Insight[] = [];

  // Logging consistency
  const cPct = Math.round(data.loggingConsistency * 100);
  if (cPct < 60) {
    insights.push({
      type: "warning",
      title: "Improve Logging Consistency",
      detail: `You logged ${cPct}% of days in this period. Aim for 80%+ — accurate data = accurate feedback. Try logging at the same time each day.`,
    });
  } else if (cPct >= 85) {
    insights.push({
      type: "success",
      title: "Excellent Logging Habit",
      detail: `${cPct}% consistency — your data is highly reliable. This is the foundation of measurable progress.`,
    });
  } else {
    insights.push({
      type: "info",
      title: "Good Logging Consistency",
      detail: `${cPct}% consistency is solid. Closing those gaps will make your trends even more accurate.`,
    });
  }

  // Weight gain rate
  if (data.weeklyWeightChange !== null && data.targetWeightKg !== null && data.currentWeight !== null) {
    const gaining = data.targetWeightKg > (data.currentWeight ?? 0);
    if (gaining) {
      const rate = data.weeklyWeightChange;
      if (rate < 0.1) {
        insights.push({
          type: "warning",
          title: "Weight Gain Too Slow",
          detail: `Averaging +${rate.toFixed(2)} kg/week. For lean muscle gain, aim for 0.25–0.5 kg/week. Add ~200 kcal to your daily intake.`,
        });
      } else if (rate > 0.7) {
        insights.push({
          type: "warning",
          title: "Weight Gain Pace High",
          detail: `+${rate.toFixed(2)} kg/week risks adding excess fat. Reduce intake by 200–300 kcal to slow to 0.3–0.5 kg/week.`,
        });
      } else {
        insights.push({
          type: "success",
          title: "Optimal Bulk Rate",
          detail: `+${rate.toFixed(2)} kg/week is the sweet spot for lean muscle gain. You're progressing without excess fat storage.`,
        });
      }
    } else {
      if (data.weeklyWeightChange >= 0) {
        insights.push({
          type: "info",
          title: "Maintaining Weight",
          detail: `Weight is stable at ${data.currentWeight.toFixed(1)} kg. If the goal is to cut, increase your activity or reduce intake by 300–500 kcal.`,
        });
      }
    }
  }

  // Protein
  if (data.avgProtein !== null && data.currentWeight !== null && data.currentWeight > 0) {
    const g_per_kg = data.avgProtein / data.currentWeight;
    if (g_per_kg < 1.6) {
      const target = Math.round(data.currentWeight * 2.0);
      insights.push({
        type: "warning",
        title: "Protein Below Optimal",
        detail: `Averaging ${data.avgProtein}g (${g_per_kg.toFixed(1)}g/kg). For muscle growth, target ≥2g/kg = ${target}g/day. Add a protein shake or high-protein meal.`,
      });
    } else if (g_per_kg >= 2.0) {
      insights.push({
        type: "success",
        title: "Protein Intake Excellent",
        detail: `${data.avgProtein}g/day (${g_per_kg.toFixed(1)}g/kg) — well above the muscle-building threshold. Muscle protein synthesis is fully supported.`,
      });
    } else {
      insights.push({
        type: "info",
        title: "Protein Intake Adequate",
        detail: `${data.avgProtein}g/day (${g_per_kg.toFixed(1)}g/kg). You're in the functional range — nudging to 2g/kg would optimize muscle retention.`,
      });
    }
  }

  // Training frequency
  if (data.totalWorkouts > 0) {
    const perWeek = data.totalWorkouts / (data.periodDays / 7);
    if (perWeek < 3) {
      insights.push({
        type: "warning",
        title: "Increase Training Frequency",
        detail: `${perWeek.toFixed(1)} sessions/week logged. 4–5 sessions is optimal for a bulk — more stimulus, more growth. Try adding one extra session.`,
      });
    } else {
      insights.push({
        type: "success",
        title: "Strong Training Frequency",
        detail: `${perWeek.toFixed(1)} sessions/week — sufficient volume for progressive overload. Ensure you're adding weight or reps over time.`,
      });
    }
  } else {
    insights.push({
      type: "info",
      title: "Start Logging Workouts",
      detail: `No workouts recorded this period. Tracking your lifts is essential — you'll see strength trends and spot plateaus before they happen.`,
    });
  }

  // FFMI
  if (data.ffmi !== null) {
    if (data.ffmi >= 22) {
      insights.push({
        type: "success",
        title: "Above-Average Muscle Development",
        detail: `FFMI of ${data.ffmi.toFixed(1)} — you're in the "above average" to "excellent" range for natural athletes. Strong foundation for continued gains.`,
      });
    } else if (data.ffmi < 18) {
      insights.push({
        type: "info",
        title: "Significant Gain Potential",
        detail: `FFMI of ${data.ffmi.toFixed(1)} — you're in the beginner/early intermediate range. This is when gains come fastest — stay consistent.`,
      });
    }
  }

  // Weekly score
  if (data.avgWeeklyScore !== null) {
    if (data.avgWeeklyScore >= 80) {
      insights.push({
        type: "success",
        title: "Excellent Weekly Performance",
        detail: `Average weekly score of ${data.avgWeeklyScore}/100 — top-tier consistency. You're executing the plan at a high level.`,
      });
    } else if (data.avgWeeklyScore < 55) {
      insights.push({
        type: "warning",
        title: "Weekly Score Needs Attention",
        detail: `Average score of ${data.avgWeeklyScore}/100. Focus on the two biggest levers: logging every day and hitting your calorie target within ±10%.`,
      });
    }
  }

  return insights.slice(0, 6);
}

// ── Mini weight bar chart ─────────────────────────────────────────────────────

function WeightMiniChart({ samples }: { samples: { date: string; weight: number }[] }) {
  if (samples.length < 2) return null;
  const weights = samples.map((s) => s.weight);
  const min = Math.min(...weights);
  const max = Math.max(...weights);
  const range = max - min || 1;
  const maxBarH = 44;
  const minBarH = 6;

  return (
    <View>
      <View style={{ flexDirection: "row", alignItems: "flex-end", gap: 4, height: 50, marginBottom: 4 }}>
        {samples.map((s, i) => {
          const h = minBarH + ((s.weight - min) / range) * (maxBarH - minBarH);
          const isLast = i === samples.length - 1;
          return (
            <View
              key={i}
              style={{
                width: Math.max(8, Math.floor(240 / samples.length) - 4),
                height: h,
                backgroundColor: isLast ? C.goldDark : C.gold,
                borderRadius: 3,
                opacity: isLast ? 1 : 0.7,
              }}
            />
          );
        })}
      </View>
      <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
        <Text style={{ fontSize: 7, color: C.warmGray }}>{samples[0].date.slice(5)}</Text>
        <Text style={{ fontSize: 7, color: C.warmGray }}>{samples[samples.length - 1].date.slice(5)}</Text>
      </View>
    </View>
  );
}

// ── Grade donut (simple badge row) ───────────────────────────────────────────

function ScoreRow({
  weekLabel, score, grade,
}: {
  weekLabel: string; score: number; grade: Grade;
}) {
  const color = GRADE_COLOR[grade];
  return (
    <View style={[s.tableRow, { alignItems: "center" }]}>
      <Text style={[s.tableCell, { flex: 2 }]}>{weekLabel}</Text>
      <View style={{ flex: 1, flexDirection: "row", alignItems: "center", gap: 6 }}>
        <View style={[s.progressTrack, { flex: 1 }]}>
          <View style={{ height: 7, width: `${score}%` as unknown as number, backgroundColor: color, borderRadius: 4 }} />
        </View>
        <Text style={{ fontSize: 8, fontFamily: "Helvetica-Bold", color, width: 22 }}>{score}</Text>
      </View>
      <View style={{ flex: 0.5, alignItems: "flex-end" }}>
        <View style={[s.gradeBadge, { backgroundColor: color, width: 24, height: 24, borderRadius: 6 }]}>
          <Text style={[s.gradeBadgeText, { fontSize: 11 }]}>{grade}</Text>
        </View>
      </View>
    </View>
  );
}

// ── BMI label ─────────────────────────────────────────────────────────────────

function bmiLabel(bmi: number): string {
  if (bmi < 18.5) return "Underweight";
  if (bmi < 25) return "Normal";
  if (bmi < 30) return "Overweight";
  return "Obese";
}

function ffmiLabel(ffmi: number, gender: string | null): string {
  const female = gender === "female";
  if (female) {
    if (ffmi < 15) return "Beginner";
    if (ffmi < 17) return "Average";
    if (ffmi < 19) return "Above average";
    if (ffmi < 21) return "Excellent";
    return "Elite";
  }
  if (ffmi < 18) return "Beginner";
  if (ffmi < 20) return "Average";
  if (ffmi < 22) return "Above average";
  if (ffmi < 24) return "Excellent";
  return "Elite";
}

// ── Document ──────────────────────────────────────────────────────────────────

export function BulkOSReport({ data }: { data: ReportData }) {
  const insights = generateInsights(data);
  const hasWorkouts = data.totalWorkouts > 0;
  const hasMeasurements = data.measurementChanges.length > 0;
  const totalPages = 5 + (hasWorkouts ? 1 : 0);

  const periodLabel = `Last ${data.periodDays} days · Generated ${data.generatedAt}`;

  return (
    <Document title={`BulkOS Report — ${data.userName}`} author="BulkOS">

      {/* ── PAGE 1: COVER ─────────────────────────────────────────────── */}
      <Page size="A4" style={s.coverPage}>
        <View style={s.coverContent}>
          {/* Logo */}
          <View style={s.coverLogo}>
            <Text style={s.coverLogoText}>B</Text>
          </View>

          {/* Brand */}
          <Text style={s.coverBrand}>
            Bulk<Text style={s.coverBrandGold}>OS</Text>
          </Text>

          <View style={s.coverDivider} />

          <Text style={s.coverTitle}>Performance Report</Text>

          <Text style={s.coverName}>{data.userName}</Text>
          <Text style={s.coverMeta}>{data.userEmail}</Text>
          <Text style={[s.coverMeta, { marginTop: 8 }]}>
            Analysis period: {data.periodDays} days
          </Text>
          <Text style={s.coverMeta}>Generated: {data.generatedAt}</Text>
        </View>

        <View style={s.coverFooter}>
          <Text style={s.coverFooterText}>BULKOS · TRACK · ANALYSE · GROW</Text>
        </View>
      </Page>

      {/* ── PAGE 2: EXECUTIVE SUMMARY ─────────────────────────────────── */}
      <Page size="A4" style={s.page}>
        <PageHeader title="Executive Summary" subtitle={periodLabel} />

        <View style={[s.body, { paddingTop: 28 }]}>
          <SectionHeading label="Overview" title="Key Metrics at a Glance" />

          {/* Top stat cards */}
          <View style={[s.row, { marginBottom: 12 }]}>
            <StatCard
              label="Current Weight"
              value={data.currentWeight ? data.currentWeight.toFixed(1) : "—"}
              unit="kg"
              sub={data.weightChange !== null
                ? `${data.weightChange >= 0 ? "+" : ""}${data.weightChange} kg this period`
                : undefined}
              gold
            />
            <StatCard
              label="Avg Daily Calories"
              value={data.avgCalories ? data.avgCalories.toLocaleString() : "—"}
              unit="kcal"
              sub={data.targetCalories ? `Target: ${data.targetCalories.toLocaleString()} kcal` : undefined}
            />
            <StatCard
              label="Avg Protein"
              value={data.avgProtein ? `${data.avgProtein}` : "—"}
              unit="g/day"
              sub={data.currentWeight ? `${((data.avgProtein ?? 0) / data.currentWeight).toFixed(1)}g per kg BW` : undefined}
            />
          </View>

          <View style={[s.row, { marginBottom: 24 }]}>
            <StatCard
              label="Logging Consistency"
              value={`${Math.round(data.loggingConsistency * 100)}`}
              unit="%"
              sub={`${data.loggingDays} of ${data.periodDays} days logged`}
            />
            <StatCard
              label="Avg Weekly Score"
              value={data.avgWeeklyScore !== null ? `${data.avgWeeklyScore}` : "—"}
              unit="/100"
              sub="Consistency + Cals + Protein"
            />
            <StatCard
              label="Workouts Logged"
              value={`${data.totalWorkouts}`}
              sub={data.totalWorkouts > 0 ? `${(data.totalWorkouts / (data.periodDays / 7)).toFixed(1)} per week` : "No workouts recorded"}
            />
          </View>

          {/* Weight progress bar */}
          {data.targetWeightKg !== null && data.targetProgressPct !== null && (
            <View style={{ marginBottom: 24 }}>
              <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 6 }}>
                <Text style={{ fontSize: 9, fontFamily: "Helvetica-Bold", color: C.espresso }}>
                  Goal Progress — {data.currentWeight?.toFixed(1)} kg → {data.targetWeightKg} kg
                </Text>
                <Text style={{ fontSize: 9, color: C.gold, fontFamily: "Helvetica-Bold" }}>
                  {data.targetProgressPct}% complete
                </Text>
              </View>
              <ProgressBar pct={data.targetProgressPct} />
            </View>
          )}

          {/* Summary paragraph */}
          <View style={{
            backgroundColor: C.espresso,
            borderRadius: 12,
            padding: 18,
            marginBottom: 24,
          }}>
            <Text style={{ fontSize: 8, color: C.goldLight, fontFamily: "Helvetica-Bold", letterSpacing: 1, marginBottom: 8 }}>
              PERIOD SUMMARY
            </Text>
            <Text style={{ fontSize: 9.5, color: C.ivory, lineHeight: 1.7 }}>
              {[
                data.currentWeight
                  ? `Current weight: ${data.currentWeight.toFixed(1)} kg${data.weightChange !== null ? ` (${data.weightChange >= 0 ? "+" : ""}${data.weightChange} kg change)` : ""}.`
                  : null,
                data.weeklyWeightChange !== null
                  ? `Weekly rate: ${data.weeklyWeightChange >= 0 ? "+" : ""}${data.weeklyWeightChange.toFixed(2)} kg/week.`
                  : null,
                data.avgCalories
                  ? `Average intake: ${data.avgCalories.toLocaleString()} kcal/day with ${data.avgProtein}g protein.`
                  : null,
                data.avgWeeklyScore !== null
                  ? `Average weekly performance score: ${data.avgWeeklyScore}/100.`
                  : null,
                data.totalWorkouts > 0
                  ? `Completed ${data.totalWorkouts} workout sessions with ${data.prs.length} personal records.`
                  : null,
              ]
                .filter(Boolean)
                .join(" ")}
            </Text>
          </View>

          {/* Milestones */}
          {data.totalMilestones > 0 && (
            <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
              <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: C.gold }} />
              <Text style={{ fontSize: 9, color: C.charcoal }}>
                <Text style={{ fontFamily: "Helvetica-Bold" }}>{data.achievedMilestones}</Text>
                {" of "}
                <Text style={{ fontFamily: "Helvetica-Bold" }}>{data.totalMilestones}</Text>
                {" milestones achieved"}
              </Text>
            </View>
          )}
        </View>

        <PageFooter page={2} total={totalPages} name={data.userName} />
      </Page>

      {/* ── PAGE 3: BODY COMPOSITION + NUTRITION ──────────────────────── */}
      <Page size="A4" style={s.page}>
        <PageHeader title="Body Composition & Nutrition" subtitle={periodLabel} />

        <View style={[s.body, { paddingTop: 28 }]}>
          <View style={s.row}>
            {/* Left: Body Composition */}
            <View style={[s.col, { marginRight: 16 }]}>
              <SectionHeading label="Body" title="Composition" />

              {/* Weight chart */}
              {data.weightSamples.length >= 2 && (
                <View style={{
                  backgroundColor: C.white,
                  borderRadius: 10,
                  padding: 14,
                  borderWidth: 1,
                  borderColor: C.sand,
                  marginBottom: 14,
                }}>
                  <Text style={s.statLabel}>Weight Trend</Text>
                  <WeightMiniChart samples={data.weightSamples} />
                </View>
              )}

              {/* Body metrics */}
              <View style={{
                backgroundColor: C.white,
                borderRadius: 10,
                padding: 14,
                borderWidth: 1,
                borderColor: C.sand,
                marginBottom: 14,
              }}>
                {data.currentWeight && (
                  <View style={s.measureRow}>
                    <Text style={s.measureLabel}>Body Weight</Text>
                    <Text style={[s.measureChange, { color: C.espresso }]}>
                      {data.currentWeight.toFixed(1)} kg
                    </Text>
                  </View>
                )}
                {data.bmi !== null && (
                  <View style={s.measureRow}>
                    <Text style={s.measureLabel}>BMI</Text>
                    <Text style={[s.measureChange, { color: C.charcoal }]}>
                      {data.bmi} — {bmiLabel(data.bmi)}
                    </Text>
                  </View>
                )}
                {data.bodyFatPct !== null && (
                  <View style={s.measureRow}>
                    <Text style={s.measureLabel}>Body Fat %</Text>
                    <Text style={[s.measureChange, { color: C.charcoal }]}>
                      {data.bodyFatPct.toFixed(1)}%
                    </Text>
                  </View>
                )}
                {data.leanMassKg !== null && (
                  <View style={s.measureRow}>
                    <Text style={s.measureLabel}>Lean Mass</Text>
                    <Text style={[s.measureChange, { color: C.sage }]}>
                      {data.leanMassKg.toFixed(1)} kg
                    </Text>
                  </View>
                )}
                {data.ffmi !== null && (
                  <View style={[s.measureRow, { borderBottomWidth: 0 }]}>
                    <Text style={s.measureLabel}>FFMI</Text>
                    <Text style={[s.measureChange, { color: C.goldDark }]}>
                      {data.ffmi.toFixed(1)} — {ffmiLabel(data.ffmi, data.gender)}
                    </Text>
                  </View>
                )}
                {!data.bmi && (
                  <Text style={{ fontSize: 8, color: C.warmGray, fontStyle: "italic" }}>
                    Add height, age & weight in Settings to unlock body composition metrics.
                  </Text>
                )}
              </View>

              {/* Measurement changes */}
              {hasMeasurements && (
                <View style={{
                  backgroundColor: C.white,
                  borderRadius: 10,
                  padding: 14,
                  borderWidth: 1,
                  borderColor: C.sand,
                }}>
                  <Text style={s.statLabel}>Measurements Change</Text>
                  {data.measurementChanges.map((mc) => (
                    <View key={mc.label} style={s.measureRow}>
                      <Text style={s.measureLabel}>{mc.label}</Text>
                      <Text style={[s.measureChange, {
                        color: mc.change > 0 ? C.sage : mc.change < 0 ? C.terracotta : C.warmGray,
                      }]}>
                        {mc.change >= 0 ? "+" : ""}{mc.change} {mc.unit}
                      </Text>
                    </View>
                  ))}
                </View>
              )}
            </View>

            {/* Right: Nutrition */}
            <View style={s.col}>
              <SectionHeading label="Nutrition" title="Analysis" />

              <View style={{
                backgroundColor: C.white,
                borderRadius: 10,
                padding: 14,
                borderWidth: 1,
                borderColor: C.sand,
                marginBottom: 14,
              }}>
                <Text style={[s.statLabel, { marginBottom: 12 }]}>Average Daily Intake</Text>

                <MacroRow
                  label={`Calories (target: ${data.targetCalories?.toLocaleString() ?? "—"} kcal)`}
                  value={data.avgCalories}
                  target={data.targetCalories}
                  color="gold"
                />
                <MacroRow
                  label={`Protein (target: ${data.targetProteinG ?? "—"}g)`}
                  value={data.avgProtein}
                  target={data.targetProteinG}
                  color="sage"
                />
                <MacroRow
                  label="Carbohydrates"
                  value={data.avgCarbs}
                  color="gold"
                />
                <MacroRow
                  label="Fats"
                  value={data.avgFats}
                  color="terra"
                />
              </View>

              {/* Consistency */}
              <View style={{
                backgroundColor: C.white,
                borderRadius: 10,
                padding: 14,
                borderWidth: 1,
                borderColor: C.sand,
                marginBottom: 14,
              }}>
                <Text style={s.statLabel}>Tracking Consistency</Text>

                <View style={{ marginBottom: 10 }}>
                  <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 4 }}>
                    <Text style={{ fontSize: 8.5, color: C.charcoal }}>Days logged</Text>
                    <Text style={{ fontSize: 8.5, fontFamily: "Helvetica-Bold", color: C.espresso }}>
                      {data.loggingDays} / {data.periodDays} days
                    </Text>
                  </View>
                  <ProgressBar pct={data.loggingConsistency * 100} />
                </View>

                <View>
                  <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 4 }}>
                    <Text style={{ fontSize: 8.5, color: C.charcoal }}>Days with calories logged</Text>
                    <Text style={{ fontSize: 8.5, fontFamily: "Helvetica-Bold", color: C.espresso }}>
                      {data.calorieDays} days
                    </Text>
                  </View>
                  <ProgressBar pct={(data.calorieDays / data.periodDays) * 100} color="sage" />
                </View>
              </View>

              {/* TDEE box */}
              {data.targetCalories && (
                <View style={{ backgroundColor: C.espresso, borderRadius: 10, padding: 14 }}>
                  <Text style={{ fontSize: 7, color: C.goldLight, fontFamily: "Helvetica-Bold", letterSpacing: 1, marginBottom: 8 }}>
                    CALORIE TARGETS
                  </Text>
                  <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 4 }}>
                    <Text style={{ fontSize: 8.5, color: C.ivory }}>Maintenance (TDEE)</Text>
                    <Text style={{ fontSize: 8.5, color: C.gold, fontFamily: "Helvetica-Bold" }}>
                      {(data.targetCalories - 300).toLocaleString()} kcal
                    </Text>
                  </View>
                  <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
                    <Text style={{ fontSize: 8.5, color: C.ivory }}>Bulk target (+300)</Text>
                    <Text style={{ fontSize: 8.5, color: C.gold, fontFamily: "Helvetica-Bold" }}>
                      {data.targetCalories.toLocaleString()} kcal
                    </Text>
                  </View>
                </View>
              )}
            </View>
          </View>
        </View>

        <PageFooter page={3} total={totalPages} name={data.userName} />
      </Page>

      {/* ── PAGE 4: TRAINING (conditional) ────────────────────────────── */}
      {hasWorkouts && (
        <Page size="A4" style={s.page}>
          <PageHeader title="Training Performance" subtitle={periodLabel} />

          <View style={[s.body, { paddingTop: 28 }]}>
            <SectionHeading label="Workout Log" title="Training Analysis" />

            {/* Stat row */}
            <View style={[s.row, { marginBottom: 20 }]}>
              <StatCard label="Sessions" value={`${data.totalWorkouts}`} sub={`${(data.totalWorkouts / (data.periodDays / 7)).toFixed(1)}/week avg`} gold />
              <StatCard label="Total Sets" value={`${data.totalSets}`} />
              <StatCard
                label="Total Volume"
                value={`${data.totalVolumeTonnes.toFixed(1)}`}
                unit="tonnes"
                sub="Reps × Weight summed"
              />
            </View>

            {/* Top exercises */}
            {data.topExercises.length > 0 && (
              <View style={{ marginBottom: 20 }}>
                <Text style={[s.sectionLabel, { marginBottom: 10 }]}>Most Trained Exercises</Text>
                <View style={s.tableHeader}>
                  <Text style={[s.tableCellHeader, { flex: 3 }]}>Exercise</Text>
                  <Text style={s.tableCellHeader}>Sets Logged</Text>
                </View>
                {data.topExercises.map((ex, i) => (
                  <View key={i} style={s.tableRow}>
                    <Text style={[s.tableCellBold, { flex: 3 }]}>{ex.name}</Text>
                    <Text style={s.tableCellGold}>{ex.count}</Text>
                  </View>
                ))}
              </View>
            )}

            {/* PRs */}
            {data.prs.length > 0 && (
              <View>
                <Text style={[s.sectionLabel, { marginBottom: 10 }]}>Personal Records</Text>
                <View style={s.tableHeader}>
                  <Text style={[s.tableCellHeader, { flex: 3 }]}>Exercise</Text>
                  <Text style={s.tableCellHeader}>Best Weight</Text>
                  <Text style={s.tableCellHeader}>Reps</Text>
                  <Text style={s.tableCellHeader}>Date</Text>
                </View>
                {data.prs.map((pr, i) => (
                  <View key={i} style={s.tableRow}>
                    <Text style={[s.tableCellBold, { flex: 3 }]}>{pr.exercise}</Text>
                    <Text style={s.tableCellGold}>{pr.weight_kg} kg</Text>
                    <Text style={s.tableCell}>{pr.reps > 0 ? `× ${pr.reps}` : "—"}</Text>
                    <Text style={s.tableCell}>{pr.date}</Text>
                  </View>
                ))}
              </View>
            )}
          </View>

          <PageFooter page={4} total={totalPages} name={data.userName} />
        </Page>
      )}

      {/* ── PAGE 5: WEEKLY SCORES ──────────────────────────────────────── */}
      <Page size="A4" style={s.page}>
        <PageHeader title="Weekly Performance" subtitle={periodLabel} />

        <View style={[s.body, { paddingTop: 28 }]}>
          <SectionHeading label="Scores" title="Week-by-Week Performance" />

          {/* Score summary stat */}
          <View style={[s.row, { marginBottom: 20 }]}>
            <StatCard
              label="Avg Weekly Score"
              value={data.avgWeeklyScore !== null ? `${data.avgWeeklyScore}` : "—"}
              unit="/100"
              gold
            />
            <StatCard
              label="Scored Weeks"
              value={`${data.weeklyScores.filter((w) => w.hasData).length}`}
              unit={`of ${data.weeklyScores.length}`}
            />
            <StatCard
              label="Best Week"
              value={`${Math.max(...data.weeklyScores.filter((w) => w.hasData).map((w) => w.score), 0)}`}
              unit="/100"
            />
          </View>

          {/* Score table */}
          <View style={s.tableHeader}>
            <Text style={[s.tableCellHeader, { flex: 2 }]}>Week</Text>
            <Text style={[s.tableCellHeader, { flex: 3 }]}>Score</Text>
            <Text style={s.tableCellHeader}>Grade</Text>
          </View>

          {data.weeklyScores.map((w, i) => (
            <ScoreRow key={i} weekLabel={w.weekLabel} score={w.score} grade={w.grade} />
          ))}

          {/* Scoring guide */}
          <View style={{
            marginTop: 24,
            backgroundColor: C.cream,
            borderRadius: 10,
            padding: 14,
          }}>
            <Text style={[s.sectionLabel, { marginBottom: 10 }]}>Scoring Breakdown</Text>
            <View style={{ flexDirection: "row", gap: 20 }}>
              {[
                { label: "Consistency", pts: "40 pts", detail: "Days logged / 7 × 40" },
                { label: "Calories", pts: "35 pts", detail: "Days within ±12% of target" },
                { label: "Protein", pts: "25 pts", detail: "Days ≥90% of protein goal" },
              ].map((item) => (
                <View key={item.label} style={{ flex: 1 }}>
                  <Text style={{ fontSize: 8.5, fontFamily: "Helvetica-Bold", color: C.espresso, marginBottom: 2 }}>
                    {item.label} — <Text style={{ color: C.gold }}>{item.pts}</Text>
                  </Text>
                  <Text style={{ fontSize: 7.5, color: C.warmGray }}>{item.detail}</Text>
                </View>
              ))}
            </View>
          </View>
        </View>

        <PageFooter page={hasWorkouts ? 5 : 4} total={totalPages} name={data.userName} />
      </Page>

      {/* ── PAGE 6: INSIGHTS ──────────────────────────────────────────── */}
      <Page size="A4" style={s.page}>
        <PageHeader title="Insights & Recommendations" subtitle={periodLabel} />

        <View style={[s.body, { paddingTop: 28 }]}>
          <SectionHeading label="Data-Driven" title="Personalised Insights" />

          <Text style={{ fontSize: 9, color: C.warmGray, marginBottom: 20, lineHeight: 1.6 }}>
            The following insights are generated from your {data.periodDays}-day data. They are specific to your numbers — not generic advice.
          </Text>

          {insights.map((ins, i) => {
            const bgColor = ins.type === "success" ? "#5B8A5B10" : ins.type === "warning" ? "#C4826A10" : "#9B8E8710";
            const bulletColor = ins.type === "success" ? C.sage : ins.type === "warning" ? C.terracotta : C.warmGray;
            return (
              <View key={i} style={[s.insightBlock, { backgroundColor: bgColor }]}>
                <View style={[s.insightBullet, { backgroundColor: bulletColor }]} />
                <View style={{ flex: 1 }}>
                  <Text style={s.insightTitle}>{ins.title}</Text>
                  <Text style={s.insightDetail}>{ins.detail}</Text>
                </View>
              </View>
            );
          })}

          {/* Closing note */}
          <View style={{
            marginTop: 20,
            backgroundColor: C.espresso,
            borderRadius: 12,
            padding: 20,
          }}>
            <Text style={{ fontSize: 8, color: C.goldLight, fontFamily: "Helvetica-Bold", letterSpacing: 1, marginBottom: 10 }}>
              KEEP GOING
            </Text>
            <Text style={{ fontSize: 9.5, color: C.ivory, lineHeight: 1.7 }}>
              Consistency beats perfection. Every logged meal, every tracked lift, every weigh-in adds up to a clear picture of your progress. The athletes who succeed long-term are not the ones who have perfect weeks — they&apos;re the ones who show up, track, and adjust.
            </Text>
            <View style={{ marginTop: 14, height: 1, backgroundColor: "#FFFFFF20" }} />
            <Text style={{ marginTop: 10, fontSize: 8, color: "#8A7A72" }}>
              Generated by BulkOS · {data.generatedAt} · Track · Analyse · Grow
            </Text>
          </View>
        </View>

        <PageFooter page={totalPages} total={totalPages} name={data.userName} />
      </Page>

    </Document>
  );
}
