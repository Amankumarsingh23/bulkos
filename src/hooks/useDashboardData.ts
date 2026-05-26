"use client";

import { useEffect, useMemo, useState } from "react";
import {
  addDays, format, isToday, isFuture,
  parseISO, startOfWeek, subDays,
} from "date-fns";
import { createBrowserClient } from "@/lib/supabase";
import { useAuth } from "./useAuth";
import type { DailyLog, Profile } from "@/types/database";
import type { MacroTargets } from "./useDailyLog";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface WeekDay {
  date: string;
  label: string;
  shortLabel: string;   // "M", "T" etc.
  isToday: boolean;
  isFuture: boolean;
  hasLog: boolean;
  calories: number | null;
  caloriePct: number;
}

export interface WeightChartPoint {
  date: string;
  displayDate: string;
  weight: number | null;
  movingAvg: number | null;
}

export interface MacroSlice {
  name: string;
  value: number;  // kcal contribution
  fill: string;
}

export interface DashboardData {
  loading: boolean;
  profile: Profile | null;
  targets: MacroTargets | null;
  todayLog: DailyLog | null;
  streak: number;
  weekDays: WeekDay[];
  weightChart: WeightChartPoint[];
  macroSlices: MacroSlice[];
  weeklyAvgCalories: number;
  currentWeight: number | null;
  startingWeight: number | null;
  weightChange: number | null;
  last7Weights: number[];
  allLogs: DailyLog[];
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const ACTIVITY_MULT: Record<string, number> = {
  sedentary: 1.2, lightly_active: 1.375, moderately_active: 1.55,
  very_active: 1.725, extra_active: 1.9,
};

function computeTargets(p: Profile, weight: number | null): MacroTargets | null {
  const { height_cm, age, gender, activity_level, target_weight_kg, target_date } = p;
  if (!height_cm || !age || !gender || !activity_level || !weight || !target_weight_kg) return null;
  const gOff   = gender === "male" ? 5 : gender === "female" ? -161 : -78;
  const bmr    = 10 * weight + 6.25 * height_cm - 5 * age + gOff;
  const tdee   = Math.round(bmr * (ACTIVITY_MULT[activity_level] ?? 1.55));
  const days   = target_date
    ? Math.max(30, Math.ceil((new Date(target_date).getTime() - Date.now()) / 86_400_000)) : 180;
  const surplus   = Math.round(((target_weight_kg - weight) * 7700) / days);
  const targetCal = tdee + surplus;
  const proteinG  = Math.round(weight * 2);
  const fatG      = Math.round(weight * 0.8);
  const carbsG    = Math.max(0, Math.round((targetCal - proteinG * 4 - fatG * 9) / 4));
  return { calories: Math.round(targetCal), proteinG, carbsG, fatG };
}

function calcStreak(logs: DailyLog[]): number {
  const today      = format(new Date(), "yyyy-MM-dd");
  const logSet     = new Set(logs.map((l) => l.log_date));
  let streak       = 0;
  let cur          = logSet.has(today) ? today : format(subDays(new Date(), 1), "yyyy-MM-dd");
  while (logSet.has(cur)) {
    streak++;
    cur = format(subDays(parseISO(cur), 1), "yyyy-MM-dd");
  }
  return streak;
}

function buildWeightChart(logs: DailyLog[]): WeightChartPoint[] {
  const today     = new Date();
  const allW      = logs.filter((l) => l.weight_kg != null).map((l) => ({
    date: l.log_date, weight: l.weight_kg!,
  }));

  return Array.from({ length: 30 }, (_, i) => {
    const d       = addDays(subDays(today, 29), i);
    const dateStr = format(d, "yyyy-MM-dd");
    const entry   = logs.find((l) => l.log_date === dateStr);

    // 7-day moving average up to this date
    const window7 = allW.filter(
      (w) => w.date <= dateStr && w.date >= format(subDays(d, 6), "yyyy-MM-dd")
    );
    const movingAvg =
      window7.length >= 3
        ? parseFloat((window7.reduce((s, w) => s + w.weight, 0) / window7.length).toFixed(2))
        : null;

    return {
      date: dateStr,
      displayDate: format(d, "MMM d"),
      weight:     entry?.weight_kg ?? null,
      movingAvg,
    };
  });
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

const EMPTY: DashboardData = {
  loading: true, profile: null, targets: null, todayLog: null,
  streak: 0, weekDays: [], weightChart: [],
  macroSlices: [], weeklyAvgCalories: 0,
  currentWeight: null, startingWeight: null, weightChange: null, last7Weights: [],
  allLogs: [],
};

export function useDashboardData(): DashboardData {
  const supabase = useMemo(() => createBrowserClient(), []);
  const { user } = useAuth();
  const [state, setState] = useState<DashboardData>(EMPTY);

  useEffect(() => {
    if (!user) return;

    async function fetchAll() {
      const uid    = user!.id;
      const today  = format(new Date(), "yyyy-MM-dd");
      const since  = format(subDays(new Date(), 60), "yyyy-MM-dd");

      const [{ data: profile }, { data: rawLogs }] = await Promise.all([
        supabase.from("profiles").select("*").eq("id", uid).maybeSingle(),
        supabase
          .from("daily_logs").select("*")
          .eq("user_id", uid).gte("log_date", since)
          .order("log_date", { ascending: true }),
      ]);

      const logs       = rawLogs ?? [];
      const todayLog   = logs.find((l) => l.log_date === today) ?? null;

      const allWeights = logs.filter((l) => l.weight_kg != null).map((l) => l.weight_kg!);
      const currentWeight  = allWeights.at(-1) ?? null;
      const startingWeight = allWeights[0] ?? null;
      const weightChange   =
        currentWeight != null && startingWeight != null
          ? parseFloat((currentWeight - startingWeight).toFixed(1))
          : null;
      const last7Weights   = allWeights.slice(-7);

      const targets = profile ? computeTargets(profile, currentWeight) : null;
      const streak  = calcStreak(logs);

      // ── This week (Mon→Sun) ──────────────────────────────────────────────
      const weekStart = startOfWeek(new Date(), { weekStartsOn: 1 });
      const weekDays: WeekDay[] = Array.from({ length: 7 }, (_, i) => {
        const d       = addDays(weekStart, i);
        const dateStr = format(d, "yyyy-MM-dd");
        const log     = logs.find((l) => l.log_date === dateStr);
        const caloriePct =
          log?.calories && targets?.calories ? log.calories / targets.calories : 0;
        return {
          date: dateStr,
          label:      format(d, "EEE"),
          shortLabel: format(d, "EEEEE"),
          isToday:    isToday(d),
          isFuture:   isFuture(d) && !isToday(d),
          hasLog:     !!log,
          calories:   log?.calories ?? null,
          caloriePct,
        };
      });

      // ── Weight chart ─────────────────────────────────────────────────────
      const weightChart = buildWeightChart(logs);

      // ── Macro donut (this week's average) ────────────────────────────────
      const weekLogsWithMacros = logs.filter(
        (l) => l.log_date >= format(weekStart, "yyyy-MM-dd") &&
               l.log_date <= today &&
               (l.protein_g || l.carbs_g || l.fats_g)
      );
      const n = weekLogsWithMacros.length || 1;
      const avgP = weekLogsWithMacros.reduce((s, l) => s + (l.protein_g ?? 0), 0) / n;
      const avgC = weekLogsWithMacros.reduce((s, l) => s + (l.carbs_g   ?? 0), 0) / n;
      const avgF = weekLogsWithMacros.reduce((s, l) => s + (l.fats_g    ?? 0), 0) / n;
      const calLogs = logs.filter(
        (l) => l.log_date >= format(weekStart, "yyyy-MM-dd") && l.log_date <= today && l.calories
      );
      const weeklyAvgCalories =
        calLogs.length > 0
          ? Math.round(calLogs.reduce((s, l) => s + (l.calories ?? 0), 0) / calLogs.length)
          : 0;

      const macroSlices: MacroSlice[] = [
        { name: "Protein", value: Math.round(avgP * 4), fill: "#C9A96E" },
        { name: "Carbs",   value: Math.round(avgC * 4), fill: "#7BA7C4" },
        { name: "Fats",    value: Math.round(avgF * 9), fill: "#C47C5A" },
      ].filter((s) => s.value > 0);

      setState({
        loading: false, profile, targets, todayLog,
        streak, weekDays, weightChart, macroSlices, weeklyAvgCalories,
        currentWeight, startingWeight, weightChange, last7Weights,
        allLogs: logs,
      });
    }

    fetchAll();
  }, [user, supabase]);

  return state;
}
