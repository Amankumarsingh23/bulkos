"use client";

import { useState, useEffect, useCallback } from "react";
import { createBrowserClient } from "@/lib/supabase";
import { useAuth } from "@/hooks/useAuth";
import { computeWeeklyHistory } from "@/lib/weeklyScore";
import type { DailyLog, BodyMeasurement, Milestone } from "@/types/database";
import { buildDailyWeightMap } from "@/lib/weightUtils";
import type { WeekScore } from "@/lib/weeklyScore";

export interface PR {
  exercise: string;
  weight_kg: number;
  reps: number;
  date: string;
}

export interface ReportData {
  // Meta
  userName: string;
  userEmail: string;
  periodDays: number;
  generatedAt: string;
  heightCm: number | null;
  age: number | null;
  gender: string | null;

  // Weight
  currentWeight: number | null;
  startWeight: number | null;
  weightChange: number | null;
  weeklyWeightChange: number | null;
  weightSamples: { date: string; weight: number }[]; // up to 10 for chart

  // Body composition (computed from Deurenberg)
  bmi: number | null;
  bodyFatPct: number | null;
  leanMassKg: number | null;
  ffmi: number | null;

  // Nutrition
  avgCalories: number | null;
  avgProtein: number | null;
  avgCarbs: number | null;
  avgFats: number | null;
  loggingDays: number;
  calorieDays: number;
  loggingConsistency: number; // 0-1

  // Goals
  targetWeightKg: number | null;
  targetProgressPct: number | null; // % from start toward target

  // Milestones
  achievedMilestones: number;
  totalMilestones: number;

  // Weekly scores
  weeklyScores: WeekScore[];
  avgWeeklyScore: number | null;

  // Workouts
  totalWorkouts: number;
  totalSets: number;
  totalVolumeTonnes: number;
  prs: PR[];
  topExercises: { name: string; count: number }[];

  // Measurements (latest vs first in period)
  measurementChanges: { label: string; change: number; unit: string }[];

  // Targets (from profile → TDEE calc)
  targetCalories: number | null;
  targetProteinG: number | null;
}

function avg(arr: (number | null)[]): number | null {
  const nums = arr.filter((v): v is number => v !== null);
  return nums.length ? Math.round(nums.reduce((a, b) => a + b, 0) / nums.length) : null;
}

function computeBMI(weight: number, heightCm: number): number {
  const hM = heightCm / 100;
  return Math.round((weight / (hM * hM)) * 10) / 10;
}

function computeBodyFat(bmi: number, age: number, gender: string | null): number {
  const sex = gender === "male" ? 1 : gender === "female" ? 0 : 0.5;
  return Math.max(3, Math.min(60, Math.round((1.2 * bmi + 0.23 * age - 10.8 * sex - 5.4) * 10) / 10));
}

function computeFFMI(leanMassKg: number, heightCm: number): number {
  const hM = heightCm / 100;
  const raw = leanMassKg / (hM * hM);
  return Math.round((raw + 6.3 * (1.8 - hM)) * 10) / 10;
}

// Simple TDEE from Mifflin-St Jeor + activity multiplier
const ACTIVITY_MULTIPLIERS: Record<string, number> = {
  sedentary: 1.2,
  lightly_active: 1.375,
  moderately_active: 1.55,
  very_active: 1.725,
  extra_active: 1.9,
};

function computeFormulaTDEE(profile: {
  weight_kg?: number | null;
  height_cm?: number | null;
  age?: number | null;
  gender?: string | null;
  activity_level?: string | null;
}): number | null {
  const { weight_kg, height_cm, age, gender, activity_level } = profile;
  if (!weight_kg || !height_cm || !age) return null;
  const bmr =
    gender === "female"
      ? 10 * weight_kg + 6.25 * height_cm - 5 * age - 161
      : 10 * weight_kg + 6.25 * height_cm - 5 * age + 5;
  const mult = ACTIVITY_MULTIPLIERS[activity_level ?? "moderately_active"] ?? 1.55;
  return Math.round(bmr * mult);
}

