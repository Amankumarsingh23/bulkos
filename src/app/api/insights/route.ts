import { NextRequest, NextResponse } from "next/server";
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";
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
    const supabase = createRouteHandlerClient<Database>({ cookies: () => cookieStore });

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

    // Fetch logs for the period
    const days = period === "week" ? 7 : 30;
    const since = new Date();
    since.setDate(since.getDate() - days);
    const sinceStr = since.toISOString().split("T")[0];

    const { data: logs } = await supabase
      .from("daily_logs")
      .select("*")
      .eq("user_id", user.id)
      .gte("log_date", sinceStr)
      .order("log_date", { ascending: true });

    // Get latest weight from logs for target computation
    const latestWeight =
      [...(logs ?? [])].reverse().find((l) => l.weight_kg !== null)?.weight_kg ?? null;

    const { targetCalories, targetProtein } = computeTargets({
      ...profile,
      weight_kg: latestWeight,
    });

    const logsForAI = logs ?? [];

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
