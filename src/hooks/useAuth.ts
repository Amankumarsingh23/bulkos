"use client";

import { useEffect, useMemo, useState } from "react";
import { createBrowserClient } from "@/lib/supabase";
import type { User } from "@supabase/supabase-js";
import type { Profile } from "@/types/database";

interface AuthState {
  user: User | null;
  profile: Profile | null;
  loading: boolean;
}

export function useAuth() {
  const supabase = useMemo(() => createBrowserClient(), []);
  const [state, setState] = useState<AuthState>({
    user: null,
    profile: null,
    loading: true,
  });

  async function fetchProfile(userId: string) {
    const { data } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", userId)
      .single();
    setState((s) => ({ ...s, profile: data }));
  }

  useEffect(() => {
    // Hydrate from current session
    supabase.auth.getUser().then(({ data: { user } }) => {
      setState((s) => ({ ...s, user, loading: false }));
      if (user) fetchProfile(user.id);
    });

    // Keep in sync with auth events
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      const user = session?.user ?? null;
      setState((s) => ({ ...s, user, loading: false }));
      if (user) fetchProfile(user.id);
      else setState((s) => ({ ...s, profile: null }));
    });

    return () => subscription.unsubscribe();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function signIn(email: string, password: string) {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error };
  }

  async function signUp(email: string, password: string, fullName: string) {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: fullName } },
    });
    return { error };
  }

  async function signInWithGoogle() {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });
    return { error };
  }

  async function signOut() {
    await supabase.auth.signOut();
  }

  return { ...state, signIn, signUp, signInWithGoogle, signOut };
}
