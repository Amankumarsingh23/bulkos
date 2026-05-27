import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { buildServerClient } from "@/lib/supabase";
import { generateInsightReport, askAI } from "@/lib/groq";
import type { Database } from "@/types/database";

function computeTargets(profile: {
  weight_kg?: number | null;
  height_cm: number | null;
  age: number | null;
  gender: string | null;
  activity_level: string | null;
}): { targetCalories: number; targetProtein: number } {
  const weight = profile.weight_kg ?? 75;
  const { height_cm, age, gender, activity_level } = profile;
  if (!height_cm || !age) return { targetCalories: 2500, targetProtein: 150 };

  const bmr =
    gender === "female"
      ? 10 * weight + 6.25 * height_cm - 5 * age - 161
      : 10 * weight + 6.25 * height_cm - 5 * age + 5;

  const multipliers: Record<string, number> = {
    sedentary: 1.2,
    lightly_active: 1.375,
    moderately_active: 1.55,
    very_active: 1.725,
    extra_active: 1.9,
  };
  const tdee = bmr * (multipliers[activity_level ?? "moderately_active"] ?? 1.55);
  return {
    targetCalories: Math.round(tdee + 300),
    targetProtein: Math.round(weight * 2.0),
  };
}

export async function POST(req: NextRequest) {
  try {
    const cookieStore = await cookies();
    const supabase = buildServerClient(cookieStore);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json() as {
      period: "week" | "month";
      mode?: "report" | "ask";
      question?: string;
    };

    const { period, mode = "report", question } = body;

    // Fetch profile
    const { data: profile } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .single();

    if (!profile) {
      return NextResponse.json({ error: "Profile not found" }, { status: 404 });
    }

    // Fetch logs + weight_logs for the period
    const days = period === "week" ? 7 : 30;
    const since = new Date();
    since.setDate(since.getDate() - days);
    const sinceStr = since.toISOString().split("T")[0];

    const [{ data: logs }, { data: weightLogs }, { data: latestWeightRow }] = await Promise.all([
      supabase
        .from("daily_logs")
        .select("*")
        .eq("user_id", user.id)
        .gte("log_date", sinceStr)
        .order("log_date", { ascending: true }),
      supabase
        .from("weight_logs")
        .select("logged_at, weight_kg")
        .eq("user_id", user.id)
        .gte("logged_at", since.toISOString())
        .order("logged_at", { ascending: true }),
      // Latest weight ever (for target calc, not just within period)
      supabase
        .from("weight_logs")
        .select("weight_kg")
        .eq("user_id", user.id)
        .order("logged_at", { ascending: false })
        .limit(1),
    ]);

    const latestWeight = latestWeightRow?.[0]?.weight_kg ?? null;

    const { targetCalories, targetProtein } = computeTargets({
      ...profile,
      weight_kg: latestWeight,
    });

    // Build daily-average weight map from weight_logs (IST date key)
    const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000;
    const weightByDate: Record<string, number[]> = {};
    for (const w of weightLogs ?? []) {
      const istDate = new Date(new Date(w.logged_at).getTime() + IST_OFFSET_MS)
        .toISOString().slice(0, 10);
      (weightByDate[istDate] ??= []).push(w.weight_kg);
    }
    const dailyAvgWeight: Record<string, number> = Object.fromEntries(
      Object.entries(weightByDate).map(([d, vals]) => [
        d,
        Math.round((vals.reduce((a, b) => a + b, 0) / vals.length) * 10) / 10,
      ])
    );

    // Inject daily-avg weight into daily_logs so AI sees real weight data
    const logsForAI = (logs ?? []).map((l) => ({
      ...l,
      weight_kg: dailyAvgWeight[l.log_date] ?? null,
    }));

    if (mode === "ask") {
      if (!question?.trim()) {
        return NextResponse.json({ error: "Question is required" }, { status: 400 });
      }
      const answer = await askAI({ profile, logs: logsForAI, question, targetCalories, targetProtein });
      return NextResponse.json({ content: answer });
    }

    // Generate full report
    const content = await generateInsightReport({
      profile,
      logs: logsForAI,
      period,
      targetCalories,
      targetProtein,
    });

    // Save to ai_reports table
    await supabase.from("ai_reports").insert({
      user_id: user.id,
      report_type: period === "week" ? "weekly" : "monthly",
      content,
      data_snapshot: {
        period,
        logCount: logsForAI.length,
        targetCalories,
        targetProtein,
        generatedAt: new Date().toISOString(),
      },
    });

    return NextResponse.json({ content });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
