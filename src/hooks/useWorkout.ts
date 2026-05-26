"use client";

import { useState, useEffect, useCallback } from "react";
import { createBrowserClient } from "@/lib/supabase";
import { useAuth } from "@/hooks/useAuth";
import type { WorkoutSession, WorkoutSet } from "@/types/database";

export interface SetDraft {
  exercise: string;
  reps: string;
  weight_kg: string;
  notes: string;
}

export interface ExerciseBlock {
  exercise: string;
  sets: SetDraft[];
}

export interface SessionWithSets extends WorkoutSession {
  sets: WorkoutSet[];
}

export function emptySet(): SetDraft {
  return { exercise: "", reps: "", weight_kg: "", notes: "" };
}

// Best (heaviest) set per exercise across all sessions for strength trend
export interface ExercisePR {
  exercise: string;
  best_weight_kg: number;
  best_reps: number;
  achieved_at: string;
}

export function useWorkout() {
  const { profile } = useAuth();
  const [sessions, setSessions] = useState<SessionWithSets[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchSessions = useCallback(async () => {
    if (!profile?.id) return;
    setLoading(true);
    const supabase = createBrowserClient();
    const { data: sessionData, error: sErr } = await supabase
      .from("workout_sessions")
      .select("*")
      .eq("user_id", profile.id)
      .order("workout_date", { ascending: false })
      .limit(60);

    if (sErr) { setError(sErr.message); setLoading(false); return; }

    const sessionIds = (sessionData ?? []).map((s) => s.id);
    if (sessionIds.length === 0) {
      setSessions([]);
      setLoading(false);
      return;
    }

    const { data: setData, error: stErr } = await supabase
      .from("workout_sets")
      .select("*")
      .in("session_id", sessionIds)
      .order("set_number", { ascending: true });

    if (stErr) { setError(stErr.message); setLoading(false); return; }

    const setsBySession = new Map<string, WorkoutSet[]>();
    for (const s of setData ?? []) {
      if (!setsBySession.has(s.session_id)) setsBySession.set(s.session_id, []);
      setsBySession.get(s.session_id)!.push(s);
    }

    setSessions(
      (sessionData ?? []).map((s) => ({ ...s, sets: setsBySession.get(s.id) ?? [] }))
    );
    setLoading(false);
  }, [profile?.id]);

  useEffect(() => { fetchSessions(); }, [fetchSessions]);

  async function saveSession(
    workoutDate: string,
    sessionName: string,
    sessionNotes: string,
    blocks: ExerciseBlock[]
  ): Promise<boolean> {
    if (!profile?.id) return false;
    setSaving(true);
    setError(null);
    const supabase = createBrowserClient();

    const { data: session, error: sErr } = await supabase
      .from("workout_sessions")
      .insert({
        user_id: profile.id,
        workout_date: workoutDate,
        name: sessionName.trim() || null,
        notes: sessionNotes.trim() || null,
      })
      .select()
      .single();

    if (sErr || !session) {
      setError(sErr?.message ?? "Failed to create session");
      setSaving(false);
      return false;
    }

    const rows: {
      session_id: string; user_id: string; exercise: string;
      set_number: number; reps: number | null; weight_kg: number | null; notes: string | null;
    }[] = [];

    for (const block of blocks) {
      if (!block.exercise.trim()) continue;
      block.sets.forEach((s, i) => {
        rows.push({
          session_id: session.id,
          user_id: profile.id,
          exercise: block.exercise.trim(),
          set_number: i + 1,
          reps: s.reps ? parseInt(s.reps, 10) : null,
          weight_kg: s.weight_kg ? parseFloat(s.weight_kg) : null,
          notes: s.notes.trim() || null,
        });
      });
    }

    if (rows.length > 0) {
      const { error: stErr } = await supabase.from("workout_sets").insert(rows);
      if (stErr) {
        await supabase.from("workout_sessions").delete().eq("id", session.id);
        setError(stErr.message);
        setSaving(false);
        return false;
      }
    }

    await fetchSessions();
    setSaving(false);
    return true;
  }

  async function removeSession(id: string): Promise<boolean> {
    const supabase = createBrowserClient();
    const { error: err } = await supabase
      .from("workout_sessions").delete().eq("id", id);
    if (err) { setError(err.message); return false; }
    setSessions((prev) => prev.filter((s) => s.id !== id));
    return true;
  }

  // Personal records: heaviest set per exercise
  function getPersonalRecords(): ExercisePR[] {
    const map = new Map<string, ExercisePR>();
    for (const session of sessions) {
      for (const set of session.sets) {
        if (!set.weight_kg) continue;
        const key = set.exercise.toLowerCase();
        const existing = map.get(key);
        if (!existing || set.weight_kg > existing.best_weight_kg) {
          map.set(key, {
            exercise: set.exercise,
            best_weight_kg: set.weight_kg,
            best_reps: set.reps ?? 0,
            achieved_at: session.workout_date,
          });
        }
      }
    }
    return Array.from(map.values()).sort((a, b) => a.exercise.localeCompare(b.exercise));
  }

  // Volume trend for a specific exercise (total kg lifted per session)
  function getVolumeTrend(exercise: string): { date: string; volume: number; maxWeight: number }[] {
    const key = exercise.toLowerCase();
    return sessions
      .filter((s) => s.sets.some((st) => st.exercise.toLowerCase() === key))
      .map((s) => {
        const relevant = s.sets.filter((st) => st.exercise.toLowerCase() === key);
        const volume = relevant.reduce((sum, st) => sum + (st.weight_kg ?? 0) * (st.reps ?? 0), 0);
        const maxWeight = Math.max(...relevant.map((st) => st.weight_kg ?? 0));
        return { date: s.workout_date, volume, maxWeight };
      })
      .reverse();
  }

  return {
    sessions, loading, saving, error,
    saveSession, removeSession,
    getPersonalRecords, getVolumeTrend,
    refetch: fetchSessions,
  };
}
