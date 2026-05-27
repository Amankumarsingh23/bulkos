import type { DailyLog } from "@/types/database";
import { differenceInDays, parseISO, format, subDays } from "date-fns";

export type NudgeSeverity = "warning" | "info";
export type NudgeType =
  | "no_log"
  | "low_protein"
  | "weight_stall"
  | "low_calories"
  | "low_sleep";

export interface Nudge {
  type: NudgeType;
  severity: NudgeSeverity;
  headline: string;
  body: string;
  actionLabel?: string;
  actionHref?: string;
  dismissTTLDays: number;
}

interface NudgeTargets {
  calories?: number;
  proteinG?: number;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function avg(arr: (number | null)[]): number | null {
  const nums = arr.filter((v): v is number => v !== null);
  return nums.length ? nums.reduce((a, b) => a + b, 0) / nums.length : null;
}

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

// Converts a gram protein deficit into a plain-English serving estimate
function proteinDeficitToFood(deficitG: number): string {
  const scoops = deficitG / 25;
  if (scoops <= 0.8) return "less than a scoop of whey protein";
  if (scoops <= 1.3) return "about 1 scoop of whey per day";
  if (scoops <= 2.3) return `~${Math.round(scoops)} scoops of whey per day`;
  if (scoops <= 3.5) return `~${Math.round(scoops)} scoops of whey (or add a full chicken breast per day)`;
  return "multiple high-protein meals — aim for protein with every sitting";
}

// Returns the last N calendar days of logs as a date-sorted array (newest last)
function recentLogs(allLogs: DailyLog[], days: number): DailyLog[] {
  const cutoff = format(subDays(new Date(), days), "yyyy-MM-dd");
  return allLogs.filter((l) => l.log_date >= cutoff);
}

// Count consecutive days from the most-recent log backwards where predicate holds
function consecutiveTailDays(
  logs: DailyLog[],
  predicate: (l: DailyLog) => boolean
): number {
  // logs are ascending — work from the end
  let count = 0;
  for (let i = logs.length - 1; i >= 0; i--) {
    if (predicate(logs[i])) count++;
    else break;
  }
  return count;
}

// ── Nudge: no_log ─────────────────────────────────────────────────────────────

function noLogNudge(allLogs: DailyLog[]): Nudge | null {
  if (allLogs.length === 0) return null; // empty state handled elsewhere

  const lastLog = allLogs[allLogs.length - 1];
  const today = new Date();
  const lastDate = parseISO(lastLog.log_date);
  const daysSince = differenceInDays(today, lastDate);

  if (daysSince < 2) return null;

  const dayLabel = format(lastDate, "EEEE, MMM d");
  const noun = daysSince === 2 ? "2 days" : `${daysSince} days`;

  return {
    type: "no_log",
    severity: "warning",
    headline: `No entry for ${noun}`,
    body: `Last logged ${dayLabel}. Even a quick weigh-in keeps your trend accurate — gaps skew the 7-day moving average.`,
    actionLabel: "Log today",
    actionHref: "/log",
    dismissTTLDays: 1, // re-surface daily if still not logged
  };
}

// ── Nudge: low_protein ────────────────────────────────────────────────────────

function lowProteinNudge(
  allLogs: DailyLog[],
  targets: NudgeTargets | null,
  currentWeight: number | null
): Nudge | null {
  const proteinTarget =
    targets?.proteinG ??
    (currentWeight ? Math.round(currentWeight * 2) : null);
  if (!proteinTarget) return null;

  const withProtein = recentLogs(allLogs, 7).filter(
    (l) => l.protein_g !== null
  );
  if (withProtein.length < 3) return null;

  const threshold = proteinTarget * 0.9;
  const consecutive = consecutiveTailDays(
    withProtein,
    (l) => (l.protein_g ?? 0) < threshold
  );
  if (consecutive < 3) return null;

  const avgProtein = avg(withProtein.slice(-consecutive).map((l) => l.protein_g));
  if (avgProtein === null) return null;

  const avgG = Math.round(avgProtein);
  const gPerKg =
    currentWeight && currentWeight > 0
      ? round1(avgProtein / currentWeight)
      : null;
  const targetGPerKg =
    currentWeight && currentWeight > 0
      ? round1(proteinTarget / currentWeight)
      : null;

  const deficit = proteinTarget - avgG;
  const perKgStr =
    gPerKg !== null && targetGPerKg !== null
      ? ` (${gPerKg}g/kg vs ${targetGPerKg}g/kg target)`
      : "";

  return {
    type: "low_protein",
    severity: "warning",
    headline: `Protein below target · ${consecutive} days straight`,
    body: `Averaging ${avgG}g/day${perKgStr}. You're ${deficit}g short of the ${proteinTarget}g goal — ${proteinDeficitToFood(deficit)}.`,
    actionLabel: "Log today",
    actionHref: "/log",
    dismissTTLDays: 3,
  };
}

// ── Nudge: weight_stall ────────────────────────────────────────────────────────

function weightStallNudge(
  allLogs: DailyLog[],
  targets: NudgeTargets | null
): Nudge | null {
  const recent = recentLogs(allLogs, 21);
  const weightLogs = recent.filter((l) => l.weight_kg !== null);
  if (weightLogs.length < 7) return null;

  const firstW = weightLogs[0].weight_kg as number;
  const lastW = weightLogs[weightLogs.length - 1].weight_kg as number;
  const change = Math.abs(lastW - firstW);
  if (change >= 0.4) return null; // weight IS moving

  // Only fire if they were eating at or above calorie target (had a surplus)
  const calLogs = recent.filter((l) => l.calories !== null);
  if (calLogs.length < 7) return null;
  const avgCals = avg(calLogs.map((l) => l.calories));
  if (!avgCals) return null;

  const calTarget = targets?.calories;
  // Require they were eating ≥ 85% of target (not just under-eating causing the stall)
  if (calTarget && avgCals < calTarget * 0.85) return null;

  const spanDays = differenceInDays(
    parseISO(weightLogs[weightLogs.length - 1].log_date),
    parseISO(weightLogs[0].log_date)
  );
  if (spanDays < 12) return null;

  const avgCalStr = Math.round(avgCals).toLocaleString();
  const calNote = calTarget
    ? ` while averaging ${avgCalStr} kcal/day (target: ${calTarget.toLocaleString()})`
    : ` while averaging ${avgCalStr} kcal/day`;

  return {
    type: "weight_stall",
    severity: "info",
    headline: `Weight stalled for ${spanDays} days`,
    body: `${firstW.toFixed(1)} → ${lastW.toFixed(1)} kg${calNote}. Add 150–200 kcal and reassess in a week — could also be water retention.`,
    actionLabel: "Smart TDEE",
    actionHref: "/settings",
    dismissTTLDays: 7,
  };
}

// ── Nudge: low_calories ────────────────────────────────────────────────────────

function lowCaloriesNudge(
  allLogs: DailyLog[],
  targets: NudgeTargets | null
): Nudge | null {
  const calTarget = targets?.calories;
  if (!calTarget) return null;

  const threshold = calTarget * 0.88;
  const withCals = recentLogs(allLogs, 7).filter((l) => l.calories !== null);
  if (withCals.length < 3) return null;

  const consecutive = consecutiveTailDays(
    withCals,
    (l) => (l.calories ?? 0) < threshold
  );
  if (consecutive < 4) return null;

  const avgCals = avg(withCals.slice(-consecutive).map((l) => l.calories));
  if (avgCals === null) return null;

  const avgStr = Math.round(avgCals).toLocaleString();
  const targetStr = calTarget.toLocaleString();
  const gap = Math.round(calTarget - avgCals);

  return {
    type: "low_calories",
    severity: "warning",
    headline: `Calories below target · ${consecutive} days running`,
    body: `Averaging ${avgStr} kcal vs your ${targetStr} goal — a ${gap} kcal daily gap. Under-eating slows muscle gain even with good training.`,
    actionLabel: "Log today",
    actionHref: "/log",
    dismissTTLDays: 3,
  };
}

// ── Nudge: low_sleep ──────────────────────────────────────────────────────────

function lowSleepNudge(allLogs: DailyLog[]): Nudge | null {
  const withSleep = recentLogs(allLogs, 7).filter((l) => l.sleep_hours !== null);
  if (withSleep.length < 5) return null;

  const avgSleep = avg(withSleep.map((l) => l.sleep_hours));
  if (avgSleep === null || avgSleep >= 7) return null;

  const avgStr = round1(avgSleep);
  const shortfall = round1(7 - avgSleep);

  return {
    type: "low_sleep",
    severity: "info",
    headline: `Sleep averaged ${avgStr}h over ${withSleep.length} nights`,
    body: `${shortfall}h below the 7h floor. Poor sleep raises cortisol and cuts muscle protein synthesis — even perfect nutrition can't fully compensate.`,
    dismissTTLDays: 3,
  };
}

// ── Main export ────────────────────────────────────────────────────────────────

export function computeNudges(
  allLogs: DailyLog[],
  targets: NudgeTargets | null,
  currentWeight: number | null
): Nudge[] {
  const candidates = [
    noLogNudge(allLogs),
    lowProteinNudge(allLogs, targets, currentWeight),
    weightStallNudge(allLogs, targets),
    lowCaloriesNudge(allLogs, targets),
    lowSleepNudge(allLogs),
  ].filter((n): n is Nudge => n !== null);

  // Warnings first, then info; cap at 3 so dashboard doesn't get swamped
  return candidates
    .sort((a, b) => (a.severity === "warning" ? -1 : 1) - (b.severity === "warning" ? -1 : 1))
    .slice(0, 3);
}

// ── Dismissal helpers (call client-side) ──────────────────────────────────────

export function isNudgeDismissed(type: NudgeType, ttlDays: number): boolean {
  try {
    const ts = localStorage.getItem(`bulkos-nudge-${type}`);
    if (!ts) return false;
    return (Date.now() - new Date(ts).getTime()) / 86_400_000 < ttlDays;
  } catch {
    return false;
  }
}

export function dismissNudge(type: NudgeType): void {
  try {
    localStorage.setItem(`bulkos-nudge-${type}`, new Date().toISOString());
  } catch {}
}
