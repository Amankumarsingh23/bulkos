import type { DailyLog } from "@/types/database";

export type TimeRange = "7D" | "30D" | "90D" | "ALL";

export function filterByRange(logs: DailyLog[], range: TimeRange): DailyLog[] {
  if (range === "ALL") return logs;
  const days = range === "7D" ? 7 : range === "30D" ? 30 : 90;
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - days);
  const cutoffStr = cutoff.toISOString().split("T")[0];
  return logs.filter((l) => l.log_date >= cutoffStr);
}

export function calculateMovingAverage(
  values: (number | null)[],
  window = 7
): (number | null)[] {
  return values.map((_, i) => {
    const slice = values
      .slice(Math.max(0, i - window + 1), i + 1)
      .filter((v): v is number => v !== null);
    return slice.length >= 3 ? slice.reduce((a, b) => a + b, 0) / slice.length : null;
  });
}

export interface WeightVelocityPoint {
  week: string;
  velocityKg: number | null;
  startWeight: number | null;
  endWeight: number | null;
}

export function calculateWeightVelocity(logs: DailyLog[]): WeightVelocityPoint[] {
  const weeks = groupByWeek(logs);
  const result: WeightVelocityPoint[] = [];

  for (let i = 0; i < weeks.length; i++) {
    const week = weeks[i];
    const weights = week.logs
      .map((l) => l.weight_kg)
      .filter((w): w is number => w !== null);

    const prevWeek = i > 0 ? weeks[i - 1] : null;
    const prevWeights = prevWeek
      ? prevWeek.logs.map((l) => l.weight_kg).filter((w): w is number => w !== null)
      : [];

    const startWeight = prevWeights.length ? prevWeights[prevWeights.length - 1] : null;
    const endWeight = weights.length ? weights[weights.length - 1] : null;

    result.push({
      week: week.weekLabel,
      velocityKg: startWeight !== null && endWeight !== null ? endWeight - startWeight : null,
      startWeight,
      endWeight,
    });
  }
  return result;
}

export interface WeeklySurplusPoint {
  week: string;
  surplus: number | null;
  cumulative: number;
}

export function calculateSurplus(logs: DailyLog[], targetCalories: number): WeeklySurplusPoint[] {
  const weeks = groupByWeek(logs);
  let cumulative = 0;
  return weeks.map((week) => {
    const cals = week.logs
      .map((l) => l.calories)
      .filter((c): c is number => c !== null);
    if (!cals.length) return { week: week.weekLabel, surplus: null, cumulative };
    const avgCals = cals.reduce((a, b) => a + b, 0) / cals.length;
    const surplus = Math.round(avgCals - targetCalories);
    cumulative += surplus * 7;
    return { week: week.weekLabel, surplus, cumulative };
  });
}

export interface ProteinPerKgPoint {
  date: string;
  proteinPerKg: number | null;
}

export function calculateProteinPerKg(logs: DailyLog[]): ProteinPerKgPoint[] {
  return logs.map((l) => ({
    date: l.log_date,
    proteinPerKg:
      l.protein_g !== null && l.weight_kg !== null && l.weight_kg > 0
        ? Math.round((l.protein_g / l.weight_kg) * 10) / 10
        : null,
  }));
}

export interface BMIPoint {
  date: string;
  bmi: number | null;
}

export function calculateBMI(logs: DailyLog[], heightCm: number): BMIPoint[] {
  const hM = heightCm / 100;
  return logs.map((l) => ({
    date: l.log_date,
    bmi:
      l.weight_kg !== null && hM > 0
        ? Math.round((l.weight_kg / (hM * hM)) * 10) / 10
        : null,
  }));
}

export interface CorrelationPoint {
  week: string;
  weeklyCalSurplus: number | null;
  weightChange: number | null;
}

