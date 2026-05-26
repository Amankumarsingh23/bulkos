import type { DailyLog, ActivityLevel } from "@/types/database";

const ACT_LEVELS: { value: ActivityLevel; multiplier: number; label: string }[] = [
  { value: "sedentary",         multiplier: 1.2,   label: "Sedentary"         },
  { value: "lightly_active",    multiplier: 1.375, label: "Lightly active"    },
  { value: "moderately_active", multiplier: 1.55,  label: "Moderately active" },
  { value: "very_active",       multiplier: 1.725, label: "Very active"       },
  { value: "extra_active",      multiplier: 1.9,   label: "Extra active"      },
];

export interface AdaptiveTDEEResult {
  hasEnoughData: boolean;
  weeksOfData: number;
  daysWithCals: number;
  confidence: "insufficient" | "low" | "medium" | "high";
  avgDailyCals: number;
  weeklyWeightChange: number;      // kg / week (positive = gaining)
  adaptiveTDEE: number;            // back-calculated from actual intake + weight change
  formulaTDEE: number;             // from Mifflin-St Jeor + activity multiplier
  difference: number;              // adaptive - formula (negative = formula overestimates)
  recommendedCalories: number;     // adaptiveTDEE + 300 surplus
  suggestedActivityLevel: ActivityLevel | null;
  suggestedActivityLabel: string | null;
}

export function computeAdaptiveTDEE(
  logs: DailyLog[],
  profile: {
    height_cm: number | null;
    age: number | null;
    gender: string | null;
    activity_level: string | null;
  },
  formulaTDEE: number
): AdaptiveTDEEResult {
  const withCals    = logs.filter((l) => l.calories   !== null);
  const withWeight  = logs.filter((l) => l.weight_kg  !== null);
  const usable      = logs.filter((l) => l.weight_kg  !== null && l.calories !== null);

  const empty: AdaptiveTDEEResult = {
    hasEnoughData: false,
    weeksOfData: 0,
    daysWithCals: withCals.length,
    confidence: "insufficient",
    avgDailyCals: 0,
    weeklyWeightChange: 0,
    adaptiveTDEE: formulaTDEE,
    formulaTDEE,
    difference: 0,
    recommendedCalories: formulaTDEE + 300,
    suggestedActivityLevel: null,
    suggestedActivityLabel: null,
  };

  if (withCals.length < 7 || withWeight.length < 4) return empty;

  // Sort by date
  const sortedW = [...withWeight].sort((a, b) => a.log_date.localeCompare(b.log_date));
  const firstDate = new Date(sortedW[0].log_date);
  const lastDate  = new Date(sortedW[sortedW.length - 1].log_date);
  const daySpan   = Math.max(1, (lastDate.getTime() - firstDate.getTime()) / 86_400_000);
  const weeksOfData = Math.round((daySpan / 7) * 10) / 10;

  if (weeksOfData < 1.5) return empty;

  const avgDailyCals = Math.round(
    withCals.reduce((s, l) => s + (l.calories ?? 0), 0) / withCals.length
  );

  const firstWeight    = sortedW[0].weight_kg!;
  const lastWeight     = sortedW[sortedW.length - 1].weight_kg!;
  const totalDelta     = lastWeight - firstWeight;
  const weeklyWeightChange = Math.round((totalDelta / weeksOfData) * 100) / 100;

  // 1 kg body mass ≈ 7700 kcal
  const dailyCalEquivOfGain = (weeklyWeightChange * 7700) / 7;
  const adaptiveTDEE = Math.round(avgDailyCals - dailyCalEquivOfGain);

  let confidence: AdaptiveTDEEResult["confidence"] = "insufficient";
  if      (weeksOfData >= 8) confidence = "high";
  else if (weeksOfData >= 4) confidence = "medium";
  else if (weeksOfData >= 2) confidence = "low";

  const difference          = adaptiveTDEE - formulaTDEE;
  const recommendedCalories = adaptiveTDEE + 300;

  // Find which activity level's multiplier best fits the implied one
  let suggestedActivityLevel: ActivityLevel | null = null;
  let suggestedActivityLabel: string | null        = null;
  if (profile.height_cm && profile.age) {
    const gOff           = profile.gender === "male" ? 5 : profile.gender === "female" ? -161 : -78;
    const latestWeight   = sortedW[sortedW.length - 1].weight_kg!;
    const bmr            = 10 * latestWeight + 6.25 * profile.height_cm - 5 * profile.age + gOff;
    const implied        = adaptiveTDEE / bmr;
    let best             = ACT_LEVELS[0];
    let bestDiff         = Math.abs(ACT_LEVELS[0].multiplier - implied);
    for (const lvl of ACT_LEVELS) {
      const d = Math.abs(lvl.multiplier - implied);
      if (d < bestDiff) { bestDiff = d; best = lvl; }
    }
    suggestedActivityLevel = best.value;
    suggestedActivityLabel = best.label;
  }

  return {
    hasEnoughData: true,
    weeksOfData,
    daysWithCals: withCals.length,
    confidence,
    avgDailyCals,
    weeklyWeightChange,
    adaptiveTDEE,
    formulaTDEE,
    difference,
    recommendedCalories,
    suggestedActivityLevel,
    suggestedActivityLabel,
  };
}
