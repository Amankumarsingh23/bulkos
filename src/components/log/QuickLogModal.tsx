"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Flame, Beef, Wheat, Droplets, Check, X } from "lucide-react";
import { format } from "date-fns";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { useDailyLog, type LogFormData, EMPTY_FORM } from "@/hooks/useDailyLog";
import { cn } from "@/lib/utils";

interface QuickLogModalProps {
  open: boolean;
  onClose: () => void;
}

function barColor(pct: number): string {
  if (pct === 0)   return "bg-sand/60";
  if (pct < 0.80)  return "bg-warm-gray/40";
  if (pct < 0.95)  return "bg-gold";
  if (pct <= 1.15) return "bg-sage";
  return                  "bg-terracotta";
}

interface MiniMacroProps {
  icon: React.ReactNode;
  iconColor: string;
  label: string;
  unit: string;
  value: string;
  target?: number;
  onChange: (v: string) => void;
}

function MiniMacro({ icon, iconColor, label, unit, value, target, onChange }: MiniMacroProps) {
  const num = parseFloat(value) || 0;
  const pct = target && target > 0 ? num / target : 0;

  return (
    <div className="space-y-1.5">
      <div className="flex items-center gap-1.5 mb-1">
        <span className={cn("flex-shrink-0", iconColor)}>{icon}</span>
        <span className="text-[11px] font-semibold text-warm-gray uppercase tracking-wider">{label}</span>
      </div>
      <div className="flex items-end gap-1">
        <input
          type="number"
          min="0"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="0"
          className={cn(
            "flex-1 bg-cream border border-sand rounded-lg px-3 py-2 text-sm font-medium text-espresso",
            "placeholder:text-sand focus:outline-none focus:border-gold focus:ring-2 focus:ring-gold/20",
            "transition-colors",
            "[appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
          )}
        />
        <span className="text-xs text-warm-gray mb-2.5 flex-shrink-0">{unit}</span>
      </div>
      {target && (
        <div className="h-1 bg-sand/40 rounded-full overflow-hidden">
          <motion.div
            className={cn("h-full rounded-full", barColor(pct))}
            initial={{ width: 0 }}
            animate={{ width: `${Math.min(pct * 100, 100)}%` }}
            transition={{ duration: 0.5 }}
          />
        </div>
      )}
    </div>
  );
}

