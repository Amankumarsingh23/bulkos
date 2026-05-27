"use client";

import { useState, useEffect, useCallback } from "react";
import { createBrowserClient } from "@/lib/supabase";
import { useAuth } from "./useAuth";
import { buildDailyWeightMap, toISTDateStr } from "@/lib/weightUtils";
import type { WeightLog } from "@/types/database";

export interface WeightLogHook {
  logs: WeightLog[];                       // last 90 days, newest first
  loading: boolean;
  dailyAvgByDate: Record<string, number>;  // IST date → avg kg
  todayLogs: WeightLog[];                  // entries for IST today
  latestKg: number | null;
  add: (kg: number, notes?: string) => Promise<boolean>;
  remove: (id: string) => Promise<boolean>;
  refetch: () => Promise<void>;
}

export function useWeightLog(): WeightLogHook {
  const { user } = useAuth();
  const [logs, setLogs] = useState<WeightLog[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchLogs = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const supabase = createBrowserClient();
    const since = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString();
    const { data } = await supabase
      .from("weight_logs")
      .select("*")
      .eq("user_id", user.id)
      .gte("logged_at", since)
      .order("logged_at", { ascending: false });
    setLogs(data ?? []);
    setLoading(false);
  }, [user]);

  useEffect(() => { fetchLogs(); }, [fetchLogs]);

  async function add(kg: number, notes?: string): Promise<boolean> {
    if (!user) return false;
    const supabase = createBrowserClient();
    const { error } = await supabase.from("weight_logs").insert({
      user_id:   user.id,
      weight_kg: kg,
      notes:     notes?.trim() || null,
      // logged_at defaults to now() in DB — stored as UTC
    });
    if (error) return false;
    await fetchLogs();
    return true;
  }

  async function remove(id: string): Promise<boolean> {
    const supabase = createBrowserClient();
    const { error } = await supabase
      .from("weight_logs").delete().eq("id", id);
    if (error) return false;
    setLogs((prev) => prev.filter((l) => l.id !== id));
    return true;
  }

  const dailyAvgByDate = buildDailyWeightMap(logs);
  const todayIST = toISTDateStr(new Date().toISOString());
  const todayLogs = logs.filter((l) => toISTDateStr(l.logged_at) === todayIST);
  const latestKg = logs[0]?.weight_kg ?? null;

  return { logs, loading, dailyAvgByDate, todayLogs, latestKg, add, remove, refetch: fetchLogs };
}
