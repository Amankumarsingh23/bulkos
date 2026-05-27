"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { endOfMonth, format, parseISO, startOfMonth } from "date-fns";
import { createBrowserClient } from "@/lib/supabase";
import { useAuth } from "./useAuth";
import type { DailyLog, Profile } from "@/types/database";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface MacroTargets {
  calories: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
}

export interface LogFormData {
  calories: string;
  protein_g: string;
  carbs_g: string;
  fats_g: string;
  water_ml: string;
  notes: string;
}

export const EMPTY_FORM: LogFormData = {
  calories: "", protein_g: "",
  carbs_g: "", fats_g: "", water_ml: "", notes: "",
};

// ─── Target calculation (Mifflin-St Jeor, same as onboarding) ────────────────

const ACTIVITY_MULT: Record<string, number> = {
  sedentary: 1.2, lightly_active: 1.375, moderately_active: 1.55,
  very_active: 1.725, extra_active: 1.9,
};

function computeTargets(profile: Profile, weight: number | null): MacroTargets | null {
  const { height_cm, age, gender, activity_level, target_weight_kg, target_date } = profile;
  if (!height_cm || !age || !gender || !activity_level || !weight || !target_weight_kg) return null;

  const gOff   = gender === "male" ? 5 : gender === "female" ? -161 : -78;
  const bmr    = 10 * weight + 6.25 * height_cm - 5 * age + gOff;
  const tdee   = Math.round(bmr * (ACTIVITY_MULT[activity_level] ?? 1.55));

  const days   = target_date
    ? Math.max(30, Math.ceil((new Date(target_date).getTime() - Date.now()) / 86_400_000))
    : 180;

  const surplus    = Math.round(((target_weight_kg - weight) * 7700) / days);
  const targetCal  = tdee + surplus;
  const proteinG   = Math.round(weight * 2);
  const fatG       = Math.round(weight * 0.8);
  const carbsG     = Math.max(0, Math.round((targetCal - proteinG * 4 - fatG * 9) / 4));

  return { calories: Math.round(targetCal), proteinG, carbsG, fatG };
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useDailyLog(date: string) {
  const supabase = useMemo(() => createBrowserClient(), []);
  const { user } = useAuth();

  const [log,         setLog]         = useState<DailyLog | null>(null);
  const [profile,     setProfile]     = useState<Profile | null>(null);
  const [latestWeight, setLatestWeight] = useState<number | null>(null);
  const [loggedDates, setLoggedDates] = useState<Set<string>>(new Set());
  const [loading,     setLoading]     = useState(true);
  const [saving,      setSaving]      = useState(false);
  const [saveError,   setSaveError]   = useState<string | null>(null);

  // Fetch profile once
  useEffect(() => {
    if (!user) return;
    supabase.from("profiles").select("*").eq("id", user.id).maybeSingle()
      .then(({ data }) => { if (data) setProfile(data); });
  }, [user, supabase]);

  // Fetch latest weight from weight_logs once for target calculation
  useEffect(() => {
    if (!user) return;
    supabase
      .from("weight_logs")
      .select("weight_kg")
      .eq("user_id", user.id)
      .order("logged_at", { ascending: false })
      .limit(1)
      .then(({ data }) => {
        setLatestWeight(data?.[0]?.weight_kg ?? null);
      });
  }, [user, supabase]);

  // Fetch log + logged dates whenever date changes
  useEffect(() => {
    if (!user) return;
    setLoading(true);

    async function fetchAll() {
      const uid = user!.id;

      const { data: logData } = await supabase
        .from("daily_logs").select("*")
        .eq("user_id", uid).eq("log_date", date).maybeSingle();
      setLog(logData);

      // All logged dates in the visible month (for dot indicators)
      const monthStart = format(startOfMonth(parseISO(date)), "yyyy-MM-dd");
      const monthEnd   = format(endOfMonth(parseISO(date)),   "yyyy-MM-dd");
      const { data: monthRows } = await supabase
        .from("daily_logs").select("log_date")
        .eq("user_id", uid).gte("log_date", monthStart).lte("log_date", monthEnd);

      setLoggedDates(new Set((monthRows ?? []).map((r) => r.log_date)));
      setLoading(false);
    }

    fetchAll();
  }, [user, date, supabase]);

  // Targets — recalculated whenever profile or latest weight changes
  const targets = useMemo(() => {
    if (!profile) return null;
    return computeTargets(profile, latestWeight);
  }, [profile, latestWeight]);

  const save = useCallback(async (formData: LogFormData): Promise<boolean> => {
    if (!user) return false;
    setSaving(true);
    setSaveError(null);

    const { error, data: saved } = await supabase
      .from("daily_logs")
      .upsert({
        user_id:   user.id,
        log_date:  date,
        calories:  formData.calories   ? parseInt(formData.calories)      : null,
        protein_g: formData.protein_g  ? parseFloat(formData.protein_g)  : null,
        carbs_g:   formData.carbs_g    ? parseFloat(formData.carbs_g)    : null,
        fats_g:    formData.fats_g     ? parseFloat(formData.fats_g)     : null,
        water_ml:  formData.water_ml   ? parseInt(formData.water_ml)     : null,
        notes:     formData.notes.trim() || null,
      }, { onConflict: "user_id,log_date" })
      .select().single();

    if (error) {
      setSaveError(error.message);
      setSaving(false);
      return false;
    }

    setLog(saved);
    setLoggedDates((prev) => new Set([...prev, date]));
    setSaving(false);
    return true;
  }, [user, date, supabase]);

  return { log, profile, targets, loggedDates, loading, saving, saveError, save };
}
