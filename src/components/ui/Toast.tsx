"use client";

import { createContext, useContext, useState, useCallback, useRef } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle2, XCircle, Info, X } from "lucide-react";
import { cn } from "@/lib/utils";

// ─── Types ────────────────────────────────────────────────────────────────────

export type ToastType = "success" | "error" | "info";

interface ToastItem {
  id: string;
  message: string;
  type: ToastType;
}

interface ToastContextValue {
  toast: (message: string, type?: ToastType) => void;
  success: (message: string) => void;
  error: (message: string) => void;
  info: (message: string) => void;
}

// ─── Context ──────────────────────────────────────────────────────────────────

const ToastContext = createContext<ToastContextValue | null>(null);

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used inside ToastProvider");
  return ctx;
}

// ─── Individual toast ─────────────────────────────────────────────────────────

const CONFIG: Record<ToastType, { bg: string; border: string; text: string; icon: React.ReactNode }> = {
  success: {
    bg: "bg-sage/10",
    border: "border-sage/30",
    text: "text-sage",
    icon: <CheckCircle2 className="h-4 w-4 flex-shrink-0" />,
  },
  error: {
    bg: "bg-rose/10",
    border: "border-rose/20",
    text: "text-rose",
    icon: <XCircle className="h-4 w-4 flex-shrink-0" />,
  },
  info: {
    bg: "bg-sky-50",
    border: "border-sky-200/60",
    text: "text-sky-700",
    icon: <Info className="h-4 w-4 flex-shrink-0" />,
  },
};

function ToastItem({ item, onDismiss }: { item: ToastItem; onDismiss: (id: string) => void }) {
  const cfg = CONFIG[item.type];
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 16, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 8, scale: 0.94 }}
      transition={{ duration: 0.25, ease: [0.25, 0.46, 0.45, 0.94] }}
      className={cn(
        "flex items-center gap-3 pl-4 pr-3 py-3 rounded-xl border shadow-warm-md text-sm",
        "max-w-xs w-full pointer-events-auto",
        cfg.bg, cfg.border, cfg.text
      )}
    >
      {cfg.icon}
      <p className="flex-1 font-medium leading-snug">{item.message}</p>
      <button
        onClick={() => onDismiss(item.id)}
        className="opacity-50 hover:opacity-100 transition-opacity ml-1 flex-shrink-0"
        aria-label="Dismiss"
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </motion.div>
  );
}

// ─── Provider ─────────────────────────────────────────────────────────────────

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const timers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  const dismiss = useCallback((id: string) => {
    clearTimeout(timers.current[id]);
    delete timers.current[id];
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const toast = useCallback((message: string, type: ToastType = "info") => {
    const id = Math.random().toString(36).slice(2);
    setToasts((prev) => [...prev.slice(-4), { id, message, type }]);
    timers.current[id] = setTimeout(() => dismiss(id), 4000);
  }, [dismiss]);

  const success = useCallback((message: string) => toast(message, "success"), [toast]);
  const error   = useCallback((message: string) => toast(message, "error"),   [toast]);
  const info    = useCallback((message: string) => toast(message, "info"),    [toast]);

  return (
    <ToastContext.Provider value={{ toast, success, error, info }}>
      {children}
      <ToastPortal toasts={toasts} onDismiss={dismiss} />
    </ToastContext.Provider>
  );
}

// ─── Portal ───────────────────────────────────────────────────────────────────

function ToastPortal({ toasts, onDismiss }: { toasts: ToastItem[]; onDismiss: (id: string) => void }) {
  if (typeof window === "undefined") return null;
  return createPortal(
    <div
      aria-live="polite"
      className="fixed bottom-6 right-4 sm:right-6 z-[9999] flex flex-col gap-2 items-end pointer-events-none"
      // On mobile, shift up to sit above the bottom tab bar
      style={{ bottom: "calc(env(safe-area-inset-bottom, 0px) + 4.5rem)" }}
    >
      <AnimatePresence mode="popLayout">
        {toasts.map((t) => (
          <ToastItem key={t.id} item={t} onDismiss={onDismiss} />
        ))}
      </AnimatePresence>
    </div>,
    document.body
  );
}