export function QuickLogModal({ open, onClose }: QuickLogModalProps) {
  const today = format(new Date(), "yyyy-MM-dd");
  const { log, targets, lastWeight, saving, saveError, save } = useDailyLog(today);

  const [form,      setForm]      = useState<LogFormData>(EMPTY_FORM);
  const [showToast, setShowToast] = useState(false);

  // Sync form with fetched log
  useEffect(() => {
    if (!open) return;
    setForm({
      weight_kg: log?.weight_kg?.toString() ?? "",
      calories:  log?.calories?.toString()  ?? "",
      protein_g: log?.protein_g?.toString() ?? "",
      carbs_g:   log?.carbs_g?.toString()   ?? "",
      fats_g:    log?.fats_g?.toString()    ?? "",
      water_ml:  log?.water_ml?.toString()  ?? "",
      notes:     log?.notes                 ?? "",
    });
  }, [log, open]);

  // Keyboard close
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    if (open) document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [open, onClose]);

  function set(field: keyof LogFormData) {
    return (v: string) => setForm((f) => ({ ...f, [field]: v }));
  }

  async function handleSave() {
    const ok = await save(form);
    if (ok) {
      setShowToast(true);
      setTimeout(() => {
        setShowToast(false);
        onClose();
      }, 1400);
    }
  }

  const weightDelta =
    form.weight_kg && lastWeight
      ? parseFloat(form.weight_kg) - lastWeight.value
      : null;

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
          {/* Backdrop */}
          <motion.div
            key="backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="absolute inset-0 bg-espresso/30 backdrop-blur-sm"
            onClick={onClose}
          />

          {/* Sheet */}
          <motion.div
            key="sheet"
            initial={{ y: "100%", opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: "100%", opacity: 0 }}
            transition={{ type: "spring", stiffness: 280, damping: 28 }}
            className={cn(
              "relative z-10 w-full bg-ivory border-t sm:border border-sand/60",
              "rounded-t-2xl sm:rounded-2xl shadow-warm-lg",
              "sm:max-w-md"
            )}
          >
            {/* Drag handle — mobile */}
            <div className="sm:hidden flex justify-center pt-3 pb-1">
              <div className="h-1 w-10 rounded-full bg-sand" />
            </div>

            {/* Header */}
            <div className="flex items-center justify-between px-5 pt-4 sm:pt-5 pb-4 border-b border-sand/50">
              <div>
                <h2 className="font-display text-lg text-espresso">Quick Log</h2>
                <p className="text-xs text-warm-gray mt-0.5">
                  {format(new Date(), "EEEE, d MMMM")}
                </p>
              </div>
              <button
                onClick={onClose}
                className="rounded-lg p-2 text-warm-gray hover:text-charcoal hover:bg-sand/40 transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="px-5 py-5 space-y-5">
              {/* Weight */}
              <div>
                <p className="text-[11px] font-semibold text-warm-gray uppercase tracking-widest mb-2">
                  Body Weight
                </p>
                <div className="flex items-end gap-2">
                  <input
                    type="number"
                    step="0.1"
                    min="30"
                    max="300"
                    value={form.weight_kg}
                    onChange={(e) => set("weight_kg")(e.target.value)}
                    placeholder={lastWeight ? String(lastWeight.value) : "0.0"}
                    className={cn(
                      "flex-1 bg-cream border border-sand rounded-lg px-3 py-2.5",
                      "font-display text-2xl font-semibold text-espresso placeholder:text-sand",
                      "focus:outline-none focus:border-gold focus:ring-2 focus:ring-gold/20 transition-colors",
                      "[appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                    )}
                  />
                  <span className="text-base text-warm-gray mb-2.5">kg</span>
                </div>
                {weightDelta !== null && (
                  <p className={cn("text-xs mt-1.5 font-medium",
                    weightDelta >= 0 ? "text-sage" : "text-terracotta")}>
                    {weightDelta > 0 ? "+" : ""}{weightDelta.toFixed(1)} kg
                  </p>
                )}
              </div>

              {/* Macros — 2x2 */}
              <div>
                <p className="text-[11px] font-semibold text-warm-gray uppercase tracking-widest mb-3">
                  Nutrition
                </p>
                <div className="grid grid-cols-2 gap-x-4 gap-y-4">
                  <MiniMacro
                    icon={<Flame className="h-3.5 w-3.5" />} iconColor="text-terracotta"
                    label="Calories" unit="kcal"
                    value={form.calories} target={targets?.calories}
                    onChange={set("calories")}
                  />
                  <MiniMacro
                    icon={<Beef className="h-3.5 w-3.5" />} iconColor="text-gold-dark"
                    label="Protein" unit="g"
                    value={form.protein_g} target={targets?.proteinG}
                    onChange={set("protein_g")}
                  />
                  <MiniMacro
                    icon={<Wheat className="h-3.5 w-3.5" />} iconColor="text-sky"
                    label="Carbs" unit="g"
                    value={form.carbs_g} target={targets?.carbsG}
                    onChange={set("carbs_g")}
                  />
                  <MiniMacro
                    icon={<Droplets className="h-3.5 w-3.5" />} iconColor="text-sage"
                    label="Fats" unit="g"
                    value={form.fats_g} target={targets?.fatG}
                    onChange={set("fats_g")}
                  />
                </div>
              </div>

              {/* Notes */}
              <Input
                label="Notes (optional)"
                value={form.notes}
                onChange={(e) => set("notes")(e.target.value)}
                placeholder=" "
              />

              {saveError && (
                <p className="text-sm text-rose">{saveError}</p>
              )}

              {/* Save */}
              <Button
                variant="primary"
                size="lg"
                loading={saving}
                onClick={handleSave}
                className="w-full"
              >
                {showToast ? (
                  <>
                    <Check className="h-4 w-4" />
                    Saved!
                  </>
                ) : "Save Log"}
              </Button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
