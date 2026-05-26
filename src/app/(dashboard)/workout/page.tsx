"use client";

import { useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Dumbbell, Plus, X, Trash2, ChevronDown, ChevronUp,
  Trophy, TrendingUp, Calendar, Flame, Search,
} from "lucide-react";
import { format, parseISO } from "date-fns";
import {
  ResponsiveContainer, LineChart, Line, XAxis, YAxis,
  Tooltip, CartesianGrid,
} from "recharts";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/components/ui/Toast";
import {
  useWorkout,
  emptySet,
  type ExerciseBlock,
  type SessionWithSets,
} from "@/hooks/useWorkout";
import { cn } from "@/lib/utils";

// ── Common exercise suggestions ───────────────────────────────────────────────

const EXERCISE_SUGGESTIONS = [
  "Bench Press", "Squat", "Deadlift", "Overhead Press", "Pull-Up",
  "Barbell Row", "Incline Bench Press", "Leg Press", "Romanian Deadlift",
  "Dumbbell Curl", "Tricep Pushdown", "Lat Pulldown", "Cable Row",
  "Chest Fly", "Shoulder Lateral Raise", "Hip Thrust", "Leg Curl",
  "Calf Raise", "Face Pull", "Plank",
];

// ── ExerciseBlockRow ──────────────────────────────────────────────────────────

function ExerciseBlockRow({
  block, index, onChange, onRemove,
}: {
  block: ExerciseBlock;
  index: number;
  onChange: (b: ExerciseBlock) => void;
  onRemove: () => void;
}) {
  const [showSuggestions, setShowSuggestions] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const filtered = EXERCISE_SUGGESTIONS.filter((s) =>
    s.toLowerCase().includes(block.exercise.toLowerCase()) && block.exercise.length > 0
  );

  function updateSet(i: number, field: string, val: string) {
    const sets = block.sets.map((s, idx) => idx === i ? { ...s, [field]: val } : s);
    onChange({ ...block, sets });
  }

  function addSet() {
    onChange({ ...block, sets: [...block.sets, emptySet()] });
  }

  function removeSet(i: number) {
    if (block.sets.length === 1) return;
    onChange({ ...block, sets: block.sets.filter((_, idx) => idx !== i) });
  }

  return (
    <div className="rounded-2xl border border-sand/70 bg-cream p-4 space-y-3">
      {/* Exercise name row */}
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <input
            ref={inputRef}
            value={block.exercise}
            onChange={(e) => {
              onChange({ ...block, exercise: e.target.value });
              setShowSuggestions(true);
            }}
            onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
            onFocus={() => setShowSuggestions(true)}
            placeholder={`Exercise ${index + 1}`}
            className="w-full bg-white border border-sand rounded-xl px-3 py-2 text-sm font-medium text-espresso placeholder:text-warm-gray/60 outline-none focus:border-gold focus:ring-2 focus:ring-gold/20 transition-all"
          />
          <AnimatePresence>
            {showSuggestions && filtered.length > 0 && (
              <motion.ul
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                className="absolute top-full mt-1 left-0 right-0 z-50 bg-white border border-sand rounded-xl shadow-warm-lg overflow-hidden max-h-48 overflow-y-auto"
              >
                {filtered.slice(0, 6).map((s) => (
                  <li key={s}>
                    <button
                      type="button"
                      onMouseDown={() => {
                        onChange({ ...block, exercise: s });
                        setShowSuggestions(false);
                      }}
                      className="w-full text-left px-3 py-2 text-sm text-espresso hover:bg-gold/10 transition-colors"
                    >
                      {s}
                    </button>
                  </li>
                ))}
              </motion.ul>
            )}
          </AnimatePresence>
        </div>
        <button
          type="button"
          onClick={onRemove}
          className="p-1.5 rounded-lg text-warm-gray hover:text-rose hover:bg-rose/10 transition-colors"
          aria-label="Remove exercise"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Sets header */}
      <div className="grid grid-cols-[32px_1fr_1fr_32px] gap-2 px-1">
        <span className="text-[10px] font-semibold text-warm-gray uppercase tracking-wider text-center">Set</span>
        <span className="text-[10px] font-semibold text-warm-gray uppercase tracking-wider">Reps</span>
        <span className="text-[10px] font-semibold text-warm-gray uppercase tracking-wider">Weight (kg)</span>
        <span />
      </div>

      {/* Sets */}
      <div className="space-y-2">
        {block.sets.map((set, si) => (
          <div key={si} className="grid grid-cols-[32px_1fr_1fr_32px] gap-2 items-center">
            <span className="text-xs font-semibold text-gold text-center bg-gold/10 rounded-lg h-8 flex items-center justify-center">
              {si + 1}
            </span>
            <input
              type="number"
              min="0"
              value={set.reps}
              onChange={(e) => updateSet(si, "reps", e.target.value)}
              placeholder="—"
              className="h-8 bg-white border border-sand rounded-lg px-2 text-sm text-espresso placeholder:text-warm-gray/50 outline-none focus:border-gold focus:ring-1 focus:ring-gold/20 transition-all [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
            />
            <input
              type="number"
              min="0"
              step="0.5"
              value={set.weight_kg}
              onChange={(e) => updateSet(si, "weight_kg", e.target.value)}
              placeholder="—"
              className="h-8 bg-white border border-sand rounded-lg px-2 text-sm text-espresso placeholder:text-warm-gray/50 outline-none focus:border-gold focus:ring-1 focus:ring-gold/20 transition-all [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
            />
            <button
              type="button"
              onClick={() => removeSet(si)}
              disabled={block.sets.length === 1}
              className="h-8 w-8 flex items-center justify-center rounded-lg text-warm-gray hover:text-rose hover:bg-rose/10 transition-colors disabled:opacity-30 disabled:pointer-events-none"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        ))}
      </div>

      <button
        type="button"
        onClick={addSet}
        className="flex items-center gap-1.5 text-xs font-medium text-gold hover:text-gold-dark transition-colors"
      >
        <Plus className="h-3.5 w-3.5" />
        Add set
      </button>
    </div>
  );
}

