// Shared helpers for the weight_logs system.
// All timestamps are stored UTC in DB; display in IST (UTC+5:30).

export interface RawWeightLog {
  id: string;
  logged_at: string; // UTC ISO timestamptz
  weight_kg: number;
  notes: string | null;
}

// ── IST helpers ───────────────────────────────────────────────────────────────

const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000;

function istDate(utcTs: string): Date {
  return new Date(new Date(utcTs).getTime() + IST_OFFSET_MS);
}

/** "yyyy-MM-dd" in IST */
export function toISTDateStr(utcTs: string): string {
  return istDate(utcTs).toISOString().slice(0, 10);
}

/** "8:30 AM" in IST */
export function toISTTimeStr(utcTs: string): string {
  const d = istDate(utcTs);
  const h = d.getUTCHours();
  const m = String(d.getUTCMinutes()).padStart(2, "0");
  const ampm = h >= 12 ? "PM" : "AM";
  return `${h % 12 || 12}:${m} ${ampm}`;
}

/** "Mon, 27 May" in IST */
export function toISTDateLabel(utcTs: string): string {
  const d = istDate(utcTs);
  return d.toLocaleDateString("en-IN", {
    weekday: "short", day: "numeric", month: "short", timeZone: "UTC",
  });
}

// ── Daily average map ─────────────────────────────────────────────────────────

/**
 * Convert raw weight_logs → { "yyyy-MM-dd": dailyAvgKg }
 * Date keys are IST calendar dates.
 * Average is rounded to 1 decimal.
 */
export function buildDailyWeightMap(
  weightLogs: RawWeightLog[]
): Record<string, number> {
  const byDate: Record<string, number[]> = {};
  for (const w of weightLogs) {
    const d = toISTDateStr(w.logged_at);
    (byDate[d] ??= []).push(w.weight_kg);
  }
  return Object.fromEntries(
    Object.entries(byDate).map(([d, vals]) => [
      d,
      Math.round((vals.reduce((a, b) => a + b, 0) / vals.length) * 10) / 10,
    ])
  );
}
