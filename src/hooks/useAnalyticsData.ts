"use client";

import { useState, useEffect, useCallback } from "react";
import { createBrowserClient } from "@/lib/supabase";
import { useAuth } from "@/hooks/useAuth";
import {
  filterByRange,
  calculateMovingAverage,
  calculateWeightVelocity,
  calculateSurplus,
  calculateProteinPerKg,
  calculateBMI,
  calculateBodyComposition,
  calculateCorrelation,
  buildConsistencyGrid,
  type TimeRange,
  type WeightVelocityPoint,
  type WeeklySurplusPoint,
  type ProteinPerKgPoint,
  type BMIPoint,
  type BodyCompPoint,
  type CorrelationPoint,
  type ConsistencyCell,
} from "@/lib/analytics";
import type { DailyLog } from "@/types/database";

function computeTargetCalories(profile: {
  height_cm: number | null;
  age: number | null;
  gender: string | null;
  activity_level: string | null;
}, currentWeight: number | null): number {
  const { height_cm, age, gender, activity_level } = profile;
  const weight_kg = currentWeight;
  if (!weight_kg || !height_cm || !age) return 2500;
  const bmr =
    gender === "female"
      ? 10 * weight_kg + 6.25 * height_cm - 5 * age - 161
      : 10 * weight_kg + 6.25 * height_cm - 5 * age + 5;
  const multipliers: Record<string, number> = {
    sedentary: 1.2,
    light: 1.375,
    moderate: 1.55,
    active: 1.725,
    very_active: 1.9,
  };
  const tdee = bmr * (multipliers[activity_level ?? "moderate"] ?? 1.55);
  return Math.round(tdee + 300);
}

export interface WeightChartDatum {
  date: string;
  weight: number | null;
  sma: number | null;
  goal: number | null;
}

export interface MacroStackDatum {
  date: string;
  protein: number | null;
  carbs: number | null;
  fats: number | null;
  totalCals: number | null;
  proteinPct: number | null;
  carbsPct: number | null;
  fatsPct: number | null;
}

export interface AnalyticsData {
  loading: boolean;
  targetCalories: number;
  goalWeight: number | null;
  heightCm: number | null;
  gender: string | null;
  weightChart: WeightChartDatum[];
  surplusChart: WeeklySurplusPoint[];
  macroStack: MacroStackDatum[];
  proteinKgChart: ProteinPerKgPoint[];
  velocityChart: WeightVelocityPoint[];
  bmiChart: BMIPoint[];
  bodyCompChart: BodyCompPoint[];
  consistencyGrid: ConsistencyCell[];
  correlationPoints: CorrelationPoint[];
  rawLogs: DailyLog[];
}

export function useAnalyticsData(range: TimeRange): AnalyticsData {
  const { profile } = useAuth();
  const [allLogs, setAllLogs] = useState<DailyLog[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchLogs = useCallback(async () => {
    if (!profile?.id) return;
    setLoading(true);
    const supabase = createBrowserClient();
    const { data } = await supabase
      .from("daily_logs")
      .select("*")
      .eq("user_id", profile.id)
      .order("log_date", { ascending: true });
    setAllLogs(data ?? []);
    setLoading(false);
  }, [profile?.id]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  if (loading || !profile) {
    return {
      loading: true,
      targetCalories: 2500,
      goalWeight: null,
      heightCm: null,
      gender: null,
      weightChart: [],
      surplusChart: [],
      macroStack: [],
      proteinKgChart: [],
      velocityChart: [],
      bmiChart: [],
      bodyCompChart: [],
      consistencyGrid: [],
      correlationPoints: [],
      rawLogs: [],
    };
  }

  const latestWeight = [...allLogs].reverse().find((l) => l.weight_kg !== null)?.weight_kg ?? null;
  const targetCalories = computeTargetCalories(profile, latestWeight);
  const goalWeight = profile.target_weight_kg ?? null;
  const heightCm = profile.height_cm ?? null;

  const logs = filterByRange(allLogs, range);

  // Weight + SMA chart
  const weights = logs.map((l) => l.weight_kg);
  const sma = calculateMovingAverage(weights, 7);
  const weightChart: WeightChartDatum[] = logs.map((l, i) => ({
    date: l.log_date,
    weight: l.weight_kg,
    sma: sma[i],
    goal: goalWeight,
  }));

  // Surplus chart (weekly)
  const surplusChart = calculateSurplus(logs, targetCalories);

  // Macro stacked area
  const macroStack: MacroStackDatum[] = logs.map((l) => {
    const p = l.protein_g ?? 0;
    const c = l.carbs_g ?? 0;
    const f = l.fats_g ?? 0;
    const total = p * 4 + c * 4 + f * 9;
    return {
      date: l.log_date,
      protein: l.protein_g,
      carbs: l.carbs_g,
      fats: l.fats_g,
      totalCals: total || null,
      proteinPct: total ? Math.round((p * 4 / total) * 100) : null,
      carbsPct: total ? Math.round((c * 4 / total) * 100) : null,
      fatsPct: total ? Math.round((f * 9 / total) * 100) : null,
    };
  });

  const proteinKgChart = calculateProteinPerKg(logs);
  const velocityChart = calculateWeightVelocity(logs);
  const bmiChart = heightCm ? calculateBMI(logs, heightCm) : [];
  const bodyCompChart = heightCm ? calculateBodyComposition(logs, heightCm, profile.age, profile.gender) : [];
  const consistencyGrid = buildConsistencyGrid(allLogs, 12);
  const correlationPoints = calculateCorrelation(logs, targetCalories);

  return {
    loading: false,
    targetCalories,
    goalWeight,
    heightCm,
    gender: profile.gender ?? null,
    weightChart,
    surplusChart,
    macroStack,
    proteinKgChart,
    velocityChart,
    bmiChart,
    bodyCompChart,
    consistencyGrid,
    correlationPoints,
    rawLogs: logs,
  };
}
