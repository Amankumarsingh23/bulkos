"use client";

import { useState, useEffect } from "react";
import { createBrowserClient } from "@/lib/supabase";
import { useAuth } from "./useAuth";
import { differenceInDays, parseISO, format, startOfWeek } from "date-fns";
import { computeWeekScore } from "@/lib/weeklyScore";
import { buildDailyWeightMap, toISTDateStr } from "@/lib/weightUtils";
import type { ShareCardData } from "@/lib/shareCard";
import type { DailyLog } from "@/types/database";

export interface ShareCardDataState {
  loading: boolean;
  data: ShareCardData | null;
}

const ACTIVITY_MULT: Record<string, number> = {
  sedentary: 1.2, lightly_active: 1.375, moderately_active: 1.55,
  very_active: 1.725, extra_active: 1.9,
};

export function useShareCardData(): ShareCardDataState {
  const { user } = useAuth();
  const [state, setState] = useState<ShareCardDataState>({ loading: true, data: null });

  useEffect(() => {
    if (!user) return;
    const supabase = createBrowserClient();

    async function load() {
      setState({ loading: true, data: null });

      const uid = user!.id;
      const displayName =
        (user!.user_metadata?.full_name as string | undefined) ??
        user!.email?.split("@")[0] ??
        "Athlete";

      // Fetch data needed for the card
      const weekStart = format(startOfWeek(new Date(), { weekStartsOn: 1 }), "yyyy-MM-dd");

      const [profileRes, weightLogsRes, firstLogRes, setsRes, photoRes, weekLogsRes] = await Promise.all([
        supabase
          .from("profiles")
          .select("target_weight_kg, height_cm, age, gender, activity_level, target_date")
          .eq("id", uid)
          .single(),
        supabase
          .from("weight_logs")
          .select("id, logged_at, weight_kg, notes")
          .eq("user_id", uid)
          .order("logged_at", { ascending: true }),
        supabase
          .from("daily_logs")
          .select("log_date")
          .eq("user_id", uid)
          .order("log_date", { ascending: true })
          .limit(1),
        supabase
          .from("workout_sets")
          .select("exercise, weight_kg")
          .eq("user_id", uid)
          .not("weight_kg", "is", null),
        supabase
          .from("progress_photos")
          .select("public_url")
          .eq("user_id", uid)
          .order("taken_at", { ascending: false })
          .limit(1),
        supabase
          .from("daily_logs")
          .select("log_date, calories, protein_g, weight_kg, sleep_hours")
          .eq("user_id", uid)
          .gte("log_date", weekStart)
          .order("log_date", { ascending: true }),
      ]);

      const profile = profileRes.data as {
        target_weight_kg: number | null;
        height_cm: number | null;
        age: number | null;
        gender: string | null;
        activity_level: string | null;
        target_date: string | null;
      } | null;

      const allSets = setsRes.data ?? [];
      const allWeightLogs = weightLogsRes.data ?? [];

      // Weeks on program — from first daily_log date
      const firstLogDate = firstLogRes.data?.[0]?.log_date ?? null;
      const weeksOnProgram = firstLogDate
        ? Math.max(1, Math.floor(differenceInDays(new Date(), parseISO(firstLogDate)) / 7))
        : 1;

      // Weight — from weight_logs daily averages
      const weightByDate = buildDailyWeightMap(allWeightLogs);
      const sortedDates = Object.keys(weightByDate).sort();
      const startWeight = sortedDates.length ? weightByDate[sortedDates[0]] : null;
      const currentWeight = sortedDates.length ? weightByDate[sortedDates.at(-1)!] : null;
      const weightChange =
        startWeight !== null && currentWeight !== null
          ? Math.round((currentWeight - startWeight) * 10) / 10
          : null;

      // Best lift — heaviest single set
      let bestLiftName: string | null = null;
      let bestLiftKg: number | null = null;
      for (const s of allSets) {
        if (s.weight_kg !== null && (bestLiftKg === null || s.weight_kg > bestLiftKg)) {
          bestLiftKg = s.weight_kg;
          bestLiftName = s.exercise;
        }
      }

      // Compute this week's score from daily_logs
      let targets: { calories?: number; proteinG?: number } | null = null;
      if (profile?.height_cm && profile.age && profile.gender && profile.activity_level && currentWeight) {
        const gOff = profile.gender === "male" ? 5 : profile.gender === "female" ? -161 : -78;
        const bmr = 10 * currentWeight + 6.25 * profile.height_cm - 5 * profile.age + gOff;
        const tdee = Math.round(bmr * (ACTIVITY_MULT[profile.activity_level] ?? 1.55));
        const days = profile.target_date
          ? Math.max(30, Math.ceil((new Date(profile.target_date).getTime() - Date.now()) / 86_400_000))
          : 180;
        const surplus = profile.target_weight_kg
          ? Math.round(((profile.target_weight_kg - currentWeight) * 7700) / days)
          : 0;
        targets = {
          calories: tdee + surplus,
          proteinG: Math.round(currentWeight * 2),
        };
      }

      const weekScore = computeWeekScore(
        (weekLogsRes.data ?? []) as DailyLog[],
        targets
      );

      // Latest progress photo
      const progressPhotoUrl = photoRes.data?.[0]?.public_url ?? null;

      setState({
        loading: false,
        data: {
          userName: displayName,
          weeksOnProgram,
          weightChange,
          currentWeight,
          startWeight,
          targetWeight: profile?.target_weight_kg ?? null,
          bestLiftName,
          bestLiftKg,
          weekGrade: weekScore.grade,
          weekScore: weekScore.score,
          progressPhotoUrl,
          includePhoto: false,
        },
      });
    }

    load();
  }, [user]);

  return state;
}
