import Groq from "groq-sdk";
import type { Profile, DailyLog } from "@/types/database";

// Lazy initialization — avoids module-evaluation error during `next build`
// when GROQ_API_KEY isn't set (e.g. local dev without the key).
function getGroqClient() {
  return new Groq({ apiKey: process.env.GROQ_API_KEY });
}

const SYSTEM_PROMPT = `You are BulkOS AI — a nutrition and bulking coach analyzing a user's tracking data.
You speak in a warm, encouraging but data-driven tone. You're like a smart friend
who also happens to be a nutritionist.

Analyze the provided data and give:
1. **Summary**: 2-3 sentence overview of the period
2. **Weight Progress**: Analysis of weight trend, rate of gain, projected trajectory
3. **Nutrition Analysis**: Are they hitting their calorie/protein targets? Consistency?
4. **What's Working**: Specific positive patterns you see in the data
5. **What Needs Attention**: Areas of concern, specific days/patterns that hurt progress
6. **Recommendations**: 3 specific, actionable recommendations
7. **Projection**: At current rate, when will they hit their target weight?

Use actual numbers from their data. Be specific, not generic. If protein intake
on weekends drops, say that. If they missed logging 3 days, mention it.
Format with clean markdown.`;

const ASK_SYSTEM_PROMPT = `You are BulkOS AI — a nutrition and bulking coach with access to a user's recent tracking data.
You speak in a warm, encouraging but data-driven tone. Answer the user's specific question
using their actual data. Be concise, specific, and actionable. Use markdown formatting.
Keep responses focused — 150-300 words unless the question genuinely needs more.`;

export interface InsightInput {
  profile: Profile;
  logs: DailyLog[];
  period: "week" | "month";
  targetCalories: number;
  targetProtein: number;
}

export interface AskInput {
  profile: Profile;
  logs: DailyLog[];
  question: string;
  targetCalories: number;
  targetProtein: number;
}

function buildDataSummary(input: InsightInput): string {
  const { profile, logs, period, targetCalories, targetProtein } = input;
  const logsWithWeight = logs.filter((l) => l.weight_kg !== null);
  const logsWithCals = logs.filter((l) => l.calories !== null);

  const avgCals = logsWithCals.length
    ? Math.round(logsWithCals.reduce((s, l) => s + (l.calories ?? 0), 0) / logsWithCals.length)
    : null;
  const avgProtein = logsWithCals.length
    ? Math.round(logsWithCals.reduce((s, l) => s + (l.protein_g ?? 0), 0) / logsWithCals.length)
    : null;

  const firstWeight = logsWithWeight[0]?.weight_kg;
  const lastWeight = logsWithWeight[logsWithWeight.length - 1]?.weight_kg;
  const weightChange =
    firstWeight != null && lastWeight != null
      ? Math.round((lastWeight - firstWeight) * 100) / 100
      : null;

  // Day-of-week pattern for protein
  const byDay = new Map<number, number[]>();
  for (const l of logs) {
    if (l.protein_g !== null) {
      const day = new Date(l.log_date).getDay();
      if (!byDay.has(day)) byDay.set(day, []);
      byDay.get(day)!.push(l.protein_g);
    }
  }
  const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const dayAvgs = Array.from(byDay.entries())
    .map(([d, vals]) => ({
      day: dayNames[d],
      avg: Math.round(vals.reduce((a, b) => a + b, 0) / vals.length),
    }))
    .sort((a, b) => a.avg - b.avg);

  const missedDays = (period === "week" ? 7 : 30) - logs.length;

  return `
**User Profile:**
- Height: ${profile.height_cm ?? "?"}cm, Age: ${profile.age ?? "?"}
- Gender: ${profile.gender ?? "?"}, Activity: ${profile.activity_level ?? "?"}
- Target weight: ${profile.target_weight_kg ?? "not set"}kg
- Target date: ${profile.target_date ?? "not set"}
- Calculated TDEE + surplus target: ${targetCalories} kcal/day
- Protein target: ${targetProtein}g/day

**Period:** Last ${period === "week" ? "7" : "30"} days (${logs.length} days logged, ${missedDays} days missed)

**Weight data:**
${logsWithWeight.map((l) => `  ${l.log_date}: ${l.weight_kg}kg`).join("\n") || "  No weight data"}
- Start: ${firstWeight ?? "?"}kg → End: ${lastWeight ?? "?"}kg (change: ${weightChange != null ? `${weightChange >= 0 ? "+" : ""}${weightChange}kg` : "?"})

**Daily nutrition logs:**
${logs
  .map(
    (l) =>
      `  ${l.log_date}: ${l.calories ?? "?"}kcal | P:${l.protein_g ?? "?"}g C:${l.carbs_g ?? "?"}g F:${l.fats_g ?? "?"}g${l.notes ? ` | Note: "${l.notes}"` : ""}`
  )
  .join("\n") || "  No nutrition data"}

**Averages:**
- Avg calories: ${avgCals ?? "?"}kcal (target: ${targetCalories}kcal, ${avgCals != null ? (avgCals >= targetCalories ? "+" : "") + (avgCals - targetCalories) + "kcal" : "?"})
- Avg protein: ${avgProtein ?? "?"}g (target: ${targetProtein}g)

**Protein by day of week (low → high):**
${dayAvgs.map((d) => `  ${d.day}: ${d.avg}g`).join("\n") || "  Insufficient data"}
  `.trim();
}

export async function generateInsightReport(input: InsightInput): Promise<string> {
  const userMessage = buildDataSummary(input);

  const completion = await getGroqClient().chat.completions.create({
    model: "llama-3.3-70b-versatile",
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: userMessage },
    ],
    temperature: 0.7,
    max_tokens: 1500,
  });

  return completion.choices[0]?.message?.content ?? "Could not generate report.";
}

export async function askAI(input: AskInput): Promise<string> {
  const { profile, logs, question, targetCalories, targetProtein } = input;

  const contextSummary = buildDataSummary({
    profile,
    logs: logs.slice(-14),
    period: "week",
    targetCalories,
    targetProtein,
  });

  const completion = await getGroqClient().chat.completions.create({
    model: "llama-3.3-70b-versatile",
    messages: [
      { role: "system", content: ASK_SYSTEM_PROMPT },
      {
        role: "user",
        content: `Here is my recent tracking data:\n\n${contextSummary}\n\n---\n\nMy question: ${question}`,
      },
    ],
    temperature: 0.7,
    max_tokens: 600,
  });

  return completion.choices[0]?.message?.content ?? "Could not generate a response.";
}
