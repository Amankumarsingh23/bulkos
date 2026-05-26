"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  User, Target, Database, Ruler, Info,
  Check, X, Download, Trash2, AlertTriangle,
  GitFork, ExternalLink, ChevronDown,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { useToast } from "@/components/ui/Toast";
import { useAuth } from "@/hooks/useAuth";
import { createBrowserClient } from "@/lib/supabase";
import { cn } from "@/lib/utils";
import type { ActivityLevel, Gender, DailyLog } from "@/types/database";
import { format, parseISO } from "date-fns";

// ─── Constants ────────────────────────────────────────────────────────────────

const ACTIVITY_OPTIONS: { value: ActivityLevel; label: string }[] = [
  { value: "sedentary",         label: "Sedentary (desk job, little exercise)" },
  { value: "lightly_active",    label: "Lightly active (1–3x / week)" },
  { value: "moderately_active", label: "Moderately active (3–5x / week)" },
  { value: "very_active",       label: "Very active (6–7x / week)" },
  { value: "extra_active",      label: "Extra active (2x / day or hard labour)" },
];

const GENDER_OPTIONS: { value: Gender; label: string }[] = [
  { value: "male",   label: "Male" },
  { value: "female", label: "Female" },
  { value: "other",  label: "Other / prefer not to say" },
];

const ACT: Record<string, number> = {
  sedentary: 1.2, lightly_active: 1.375, moderately_active: 1.55,
  very_active: 1.725, extra_active: 1.9,
};

// ─── TDEE helpers ─────────────────────────────────────────────────────────────

interface MacroTargets { calories: number; proteinG: number; carbsG: number; fatG: number; tdee: number; }

function computeMacros(
  weightKg: number, heightCm: number, age: number,
  gender: string, activityLevel: string,
  targetWeightKg: number, targetDate: string | null
): MacroTargets {
  const gOff = gender === "male" ? 5 : gender === "female" ? -161 : -78;
  const bmr  = 10 * weightKg + 6.25 * heightCm - 5 * age + gOff;
  const tdee = Math.round(bmr * (ACT[activityLevel] ?? 1.55));
  const days = targetDate
    ? Math.max(30, Math.ceil((parseISO(targetDate).getTime() - Date.now()) / 86_400_000))
    : 180;
  const surplus   = Math.round(((targetWeightKg - weightKg) * 7700) / days);
  const calories  = tdee + surplus;
  const proteinG  = Math.round(weightKg * 2);
  const fatG      = Math.round(weightKg * 0.8);
  const carbsG    = Math.max(0, Math.round((calories - proteinG * 4 - fatG * 9) / 4));
  return { calories: Math.round(calories), proteinG, carbsG, fatG, tdee };
}

// ─── SettingsCard ─────────────────────────────────────────────────────────────

function SettingsCard({ icon, title, description, children }: {
  icon: React.ReactNode; title: string; description?: string; children: React.ReactNode;
}) {
  return (
    <div className="bg-ivory rounded-2xl border border-sand/60 shadow-warm-md px-6 py-5">
      <div className="flex items-center gap-2.5 mb-5 pb-4 border-b border-sand/40">
        <div className="h-8 w-8 rounded-lg bg-gold/12 flex items-center justify-center text-gold flex-shrink-0">
          {icon}
        </div>
        <div>
          <h2 className="font-display text-base font-semibold text-espresso">{title}</h2>
          {description && <p className="text-xs text-warm-gray mt-0.5">{description}</p>}
        </div>
      </div>
      {children}
    </div>
  );
}

// ─── Toast banner ─────────────────────────────────────────────────────────────

function Toast({ message, type }: { message: string; type: "success" | "error" }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -4 }}
      className={`flex items-center gap-2 text-sm px-4 py-2.5 rounded-xl mb-4 ${
        type === "success"
          ? "bg-sage/15 border border-sage/30 text-sage"
          : "bg-rose/10 border border-rose/20 text-rose"
      }`}
    >
      {type === "success" ? <Check className="h-3.5 w-3.5 flex-shrink-0" /> : <X className="h-3.5 w-3.5 flex-shrink-0" />}
      {message}
    </motion.div>
  );
}

// ─── Toggle ───────────────────────────────────────────────────────────────────

