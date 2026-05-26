"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronLeft, ChevronRight, Check } from "lucide-react";
import { format, addDays } from "date-fns";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { useAuth } from "@/hooks/useAuth";
import { createBrowserClient } from "@/lib/supabase";
import { cn } from "@/lib/utils";
import type { ActivityLevel, Gender } from "@/types/database";

// ─── Types ────────────────────────────────────────────────────────────────────

interface WizardData {
  fullName: string;
  gender: Gender | "";
  age: string;
  heightCm: string;
  weightKg: string;
  activityLevel: ActivityLevel | "";
  targetWeightKg: string;
  timelineOption: "3" | "6" | "12" | "custom";
  customDate: string;
}

interface Calcs {
  bmr: number;
  tdee: number;
  dailySurplus: number;
  targetCalories: number;
  proteinG: number;
  fatG: number;
  carbsG: number;
  currentBmi: number;
  targetBmi: number;
  monthlyGain: number;
}

// ─── Calculation logic ────────────────────────────────────────────────────────

const MULTIPLIERS: Record<ActivityLevel, number> = {
  sedentary:         1.2,
  lightly_active:    1.375,
  moderately_active: 1.55,
  very_active:       1.725,
  extra_active:      1.9,
};

function timelineDays(option: WizardData["timelineOption"], customDate: string): number {
  if (option === "custom" && customDate) {
    return Math.max(30, Math.ceil((new Date(customDate).getTime() - Date.now()) / 86_400_000));
  }
  return parseInt(option) * 30;
}

function computeCalcs(d: WizardData): Calcs | null {
  const w  = parseFloat(d.weightKg);
  const h  = parseFloat(d.heightCm);
  const a  = parseInt(d.age);
  const tw = parseFloat(d.targetWeightKg);
  if (!w || !h || !a || !tw || !d.gender || !d.activityLevel) return null;

  const gOff = d.gender === "male" ? 5 : d.gender === "female" ? -161 : -78;
  const bmr  = Math.round(10 * w + 6.25 * h - 5 * a + gOff);
  const tdee = Math.round(bmr * MULTIPLIERS[d.activityLevel as ActivityLevel]);

  const days        = timelineDays(d.timelineOption, d.customDate);
  const surplus     = Math.round(((tw - w) * 7700) / days);
  const targetCal   = tdee + surplus;

  const proteinG    = Math.round(w * 2);
  const fatG        = Math.round(w * 0.8);
  const carbsG      = Math.max(0, Math.round((targetCal - proteinG * 4 - fatG * 9) / 4));

  const hm          = h / 100;
  const monthlyGain = parseFloat((((tw - w) / days) * 30).toFixed(2));

  return {
    bmr, tdee,
    dailySurplus:  surplus,
    targetCalories: Math.round(targetCal),
    proteinG, fatG, carbsG,
    currentBmi: parseFloat((w  / (hm * hm)).toFixed(1)),
    targetBmi:  parseFloat((tw / (hm * hm)).toFixed(1)),
    monthlyGain,
  };
}

function cmToFtIn(cm: number): string {
  if (!cm || isNaN(cm)) return "";
  const totalIn = cm / 2.54;
  return `${Math.floor(totalIn / 12)}′${Math.round(totalIn % 12)}″`;
}

// ─── Shared mini-components ───────────────────────────────────────────────────

function RadioCard({
  selected, onClick, children, className,
}: {
  selected: boolean; onClick: () => void; children: React.ReactNode; className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "relative flex items-center gap-3 p-4 rounded-xl border-2 text-left transition-all duration-150 w-full",
        selected
          ? "border-gold bg-gold/8 text-espresso"
          : "border-sand bg-cream text-charcoal hover:border-warm-gray/40 hover:bg-ivory",
        className,
      )}
    >
      {children}
      {selected && (
        <span className="absolute top-3 right-3 h-4 w-4 rounded-full bg-gold flex items-center justify-center flex-shrink-0">
          <Check className="h-2.5 w-2.5 text-espresso" strokeWidth={3} />
        </span>
      )}
    </button>
  );
}