export function calculateCorrelation(
  logs: DailyLog[],
  targetCalories: number
): CorrelationPoint[] {
  const weeks = groupByWeek(logs);
  return weeks
    .map((week, i) => {
      const cals = week.logs
        .map((l) => l.calories)
        .filter((c): c is number => c !== null);
      const weights = week.logs
        .map((l) => l.weight_kg)
        .filter((w): w is number => w !== null);

      const prevWeights = i > 0
        ? weeks[i - 1].logs.map((l) => l.weight_kg).filter((w): w is number => w !== null)
        : [];

      const avgCals = cals.length ? cals.reduce((a, b) => a + b, 0) / cals.length : null;
      const surplus = avgCals !== null ? Math.round((avgCals - targetCalories) * 7) : null;

      const startW = prevWeights.length ? prevWeights[prevWeights.length - 1] : null;
      const endW = weights.length ? weights[weights.length - 1] : null;
      const change = startW !== null && endW !== null ? Math.round((endW - startW) * 10) / 10 : null;

      return { week: week.weekLabel, weeklyCalSurplus: surplus, weightChange: change };
    })
    .filter((p) => p.weeklyCalSurplus !== null && p.weightChange !== null);
}

export interface WeekGroup {
  weekLabel: string;
  weekStart: string;
  logs: DailyLog[];
}

export function groupByWeek(logs: DailyLog[]): WeekGroup[] {
  const map = new Map<string, DailyLog[]>();
  for (const log of logs) {
    const d = new Date(log.log_date);
    const dayOfWeek = d.getDay(); // 0=Sun
    const diff = d.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1); // Mon start
    const mon = new Date(d.setDate(diff));
    const key = mon.toISOString().split("T")[0];
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(log);
  }
  return Array.from(map.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([weekStart, weekLogs]) => ({
      weekLabel: new Date(weekStart).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
      weekStart,
      logs: weekLogs.sort((a, b) => a.log_date.localeCompare(b.log_date)),
    }));
}

export interface ConsistencyCell {
  date: string;
  level: 0 | 1 | 2 | 3; // 0=none, 1=partial(just weight), 2=partial(cals), 3=full
  hasLog: boolean;
}

export function buildConsistencyGrid(logs: DailyLog[], weeks = 12): ConsistencyCell[] {
  const logMap = new Map(logs.map((l) => [l.log_date, l]));
  const cells: ConsistencyCell[] = [];
  const today = new Date();

  for (let w = weeks - 1; w >= 0; w--) {
    for (let d = 1; d <= 7; d++) {
      const date = new Date(today);
      const dayOfWeek = today.getDay() || 7; // Mon=1..Sun=7
      date.setDate(today.getDate() - (w * 7) - (dayOfWeek - d));
      if (date > today) continue;
      const key = date.toISOString().split("T")[0];
      const log = logMap.get(key);
      let level: 0 | 1 | 2 | 3 = 0;
      if (log) {
        const hasWeight = log.weight_kg !== null;
        const hasCals = log.calories !== null;
        const hasMacros = log.protein_g !== null && log.carbs_g !== null && log.fats_g !== null;
        if (hasWeight && hasCals && hasMacros) level = 3;
        else if (hasCals || (hasWeight && hasMacros)) level = 2;
        else if (hasWeight || hasCals) level = 1;
      }
      cells.push({ date: key, level, hasLog: !!log });
    }
  }
  return cells;
}

export function linearRegression(
  points: { x: number; y: number }[]
): { slope: number; intercept: number } | null {
  const n = points.length;
  if (n < 2) return null;
  const sumX = points.reduce((s, p) => s + p.x, 0);
  const sumY = points.reduce((s, p) => s + p.y, 0);
  const sumXY = points.reduce((s, p) => s + p.x * p.y, 0);
  const sumXX = points.reduce((s, p) => s + p.x * p.x, 0);
  const denom = n * sumXX - sumX * sumX;
  if (denom === 0) return null;
  const slope = (n * sumXY - sumX * sumY) / denom;
  const intercept = (sumY - slope * sumX) / n;
  return { slope, intercept };
}
