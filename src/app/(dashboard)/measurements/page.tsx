"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Ruler, Plus, X, Trash2, TrendingUp, ChevronDown, ChevronUp,
} from "lucide-react";
import { format } from "date-fns";
import {
  ResponsiveContainer, LineChart, Line, XAxis, YAxis,
  Tooltip, CartesianGrid, Legend,
} from "recharts";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/components/ui/Toast";
import {
  useBodyMeasurements,
  EMPTY_MEASUREMENT_FORM,
  type MeasurementFormData,
} from "@/hooks/useBodyMeasurements";
import type { BodyMeasurement } from "@/types/database";
import { cn } from "@/lib/utils";

// ── Measurement field config ──────────────────────────────────────────────────

const FIELDS: { key: keyof MeasurementFormData; label: string; color: string; group: string }[] = [
  { key: "chest_cm",       label: "Chest",       color: "#C9A96E", group: "upper" },
  { key: "waist_cm",       label: "Waist",       color: "#C4826A", group: "upper" },
  { key: "hips_cm",        label: "Hips",        color: "#9B8E87", group: "upper" },
  { key: "left_arm_cm",    label: "Left arm",    color: "#5B8A5B", group: "arms"  },
  { key: "right_arm_cm",   label: "Right arm",   color: "#8FAF8F", group: "arms"  },
  { key: "left_thigh_cm",  label: "Left thigh",  color: "#6B8FA8", group: "legs"  },
  { key: "right_thigh_cm", label: "Right thigh", color: "#8AAFC0", group: "legs"  },
  { key: "neck_cm",        label: "Neck",        color: "#B0A090", group: "upper" },
];

const DATA_FIELDS = FIELDS.filter((f) => f.key !== "notes" && f.key !== "measured_at");

// ── Log form modal ────────────────────────────────────────────────────────────

function MeasurementInput({
  label, value, onChange,
}: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-[11px] font-semibold text-warm-gray uppercase tracking-wider">
        {label}
      </label>
      <div className="flex items-center gap-1.5 bg-cream border border-sand rounded-xl px-3 py-2.5 focus-within:border-gold focus-within:ring-2 focus-within:ring-gold/20 transition-all">
        <input
          type="number"
          min="0"
          step="0.1"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="—"
          className="flex-1 bg-transparent text-sm font-medium text-espresso placeholder:text-sand/70 outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
        />
        <span className="text-xs text-warm-gray flex-shrink-0">cm</span>
      </div>
    </div>
  );
}

interface LogFormProps {
  onClose: () => void;
  onSaved: () => void;
}

