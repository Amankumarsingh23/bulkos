"use client";

import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Scale, Trash2, Loader2, TrendingUp, TrendingDown, Minus } from "lucide-react";
import { useWeightLog } from "@/hooks/useWeightLog";
import { toISTDateStr, toISTTimeStr, toISTDateLabel } from "@/lib/weightUtils";
import { useToast } from "@/components/ui/Toast";
import { cn } from "@/lib/utils";
import type { WeightLog } from "@/types/database";

// ── Helpers ────────────────────────────────────────────────────────────────────

function todayISTStr(): string {
  return toISTDateStr(new Date().toISOString());
}

// Group logs by IST date
function groupByDate(logs: WeightLog[]): { date: string; label: string; entries: WeightLog[]; avg: number }[] {
  const map = new Map<string, WeightLog[]>();
  for (const log of logs) {
    const d = toISTDateStr(log.logged_at);
    (map.get(d) ?? map.set(d, []).get(d)!).push(log);
  }
  return Array.from(map.entries())
    .sort(([a], [b]) => b.localeCompare(a)) // newest first
    .map(([date, entries]) => {
      const avg = Math.round(
        (entries.reduce((s, e) => s + e.weight_kg, 0) / entries.length) * 10
      ) / 10;
      return { date, label: toISTDateLabel(entries[0].logged_at), entries, avg };
    });
}

// ── Quick Add panel ────────────────────────────────────────────────────────────

function QuickAdd({ onAdded }: { onAdded: () => void }) {
  const { add, latestKg } = useWeightLog();
  const toast = useToast();
  const [value, setValue] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  async function handleAdd() {
    const kg = parseFloat(value);
    if (isNaN(kg) || kg < 20 || kg > 400) {
      toast.error("Enter a valid weight between 20 – 400 kg");
      return;
    }
    setSaving(true);
    const ok = await add(kg, notes);
    if (ok) {
      toast.success(`${kg} kg logged at ${toISTTimeStr(new Date().toISOString())} IST`);
      setValue("");
      setNotes("");
      onAdded();
    } else {
      toast.error("Failed to save. Try again.");
    }
    setSaving(false);
  }

  const delta = latestKg !== null && !isNaN(parseFloat(value))
    ? parseFloat((parseFloat(value) - latestKg).toFixed(1))
    : null;

  return (
    <div className="bg-espresso rounded-2xl p-6 text-ivory shadow-warm-lg">
      <div className="flex items-center gap-2 mb-5">
        <Scale className="h-4 w-4 text-gold" />
        <p className="text-[11px] font-semibold text-gold/80 uppercase tracking-widest">Log Weight Now</p>
      </div>

      {/* Big weight input */}
      <div className="flex items-end gap-3 mb-2">
        <input
          type="number"
          step="0.1"
          min="20"
          max="400"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleAdd()}
          placeholder={latestKg ? String(latestKg) : "75.0"}
          autoFocus
          className={cn(
            "flex-1 bg-transparent font-display text-6xl font-bold text-white",
            "placeholder:text-white/20 focus:text-gold outline-none transition-colors duration-150",
            "[appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
          )}
          aria-label="Weight in kg"
        />
        <span className="text-xl text-white/50 mb-3 flex-shrink-0">kg</span>
      </div>

      {/* Delta indicator */}
      <AnimatePresence mode="wait">
        {delta !== null ? (
          <motion.div
            key="delta"
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="flex items-center gap-1.5 mb-4"
          >
            {delta > 0.05 ? (
              <TrendingUp className="h-3.5 w-3.5 text-terracotta" />
            ) : delta < -0.05 ? (
              <TrendingDown className="h-3.5 w-3.5 text-sage" />
            ) : (
              <Minus className="h-3.5 w-3.5 text-white/40" />
            )}
            <span className={cn(
              "text-sm font-medium",
              delta > 0.05 ? "text-terracotta" : delta < -0.05 ? "text-sage" : "text-white/40"
            )}>
              {delta > 0 ? "+" : ""}{delta} kg from last reading
            </span>
          </motion.div>
        ) : latestKg ? (
          <motion.p key="last" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-xs text-white/40 mb-4">
            Last: {latestKg} kg · {toISTTimeStr(new Date().toISOString())} IST now
          </motion.p>
        ) : (
          <div className="mb-4" />
        )}
      </AnimatePresence>

      {/* Optional notes */}
      <input
        type="text"
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        placeholder="Note (optional) — fasted, post-workout…"
        className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-gold/50 transition-colors mb-4"
      />

      <button
        onClick={handleAdd}
        disabled={saving || !value}
        className="w-full flex items-center justify-center gap-2 bg-gold text-espresso font-semibold text-sm rounded-xl py-3 hover:bg-gold-dark transition-colors disabled:opacity-40"
      >
        {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Scale className="h-4 w-4" />}
        Log Now
      </button>
    </div>
  );
}

// ── Entry row ──────────────────────────────────────────────────────────────────

