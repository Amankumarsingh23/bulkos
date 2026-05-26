"use client";

import { useState, useEffect, useCallback } from "react";
import { createBrowserClient } from "@/lib/supabase";
import { useAuth } from "@/hooks/useAuth";
import type { BodyMeasurement } from "@/types/database";

export interface MeasurementFormData {
  measured_at: string;
  neck_cm: string;
  chest_cm: string;
  waist_cm: string;
  hips_cm: string;
  left_arm_cm: string;
  right_arm_cm: string;
  left_thigh_cm: string;
  right_thigh_cm: string;
  notes: string;
}

export const EMPTY_MEASUREMENT_FORM = (date: string): MeasurementFormData => ({
  measured_at: date,
  neck_cm: "",
  chest_cm: "",
  waist_cm: "",
  hips_cm: "",
  left_arm_cm: "",
  right_arm_cm: "",
  left_thigh_cm: "",
  right_thigh_cm: "",
  notes: "",
});

function parseNum(s: string): number | null {
  const n = parseFloat(s);
  return isNaN(n) || n <= 0 ? null : Math.round(n * 10) / 10;
}

export function useBodyMeasurements() {
  const { profile } = useAuth();
  const [measurements, setMeasurements] = useState<BodyMeasurement[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetch = useCallback(async () => {
    if (!profile?.id) return;
    setLoading(true);
    const supabase = createBrowserClient();
    const { data, error: err } = await supabase
      .from("body_measurements")
      .select("*")
      .eq("user_id", profile.id)
      .order("measured_at", { ascending: true });
    if (err) setError(err.message);
    else setMeasurements(data ?? []);
    setLoading(false);
  }, [profile?.id]);

  useEffect(() => { fetch(); }, [fetch]);

  async function save(form: MeasurementFormData): Promise<boolean> {
    if (!profile?.id) return false;
    setSaving(true);
    setError(null);
    const supabase = createBrowserClient();
    const payload = {
      user_id: profile.id,
      measured_at: form.measured_at,
      neck_cm: parseNum(form.neck_cm),
      chest_cm: parseNum(form.chest_cm),
      waist_cm: parseNum(form.waist_cm),
      hips_cm: parseNum(form.hips_cm),
      left_arm_cm: parseNum(form.left_arm_cm),
      right_arm_cm: parseNum(form.right_arm_cm),
      left_thigh_cm: parseNum(form.left_thigh_cm),
      right_thigh_cm: parseNum(form.right_thigh_cm),
      notes: form.notes.trim() || null,
    };
    const { error: err } = await supabase
      .from("body_measurements")
      .upsert(payload, { onConflict: "user_id,measured_at" });
    setSaving(false);
    if (err) { setError(err.message); return false; }
    await fetch();
    return true;
  }

  async function remove(id: string): Promise<boolean> {
    const supabase = createBrowserClient();
    const { error: err } = await supabase.from("body_measurements").delete().eq("id", id);
    if (err) { setError(err.message); return false; }
    setMeasurements((prev) => prev.filter((m) => m.id !== id));
    return true;
  }

  return { measurements, loading, saving, error, save, remove, refetch: fetch };
}