// ── Log form modal ─────────────────────────────────────────────────────────────

function LogModal({
  onClose, onSave, saving,
}: {
  onClose: () => void;
  onSave: (date: string, name: string, notes: string, blocks: ExerciseBlock[]) => Promise<boolean>;
  saving: boolean;
}) {
  const today = new Date().toISOString().slice(0, 10);
  const [date, setDate] = useState(today);
  const [sessionName, setSessionName] = useState("");
  const [sessionNotes, setSessionNotes] = useState("");
  const [blocks, setBlocks] = useState<ExerciseBlock[]>([
    { exercise: "", sets: [emptySet()] },
  ]);
  const toast = useToast();

  function updateBlock(i: number, b: ExerciseBlock) {
    setBlocks((prev) => prev.map((bl, idx) => idx === i ? b : bl));
  }

  function addExercise() {
    setBlocks((prev) => [...prev, { exercise: "", sets: [emptySet()] }]);
  }

  function removeBlock(i: number) {
    setBlocks((prev) => prev.filter((_, idx) => idx !== i));
  }

  async function handleSave() {
    const filledBlocks = blocks.filter((b) => b.exercise.trim());
    if (filledBlocks.length === 0) {
      toast.error("Add at least one exercise.");
      return;
    }
    const ok = await onSave(date, sessionName, sessionNotes, filledBlocks);
    if (ok) {
      toast.success("Workout logged!");
      onClose();
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="absolute inset-0 bg-espresso/30 backdrop-blur-sm"
        onClick={onClose}
      />
      <motion.div
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 40 }}
        className="relative w-full max-w-lg bg-ivory rounded-2xl shadow-warm-lg overflow-hidden max-h-[90vh] flex flex-col"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-sand/60">
          <div className="flex items-center gap-2">
            <Dumbbell className="h-4 w-4 text-gold" />
            <h2 className="font-semibold text-espresso text-sm">Log Workout</h2>
          </div>
          <button onClick={onClose} className="p-1 rounded-md text-warm-gray hover:text-charcoal transition-colors">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="overflow-y-auto flex-1 p-5 space-y-4">
          {/* Session meta */}
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1">
              <label className="text-[11px] font-semibold text-warm-gray uppercase tracking-wider">Date</label>
              <input
                type="date"
                value={date}
                max={today}
                onChange={(e) => setDate(e.target.value)}
                className="bg-cream border border-sand rounded-xl px-3 py-2 text-sm text-espresso outline-none focus:border-gold focus:ring-2 focus:ring-gold/20 transition-all"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-[11px] font-semibold text-warm-gray uppercase tracking-wider">Session name</label>
              <input
                value={sessionName}
                onChange={(e) => setSessionName(e.target.value)}
                placeholder="Push day, Legs…"
                className="bg-cream border border-sand rounded-xl px-3 py-2 text-sm text-espresso placeholder:text-warm-gray/60 outline-none focus:border-gold focus:ring-2 focus:ring-gold/20 transition-all"
              />
            </div>
          </div>

          {/* Exercises */}
          <div className="space-y-3">
            {blocks.map((block, i) => (
              <ExerciseBlockRow
                key={i}
                block={block}
                index={i}
                onChange={(b) => updateBlock(i, b)}
                onRemove={() => removeBlock(i)}
              />
            ))}
          </div>

          <button
            type="button"
            onClick={addExercise}
            className="w-full py-2.5 rounded-xl border-2 border-dashed border-sand/70 text-sm font-medium text-warm-gray hover:border-gold/50 hover:text-gold transition-all flex items-center justify-center gap-2"
          >
            <Plus className="h-4 w-4" />
            Add exercise
          </button>

          {/* Notes */}
          <div className="flex flex-col gap-1">
            <label className="text-[11px] font-semibold text-warm-gray uppercase tracking-wider">Session notes</label>
            <textarea
              value={sessionNotes}
              onChange={(e) => setSessionNotes(e.target.value)}
              rows={2}
              placeholder="How did it feel? Any PRs?"
              className="bg-cream border border-sand rounded-xl px-3 py-2 text-sm text-espresso placeholder:text-warm-gray/60 outline-none focus:border-gold focus:ring-2 focus:ring-gold/20 transition-all resize-none"
            />
          </div>
        </div>

        <div className="flex gap-3 px-5 py-4 border-t border-sand/60">
          <Button variant="secondary" className="flex-1" onClick={onClose}>Cancel</Button>
          <Button className="flex-1" onClick={handleSave} disabled={saving}>
            {saving ? "Saving…" : "Save workout"}
          </Button>
        </div>
      </motion.div>
    </div>
  );
}