function LogForm({ onClose, onSaved }: LogFormProps) {
  const today = format(new Date(), "yyyy-MM-dd");
  const [form, setForm] = useState<MeasurementFormData>(EMPTY_MEASUREMENT_FORM(today));
  const { save, saving } = useBodyMeasurements();
  const { success: toastSuccess, error: toastError } = useToast();

  function set(key: keyof MeasurementFormData) {
    return (v: string) => setForm((f) => ({ ...f, [key]: v }));
  }

  async function handleSave() {
    const hasAny = DATA_FIELDS.some((f) => form[f.key] !== "");
    if (!hasAny) { toastError("Enter at least one measurement."); return; }
    const ok = await save(form);
    if (ok) { toastSuccess("Measurements saved!"); onSaved(); onClose(); }
    else toastError("Failed to save. Please try again.");
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-espresso/40 backdrop-blur-sm"
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, y: 40, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 20, scale: 0.97 }}
        transition={{ type: "spring", stiffness: 320, damping: 30 }}
        className="w-full max-w-lg bg-ivory rounded-2xl border border-sand/60 shadow-warm-lg overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-5 pb-3 border-b border-sand/50">
          <div>
            <h2 className="font-display text-lg font-semibold text-espresso">Log Measurements</h2>
            <p className="text-xs text-warm-gray mt-0.5">Fill in only the ones you measured today</p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg text-warm-gray hover:bg-sand/40 transition-colors">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="px-5 py-4 space-y-4 max-h-[70vh] overflow-y-auto">
          {/* Date */}
          <div className="flex flex-col gap-1">
            <label className="text-[11px] font-semibold text-warm-gray uppercase tracking-wider">Date</label>
            <input
              type="date"
              value={form.measured_at}
              max={today}
              onChange={(e) => set("measured_at")(e.target.value)}
              className="bg-cream border border-sand rounded-xl px-3 py-2.5 text-sm text-espresso focus:border-gold focus:ring-2 focus:ring-gold/20 outline-none transition-all"
            />
          </div>

          {/* Grid of measurements */}
          <div className="grid grid-cols-2 gap-3">
            {DATA_FIELDS.map(({ key, label }) => (
              <MeasurementInput key={key} label={label} value={form[key]} onChange={set(key)} />
            ))}
          </div>

          {/* Notes */}
          <div className="flex flex-col gap-1">
            <label className="text-[11px] font-semibold text-warm-gray uppercase tracking-wider">Notes</label>
            <textarea
              value={form.notes}
              onChange={(e) => set("notes")(e.target.value)}
              placeholder="e.g. morning, fasted, post-workout…"
              rows={2}
              className="bg-cream border border-sand rounded-xl px-3 py-2.5 text-sm text-espresso placeholder:text-warm-gray/50 resize-none focus:border-gold focus:ring-2 focus:ring-gold/20 outline-none transition-all"
            />
          </div>

          <p className="text-[11px] text-warm-gray/60 bg-cream rounded-xl px-3 py-2.5 border border-sand/40">
            Tip: measure in the morning before eating, unflexed, at the same spot each time.
          </p>
        </div>

        <div className="px-5 pb-5 pt-3 border-t border-sand/50 flex gap-3">
          <Button variant="ghost" size="md" onClick={onClose} className="flex-1">Cancel</Button>
          <Button variant="primary" size="md" onClick={handleSave} loading={saving} className="flex-1">
            Save
          </Button>
        </div>
      </motion.div>
    </motion.div>
  );
}

// ── Stat card ────────────────────────────────────────────────────────────────

function StatCard({
  label, latest, first, color,
}: { label: string; latest: number | null; first: number | null; color: string }) {
  const delta = latest !== null && first !== null ? Math.round((latest - first) * 10) / 10 : null;
  return (
    <div className="bg-cream rounded-2xl border border-sand/60 px-4 py-3 space-y-1">
      <p className="text-[11px] font-semibold text-warm-gray uppercase tracking-wider truncate">{label}</p>
      {latest !== null ? (
        <>
          <div className="flex items-baseline gap-1">
            <span className="font-display text-xl font-semibold" style={{ color }}>{latest}</span>
            <span className="text-xs text-warm-gray">cm</span>
          </div>
          {delta !== null && (
            <p className={cn("text-xs font-medium", delta > 0 ? "text-sage" : delta < 0 ? "text-terracotta" : "text-warm-gray")}>
              {delta > 0 ? "+" : ""}{delta} cm total
            </p>
          )}
        </>
      ) : (
        <span className="text-sm text-warm-gray/50 italic">—</span>
      )}
    </div>
  );
}

// ── Trend chart ───────────────────────────────────────────────────────────────

function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-ivory border border-sand rounded-xl px-3 py-2 shadow-warm text-xs space-y-0.5">
      <p className="text-warm-gray mb-1">{label}</p>
      {payload.map((p: any) => (
        p.value != null && (
          <p key={p.dataKey} style={{ color: p.color }} className="font-medium">
            {p.name}: {p.value} cm
          </p>
        )
      ))}
    </div>
  );
}

