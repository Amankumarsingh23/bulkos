import type { DailyLog } from "@/types/database";
import { format, addDays, differenceInDays, parseISO } from "date-fns";

// ─── Core types ───────────────────────────────────────────────────────────────

export interface WeightPoint {
  date: string;
  weight: number;
  dayIndex: number; // days since first point
}

export interface LinearProjectionResult {
  slope: number;      // kg per day
  intercept: number;  // weight at day 0
  r2: number;
  stdErr: number;     // residual std deviation
}

export interface ProjectionChartPoint {
  date: string;
  label: string;
  actual: number | null;
  projected: number | null;
  projBase: number | null;    // lower bound of confidence band
  projBand: number | null;    // band width (high - low), for stacked area
  plan: number | null;        // original plan (linear start→target on target_date)
  isToday?: boolean;
}

export interface WeeklyStats {
  avgWeeklyGain: number | null;
  bestWeekGain: number | null;
  worstWeekGain: number | null;
}

// ─── Pure functions ───────────────────────────────────────────────────────────

export function buildWeightPoints(logs: DailyLog[]): WeightPoint[] {
  const withWeight = logs
    .filter((l) => l.weight_kg !== null)
    .sort((a, b) => a.log_date.localeCompare(b.log_date));

  if (!withWeight.length) return [];
  const origin = parseISO(withWeight[0].log_date);

  return withWeight.map((l) => ({
    date: l.log_date,
    weight: l.weight_kg!,
    dayIndex: differenceInDays(parseISO(l.log_date), origin),
  }));
}

export function linearProjection(points: WeightPoint[]): LinearProjectionResult | null {
  const n = points.length;
  if (n < 2) return null;

  const sumX  = points.reduce((s, p) => s + p.dayIndex, 0);
  const sumY  = points.reduce((s, p) => s + p.weight, 0);
  const sumXY = points.reduce((s, p) => s + p.dayIndex * p.weight, 0);
  const sumXX = points.reduce((s, p) => s + p.dayIndex ** 2, 0);

  const denom = n * sumXX - sumX ** 2;
  if (denom === 0) return null;

  const slope     = (n * sumXY - sumX * sumY) / denom;
  const intercept = (sumY - slope * sumX) / n;

  const meanY  = sumY / n;
  const ssTot  = points.reduce((s, p) => s + (p.weight - meanY) ** 2, 0);
  const ssRes  = points.reduce((s, p) => s + (p.weight - (slope * p.dayIndex + intercept)) ** 2, 0);
  const r2     = ssTot > 0 ? Math.max(0, 1 - ssRes / ssTot) : 0;
  const stdErr = n > 2 ? Math.sqrt(ssRes / (n - 2)) : 0.5;

  return { slope, intercept, r2, stdErr };
}

export function estimateCompletionDate(
  currentWeight: number,
  targetWeight: number,
  dailyRateKg: number
): Date | null {
  if (dailyRateKg <= 0) return null;
  const remaining    = targetWeight - currentWeight;
  if (remaining <= 0) return new Date();
  const daysNeeded   = Math.ceil(remaining / dailyRateKg);
  return addDays(new Date(), daysNeeded);
}

export function calculateRequiredSurplus(
  currentWeight: number,
  targetWeight: number,
  daysRemaining: number,
  tdee: number
): number {
  if (daysRemaining <= 0 || targetWeight <= currentWeight) return 0;
  const kcalNeeded  = (targetWeight - currentWeight) * 7700;
  const dailySurplus = kcalNeeded / daysRemaining;
  return Math.round(tdee + dailySurplus);
}

