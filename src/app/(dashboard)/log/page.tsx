"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  ChevronLeft, ChevronRight, CalendarDays,
  Flame, Beef, Wheat, Droplets, StickyNote, Check,
} from "lucide-react";
import { format, addDays, parseISO, isToday, isFuture } from "date-fns";
import { Button } from "@/components/ui/Button";
import { Card, CardContent } from "@/components/ui/Card";
import { Skeleton } from "@/components/ui/Skeleton";
import { useDailyLog, type LogFormData, type MacroTargets, EMPTY_FORM } from "@/hooks/useDailyLog";
import { cn } from "@/lib/utils";

// ─── Date selector ────────────────────────────────────────────────────────────

interface DateSelectorProps {
  date: string;
  loggedDates: Set<string>;
  onChange: (d: string) => void;
}

function DateSelector({ date, loggedDates, onChange }: DateSelectorProps) {
  const dateRef = useRef<HTMLInputElement>(null);
  const parsed  = parseISO(date);

  function shift(days: number) {
    const next = format(addDays(parsed, days), "yyyy-MM-dd");
    if (!isFuture(parseISO(next)) || next === format(new Date(), "yyyy-MM-dd")) {
      onChange(next);
    }
  }

  const isLogged  = loggedDates.has(date);
  const isCurrentDay = isToday(parsed);

  return (
    <div className="flex items-center justify-between gap-3 bg-ivory border border-sand/60 rounded-xl px-4 py-3 shadow-warm">
      <button
        onClick={() => shift(-1)}
        className="rounded-lg p-2 text-warm-gray hover:text-charcoal hover:bg-sand/40 transition-colors"
        aria-label="Previous day"
      >
        <ChevronLeft className="h-4 w-4" />
      </button>

      <button
        onClick={() => dateRef.current?.showPicker?.()}
        className="flex flex-col items-center gap-0.5 group min-w-[160px]"
      >
        <span className="text-[11px] text-warm-gray uppercase tracking-widest">
          {format(parsed, "EEEE")}
        </span>
        <span className="font-display text-xl text-espresso group-hover:text-gold transition-colors">
          {format(parsed, "d MMMM yyyy")}
        </span>
        <div className="flex items-center gap-1.5 mt-0.5">
          {isCurrentDay && (
            <span className="text-[10px] text-gold font-medium">Today</span>
          )}
          {isLogged && (
            <span className="h-1.5 w-1.5 rounded-full bg-gold inline-block" title="Log exists" />
          )}
        </div>
      </button>

      {/* Hidden native date picker */}
      <input
        ref={dateRef}
        type="date"
        value={date}
        max={format(new Date(), "yyyy-MM-dd")}
        onChange={(e) => e.target.value && onChange(e.target.value)}
        className="sr-only"
        aria-hidden="true"
      />

      <div className="flex items-center gap-1">
        <button
          onClick={() => dateRef.current?.showPicker?.()}
          className="rounded-lg p-2 text-warm-gray hover:text-charcoal hover:bg-sand/40 transition-colors"
          aria-label="Open calendar"
        >
          <CalendarDays className="h-4 w-4" />
        </button>
        <button
          onClick={() => shift(1)}
          disabled={isToday(parsed)}
          className="rounded-lg p-2 text-warm-gray hover:text-charcoal hover:bg-sand/40 transition-colors disabled:opacity-30 disabled:pointer-events-none"
          aria-label="Next day"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

// ─── Weight section ───────────────────────────────────────────────────────────

interface WeightSectionProps {
  value: string;
  onChange: (v: string) => void;
  lastWeight: { value: number; daysAgo: number } | null;
}

function WeightSection({ value, onChange, lastWeight }: WeightSectionProps) {
  const numValue = parseFloat(value);
  const delta    = !isNaN(numValue) && lastWeight ? numValue - lastWeight.value : null;

  return (
    <Card animate={false}>
      <CardContent className="pb-5">
        <p className="text-[11px] font-semibold text-warm-gray uppercase tracking-widest mb-4">
          Body Weight
        </p>

        <div className="flex items-end gap-3">
          <input
            type="number"
            step="0.1"
            min="30"
            max="300"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={lastWeight ? String(lastWeight.value) : "0.0"}
            className={cn(
              "flex-1 bg-transparent font-display text-5xl font-bold text-espresso",
              "placeholder:text-sand focus:text-gold outline-none transition-colors duration-150",
              "[appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
            )}
            aria-label="Weight in kg"
          />
          <span className="text-xl text-warm-gray mb-2 flex-shrink-0">kg</span>
        </div>

        <AnimatePresence mode="wait">
          {delta !== null ? (
            <motion.p
              key="delta"
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className={cn(
                "text-sm font-medium mt-2",
                delta >= 0 ? "text-sage" : "text-terracotta"
              )}
            >
              {delta > 0 ? "+" : ""}{delta.toFixed(1)} kg from last weigh-in
            </motion.p>
          ) : lastWeight ? (
            <motion.p
              key="lastknown"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-xs text-warm-gray mt-2"
            >
              Last recorded: {lastWeight.value} kg
              {lastWeight.daysAgo > 0 ? ` · ${lastWeight.daysAgo}d ago` : " · yesterday"}
            </motion.p>
          ) : (
            <motion.p
              key="empty"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-xs text-warm-gray mt-2"
            >
              No previous weight on record
            </motion.p>
          )}
        </AnimatePresence>
      </CardContent>
    </Card>
  );
}

// ─── Macro card ───────────────────────────────────────────────────────────────

interface MacroCardProps {
  label: string;
  unit: string;
  value: string;
  target?: number;
  icon: React.ReactNode;
  iconColor: string;
  onChange: (v: string) => void;
}

function barColor(pct: number): string {
  if (pct === 0)           return "bg-sand/60";
  if (pct < 0.80)          return "bg-warm-gray/40";
  if (pct < 0.95)          return "bg-gold";
  if (pct <= 1.15)         return "bg-sage";
  return                          "bg-terracotta";
}

function MacroCard({ label, unit, value, target, icon, iconColor, onChange }: MacroCardProps) {
  const num = parseFloat(value) || 0;
  const pct = target && target > 0 ? num / target : 0;
  const barW = `${Math.min(pct * 100, 100)}%`;

  return (
    <div className="bg-ivory border border-sand/70 rounded-xl p-4 flex flex-col gap-3">
      <div className="flex items-center gap-2">
        <span className={cn("flex-shrink-0", iconColor)}>{icon}</span>
        <p className="text-[11px] font-semibold text-warm-gray uppercase tracking-wider">{label}</p>
      </div>

      <div className="flex items-end gap-1.5">
        <input
          type="number"
          min="0"
          step={unit === "kcal" ? "1" : "0.1"}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="0"
          className={cn(
            "flex-1 bg-transparent font-display text-3xl font-semibold text-espresso",
            "placeholder:text-sand/70 focus:text-gold outline-none transition-colors duration-150",
            "[appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
          )}
        />
        <span className="text-sm text-warm-gray mb-0.5 flex-shrink-0">{unit}</span>
      </div>

      {target ? (
        <>
          <div className="h-1.5 bg-sand/40 rounded-full overflow-hidden">
            <motion.div
              className={cn("h-full rounded-full transition-colors duration-300", barColor(pct))}
              initial={{ width: 0 }}
              animate={{ width: barW }}
              transition={{ duration: 0.6, ease: [0.25, 0.46, 0.45, 0.94] }}
            />
          </div>
          <p className="text-[11px] text-warm-gray -mt-1">
            {target.toLocaleString()} {unit} target
            {num > 0 && <span className="text-charcoal"> · {Math.round(pct * 100)}%</span>}
          </p>
        </>
      ) : (
        <p className="text-[11px] text-warm-gray/60 -mt-1">Complete onboarding to see targets</p>
      )}
    </div>
  );
}

// ─── Success toast ────────────────────────────────────────────────────────────

function Toast({ show }: { show: boolean }) {
  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0, y: 16, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 8, scale: 0.97 }}
          transition={{ duration: 0.25, ease: [0.25, 0.46, 0.45, 0.94] }}
          className="fixed bottom-24 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2.5 bg-espresso text-cream text-sm font-medium px-5 py-3 rounded-full shadow-warm-lg whitespace-nowrap"
        >
          <span className="h-5 w-5 rounded-full bg-sage flex items-center justify-center flex-shrink-0">
            <Check className="h-3 w-3 text-white" strokeWidth={3} />
          </span>
          Log saved successfully
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function LogPage() {
  const router  = useRouter();
  const today   = format(new Date(), "yyyy-MM-dd");

  const [date,      setDate]      = useState(today);
  const [form,      setForm]      = useState<LogFormData>(EMPTY_FORM);
  const [showToast, setShowToast] = useState(false);

  const { log, targets, lastWeight, loggedDates, loading, saving, saveError, save } =
    useDailyLog(date);

  // Sync form when log or date changes
  useEffect(() => {
    setForm({
      weight_kg:  log?.weight_kg?.toString()  ?? "",
      calories:   log?.calories?.toString()   ?? "",
      protein_g:  log?.protein_g?.toString()  ?? "",
      carbs_g:    log?.carbs_g?.toString()    ?? "",
      fats_g:     log?.fats_g?.toString()     ?? "",
      water_ml:   log?.water_ml?.toString()   ?? "",
      notes:      log?.notes                  ?? "",
    });
  }, [log, date]);

  function set(field: keyof LogFormData) {
    return (v: string) => setForm((f) => ({ ...f, [field]: v }));
  }

  async function handleSave() {
    const ok = await save(form);
    if (ok) {
      setShowToast(true);
      setTimeout(() => {
        setShowToast(false);
        router.push("/");
      }, 1800);
    }
  }

  const macros: Array<{
    field: keyof LogFormData;
    label: string;
    unit: string;
    target: number | undefined;
    icon: React.ReactNode;
    iconColor: string;
  }> = [
    {
      field: "calories", label: "Calories", unit: "kcal",
      target: targets?.calories,
      icon: <Flame className="h-4 w-4" />, iconColor: "text-terracotta",
    },
    {
      field: "protein_g", label: "Protein", unit: "g",
      target: targets?.proteinG,
      icon: <Beef className="h-4 w-4" />, iconColor: "text-gold-dark",
    },
    {
      field: "carbs_g", label: "Carbs", unit: "g",
      target: targets?.carbsG,
      icon: <Wheat className="h-4 w-4" />, iconColor: "text-sky",
    },
    {
      field: "fats_g", label: "Fats", unit: "g",
      target: targets?.fatG,
      icon: <Droplets className="h-4 w-4" />, iconColor: "text-sage",
    },
  ];

  return (
    <>
      <div className="max-w-2xl mx-auto space-y-5 pb-28 lg:pb-10">

        {/* Date selector */}
        <DateSelector date={date} loggedDates={loggedDates} onChange={setDate} />

        {/* Weight */}
        {loading ? (
          <div className="bg-ivory border border-sand/60 rounded-xl p-6">
            <Skeleton height={16} width="30%" className="mb-4" />
            <Skeleton height={56} width="55%" />
          </div>
        ) : (
          <WeightSection
            value={form.weight_kg}
            onChange={set("weight_kg")}
            lastWeight={lastWeight}
          />
        )}

        {/* Nutrition grid */}
        <div>
          <p className="text-[11px] font-semibold text-warm-gray uppercase tracking-widest mb-3 px-0.5">
            Nutrition
          </p>
          {loading ? (
            <div className="grid grid-cols-2 gap-3">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="bg-ivory border border-sand/60 rounded-xl p-4 space-y-3">
                  <Skeleton height={14} width="40%" />
                  <Skeleton height={40} width="60%" />
                  <Skeleton height={6} />
                  <Skeleton height={12} width="70%" />
                </div>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              {macros.map(({ field, label, unit, target, icon, iconColor }) => (
                <MacroCard
                  key={field}
                  label={label}
                  unit={unit}
                  value={form[field]}
                  target={target}
                  icon={icon}
                  iconColor={iconColor}
                  onChange={set(field)}
                />
              ))}
            </div>
          )}
        </div>

        {/* Quick-add placeholder */}
        <div className="border-2 border-dashed border-sand/70 rounded-xl p-5 text-center opacity-60">
          <p className="text-sm font-medium text-warm-gray">Meal Templates</p>
          <p className="text-xs text-warm-gray/70 mt-1">Quick-add from saved meals — coming soon</p>
        </div>

        {/* Notes */}
        <Card animate={false}>
          <CardContent>
            <div className="flex items-center gap-2 mb-3">
              <StickyNote className="h-4 w-4 text-warm-gray" />
              <p className="text-[11px] font-semibold text-warm-gray uppercase tracking-widest">Notes</p>
            </div>
            <textarea
              value={form.notes}
              onChange={(e) => set("notes")(e.target.value)}
              placeholder="How did today feel? Anything worth noting…"
              rows={3}
              className={cn(
                "w-full bg-cream rounded-lg border border-sand px-3.5 py-3 text-sm text-charcoal",
                "placeholder:text-warm-gray/50 resize-none",
                "focus:outline-none focus:border-gold focus:ring-2 focus:ring-gold/20",
                "transition-colors duration-150"
              )}
            />
          </CardContent>
        </Card>

        {/* Error */}
        {saveError && (
          <p className="text-sm text-rose px-1">{saveError}</p>
        )}

        {/* Desktop save button */}
        <Button
          variant="primary"
          size="lg"
          loading={saving}
          onClick={handleSave}
          className="hidden lg:flex w-full"
        >
          Save Log
        </Button>
      </div>

      {/* Mobile save button — fixed at bottom */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 p-4 bg-cream/95 backdrop-blur-sm border-t border-sand/60 z-30">
        <Button
          variant="primary"
          size="lg"
          loading={saving}
          onClick={handleSave}
          className="w-full"
        >
          Save Log
        </Button>
      </div>

      <Toast show={showToast} />
    </>
  );
}