// ── Session history card ───────────────────────────────────────────────────────

function SessionCard({
  session, onDelete,
}: {
  session: SessionWithSets;
  onDelete: () => void;
}) {
  const [expanded, setExpanded] = useState(false);

  const exerciseNames = [...new Set(session.sets.map((s) => s.exercise))];
  const totalVolume = session.sets.reduce(
    (sum, s) => sum + (s.weight_kg ?? 0) * (s.reps ?? 0), 0
  );
  const totalSets = session.sets.length;

  return (
    <div className="rounded-2xl border border-sand/70 bg-white overflow-hidden">
      <button
        onClick={() => setExpanded((v) => !v)}
        className="w-full flex items-start justify-between px-4 py-3.5 text-left hover:bg-ivory/50 transition-colors"
      >
        <div className="flex flex-col gap-0.5">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-espresso">
              {session.name ?? "Workout"}
            </span>
            <span className="text-[10px] font-medium text-warm-gray bg-sand/40 rounded-full px-2 py-0.5">
              {format(parseISO(session.workout_date), "MMM d, yyyy")}
            </span>
          </div>
          <p className="text-xs text-warm-gray line-clamp-1">
            {exerciseNames.join(" · ")}
          </p>
        </div>
        <div className="flex items-center gap-3 ml-3 flex-shrink-0">
          <div className="text-right">
            <p className="text-xs font-semibold text-espresso">{totalSets} sets</p>
            {totalVolume > 0 && (
              <p className="text-[10px] text-warm-gray">{totalVolume.toLocaleString()} kg vol</p>
            )}
          </div>
          {expanded ? <ChevronUp className="h-4 w-4 text-warm-gray" /> : <ChevronDown className="h-4 w-4 text-warm-gray" />}
        </div>
      </button>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="border-t border-sand/50 px-4 pt-3 pb-4 space-y-4">
              {exerciseNames.map((ex) => {
                const exSets = session.sets.filter((s) => s.exercise === ex);
                return (
                  <div key={ex}>
                    <p className="text-xs font-semibold text-espresso mb-1.5">{ex}</p>
                    <div className="space-y-1">
                      {exSets.map((s, i) => (
                        <div key={i} className="flex items-center gap-3 text-xs text-warm-gray">
                          <span className="w-12 text-[10px] font-medium text-gold bg-gold/10 rounded-full px-2 py-0.5 text-center">
                            Set {s.set_number}
                          </span>
                          {s.reps && <span>{s.reps} reps</span>}
                          {s.weight_kg && <span>@ {s.weight_kg} kg</span>}
                          {s.reps && s.weight_kg && (
                            <span className="text-[10px] text-sand/80">
                              = {(s.reps * s.weight_kg).toFixed(0)} kg vol
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}

              {session.notes && (
                <p className="text-xs text-warm-gray italic border-t border-sand/40 pt-2 mt-1">
                  {session.notes}
                </p>
              )}

              <button
                onClick={onDelete}
                className="flex items-center gap-1.5 text-xs text-warm-gray hover:text-rose transition-colors"
              >
                <Trash2 className="h-3.5 w-3.5" />
                Delete session
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ── Strength trend chart ───────────────────────────────────────────────────────

function StrengthTrendChart({
  sessions, allExercises,
}: {
  sessions: SessionWithSets[];
  allExercises: string[];
}) {
  const [selected, setSelected] = useState(allExercises[0] ?? "");
  const [query, setQuery] = useState("");

  const filtered = allExercises.filter((e) =>
    e.toLowerCase().includes(query.toLowerCase())
  );

  const trend = selected
    ? sessions
        .filter((s) => s.sets.some((st) => st.exercise.toLowerCase() === selected.toLowerCase()))
        .map((s) => {
          const relevant = s.sets.filter((st) => st.exercise.toLowerCase() === selected.toLowerCase());
          const maxWeight = Math.max(...relevant.map((st) => st.weight_kg ?? 0));
          return { date: format(parseISO(s.workout_date), "MMM d"), maxWeight };
        })
        .reverse()
    : [];

  if (allExercises.length === 0) return null;

  return (
    <div className="space-y-3">
      {/* Exercise picker */}
      <div className="flex items-center gap-2">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-warm-gray" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Filter exercise…"
            className="w-full pl-8 pr-3 py-2 bg-cream border border-sand rounded-xl text-xs text-espresso placeholder:text-warm-gray/60 outline-none focus:border-gold transition-all"
          />
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {filtered.slice(0, 8).map((ex) => (
          <button
            key={ex}
            onClick={() => setSelected(ex)}
            className={cn(
              "px-3 py-1.5 rounded-full text-xs font-medium transition-all",
              selected === ex
                ? "bg-gold text-espresso shadow-warm"
                : "bg-cream border border-sand/70 text-warm-gray hover:border-gold/50 hover:text-espresso"
            )}
          >
            {ex}
          </button>
        ))}
      </div>

      {trend.length >= 2 ? (
        <ResponsiveContainer width="100%" height={180}>
          <LineChart data={trend} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#E8E0D4" />
            <XAxis dataKey="date" tick={{ fontSize: 10, fill: "#9B8E87" }} />
            <YAxis tick={{ fontSize: 10, fill: "#9B8E87" }} />
            <Tooltip
              contentStyle={{ background: "#FAF8F5", border: "1px solid #E8E0D4", borderRadius: 12, fontSize: 12 }}
              formatter={(v) => [`${v} kg`, "Best weight"]}
            />
            <Line
              type="monotone"
              dataKey="maxWeight"
              stroke="#C9A96E"
              strokeWidth={2}
              dot={{ fill: "#C9A96E", r: 4 }}
              activeDot={{ r: 6 }}
            />
          </LineChart>
        </ResponsiveContainer>
      ) : (
        <p className="text-xs text-warm-gray text-center py-6">
          Need 2+ sessions with "{selected}" to show trend.
        </p>
      )}
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function WorkoutPage() {
  const {
    sessions, loading, saving, error,
    saveSession, removeSession,
    getPersonalRecords,
  } = useWorkout();

  const [showLog, setShowLog] = useState(false);
  const [activeTab, setActiveTab] = useState<"history" | "strength" | "prs">("history");
  const [showAll, setShowAll] = useState(false);
  const toast = useToast();

  const prs = getPersonalRecords();
  const allExercises = [...new Set(sessions.flatMap((s) => s.sets.map((st) => st.exercise)))];
  const displayedSessions = showAll ? sessions : sessions.slice(0, 5);

  async function handleDelete(id: string) {
    const ok = await removeSession(id);
    if (ok) toast.success("Session deleted.");
    else toast.error("Failed to delete.");
  }

  return (
    <div className="min-h-screen bg-ivory">
      {/* Header */}
      <div className="sticky top-0 z-30 bg-ivory/95 backdrop-blur-md border-b border-sand/60 px-4 sm:px-6 lg:px-8 py-4">
        <div className="max-w-4xl mx-auto flex items-center justify-between gap-4">
          <div>
            <h1 className="text-lg font-semibold text-espresso font-display">Workout Log</h1>
            <p className="text-xs text-warm-gray mt-0.5">
              {sessions.length > 0 ? `${sessions.length} sessions recorded` : "Track your lifts, watch strength grow"}
            </p>
          </div>
          <Button onClick={() => setShowLog(true)} className="flex items-center gap-2 flex-shrink-0">
            <Plus className="h-4 w-4" />
            <span className="hidden sm:inline">Log workout</span>
            <span className="sm:hidden">Log</span>
          </Button>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {/* Error */}
        {error && (
          <div className="rounded-xl bg-rose/10 border border-rose/20 px-4 py-3 text-sm text-rose">
            {error}
          </div>
        )}

        {/* Empty state */}
        {!loading && sessions.length === 0 && (
          <div className="rounded-2xl border border-sand/60 bg-white p-10 text-center space-y-3">
            <div className="h-14 w-14 rounded-2xl bg-gold/10 flex items-center justify-center mx-auto">
              <Dumbbell className="h-7 w-7 text-gold" />
            </div>
            <h3 className="font-semibold text-espresso">No workouts yet</h3>
            <p className="text-sm text-warm-gray max-w-xs mx-auto">
              Log your first session — exercises, sets, reps, and weight. You&apos;ll see
              strength trends appear as soon as you have 2+ sessions.
            </p>
            <Button onClick={() => setShowLog(true)} className="mx-auto">
              <Plus className="h-4 w-4 mr-2" />
              Log first workout
            </Button>
          </div>
        )}

        {/* Stats row */}
        {sessions.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              {
                icon: Calendar,
                label: "Total sessions",
                value: sessions.length,
                unit: "",
              },
              {
                icon: Dumbbell,
                label: "Exercises tracked",
                value: allExercises.length,
                unit: "",
              },
              {
                icon: Trophy,
                label: "Personal records",
                value: prs.length,
                unit: "",
              },
              {
                icon: Flame,
                label: "Total volume",
                value: Math.round(
                  sessions.reduce(
                    (sum, s) =>
                      sum + s.sets.reduce((a, st) => a + (st.weight_kg ?? 0) * (st.reps ?? 0), 0),
                    0
                  ) / 1000
                ),
                unit: "t",
              },
            ].map(({ icon: Icon, label, value, unit }) => (
              <div key={label} className="rounded-2xl border border-sand/60 bg-white p-4">
                <div className="flex items-center gap-2 mb-1">
                  <Icon className="h-3.5 w-3.5 text-gold" />
                  <span className="text-[10px] font-semibold text-warm-gray uppercase tracking-wider">{label}</span>
                </div>
                <p className="text-xl font-bold text-espresso font-display">
                  {typeof value === "number" ? value.toLocaleString() : value}
                  <span className="text-sm font-normal text-warm-gray ml-0.5">{unit}</span>
                </p>
              </div>
            ))}
          </div>
        )}

        {/* Tabs */}
        {sessions.length > 0 && (
          <div className="rounded-2xl border border-sand/60 bg-white overflow-hidden">
            {/* Tab pills */}
            <div className="flex border-b border-sand/50">
              {(["history", "strength", "prs"] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={cn(
                    "flex-1 py-3 text-xs font-semibold transition-colors capitalize tracking-wide",
                    activeTab === tab
                      ? "text-espresso border-b-2 border-gold"
                      : "text-warm-gray hover:text-charcoal"
                  )}
                >
                  {tab === "prs" ? "Personal Records" : tab.charAt(0).toUpperCase() + tab.slice(1)}
                </button>
              ))}
            </div>

            <div className="p-4">
              {/* History tab */}
              {activeTab === "history" && (
                <div className="space-y-3">
                  {loading ? (
                    <div className="space-y-3">
                      {[1, 2, 3].map((i) => (
                        <div key={i} className="h-16 rounded-2xl bg-sand/30 animate-pulse" />
                      ))}
                    </div>
                  ) : (
                    <>
                      {displayedSessions.map((session) => (
                        <SessionCard
                          key={session.id}
                          session={session}
                          onDelete={() => handleDelete(session.id)}
                        />
                      ))}
                      {sessions.length > 5 && (
                        <button
                          onClick={() => setShowAll((v) => !v)}
                          className="w-full py-2.5 text-xs font-medium text-gold hover:text-gold-dark transition-colors flex items-center justify-center gap-1"
                        >
                          {showAll ? (
                            <><ChevronUp className="h-3.5 w-3.5" /> Show less</>
                          ) : (
                            <><ChevronDown className="h-3.5 w-3.5" /> Show all {sessions.length} sessions</>
                          )}
                        </button>
                      )}
                    </>
                  )}
                </div>
              )}

              {/* Strength trend tab */}
              {activeTab === "strength" && (
                <div>
                  {allExercises.length === 0 ? (
                    <p className="text-sm text-warm-gray text-center py-8">No exercise data yet.</p>
                  ) : (
                    <StrengthTrendChart sessions={sessions} allExercises={allExercises} />
                  )}
                </div>
              )}

              {/* PRs tab */}
              {activeTab === "prs" && (
                <div>
                  {prs.length === 0 ? (
                    <p className="text-sm text-warm-gray text-center py-8">
                      Log workouts with weight to see your personal records here.
                    </p>
                  ) : (
                    <div className="space-y-2">
                      {prs.map((pr) => (
                        <div
                          key={pr.exercise}
                          className="flex items-center justify-between py-3 border-b border-sand/40 last:border-0"
                        >
                          <div className="flex items-center gap-3">
                            <div className="h-8 w-8 rounded-xl bg-gold/10 flex items-center justify-center flex-shrink-0">
                              <Trophy className="h-4 w-4 text-gold" />
                            </div>
                            <div>
                              <p className="text-sm font-semibold text-espresso">{pr.exercise}</p>
                              <p className="text-[10px] text-warm-gray">
                                {format(parseISO(pr.achieved_at), "MMM d, yyyy")}
                              </p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="text-sm font-bold text-gold">{pr.best_weight_kg} kg</p>
                            {pr.best_reps > 0 && (
                              <p className="text-[10px] text-warm-gray">× {pr.best_reps} reps</p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Beginner tip */}
        {sessions.length < 3 && (
          <div className="rounded-2xl bg-gold/5 border border-gold/20 px-5 py-4">
            <div className="flex items-start gap-3">
              <TrendingUp className="h-4 w-4 text-gold mt-0.5 flex-shrink-0" />
              <div className="text-sm text-warm-gray">
                <span className="font-semibold text-espresso">Tip for beginners:</span>{" "}
                Log the same exercises each week (e.g., Bench Press every Monday). Once you have
                2+ sessions, the Strength tab will plot your weight progression — you'll visually
                see yourself getting stronger with each session.
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Log modal */}
      <AnimatePresence>
        {showLog && (
          <LogModal
            onClose={() => setShowLog(false)}
            onSave={saveSession}
            saving={saving}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