export function calculateWeeklyStats(logs: DailyLog[]): WeeklyStats {
  const withWeight = logs
    .filter((l) => l.weight_kg !== null)
    .sort((a, b) => a.log_date.localeCompare(b.log_date));

  if (withWeight.length < 2) return { avgWeeklyGain: null, bestWeekGain: null, worstWeekGain: null };

  // Group into 7-day windows
  const gains: number[] = [];
  for (let i = 7; i < withWeight.length; i++) {
    const prev = withWeight.find(
      (w) => differenceInDays(parseISO(withWeight[i].log_date), parseISO(w.log_date)) <= 7 &&
             differenceInDays(parseISO(withWeight[i].log_date), parseISO(w.log_date)) > 0
    );
    if (prev && prev.weight_kg !== null) {
      gains.push(withWeight[i].weight_kg! - prev.weight_kg);
    }
  }

  if (!gains.length) {
    // fallback: total gain / total weeks
    const totalGain  = withWeight.at(-1)!.weight_kg! - withWeight[0].weight_kg!;
    const totalWeeks = differenceInDays(
      parseISO(withWeight.at(-1)!.log_date),
      parseISO(withWeight[0].log_date)
    ) / 7;
    return {
      avgWeeklyGain: totalWeeks > 0 ? Math.round((totalGain / totalWeeks) * 100) / 100 : null,
      bestWeekGain: null,
      worstWeekGain: null,
    };
  }

  const avg  = gains.reduce((a, b) => a + b, 0) / gains.length;
  return {
    avgWeeklyGain : Math.round(avg * 100) / 100,
    bestWeekGain  : Math.round(Math.max(...gains) * 100) / 100,
    worstWeekGain : Math.round(Math.min(...gains) * 100) / 100,
  };
}

export function buildProjectionChartData(params: {
  weightPoints: WeightPoint[];
  proj: LinearProjectionResult | null;
  startDate: string;        // first weight log date
  startWeight: number;
  targetWeight: number;
  targetDate: string | null;
  estimatedEnd: Date | null;
}): ProjectionChartPoint[] {
  const { weightPoints, proj, startDate, startWeight, targetWeight, targetDate, estimatedEnd } = params;

  const today        = new Date();
  const todayStr     = format(today, "yyyy-MM-dd");
  const origin       = parseISO(startDate);

  // Chart end = later of targetDate / estimatedEnd, capped at 180 days from today
  let endDate = addDays(today, 90);
  if (targetDate) {
    const td = parseISO(targetDate);
    if (td > endDate) endDate = td;
  }
  if (estimatedEnd) {
    if (estimatedEnd > endDate) endDate = estimatedEnd;
  }
  const maxFuture = addDays(today, 180);
  if (endDate > maxFuture) endDate = maxFuture;

  // Build weight lookup map
  const weightMap = new Map(weightPoints.map((p) => [p.date, p.weight]));

  // Plan: linear from startWeight at startDate to targetWeight at targetDate (or endDate)
  const planEnd    = targetDate ? parseISO(targetDate) : endDate;
  const planDays   = differenceInDays(planEnd, origin);

  const points: ProjectionChartPoint[] = [];
  const totalDays  = differenceInDays(endDate, origin) + 1;

  for (let i = 0; i <= totalDays; i++) {
    const d       = addDays(origin, i);
    const dateStr = format(d, "yyyy-MM-dd");
    const dayIdx  = i;
    const isFuture = dateStr > todayStr;

    const actual = weightMap.get(dateStr) ?? null;

    // Projected: only show from today onward, based on regression
    let projected: number | null = null;
    let projBase: number | null  = null;
    let projBand: number | null  = null;

    if (isFuture && proj) {
      const projVal = proj.slope * dayIdx + proj.intercept;
      const band    = proj.stdErr * 1.5;
      projected     = Math.round(projVal * 100) / 100;
      projBase      = Math.round((projVal - band) * 100) / 100;
      projBand      = Math.round(band * 2 * 100) / 100;
    }
    // Connect projected to last actual point (today)
    if (dateStr === todayStr && proj) {
      const projVal = proj.slope * dayIdx + proj.intercept;
      const band    = proj.stdErr * 1.5;
      projected     = Math.round(projVal * 100) / 100;
      projBase      = Math.round((projVal - band) * 100) / 100;
      projBand      = Math.round(band * 2 * 100) / 100;
    }

    // Plan: linear interpolation
    let plan: number | null = null;
    if (planDays > 0 && dayIdx <= planDays) {
      plan = Math.round((startWeight + (targetWeight - startWeight) * (dayIdx / planDays)) * 100) / 100;
    }

    points.push({
      date: dateStr,
      label: format(d, "MMM d"),
      actual,
      projected,
      projBase,
      projBand,
      plan,
      isToday: dateStr === todayStr,
    });
  }

  return points;
}
