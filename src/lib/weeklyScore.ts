import type { DailyLog } from "@/types/database";
import { format, startOfWeek, addDays } from "date-fns";

export type Grade = "A" | "B" | "C" | "D" | "F";

export interface ScoreBreakdown {
  consistency: { earned: number; max: number; daysLogged: number };
  calories:    { earned: number; max: number; daysHit: number; daysTracked: number };
  protein:     { earned: number; max: number; daysHit: number; daysTracked: number };
}

export interface WeekScore {
  weekStart: string;       // ISO "yyyy-MM-dd" (Monday)
  weekLabel: string;       // "May 19"
  score: number;           // 0–100
  grade: Grade;
  breakdown: ScoreBreakdown;
  insight: string;
  hasData: boolean;
}

interface Targets { calories?: number; proteinG?: number }

function gradeFor(score: number): Grade {
  if (score >= 90) return "A";
  if (score >= 75) return "B";
  if (score >= 60) return "C";
  if (score >= 45) return "D";
  return "F";
}

function insightFor(breakdown: ScoreBreakdown, grade: Grade): string {
  const { consistency, calories, protein } = breakdown;
  const loggedAll  = consistency.daysLogged === 7;
  const calHitRate = calories.daysTracked  > 0 ? calories.daysHit  / calories.daysTracked  : 0;
  const proHitRate = protein.daysTracked   > 0 ? protein.daysHit   / protein.daysTracked   : 0;

  if (grade === "A") {
    if (loggedAll) return "Flawless week — you logged every single day!";
    return "Excellent week, nearly perfect consistency and targets hit.";
  }
  if (grade === "B") {
    if (calHitRate < 0.7) return "Solid logging — nudge your calories closer to target and you'll hit an A.";
    if (proHitRate < 0.7) return "Good week! Prioritise protein a bit more to unlock that A.";
    return "Strong week — just a few more consistent days and you're there.";
  }
  if (consistency.daysLogged <= 3) return "Logging consistency is the biggest lever — aim for 5+ days next week.";
  if (calHitRate < 0.5 && proHitRate < 0.5) return "Targets were off this week. Try pre-logging your meals the night before.";
  if (calHitRate < 0.5) return "Keep calories closer to target — you’re leaving gains on the table.";
  if (proHitRate < 0.5) return "Protein was low this week — add a high-protein snack or shake each day.";
  return "Keep at it — small improvements every week compound into big results.";
}

export function computeWeekScore(logs: DailyLog[], targets: Targets | null): WeekScore {
  const weekStart = format(startOfWeek(new Date(), { weekStartsOn: 1 }), "yyyy-MM-dd");
  const weekLabel = format(startOfWeek(new Date(), { weekStartsOn: 1 }), "MMM d");

  const empty: WeekScore = {
    weekStart, weekLabel, score: 0, grade: "F",
    breakdown: {
      consistency: { earned: 0, max: 40, daysLogged: 0 },
      calories:    { earned: 0, max: 35, daysHit: 0, daysTracked: 0 },
      protein:     { earned: 0, max: 25, daysHit: 0, daysTracked: 0 },
    },
    insight: "Log your first entry this week to start earning a score!",
    hasData: false,
  };

  if (!logs.length) return empty;

  // ── Consistency (40 pts) ────────────────────────────────────────────────────
  const daysLogged        = logs.length;
  const consistencyEarned = Math.round((daysLogged / 7) * 40);

  // ── Calories (35 pts) ──────────────────────────────────────────────────────
  const calTarget   = targets?.calories;
  const calLogs     = logs.filter((l) => l.calories !== null);
  let calEarned     = 0;
  let calHit        = 0;

  if (calLogs.length > 0 && calTarget) {
    let calPoints = 0;
    for (const l of calLogs) {
      const pct = (l.calories ?? 0) / calTarget;
      if (pct >= 0.88 && pct <= 1.12) { calPoints += 1; calHit++; }
      else if (pct >= 0.75 && pct <= 1.25) calPoints += 0.5;
    }
    calEarned = Math.round((calPoints / calLogs.length) * 35);
  } else if (!calTarget) {
    calEarned = 17; // partial credit — no target set
  }

  // ── Protein (25 pts) ───────────────────────────────────────────────────────
  const proTarget   = targets?.proteinG;
  const proLogs     = logs.filter((l) => l.protein_g !== null);
  let proEarned     = 0;
  let proHit        = 0;

  if (proLogs.length > 0 && proTarget) {
    proHit    = proLogs.filter((l) => (l.protein_g ?? 0) >= proTarget * 0.9).length;
    proEarned = Math.round((proHit / proLogs.length) * 25);
  } else if (!proTarget) {
    proEarned = 12; // partial credit
  }

  const score = Math.min(100, consistencyEarned + calEarned + proEarned);
  const grade = gradeFor(score);

  const breakdown: ScoreBreakdown = {
    consistency: { earned: consistencyEarned, max: 40, daysLogged },
    calories:    { earned: calEarned,         max: 35, daysHit: calHit,  daysTracked: calLogs.length },
    protein:     { earned: proEarned,         max: 25, daysHit: proHit,  daysTracked: proLogs.length },
  };

  return {
    weekStart, weekLabel, score, grade, breakdown,
    insight: insightFor(breakdown, grade),
    hasData: true,
  };
}

export function computeWeeklyHistory(allLogs: DailyLog[], targets: Targets | null, weeks = 8): WeekScore[] {
  const today     = new Date();
  const results: WeekScore[] = [];

  for (let w = weeks - 1; w >= 0; w--) {
    const mon    = startOfWeek(addDays(today, -w * 7), { weekStartsOn: 1 });
    const sun    = addDays(mon, 6);
    const monStr = format(mon, "yyyy-MM-dd");
    const sunStr = format(sun, "yyyy-MM-dd");

    const weekLogs = allLogs.filter(
      (l) => l.log_date >= monStr && l.log_date <= sunStr
    );

    const score    = computeWeekScore(weekLogs, targets);
    const adjusted = { ...score, weekStart: monStr, weekLabel: format(mon, "MMM d") };
    results.push(adjusted);
  }

  return results;
}

export const GRADE_COLOR: Record<Grade, string> = {
  A: "#C9A96E",
  B: "#5B8A5B",
  C: "#9B8E87",
  D: "#C4826A",
  F: "#C05252",
};

export const GRADE_BG: Record<Grade, string> = {
  A: "#C9A96E20",
  B: "#5B8A5B20",
  C: "#9B8E8720",
  D: "#C4826A20",
  F: "#C0525220",
};