function StatTile({
  label, value, unit, highlight = false,
}: {
  label: string; value: string | number; unit: string; highlight?: boolean;
}) {
  return (
    <div className={cn(
      "rounded-xl p-3.5 border",
      highlight ? "bg-gold/12 border-gold/30" : "bg-ivory border-sand",
    )}>
      <p className="text-[11px] text-warm-gray leading-none">{label}</p>
      <p className={cn("mt-1.5 text-base font-semibold leading-none", highlight ? "text-espresso" : "text-charcoal")}>
        {value}{" "}
        <span className="text-xs font-normal text-warm-gray">{unit}</span>
      </p>
    </div>
  );
}

// ─── Step 1 — Personal info ───────────────────────────────────────────────────

const GENDER_OPTIONS: { value: Gender; label: string; symbol: string }[] = [
  { value: "male",   label: "Male",   symbol: "♂" },
  { value: "female", label: "Female", symbol: "♀" },
  { value: "other",  label: "Other",  symbol: "◌" },
];

function Step1({
  data, onChange,
}: {
  data: WizardData; onChange: (p: Partial<WizardData>) => void;
}) {
  const ftIn = cmToFtIn(parseFloat(data.heightCm));
  return (
    <div className="space-y-6">
      <Input
        label="Full name"
        type="text"
        autoComplete="name"
        value={data.fullName}
        onChange={(e) => onChange({ fullName: e.target.value })}
      />

      <div>
        <p className="text-sm font-medium text-charcoal mb-3">Gender</p>
        <div className="grid grid-cols-3 gap-3">
          {GENDER_OPTIONS.map(({ value, label, symbol }) => (
            <RadioCard
              key={value}
              selected={data.gender === value}
              onClick={() => onChange({ gender: value })}
              className="flex-col items-center justify-center py-5 gap-2"
            >
              <span className="text-2xl leading-none">{symbol}</span>
              <span className="text-sm font-medium">{label}</span>
            </RadioCard>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Input
          label="Age"
          type="number"
          min="10"
          max="100"
          value={data.age}
          onChange={(e) => onChange({ age: e.target.value })}
        />
        <Input
          label="Height (cm)"
          type="number"
          min="100"
          max="250"
          value={data.heightCm}
          onChange={(e) => onChange({ heightCm: e.target.value })}
          hint={ftIn ? `≈ ${ftIn}` : "Enter your height in centimetres"}
        />
      </div>
    </div>
  );
}

// ─── Step 2 — Current stats ───────────────────────────────────────────────────

const ACTIVITY_OPTIONS: {
  value: ActivityLevel; label: string; desc: string; emoji: string;
}[] = [
  { value: "sedentary",         label: "Sedentary",         desc: "Desk job, minimal exercise",           emoji: "🪑" },
  { value: "lightly_active",    label: "Lightly Active",    desc: "Light exercise 1–3 days/week",         emoji: "🚶" },
  { value: "moderately_active", label: "Moderately Active", desc: "Moderate exercise 3–5 days/week",      emoji: "🏃" },
  { value: "very_active",       label: "Very Active",       desc: "Hard exercise 6–7 days/week",          emoji: "🏋️" },
  { value: "extra_active",      label: "Extra Active",      desc: "Athlete or physical job",              emoji: "⚡" },
];

function Step2({
  data, onChange,
}: {
  data: WizardData; onChange: (p: Partial<WizardData>) => void;
}) {
  return (
    <div className="space-y-6">
      <Input
        label="Current weight (kg)"
        type="number"
        min="30"
        max="300"
        step="0.1"
        value={data.weightKg}
        onChange={(e) => onChange({ weightKg: e.target.value })}
        hint="This becomes your Day 1 entry"
      />

      <div>
        <p className="text-sm font-medium text-charcoal mb-3">Activity level</p>
        <div className="space-y-2.5">
          {ACTIVITY_OPTIONS.map(({ value, label, desc, emoji }) => (
            <RadioCard
              key={value}
              selected={data.activityLevel === value}
              onClick={() => onChange({ activityLevel: value })}
            >
              <span className="text-xl w-6 flex-shrink-0 text-center">{emoji}</span>
              <div className="min-w-0">
                <p className="text-sm font-medium leading-none">{label}</p>
                <p className="text-xs text-warm-gray mt-1">{desc}</p>
              </div>
            </RadioCard>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Step 3 — Goals + live calculations ──────────────────────────────────────

const TIMELINE_OPTIONS: { value: WizardData["timelineOption"]; label: string }[] = [
  { value: "3",      label: "3 months" },
  { value: "6",      label: "6 months" },
  { value: "12",     label: "1 year"   },
  { value: "custom", label: "Custom"   },
];

function Step3({
  data, onChange, calcs,
}: {
  data: WizardData;
  onChange: (p: Partial<WizardData>) => void;
  calcs: Calcs | null;
}) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8">
      {/* ── Left: inputs ── */}
      <div className="space-y-6">
        <Input
          label="Target weight (kg)"
          type="number"
          min="30"
          max="300"
          step="0.1"
          value={data.targetWeightKg}
          onChange={(e) => onChange({ targetWeightKg: e.target.value })}
        />

        <div>
          <p className="text-sm font-medium text-charcoal mb-3">Timeline</p>
          <div className="grid grid-cols-2 gap-2.5">
            {TIMELINE_OPTIONS.map(({ value, label }) => (
              <button
                key={value}
                type="button"
                onClick={() => onChange({ timelineOption: value })}
                className={cn(
                  "p-3 rounded-xl border-2 text-sm font-medium transition-all duration-150",
                  data.timelineOption === value
                    ? "border-gold bg-gold/8 text-espresso"
                    : "border-sand bg-cream text-charcoal hover:border-warm-gray/40",
                )}
              >
                {label}
              </button>
            ))}
          </div>

          <AnimatePresence>
            {data.timelineOption === "custom" && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="overflow-hidden mt-3"
              >
                <Input
                  label="Target date"
                  type="date"
                  value={data.customDate}
                  onChange={(e) => onChange({ customDate: e.target.value })}
                  min={format(addDays(new Date(), 30), "yyyy-MM-dd")}
                />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* ── Right: live preview ── */}
      {calcs ? (
        <motion.div
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-cream rounded-2xl border border-sand p-5 space-y-4 self-start"
        >
          <p className="text-[11px] font-semibold text-warm-gray uppercase tracking-wider">
            Live preview
          </p>

          <div className="grid grid-cols-2 gap-2.5">
            <StatTile label="BMR"            value={calcs.bmr}           unit="kcal" />
            <StatTile label="TDEE"           value={calcs.tdee}          unit="kcal" />
            <StatTile label="Daily surplus"  value={`+${calcs.dailySurplus}`} unit="kcal" />
            <StatTile label="Target calories" value={calcs.targetCalories} unit="kcal" highlight />
          </div>

          <div className="border-t border-sand pt-4 space-y-2.5">
            <p className="text-[11px] font-semibold text-warm-gray uppercase tracking-wider">
              Daily macros
            </p>
            <div className="grid grid-cols-3 gap-2">
              {[
                { label: "Protein", value: calcs.proteinG, color: "text-terracotta" },
                { label: "Carbs",   value: calcs.carbsG,   color: "text-sky"        },
                { label: "Fats",    value: calcs.fatG,     color: "text-sage"       },
              ].map(({ label, value, color }) => (
                <div key={label} className="bg-ivory border border-sand rounded-lg p-2.5 text-center">
                  <p className={cn("text-sm font-bold leading-none", color)}>
                    {value}<span className="text-[10px] font-normal text-warm-gray">g</span>
                  </p>
                  <p className="text-[10px] text-warm-gray mt-1">{label}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="border-t border-sand pt-4 grid grid-cols-3 gap-2">
            <div>
              <p className="text-[11px] text-warm-gray">Current BMI</p>
              <p className="text-sm font-semibold text-charcoal mt-0.5">{calcs.currentBmi}</p>
            </div>
            <div>
              <p className="text-[11px] text-warm-gray">Target BMI</p>
              <p className="text-sm font-semibold text-charcoal mt-0.5">{calcs.targetBmi}</p>
            </div>
            <div>
              <p className="text-[11px] text-warm-gray">Per month</p>
              <p className="text-sm font-semibold text-sage mt-0.5">+{calcs.monthlyGain} kg</p>
            </div>
          </div>
        </motion.div>
      ) : (
        <div className="bg-cream rounded-2xl border border-sand/60 p-6 flex items-center justify-center min-h-[200px]">
          <p className="text-sm text-warm-gray text-center leading-relaxed">
            Enter your target weight and pick a timeline to see your personalised calculations.
          </p>
        </div>
      )}
    </div>
  );
}

// ─── Step 4 — Summary ────────────────────────────────────────────────────────

function Step4({ data, calcs }: { data: WizardData; calcs: Calcs | null }) {
  if (!calcs) return (
    <p className="text-warm-gray text-sm">Missing data — go back and fill in all fields.</p>
  );

  const weightDiff = (parseFloat(data.targetWeightKg) - parseFloat(data.weightKg)).toFixed(1);

  const macros = [
    { label: "Calories", value: calcs.targetCalories.toLocaleString(), unit: "kcal", emoji: "🔥", highlight: true },
    { label: "Protein",  value: `${calcs.proteinG}`,   unit: "g",    emoji: "🥩" },
    { label: "Carbs",    value: `${calcs.carbsG}`,     unit: "g",    emoji: "🌾" },
    { label: "Fats",     value: `${calcs.fatG}`,       unit: "g",    emoji: "🥑" },
  ];

  return (
    <div className="space-y-5">
      {/* Daily targets */}
      <div className="bg-gold/8 border border-gold/25 rounded-2xl p-6">
        <p className="font-display text-lg text-espresso mb-5">Your daily targets</p>
        <div className="grid grid-cols-2 gap-3">
          {macros.map(({ label, value, unit, emoji, highlight }) => (
            <div
              key={label}
              className={cn(
                "rounded-xl p-4 border",
                highlight
                  ? "bg-gold/15 border-gold/35 col-span-2"
                  : "bg-cream border-sand/70",
              )}
            >
              <span className="text-lg">{emoji}</span>
              <p className={cn(
                "font-display font-semibold leading-none mt-2",
                highlight ? "text-3xl text-espresso" : "text-xl text-charcoal",
              )}>
                {value}
              </p>
              <p className="text-xs text-warm-gray mt-1">{unit} {label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: "BMR",        value: calcs.bmr,  color: "text-charcoal" },
          { label: "TDEE",       value: calcs.tdee, color: "text-charcoal" },
          { label: "Monthly gain", value: `+${calcs.monthlyGain}`, color: "text-sage" },
        ].map(({ label, value, color }) => (
          <div key={label} className="bg-ivory border border-sand rounded-xl p-4 text-center">
            <p className={cn("font-display text-xl font-semibold", color)}>{value}</p>
            <p className="text-xs text-warm-gray mt-1">{label}</p>
          </div>
        ))}
      </div>

      {/* Journey bar */}
      <div className="bg-ivory border border-sand rounded-xl p-4 flex items-center gap-4">
        <div className="text-center">
          <p className="text-xs text-warm-gray">Starting</p>
          <p className="text-base font-semibold text-charcoal mt-0.5">{data.weightKg} kg</p>
        </div>
        <div className="flex-1 h-px bg-sand relative">
          <div className="absolute inset-y-0 left-0 bg-gold rounded-full" style={{ width: "40%" }} />
          <div className="absolute -top-2.5 right-0 text-gold text-lg">●</div>
        </div>
        <div className="text-center">
          <p className="text-xs text-warm-gray">Target</p>
          <p className="text-base font-semibold text-gold-dark mt-0.5">{data.targetWeightKg} kg</p>
        </div>
        <div className="text-center ml-2 pl-3 border-l border-sand">
          <p className="text-xs text-warm-gray">Total</p>
          <p className="text-base font-semibold text-sage mt-0.5">+{weightDiff} kg</p>
        </div>
      </div>
    </div>
  );
}

// ─── Wizard ───────────────────────────────────────────────────────────────────

const STEPS = [
  { title: "Let's get to know you",    subtitle: "We'll personalise everything to your body." },
  { title: "Where are you now?",        subtitle: "Your current stats set your baseline."      },
  { title: "Where do you want to be?",  subtitle: "Set your goal and watch the numbers update." },
  { title: "Your plan",                 subtitle: "Everything you need — in one clear view."    },
];

const slideVariants = {
  enter: (dir: number) => ({ x: dir > 0 ? 56 : -56, opacity: 0 }),
  center:               ({ x: 0, opacity: 1 }),
  exit:  (dir: number) => ({ x: dir > 0 ? -56 : 56, opacity: 0 }),
};

function canAdvance(step: number, data: WizardData): boolean {
  switch (step) {
    case 0: return !!data.fullName.trim() && !!data.gender && !!data.age && !!data.heightCm;
    case 1: return !!data.weightKg && !!data.activityLevel;
    case 2: return !!data.targetWeightKg && (data.timelineOption !== "custom" || !!data.customDate);
    default: return true;
  }
}

export default function OnboardingPage() {
  const router  = useRouter();
  const { user } = useAuth();

  const [step, setStep]         = useState(0);
  const [direction, setDirection] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError]       = useState<string | null>(null);

  const [data, setData] = useState<WizardData>({
    fullName: "", gender: "", age: "", heightCm: "",
    weightKg: "", activityLevel: "",
    targetWeightKg: "", timelineOption: "6", customDate: "",
  });

  // Pre-fill name once auth resolves
  useEffect(() => {
    const name = user?.user_metadata?.full_name as string | undefined;
    if (name && !data.fullName) setData((d) => ({ ...d, fullName: name }));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const calcs = useMemo(() => computeCalcs(data), [data]);

  function update(patch: Partial<WizardData>) {
    setData((d) => ({ ...d, ...patch }));
    setError(null);
  }

  function navigate(next: number) {
    setDirection(next > step ? 1 : -1);
    setStep(next);
    setError(null);
  }

  function getTargetDate(): string {
    if (data.timelineOption === "custom") return data.customDate;
    return format(addDays(new Date(), parseInt(data.timelineOption) * 30), "yyyy-MM-dd");
  }

  async function handleSubmit() {
    if (!user || !calcs) return;
    setSubmitting(true);
    setError(null);

    const supabase = createBrowserClient();

    try {
      // 1. Save profile
      const { error: profileErr } = await supabase.from("profiles").upsert({
        id:               user.id,
        full_name:        data.fullName.trim(),
        gender:           data.gender as Gender,
        age:              parseInt(data.age),
        height_cm:        parseFloat(data.heightCm),
        activity_level:   data.activityLevel as ActivityLevel,
        target_weight_kg: parseFloat(data.targetWeightKg),
        target_date:      getTargetDate(),
      });
      if (profileErr) throw profileErr;

      // 2. First daily log (starting weight + day-one targets)
      await supabase.from("daily_logs").upsert(
        {
          user_id:   user.id,
          log_date:  format(new Date(), "yyyy-MM-dd"),
          weight_kg: parseFloat(data.weightKg),
          calories:  calcs.targetCalories,
          protein_g: calcs.proteinG,
          carbs_g:   calcs.carbsG,
          fats_g:    calcs.fatG,
        },
        { onConflict: "user_id,log_date" }
      );

      // 3. Auto-milestones every 2 kg between start and target
      const start  = parseFloat(data.weightKg);
      const target = parseFloat(data.targetWeightKg);
      const step2  = target > start ? 2 : -2;
      const milestones: { user_id: string; title: string; target_weight_kg: number }[] = [];

      for (
        let w = start + step2;
        target > start ? w <= target : w >= target;
        w += step2
      ) {
        const kg = parseFloat(w.toFixed(1));
        milestones.push({
          user_id:          user.id,
          title:            kg === target ? `Goal reached: ${kg} kg 🎯` : `Reach ${kg} kg`,
          target_weight_kg: kg,
        });
      }
      if (milestones.length > 0) await supabase.from("milestones").insert(milestones);

      router.push("/dashboard");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Something went wrong. Please try again.");
      setSubmitting(false);
    }
  }

  return (
    <div className="max-w-2xl mx-auto py-6 lg:py-10">

      {/* ── Progress bar ── */}
      <div className="mb-10">
        <div className="flex gap-2 mb-3">
          {STEPS.map((_, i) => (
            <div key={i} className="flex-1 h-1 rounded-full bg-sand overflow-hidden">
              <motion.div
                className="h-full bg-gold rounded-full origin-left"
                initial={false}
                animate={{ scaleX: i <= step ? 1 : 0 }}
                transition={{ duration: 0.35, ease: "easeInOut" }}
                style={{ transformOrigin: "left" }}
              />
            </div>
          ))}
        </div>
        <div className="flex items-center justify-between">
          <p className="text-xs text-warm-gray">Step {step + 1} of {STEPS.length}</p>
          <p className="text-xs text-warm-gray hidden sm:block">{STEPS[step].subtitle}</p>
        </div>
      </div>

      {/* ── Step heading ── */}
      <AnimatePresence mode="wait">
        <motion.h1
          key={`heading-${step}`}
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 8 }}
          transition={{ duration: 0.2 }}
          className="font-display text-2xl lg:text-3xl text-espresso mb-8"
        >
          {STEPS[step].title}
        </motion.h1>
      </AnimatePresence>

      {/* ── Step content ── */}
      <AnimatePresence mode="wait" custom={direction}>
        <motion.div
          key={step}
          custom={direction}
          variants={slideVariants}
          initial="enter"
          animate="center"
          exit="exit"
          transition={{ duration: 0.25, ease: [0.25, 0.46, 0.45, 0.94] }}
        >
          {step === 0 && <Step1 data={data} onChange={update} />}
          {step === 1 && <Step2 data={data} onChange={update} />}
          {step === 2 && <Step3 data={data} onChange={update} calcs={calcs} />}
          {step === 3 && <Step4 data={data} calcs={calcs} />}
        </motion.div>
      </AnimatePresence>

      {/* ── Error ── */}
      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="mt-5 px-4 py-3 rounded-lg bg-rose/10 border border-rose/20 text-sm text-rose overflow-hidden"
          >
            {error}
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Navigation ── */}
      <div className="mt-8 flex items-center justify-between">
        <Button
          variant="ghost"
          size="md"
          onClick={() => navigate(step - 1)}
          disabled={step === 0}
        >
          <ChevronLeft className="h-4 w-4" />
          Back
        </Button>

        {step < STEPS.length - 1 ? (
          <Button
            variant="primary"
            size="md"
            disabled={!canAdvance(step, data)}
            onClick={() => navigate(step + 1)}
          >
            Continue
            <ChevronRight className="h-4 w-4" />
          </Button>
        ) : (
          <Button
            variant="primary"
            size="lg"
            loading={submitting}
            disabled={!calcs}
            onClick={handleSubmit}
          >
            Start Tracking
            <ChevronRight className="h-4 w-4" />
          </Button>
        )}
      </div>
    </div>
  );
}