function EntryRow({
  entry,
  isFirst,
  onDelete,
}: {
  entry: WeightLog;
  isFirst: boolean;
  onDelete: (id: string) => void;
}) {
  const [confirming, setConfirming] = useState(false);
  const [deleting, setDeleting] = useState(false);

  async function handleDelete() {
    if (!confirming) { setConfirming(true); return; }
    setDeleting(true);
    onDelete(entry.id);
  }

  return (
    <motion.div
      layout
      initial={{ opacity: 0, x: -8 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 8 }}
      className="flex items-center gap-3 py-2.5 border-b border-sand/40 last:border-0"
    >
      {/* Time */}
      <span className="text-xs font-mono text-warm-gray w-16 flex-shrink-0">
        {toISTTimeStr(entry.logged_at)}
      </span>

      {/* Weight */}
      <span className={cn(
        "font-display text-lg font-semibold flex-1",
        isFirst ? "text-espresso" : "text-charcoal"
      )}>
        {entry.weight_kg} <span className="text-xs font-sans font-normal text-warm-gray">kg</span>
      </span>

      {/* Notes */}
      {entry.notes && (
        <span className="text-xs text-warm-gray/70 italic truncate max-w-[120px]">{entry.notes}</span>
      )}

      {/* Delete */}
      <button
        onClick={handleDelete}
        disabled={deleting}
        className={cn(
          "flex-shrink-0 rounded-lg p-1.5 transition-colors",
          confirming
            ? "bg-rose/10 text-rose"
            : "text-warm-gray/40 hover:text-rose hover:bg-rose/5"
        )}
        title={confirming ? "Tap again to confirm delete" : "Delete entry"}
        onBlur={() => setConfirming(false)}
      >
        {deleting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
      </button>
    </motion.div>
  );
}

// ── Day group card ─────────────────────────────────────────────────────────────

function DayCard({
  group,
  isToday,
  onDelete,
}: {
  group: { date: string; label: string; entries: WeightLog[]; avg: number };
  isToday: boolean;
  onDelete: (id: string) => void;
}) {
  return (
    <div className={cn(
      "bg-white/70 border rounded-2xl overflow-hidden",
      isToday ? "border-gold/40 shadow-warm" : "border-sand/60"
    )}>
      {/* Date header */}
      <div className={cn(
        "flex items-center justify-between px-4 py-3",
        isToday ? "bg-gold/5 border-b border-gold/20" : "bg-ivory/50 border-b border-sand/40"
      )}>
        <div className="flex items-center gap-2">
          {isToday && <span className="h-1.5 w-1.5 rounded-full bg-gold" />}
          <span className={cn("text-sm font-semibold", isToday ? "text-espresso" : "text-charcoal")}>
            {isToday ? "Today" : group.label}
          </span>
          <span className="text-xs text-warm-gray">
            · {group.entries.length} {group.entries.length === 1 ? "reading" : "readings"}
          </span>
        </div>
        <div className="flex items-center gap-1">
          <span className="text-xs text-warm-gray">avg</span>
          <span className={cn(
            "font-display font-bold text-base",
            isToday ? "text-gold-dark" : "text-espresso"
          )}>
            {group.avg}
          </span>
          <span className="text-xs text-warm-gray">kg</span>
        </div>
      </div>

      {/* Entries */}
      <div className="px-4">
        <AnimatePresence>
          {group.entries
            .sort((a, b) => b.logged_at.localeCompare(a.logged_at))
            .map((entry, idx) => (
              <EntryRow
                key={entry.id}
                entry={entry}
                isFirst={idx === 0}
                onDelete={onDelete}
              />
            ))}
        </AnimatePresence>
      </div>
    </div>
  );
}

// ── Page ───────────────────────────────────────────────────────────────────────

export default function WeightPage() {
  const { logs, loading, remove, refetch } = useWeightLog();
  const toast = useToast();

  const grouped = useMemo(() => groupByDate(logs), [logs]);
  const todayStr = todayISTStr();

  async function handleDelete(id: string) {
    const ok = await remove(id);
    if (!ok) toast.error("Failed to delete entry.");
  }

  // Summary stats
  const allAvgs = grouped.map((g) => g.avg);
  const totalReadings = logs.length;
  const first = allAvgs[allAvgs.length - 1] ?? null;
  const latest = allAvgs[0] ?? null;
  const overallChange = first !== null && latest !== null
    ? Math.round((latest - first) * 10) / 10
    : null;

  return (
    <div className="max-w-2xl mx-auto space-y-6 pb-28 lg:pb-10">

      {/* Header */}
      <div>
        <h1 className="font-display text-2xl font-semibold text-espresso">Weight Tracker</h1>
        <p className="text-sm text-warm-gray mt-0.5">
          Log multiple readings per day · all timestamps in IST
        </p>
      </div>

      {/* Quick add */}
      <QuickAdd onAdded={refetch} />

      {/* Summary stats */}
      {!loading && totalReadings > 0 && (
        <div className="grid grid-cols-3 gap-3">
          <StatCard label="Total readings" value={String(totalReadings)} />
          <StatCard
            label="Latest"
            value={latest !== null ? `${latest} kg` : "—"}
          />
          <StatCard
            label={overallChange !== null && overallChange >= 0 ? "Total gain" : "Total loss"}
            value={overallChange !== null
              ? `${overallChange > 0 ? "+" : ""}${overallChange} kg`
              : "—"
            }
            highlight={overallChange !== null && overallChange > 0}
          />
        </div>
      )}

      {/* History */}
      {loading ? (
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="bg-white/70 border border-sand/60 rounded-2xl h-24 animate-pulse" />
          ))}
        </div>
      ) : grouped.length === 0 ? (
        <div className="text-center py-16 text-warm-gray">
          <Scale className="h-10 w-10 mx-auto mb-3 opacity-30" />
          <p className="text-sm font-medium">No weight logged yet</p>
          <p className="text-xs mt-1 opacity-70">Enter your weight above and tap "Log Now"</p>
        </div>
      ) : (
        <div className="space-y-3">
          {grouped.map((group) => (
            <DayCard
              key={group.date}
              group={group}
              isToday={group.date === todayStr}
              onDelete={handleDelete}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function StatCard({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className="bg-white/70 border border-sand/60 rounded-xl px-3 py-3">
      <p className="text-[10px] font-semibold text-warm-gray uppercase tracking-wider mb-1">{label}</p>
      <p className={cn(
        "font-display text-lg font-bold",
        highlight ? "text-sage" : "text-espresso"
      )}>
        {value}
      </p>
    </div>
  );
}