function Toggle({ checked, onChange, label, sub }: {
  checked: boolean; onChange: (v: boolean) => void; label: string; sub?: string;
}) {
  return (
    <div className="flex items-center justify-between py-2">
      <div>
        <p className="text-sm font-medium text-charcoal">{label}</p>
        {sub && <p className="text-xs text-warm-gray mt-0.5">{sub}</p>}
      </div>
      <button
        type="button"
        onClick={() => onChange(!checked)}
        className={`relative h-6 w-11 rounded-full transition-colors duration-200 ${checked ? "bg-gold" : "bg-sand"}`}
      >
        <motion.div
          className="absolute top-0.5 h-5 w-5 rounded-full bg-white shadow"
          animate={{ left: checked ? "calc(100% - 1.375rem)" : "0.125rem" }}
          transition={{ type: "spring", stiffness: 500, damping: 30 }}
        />
      </button>
    </div>
  );
}

// ─── Select ───────────────────────────────────────────────────────────────────

function Select({ label, value, onChange, options }: {
  label: string; value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-xs text-warm-gray font-medium">{label}</label>
      <div className="relative">
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full appearance-none rounded-md border border-sand bg-cream px-3.5 py-2.5 text-sm text-charcoal pr-9 focus:outline-none focus:ring-2 focus:ring-gold/40 focus:border-gold transition-colors hover:border-warm-gray/60"
        >
          {options.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
        <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-warm-gray pointer-events-none" />
      </div>
    </div>
  );
}

// ─── Recalculate TDEE modal ───────────────────────────────────────────────────

function TDEEModal({ oldMacros, newMacros, onConfirm, onClose }: {
  oldMacros: MacroTargets; newMacros: MacroTargets;
  onConfirm: () => void; onClose: () => void;
}) {
  function Row({ label, oldVal, newVal, unit = "" }: {
    label: string; oldVal: number; newVal: number; unit?: string;
  }) {
    const diff = newVal - oldVal;
    return (
      <div className="flex items-center justify-between py-2.5 border-b border-sand/40 last:border-0 text-sm">
        <span className="text-warm-gray">{label}</span>
        <div className="flex items-center gap-3">
          <span className="text-warm-gray/60 line-through">{oldVal}{unit}</span>
          <span className="font-medium text-espresso">{newVal}{unit}</span>
          {diff !== 0 && (
            <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
              diff > 0 ? "bg-sage/15 text-sage" : "bg-terracotta/15 text-terracotta"
            }`}>
              {diff > 0 ? "+" : ""}{diff}{unit}
            </span>
          )}
        </div>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-espresso/40 backdrop-blur-sm"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95, y: 16 }} animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.95, y: 8 }}
        transition={{ type: "spring", stiffness: 400, damping: 30 }}
        className="bg-ivory rounded-2xl border border-sand/60 shadow-warm-md w-full max-w-md p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-5">
          <h3 className="font-display text-lg font-semibold text-espresso">New targets preview</h3>
          <button onClick={onClose} className="text-warm-gray hover:text-charcoal transition-colors">
            <X className="h-4 w-4" />
          </button>
        </div>
        <p className="text-xs text-warm-gray mb-4">Based on your updated profile, here's how your daily targets change:</p>
        <div className="bg-cream rounded-xl border border-sand/60 px-4 py-1 mb-5">
          <Row label="TDEE"          oldVal={oldMacros.tdee}     newVal={newMacros.tdee}     unit=" kcal" />
          <Row label="Target calories" oldVal={oldMacros.calories} newVal={newMacros.calories} unit=" kcal" />
          <Row label="Protein"       oldVal={oldMacros.proteinG} newVal={newMacros.proteinG} unit="g" />
          <Row label="Carbs"         oldVal={oldMacros.carbsG}   newVal={newMacros.carbsG}   unit="g" />
          <Row label="Fats"          oldVal={oldMacros.fatG}     newVal={newMacros.fatG}     unit="g" />
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" size="md" onClick={onClose} className="flex-1">Cancel</Button>
          <Button variant="primary"   size="md" onClick={onConfirm} className="flex-1">Apply & save</Button>
        </div>
      </motion.div>
    </motion.div>
  );
}

// ─── Delete account modal ─────────────────────────────────────────────────────

function DeleteAccountModal({ onConfirm, onClose, loading }: {
  onConfirm: () => void; onClose: () => void; loading: boolean;
}) {
  const [phrase, setPhrase] = useState("");
  const valid = phrase === "DELETE";

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-espresso/40 backdrop-blur-sm"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95, y: 16 }} animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.95 }} transition={{ type: "spring", stiffness: 400, damping: 30 }}
        className="bg-ivory rounded-2xl border border-rose/30 shadow-warm-md w-full max-w-sm p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-2.5 mb-4">
          <div className="h-10 w-10 rounded-xl bg-rose/10 flex items-center justify-center">
            <AlertTriangle className="h-5 w-5 text-rose" />
          </div>
          <div>
            <h3 className="font-display text-base font-semibold text-espresso">Delete account</h3>
            <p className="text-xs text-rose">This cannot be undone</p>
          </div>
        </div>
        <p className="text-sm text-charcoal mb-4 leading-relaxed">
          All your data — logs, milestones, reports — will be permanently deleted.
          Type <strong>DELETE</strong> to confirm.
        </p>
        <Input
          value={phrase}
          onChange={(e) => setPhrase(e.target.value)}
          placeholder="Type DELETE"
          className="mb-4 font-mono tracking-widest"
        />
        <div className="flex gap-2">
          <Button variant="secondary" size="md" onClick={onClose} className="flex-1">Cancel</Button>
          <Button
            variant="danger" size="md"
            disabled={!valid} loading={loading}
            onClick={onConfirm}
            className="flex-1"
          >
            Delete forever
          </Button>
        </div>
      </motion.div>
    </motion.div>
  );
}

// ─── MAIN PAGE ────────────────────────────────────────────────────────────────

export default function SettingsPage() {
  const router = useRouter();
  const { profile, user, signOut } = useAuth();
  const { success: toastSuccess, error: toastError } = useToast();
  const [currentWeight, setCurrentWeight] = useState<number | null>(null);
  const [allLogs, setAllLogs] = useState<DailyLog[]>([]);

  // ── Profile draft ──────────────────────────────────────────────────────────
  const [profileDraft, setProfileDraft] = useState({
    full_name:      "",
    height_cm:      "",
    age:            "",
    gender:         "male" as Gender,
    activity_level: "moderately_active" as ActivityLevel,
  });
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileToast, setProfileToast] = useState<{ msg: string; type: "success" | "error" } | null>(null);
  const [showTDEEModal, setShowTDEEModal] = useState(false);

  // ── Goal draft ─────────────────────────────────────────────────────────────
  const [goalDraft, setGoalDraft] = useState({ target_weight_kg: "", target_date: "" });
  const [goalSaving, setGoalSaving] = useState(false);
  const [goalToast, setGoalToast] = useState<{ msg: string; type: "success" | "error" } | null>(null);

  // ── Data section ───────────────────────────────────────────────────────────
  const [exportLoading, setExportLoading] = useState<"csv" | "json" | null>(null);
  const [deleteRange, setDeleteRange] = useState({ from: "", to: "" });
  const [deleteRangeCount, setDeleteRangeCount] = useState<number | null>(null);
  const [deleteRangeLoading, setDeleteRangeLoading] = useState(false);
  const [deleteRangeToast, setDeleteRangeToast] = useState<{ msg: string; type: "success" | "error" } | null>(null);
  const [showDeleteAccount, setShowDeleteAccount] = useState(false);
  const [deleteAccountLoading, setDeleteAccountLoading] = useState(false);

  // ── Units ──────────────────────────────────────────────────────────────────
  const [units, setUnits] = useState({ weight: "kg", height: "cm" });

  // ── Init ───────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (profile) {
      setProfileDraft({
        full_name:      profile.full_name ?? "",
        height_cm:      profile.height_cm?.toString() ?? "",
        age:            profile.age?.toString() ?? "",
        gender:         profile.gender ?? "male",
        activity_level: profile.activity_level ?? "moderately_active",
      });
      setGoalDraft({
        target_weight_kg: profile.target_weight_kg?.toString() ?? "",
        target_date:      profile.target_date ?? "",
      });
    }
  }, [profile]);

  const fetchData = useCallback(async () => {
    if (!user?.id) return;
    const sb = createBrowserClient();
    const { data } = await sb
      .from("daily_logs").select("*").eq("user_id", user.id)
      .order("log_date", { ascending: true });
    const logs = data ?? [];
    setAllLogs(logs);
    const withWeight = logs.filter((l: DailyLog) => l.weight_kg !== null);
    setCurrentWeight(withWeight.at(-1)?.weight_kg ?? null);
  }, [user?.id]);

  useEffect(() => { fetchData(); }, [fetchData]);

  useEffect(() => {
    const saved = localStorage.getItem("bulkos-units");
    if (saved) { try { setUnits(JSON.parse(saved)); } catch {} }
  }, []);

  function saveUnits(next: typeof units) {
    setUnits(next);
    localStorage.setItem("bulkos-units", JSON.stringify(next));
  }

  // Compute impact preview for goal section
  const goalImpact = (() => {
    const w = currentWeight;
    const tw = parseFloat(goalDraft.target_weight_kg);
    const { height_cm, age, gender, activity_level } = profileDraft;
    if (!w || !tw || !height_cm || !age) return null;
    try {
      return computeMacros(w, parseFloat(height_cm), parseInt(age), gender, activity_level, tw, goalDraft.target_date || null);
    } catch { return null; }
  })();

  // ── Profile save ───────────────────────────────────────────────────────────
  async function saveProfile() {
    if (!user?.id) return;
    setProfileSaving(true);
    setProfileToast(null);
    const sb = createBrowserClient();
    const { error } = await sb.from("profiles").update({
      full_name:      profileDraft.full_name || null,
      height_cm:      parseFloat(profileDraft.height_cm) || null,
      age:            parseInt(profileDraft.age) || null,
      gender:         profileDraft.gender,
      activity_level: profileDraft.activity_level,
    }).eq("id", user.id);
    setProfileSaving(false);
    if (error) {
      toastError(error.message);
      setProfileToast({ msg: error.message, type: "error" });
    } else {
      toastSuccess("Profile updated!");
      setProfileToast({ msg: "Profile saved.", type: "success" });
    }
    setTimeout(() => setProfileToast(null), 3500);
  }

  // Old vs new targets for TDEE modal
  const tdeeComparison = (() => {
    if (!profile || !currentWeight || !profile.target_weight_kg) return null;
    const w = currentWeight;
    const tw = profile.target_weight_kg;
    const { height_cm, age, gender, activity_level } = profileDraft;
    if (!height_cm || !age) return null;
    const oldMacros = profile.height_cm && profile.age && profile.gender && profile.activity_level
      ? computeMacros(w, profile.height_cm, profile.age, profile.gender, profile.activity_level, tw, profile.target_date)
      : null;
    const newMacros = computeMacros(w, parseFloat(height_cm), parseInt(age), gender, activity_level, tw, profile.target_date);
    return oldMacros ? { oldMacros, newMacros } : null;
  })();

  // ── Goal save ──────────────────────────────────────────────────────────────
  async function saveGoal() {
    if (!user?.id) return;
    setGoalSaving(true);
    setGoalToast(null);
    const sb = createBrowserClient();
    const { error } = await sb.from("profiles").update({
      target_weight_kg: parseFloat(goalDraft.target_weight_kg) || null,
      target_date:      goalDraft.target_date || null,
    }).eq("id", user.id);
    setGoalSaving(false);
    if (error) {
      toastError(error.message);
      setGoalToast({ msg: error.message, type: "error" });
    } else {
      toastSuccess("Goal updated!");
      setGoalToast({ msg: "Goal updated.", type: "success" });
    }
    setTimeout(() => setGoalToast(null), 3500);
  }

  // ── Data export ────────────────────────────────────────────────────────────
  function exportCSV() {
    setExportLoading("csv");
    const headers = ["date", "weight_kg", "calories", "protein_g", "carbs_g", "fats_g", "water_ml", "notes"];
    const rows = allLogs.map((l) => [
      l.log_date, l.weight_kg ?? "", l.calories ?? "", l.protein_g ?? "",
      l.carbs_g ?? "", l.fats_g ?? "", l.water_ml ?? "",
      l.notes ? `"${l.notes.replace(/"/g, '""')}"` : "",
    ].join(","));
    const csv = [headers.join(","), ...rows].join("\n");
    downloadBlob(csv, "bulkos-data.csv", "text/csv");
    setExportLoading(null);
  }

  function exportJSON() {
    setExportLoading("json");
    const json = JSON.stringify({ exportedAt: new Date().toISOString(), logs: allLogs }, null, 2);
    downloadBlob(json, "bulkos-data.json", "application/json");
    setExportLoading(null);
  }

  function downloadBlob(content: string, filename: string, type: string) {
    const blob = new Blob([content], { type });
    const url  = URL.createObjectURL(blob);
    const a    = Object.assign(document.createElement("a"), { href: url, download: filename });
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  // ── Delete log range ───────────────────────────────────────────────────────
  useEffect(() => {
    if (!deleteRange.from || !deleteRange.to) { setDeleteRangeCount(null); return; }
    const count = allLogs.filter((l) => l.log_date >= deleteRange.from && l.log_date <= deleteRange.to).length;
    setDeleteRangeCount(count);
  }, [deleteRange, allLogs]);

  async function deleteLogRange() {
    if (!user?.id || !deleteRange.from || !deleteRange.to) return;
    setDeleteRangeLoading(true);
    setDeleteRangeToast(null);
    const sb = createBrowserClient();
    const { error } = await sb.from("daily_logs")
      .delete()
      .eq("user_id", user.id)
      .gte("log_date", deleteRange.from)
      .lte("log_date", deleteRange.to);
    if (error) {
      setDeleteRangeToast({ msg: error.message, type: "error" });
    } else {
      setDeleteRangeToast({ msg: `Deleted ${deleteRangeCount ?? 0} logs.`, type: "success" });
      setDeleteRange({ from: "", to: "" });
      await fetchData();
    }
    setDeleteRangeLoading(false);
    setTimeout(() => setDeleteRangeToast(null), 3500);
  }

  // ── Delete account ─────────────────────────────────────────────────────────
  async function deleteAccount() {
    setDeleteAccountLoading(true);
    try {
      const res = await fetch("/api/account/delete", { method: "DELETE" });
      if (!res.ok) {
        const j = await res.json();
        throw new Error(j.error ?? "Delete failed");
      }
      await signOut();
      router.push("/login");
    } catch (err) {
      alert(err instanceof Error ? err.message : "Something went wrong.");
      setDeleteAccountLoading(false);
      setShowDeleteAccount(false);
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <>
      <div className="space-y-6 max-w-2xl">
        {/* Header */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
          <h1 className="font-display text-2xl font-semibold text-espresso">Settings</h1>
          <p className="text-sm text-warm-gray mt-0.5">Manage your profile, goals and data.</p>
        </motion.div>

        {/* ── 1. Profile Settings ──────────────────────────────────────────── */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.05 }}>
          <SettingsCard icon={<User className="h-4 w-4" />} title="Profile" description="Your personal details used for TDEE calculations">
            <AnimatePresence>{profileToast && <Toast message={profileToast.msg} type={profileToast.type} />}</AnimatePresence>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2">
                <Input
                  label="Full name"
                  value={profileDraft.full_name}
                  onChange={(e) => setProfileDraft((d) => ({ ...d, full_name: e.target.value }))}
                />
              </div>
              <Input
                label="Height (cm)"
                type="number"
                value={profileDraft.height_cm}
                onChange={(e) => setProfileDraft((d) => ({ ...d, height_cm: e.target.value }))}
              />
              <Input
                label="Age"
                type="number"
                value={profileDraft.age}
                onChange={(e) => setProfileDraft((d) => ({ ...d, age: e.target.value }))}
              />
              <Select
                label="Gender"
                value={profileDraft.gender}
                onChange={(v) => setProfileDraft((d) => ({ ...d, gender: v as Gender }))}
                options={GENDER_OPTIONS}
              />
              <Select
                label="Activity level"
                value={profileDraft.activity_level}
                onChange={(v) => setProfileDraft((d) => ({ ...d, activity_level: v as ActivityLevel }))}
                options={ACTIVITY_OPTIONS}
              />
            </div>

            <div className="flex items-center gap-2 mt-5">
              <Button variant="primary" size="md" loading={profileSaving} onClick={saveProfile}>
                Save profile
              </Button>
              {tdeeComparison && (
                <Button variant="secondary" size="md" onClick={() => setShowTDEEModal(true)}>
                  Recalculate targets
                </Button>
              )}
            </div>
          </SettingsCard>
        </motion.div>

        {/* ── 2. Goal Settings ─────────────────────────────────────────────── */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.1 }}>
          <SettingsCard icon={<Target className="h-4 w-4" />} title="Goal" description="Your target weight and timeline">
            <AnimatePresence>{goalToast && <Toast message={goalToast.msg} type={goalToast.type} />}</AnimatePresence>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="Target weight (kg)"
                type="number"
                step="0.5"
                value={goalDraft.target_weight_kg}
                onChange={(e) => setGoalDraft((d) => ({ ...d, target_weight_kg: e.target.value }))}
              />
              <div className="flex flex-col gap-1.5">
                <label className="text-xs text-warm-gray font-medium">Target date</label>
                <input
                  type="date"
                  value={goalDraft.target_date}
                  min={format(new Date(), "yyyy-MM-dd")}
                  onChange={(e) => setGoalDraft((d) => ({ ...d, target_date: e.target.value }))}
                  className="h-12 rounded-md border border-sand bg-cream px-3.5 text-sm text-charcoal focus:outline-none focus:ring-2 focus:ring-gold/40 focus:border-gold transition-colors hover:border-warm-gray/60"
                />
              </div>
            </div>

            {/* Live impact */}
            <AnimatePresence>
              {goalImpact && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="overflow-hidden"
                >
                  <div className="mt-4 bg-gold/8 border border-gold/30 rounded-xl px-4 py-3">
                    <p className="text-xs font-medium text-gold mb-2 flex items-center gap-1.5">
                      <Info className="h-3 w-3" /> Impact preview
                    </p>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
                      {[
                        { label: "Daily target", val: `${goalImpact.calories} kcal` },
                        { label: "TDEE",          val: `${goalImpact.tdee} kcal` },
                        { label: "Surplus",        val: `+${goalImpact.calories - goalImpact.tdee} kcal` },
                        { label: "Protein",        val: `${goalImpact.proteinG}g` },
                      ].map(({ label, val }) => (
                        <div key={label}>
                          <p className="font-display text-base font-semibold text-espresso">{val}</p>
                          <p className="text-xs text-warm-gray">{label}</p>
                        </div>
                      ))}
                    </div>
                    {goalImpact.calories - goalImpact.tdee > 500 && (
                      <p className="text-xs text-terracotta mt-2.5 flex items-center gap-1">
                        <AlertTriangle className="h-3 w-3" />
                        Surplus over 500 kcal/day may increase fat accumulation.
                      </p>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <Button variant="primary" size="md" loading={goalSaving} onClick={saveGoal} className="mt-5">
              Save goal
            </Button>
          </SettingsCard>
        </motion.div>

        {/* ── 3. Data Management ───────────────────────────────────────────── */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.15 }}>
          <SettingsCard icon={<Database className="h-4 w-4" />} title="Data" description={`${allLogs.length} log entries`}>

            {/* Export */}
            <div className="mb-6">
              <p className="text-sm font-medium text-charcoal mb-3">Export all data</p>
              <div className="flex flex-wrap gap-2">
                <Button variant="secondary" size="sm" loading={exportLoading === "csv"} onClick={exportCSV}>
                  <Download className="h-3.5 w-3.5" />
                  Download CSV
                </Button>
                <Button variant="secondary" size="sm" loading={exportLoading === "json"} onClick={exportJSON}>
                  <Download className="h-3.5 w-3.5" />
                  Download JSON
                </Button>
              </div>
              <p className="text-xs text-warm-gray mt-2">Includes all daily logs. Open in Excel or any spreadsheet app.</p>
            </div>

            <div className="border-t border-sand/50 pt-5 mb-6">
              <p className="text-sm font-medium text-charcoal mb-3">Delete logs by date range</p>
              <AnimatePresence>{deleteRangeToast && <Toast message={deleteRangeToast.msg} type={deleteRangeToast.type} />}</AnimatePresence>
              <div className="grid grid-cols-2 gap-3 mb-3">
                {(["from", "to"] as const).map((k) => (
                  <div key={k} className="flex flex-col gap-1.5">
                    <label className="text-xs text-warm-gray font-medium capitalize">{k}</label>
                    <input
                      type="date"
                      value={deleteRange[k]}
                      onChange={(e) => setDeleteRange((r) => ({ ...r, [k]: e.target.value }))}
                      className="h-10 rounded-md border border-sand bg-cream px-3 text-sm text-charcoal focus:outline-none focus:ring-2 focus:ring-gold/40 focus:border-gold transition-colors"
                    />
                  </div>
                ))}
              </div>
              {deleteRangeCount !== null && (
                <p className="text-xs text-warm-gray mb-2">
                  {deleteRangeCount === 0 ? "No logs in this range." : `${deleteRangeCount} log${deleteRangeCount !== 1 ? "s" : ""} will be deleted.`}
                </p>
              )}
              <Button
                variant="danger" size="sm"
                disabled={!deleteRange.from || !deleteRange.to || deleteRangeCount === 0}
                loading={deleteRangeLoading}
                onClick={deleteLogRange}
              >
                <Trash2 className="h-3.5 w-3.5" />
                Delete logs
              </Button>
            </div>

            {/* Delete account */}
            <div className="border-t border-sand/50 pt-5">
              <p className="text-sm font-medium text-rose mb-1">Danger zone</p>
              <p className="text-xs text-warm-gray mb-3">Permanently delete your account and all data. This cannot be undone.</p>
              <Button variant="danger" size="sm" onClick={() => setShowDeleteAccount(true)}>
                <Trash2 className="h-3.5 w-3.5" />
                Delete account
              </Button>
            </div>
          </SettingsCard>
        </motion.div>

        {/* ── 4. Units ─────────────────────────────────────────────────────── */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.2 }}>
          <SettingsCard icon={<Ruler className="h-4 w-4" />} title="Units" description="Stored in your browser — display-only for now">
            <div className="space-y-1 divide-y divide-sand/40">
              <Toggle
                label="Weight unit"
                sub={units.weight === "kg" ? "Showing kilograms" : "Showing pounds"}
                checked={units.weight === "lbs"}
                onChange={(v) => saveUnits({ ...units, weight: v ? "lbs" : "kg" })}
              />
              <Toggle
                label="Height unit"
                sub={units.height === "cm" ? "Showing centimetres" : "Showing feet & inches"}
                checked={units.height === "ft"}
                onChange={(v) => saveUnits({ ...units, height: v ? "ft" : "cm" })}
              />
            </div>
            <p className="text-xs text-warm-gray mt-4 flex items-center gap-1.5">
              <Info className="h-3 w-3" />
              Unit conversion across all pages will be available in a future update.
            </p>
          </SettingsCard>
        </motion.div>

        {/* ── 5. About ─────────────────────────────────────────────────────── */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.25 }}>
          <SettingsCard icon={<Info className="h-4 w-4" />} title="About">
            <div className="space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span className="text-warm-gray">App</span>
                <span className="font-medium text-charcoal">BulkOS</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-warm-gray">Version</span>
                <span className="font-mono text-xs text-charcoal bg-sand/50 rounded px-2 py-0.5">1.0.0-beta</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-warm-gray">Built by</span>
                <span className="font-medium text-charcoal">Aman Kumar Singh</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-warm-gray">Stack</span>
                <span className="text-charcoal text-xs">Next.js · Supabase · Groq · Recharts</span>
              </div>
              <div className="border-t border-sand/40 pt-3 flex gap-3">
                <a
                  href="https://github.com/Amankumarsingh23/bulkos"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 text-xs text-warm-gray hover:text-charcoal transition-colors"
                >
                  <GitFork className="h-3.5 w-3.5" />
                  Source on GitHub
                  <ExternalLink className="h-2.5 w-2.5" />
                </a>
              </div>
            </div>
          </SettingsCard>
        </motion.div>
      </div>

      {/* ── Modals ────────────────────────────────────────────────────────── */}
      <AnimatePresence>
        {showTDEEModal && tdeeComparison && (
          <TDEEModal
            oldMacros={tdeeComparison.oldMacros}
            newMacros={tdeeComparison.newMacros}
            onClose={() => setShowTDEEModal(false)}
            onConfirm={async () => {
              setShowTDEEModal(false);
              await saveProfile();
            }}
          />
        )}
        {showDeleteAccount && (
          <DeleteAccountModal
            onClose={() => setShowDeleteAccount(false)}
            onConfirm={deleteAccount}
            loading={deleteAccountLoading}
          />
        )}
      </AnimatePresence>
    </>
  );
}