export function useReportData(periodDays: number) {
  const { profile, user } = useAuth();
  const [data, setData] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetch = useCallback(async () => {
    if (!profile?.id || !user) return;
    setLoading(true);
    setError(null);

    const supabase = createBrowserClient();
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - periodDays);
    const cutoffStr = cutoff.toISOString().slice(0, 10);
    const today = new Date().toISOString().slice(0, 10);

    const [logsRes, measurementsRes, milestonesRes, sessionsRes, weightLogsRes] = await Promise.all([
      supabase
        .from("daily_logs")
        .select("*")
        .eq("user_id", profile.id)
        .gte("log_date", cutoffStr)
        .order("log_date", { ascending: true }),
      supabase
        .from("body_measurements")
        .select("*")
        .eq("user_id", profile.id)
        .gte("measured_at", cutoffStr)
        .order("measured_at", { ascending: true }),
      supabase
        .from("milestones")
        .select("*")
        .eq("user_id", profile.id),
      supabase
        .from("workout_sessions")
        .select("*")
        .eq("user_id", profile.id)
        .gte("workout_date", cutoffStr),
      supabase
        .from("weight_logs")
        .select("id, logged_at, weight_kg, notes")
        .eq("user_id", profile.id)
        .gte("logged_at", new Date(cutoff.getTime()).toISOString())
        .order("logged_at", { ascending: true }),
    ]);

    if (logsRes.error) { setError(logsRes.error.message); setLoading(false); return; }

    const weightByDate = buildDailyWeightMap(weightLogsRes.data ?? []);
    const rawLogs: DailyLog[] = logsRes.data ?? [];
    const logs: DailyLog[] = rawLogs.map((l) => ({
      ...l,
      weight_kg: weightByDate[l.log_date] ?? null,
    }));
    const measurements: BodyMeasurement[] = measurementsRes.data ?? [];
    const milestones: Milestone[] = milestonesRes.data ?? [];
    const sessions = sessionsRes.data ?? [];

    // Fetch sets for workout sessions
    let prs: PR[] = [];
    let totalSets = 0;
    let totalVolumeTonnes = 0;
    const exerciseCounter = new Map<string, number>();

    if (sessions.length > 0) {
      const sessionIds = sessions.map((s) => s.id);
      const { data: setsData } = await supabase
        .from("workout_sets")
        .select("*")
        .in("session_id", sessionIds);

      const sets = setsData ?? [];
      totalSets = sets.length;
      totalVolumeTonnes = sets.reduce(
        (sum, s) => sum + (s.weight_kg ?? 0) * (s.reps ?? 0), 0
      ) / 1000;

      for (const s of sets) {
        exerciseCounter.set(s.exercise, (exerciseCounter.get(s.exercise) ?? 0) + 1);
      }

      // PRs per exercise
      const prMap = new Map<string, PR>();
      for (const s of sets) {
        if (!s.weight_kg) continue;
        const key = s.exercise.toLowerCase();
        const existing = prMap.get(key);
        if (!existing || s.weight_kg > existing.weight_kg) {
          const session = sessions.find((ss) => ss.id === s.session_id);
          prMap.set(key, {
            exercise: s.exercise,
            weight_kg: s.weight_kg,
            reps: s.reps ?? 0,
            date: session?.workout_date ?? today,
          });
        }
      }
      prs = Array.from(prMap.values())
        .sort((a, b) => b.weight_kg - a.weight_kg)
        .slice(0, 8);
    }

    const topExercises = Array.from(exerciseCounter.entries())
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([name, count]) => ({ name, count }));

    // Weight stats
    const weightLogs = logs.filter((l) => l.weight_kg !== null);
    const currentWeight = weightLogs.length ? weightLogs[weightLogs.length - 1].weight_kg : null;
    const startWeight = weightLogs.length ? weightLogs[0].weight_kg : null;
    const weightChange = currentWeight !== null && startWeight !== null ? Math.round((currentWeight - startWeight) * 10) / 10 : null;
    const weeks = periodDays / 7;
    const weeklyWeightChange = weightChange !== null && weeks > 0 ? Math.round((weightChange / weeks) * 100) / 100 : null;

    // Weight samples (up to 12 evenly spaced for chart)
    const step = Math.max(1, Math.floor(weightLogs.length / 12));
    const weightSamples = weightLogs
      .filter((_, i) => i % step === 0 || i === weightLogs.length - 1)
      .map((l) => ({ date: l.log_date, weight: l.weight_kg as number }))
      .slice(0, 12);

    // Body composition
    let bmi: number | null = null;
    let bodyFatPct: number | null = null;
    let leanMassKg: number | null = null;
    let ffmi: number | null = null;

    if (currentWeight && profile.height_cm && profile.age) {
      bmi = computeBMI(currentWeight, profile.height_cm);
      bodyFatPct = computeBodyFat(bmi, profile.age, profile.gender ?? null);
      leanMassKg = Math.round(currentWeight * (1 - bodyFatPct / 100) * 10) / 10;
      ffmi = computeFFMI(leanMassKg, profile.height_cm);
    }

    // Nutrition
    const loggingDays = logs.length;
    const calorieDays = logs.filter((l) => l.calories !== null).length;
    const loggingConsistency = loggingDays / periodDays;
    const avgCalories = avg(logs.map((l) => l.calories));
    const avgProtein  = avg(logs.map((l) => l.protein_g));
    const avgCarbs    = avg(logs.map((l) => l.carbs_g));
    const avgFats     = avg(logs.map((l) => l.fats_g));

    // Goals
    const targetWeightKg = profile.target_weight_kg ?? null;
    let targetProgressPct: number | null = null;
    if (targetWeightKg && startWeight && currentWeight && targetWeightKg !== startWeight) {
      targetProgressPct = Math.min(100, Math.max(0, Math.round(
        ((currentWeight - startWeight) / (targetWeightKg - startWeight)) * 100
      )));
    }

    // Milestones
    const achievedMilestones = milestones.filter((m) => m.achieved).length;
    const totalMilestones = milestones.length;

    // Weekly scores (last 8 weeks)
    const allLogsForScoring: DailyLog[] = logs;
    const tdee = computeFormulaTDEE({
      weight_kg: currentWeight,
      height_cm: profile.height_cm,
      age: profile.age,
      gender: profile.gender,
      activity_level: profile.activity_level,
    });
    const targetCalories = tdee ? tdee + 300 : null; // +300 surplus for bulk
    const targetProteinG = currentWeight ? Math.round(currentWeight * 2.0) : null;
    const weeklyScores = computeWeeklyHistory(
      allLogsForScoring,
      { calories: targetCalories ?? undefined, proteinG: targetProteinG ?? undefined },
      8
    );
    const scoredWeeks = weeklyScores.filter((w) => w.hasData);
    const avgWeeklyScore = scoredWeeks.length
      ? Math.round(scoredWeeks.reduce((sum, w) => sum + w.score, 0) / scoredWeeks.length)
      : null;

    // Measurement changes
    const measurementChanges: { label: string; change: number; unit: string }[] = [];
    if (measurements.length >= 2) {
      const first = measurements[0];
      const last = measurements[measurements.length - 1];
      const fields: [keyof BodyMeasurement, string][] = [
        ["chest_cm", "Chest"],
        ["waist_cm", "Waist"],
        ["left_arm_cm", "Left arm"],
        ["right_arm_cm", "Right arm"],
      ];
      for (const [key, label] of fields) {
        const f = first[key] as number | null;
        const l = last[key] as number | null;
        if (f !== null && l !== null) {
          measurementChanges.push({ label, change: Math.round((l - f) * 10) / 10, unit: "cm" });
        }
      }
    }

    // User name
    const userName =
      (profile as { full_name?: string | null }).full_name ??
      user.user_metadata?.full_name ??
      user.email?.split("@")[0] ??
      "Athlete";

    setData({
      userName: String(userName),
      userEmail: user.email ?? "",
      periodDays,
      generatedAt: new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" }),
      heightCm: profile.height_cm ?? null,
      age: profile.age ?? null,
      gender: profile.gender ?? null,
      currentWeight,
      startWeight,
      weightChange,
      weeklyWeightChange,
      weightSamples,
      bmi,
      bodyFatPct,
      leanMassKg,
      ffmi,
      avgCalories,
      avgProtein,
      avgCarbs,
      avgFats,
      loggingDays,
      calorieDays,
      loggingConsistency,
      targetWeightKg,
      targetProgressPct,
      achievedMilestones,
      totalMilestones,
      weeklyScores,
      avgWeeklyScore,
      totalWorkouts: sessions.length,
      totalSets,
      totalVolumeTonnes: Math.round(totalVolumeTonnes * 10) / 10,
      prs,
      topExercises,
      measurementChanges,
      targetCalories,
      targetProteinG,
    });
    setLoading(false);
  }, [profile?.id, user, periodDays]);

  useEffect(() => { fetch(); }, [fetch]);

  return { data, loading, error, refetch: fetch };
}