function TrendChart({ measurements }: { measurements: BodyMeasurement[] }) {
  const [visible, setVisible] = useState<Set<string>>(
    new Set(["chest_cm", "waist_cm", "left_arm_cm"])
  );

  function toggleField(key: string) {
    setVisible((prev) => {
      const next = new Set(prev);
      if (next.has(key)) { if (next.size > 1) next.delete(key); }
      else next.add(key);
      return next;
    });
  }

  const chartData = measurements.map((m) => ({
    date: new Date(m.measured_at + "T00:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" }),
    ...Object.fromEntries(DATA_FIELDS.map((f) => [f.key, m[f.key as keyof BodyMeasurement] as number | null])),
  }));

  const activeMeasurements = DATA_FIELDS.filter((f) =>
    measurements.some((m) => m[f.key as keyof BodyMeasurement] !== null)
  );

  return (
    <div>
      {/* Toggle pills */}
      <div className="flex flex-wrap gap-2 mb-4">
        {activeMeasurements.map(({ key, label, color }) => {
          const on = visible.has(key);
          return (
            <button
              key={key}
              onClick={() => toggleField(key)}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-all duration-150",
                on ? "border-transparent text-espresso" : "border-sand text-warm-gray bg-transparent"
              )}
              style={on ? { background: color + "22", borderColor: color + "55" } : {}}
            >
              <span
                className="h-2 w-2 rounded-full flex-shrink-0"
                style={{ background: on ? color : "#C5BAB0" }}
              />
              {label}
            </button>
          );
        })}
      </div>

      <ResponsiveContainer width="100%" height={240}>
        <LineChart data={chartData} margin={{ top: 4, right: 8, left: -16, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#E8DDD0" strokeOpacity={0.6} />
          <XAxis dataKey="date" tick={{ fontSize: 11, fill: "#9B8E87" }} tickLine={false} axisLine={false} interval="preserveStartEnd" />
          <YAxis tick={{ fontSize: 11, fill: "#9B8E87" }} tickLine={false} axisLine={false} tickFormatter={(v) => `${v}`} />
          <Tooltip content={(props: any) => <CustomTooltip {...props} />} />
          {activeMeasurements.filter((f) => visible.has(f.key)).map(({ key, label, color }) => (
            <Line
              key={key}
              type="monotone"
              dataKey={key}
              name={label}
              stroke={color}
              strokeWidth={2.5}
              dot={{ r: 3, fill: color, strokeWidth: 0 }}
              activeDot={{ r: 5 }}
              connectNulls
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

// ── History row ───────────────────────────────────────────────────────────────

function HistoryRow({ m, onDelete }: { m: BodyMeasurement; onDelete: (id: string) => void }) {
  const [expanded, setExpanded] = useState(false);
  const hasExtra = m.hips_cm || m.left_thigh_cm || m.right_thigh_cm || m.neck_cm;

  const main = [
    { label: "Chest",  val: m.chest_cm },
    { label: "Waist",  val: m.waist_cm },
    { label: "L.Arm",  val: m.left_arm_cm },
    { label: "R.Arm",  val: m.right_arm_cm },
  ];
  const extra = [
    { label: "Hips",    val: m.hips_cm },
    { label: "L.Thigh", val: m.left_thigh_cm },
    { label: "R.Thigh", val: m.right_thigh_cm },
    { label: "Neck",    val: m.neck_cm },
  ].filter((x) => x.val !== null);

  return (
    <div className="bg-cream rounded-xl border border-sand/50 px-4 py-3 space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-espresso">
          {new Date(m.measured_at + "T00:00:00").toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}
        </span>
        <div className="flex items-center gap-1">
          {hasExtra && (
            <button onClick={() => setExpanded((p) => !p)} className="p-1.5 rounded-lg text-warm-gray hover:bg-sand/40 transition-colors">
              {expanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
            </button>
          )}
          <button onClick={() => onDelete(m.id)} className="p-1.5 rounded-lg text-warm-gray hover:text-rose hover:bg-rose/10 transition-colors">
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      <div className="flex flex-wrap gap-x-4 gap-y-1">
        {main.map(({ label, val }) => val !== null && (
          <span key={label} className="text-xs text-warm-gray">
            {label} <span className="font-semibold text-espresso">{val} cm</span>
          </span>
        ))}
      </div>

      <AnimatePresence>
        {expanded && extra.length > 0 && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="flex flex-wrap gap-x-4 gap-y-1 pt-1 border-t border-sand/40">
              {extra.map(({ label, val }) => (
                <span key={label} className="text-xs text-warm-gray">
                  {label} <span className="font-semibold text-espresso">{val} cm</span>
                </span>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {m.notes && <p className="text-xs text-warm-gray/70 italic">{m.notes}</p>}
    </div>
  );
}

// ── Empty state ───────────────────────────────────────────────────────────────

function EmptyState({ onLog }: { onLog: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col items-center justify-center py-20 text-center px-4"
    >
      <div className="h-20 w-20 rounded-2xl bg-gold/10 border-2 border-gold/20 flex items-center justify-center mb-6">
        <Ruler className="h-9 w-9 text-gold/50" strokeWidth={1.25} />
      </div>
      <h2 className="font-display text-2xl font-semibold text-espresso mb-2">Track your size</h2>
      <p className="text-warm-gray text-sm max-w-xs mx-auto mb-6 leading-relaxed">
        Log your body measurements weekly to see exactly where you&apos;re putting on size — not just how much.
      </p>
      <Button variant="primary" size="md" onClick={onLog}>
        <Plus className="h-3.5 w-3.5" /> Log first measurement
      </Button>
    </motion.div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function MeasurementsPage() {
  const { measurements, loading, remove } = useBodyMeasurements();
  const [showForm, setShowForm] = useState(false);
  const [showAllHistory, setShowAllHistory] = useState(false);
  const { error: toastError, success: toastSuccess } = useToast();

  async function handleDelete(id: string) {
    const ok = await remove(id);
    if (ok) toastSuccess("Entry deleted.");
    else toastError("Failed to delete.");
  }

  const first = measurements[0];
  const latest = measurements[measurements.length - 1];

  const visibleHistory = showAllHistory ? [...measurements].reverse() : [...measurements].reverse().slice(0, 5);

  return (
    <>
      <div className="space-y-6 pb-28 lg:pb-10">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3"
        >
          <div>
            <h1 className="font-display text-2xl font-semibold text-espresso">Measurements</h1>
            <p className="text-sm text-warm-gray mt-0.5">Track where you&apos;re growing week by week.</p>
          </div>
          <Button variant="primary" size="md" onClick={() => setShowForm(true)}>
            <Plus className="h-3.5 w-3.5" /> Log measurements
          </Button>
        </motion.div>

        {loading ? (
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-20 rounded-2xl bg-sand/30 animate-pulse" />
            ))}
          </div>
        ) : measurements.length === 0 ? (
          <EmptyState onLog={() => setShowForm(true)} />
        ) : (
          <>
            {/* Stat cards */}
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
            >
              <p className="text-[11px] font-semibold text-warm-gray uppercase tracking-widest mb-3">
                Current vs. Start
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {[
                  { key: "chest_cm", label: "Chest", color: "#C9A96E" },
                  { key: "waist_cm", label: "Waist", color: "#C4826A" },
                  { key: "left_arm_cm", label: "Arm (L)", color: "#5B8A5B" },
                  { key: "right_arm_cm", label: "Arm (R)", color: "#8FAF8F" },
                ].map(({ key, label, color }) => (
                  <StatCard
                    key={key}
                    label={label}
                    latest={latest?.[key as keyof BodyMeasurement] as number | null ?? null}
                    first={first?.[key as keyof BodyMeasurement] as number | null ?? null}
                    color={color}
                  />
                ))}
              </div>
            </motion.div>

            {/* Trend chart */}
            {measurements.length >= 2 && (
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.15 }}
                className="bg-ivory rounded-2xl border border-sand/60 shadow-warm-md p-5"
              >
                <div className="flex items-center gap-2 mb-4">
                  <TrendingUp className="h-4 w-4 text-gold" />
                  <h2 className="font-display text-base font-semibold text-espresso">Trend</h2>
                  <span className="text-xs text-warm-gray">— select measurements to compare</span>
                </div>
                <TrendChart measurements={measurements} />
              </motion.div>
            )}

            {/* History */}
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="space-y-3"
            >
              <p className="text-[11px] font-semibold text-warm-gray uppercase tracking-widest">
                History
              </p>
              {visibleHistory.map((m) => (
                <HistoryRow key={m.id} m={m} onDelete={handleDelete} />
              ))}
              {measurements.length > 5 && (
                <button
                  onClick={() => setShowAllHistory((p) => !p)}
                  className="text-xs text-gold font-medium hover:underline"
                >
                  {showAllHistory ? "Show less" : `Show all ${measurements.length} entries`}
                </button>
              )}
            </motion.div>
          </>
        )}
      </div>

      <AnimatePresence>
        {showForm && (
          <LogForm onClose={() => setShowForm(false)} onSaved={() => {}} />
        )}
      </AnimatePresence>
    </>
  );
}
