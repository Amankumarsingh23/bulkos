"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Download, X } from "lucide-react";

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  readonly userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

const VISIT_KEY = "bulkos_visit_count";
const DISMISSED_KEY = "bulkos_install_dismissed";
const VISITS_REQUIRED = 3;

export function InstallPrompt() {
  const [promptEvent, setPromptEvent] = useState<BeforeInstallPromptEvent | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // Increment visit counter
    const visits = parseInt(localStorage.getItem(VISIT_KEY) ?? "0", 10) + 1;
    localStorage.setItem(VISIT_KEY, String(visits));

    const dismissed = localStorage.getItem(DISMISSED_KEY) === "true";
    if (dismissed) return;

    const handler = (e: Event) => {
      e.preventDefault();
      setPromptEvent(e as BeforeInstallPromptEvent);
      if (visits >= VISITS_REQUIRED) setVisible(true);
    };

    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  async function handleInstall() {
    if (!promptEvent) return;
    await promptEvent.prompt();
    const { outcome } = await promptEvent.userChoice;
    if (outcome === "accepted") dismiss();
    else setVisible(false);
  }

  function dismiss() {
    setVisible(false);
    localStorage.setItem(DISMISSED_KEY, "true");
  }

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ y: 80, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 80, opacity: 0 }}
          transition={{ type: "spring", stiffness: 380, damping: 32 }}
          className="fixed bottom-[calc(env(safe-area-inset-bottom,0px)+5.5rem)] inset-x-4 z-50 lg:left-auto lg:right-6 lg:max-w-sm lg:bottom-6"
        >
          <div className="bg-ivory border border-sand/80 rounded-2xl shadow-warm-lg px-4 py-3.5 flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-gold/15 border border-gold/30 flex items-center justify-center flex-shrink-0">
              <Download className="h-5 w-5 text-gold" strokeWidth={1.75} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-espresso leading-tight">Install BulkOS</p>
              <p className="text-xs text-warm-gray mt-0.5">Add to home screen for quick access</p>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <button
                onClick={handleInstall}
                className="px-3 py-1.5 bg-gold text-cream text-xs font-semibold rounded-lg hover:bg-gold/90 transition-colors"
              >
                Install
              </button>
              <button
                onClick={dismiss}
                className="p-1.5 text-warm-gray hover:text-charcoal rounded-lg hover:bg-sand/40 transition-colors"
                aria-label="Dismiss"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
