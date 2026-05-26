"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import { format } from "date-fns";
import { Menu, Bell, PlusCircle } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { QuickLogModal } from "@/components/log/QuickLogModal";

const TITLE_MAP: Record<string, string> = {
  "/dashboard":   "Dashboard",
  "/log":         "Log Entry",
  "/analytics":   "Analytics",
  "/insights":    "AI Insights",
  "/goals":       "Goals",
  "/settings":    "Settings",
  "/onboarding":  "Setup",
};

interface HeaderProps {
  onMenuClick: () => void;
}

export function Header({ onMenuClick }: HeaderProps) {
  const pathname = usePathname();
  const title    = TITLE_MAP[pathname] ?? "BulkOS";
  const today    = format(new Date(), "EEEE, d MMMM yyyy");

  const [quickLogOpen, setQuickLogOpen] = useState(false);

  return (
    <>
      <header className="h-16 flex items-center justify-between px-5 lg:px-8 bg-cream border-b border-sand/70 flex-shrink-0">
        {/* Left — hamburger (mobile) + page title */}
        <div className="flex items-center gap-3">
          <button
            onClick={onMenuClick}
            className="lg:hidden rounded-md p-2 text-warm-gray hover:text-charcoal hover:bg-sand/40 transition-colors"
            aria-label="Open menu"
          >
            <Menu className="h-5 w-5" />
          </button>

          <div>
            <h1 className="font-display text-lg lg:text-xl font-semibold text-espresso leading-none">
              {title}
            </h1>
            <p className="text-[11px] text-warm-gray mt-0.5 hidden sm:block">{today}</p>
          </div>
        </div>

        {/* Right — actions */}
        <div className="flex items-center gap-2 lg:gap-3">
          <button
            className="relative rounded-md p-2 text-warm-gray hover:text-charcoal hover:bg-sand/40 transition-colors"
            aria-label="Notifications"
          >
            <Bell className="h-[18px] w-[18px]" strokeWidth={1.75} />
            <span className="absolute top-1.5 right-1.5 h-1.5 w-1.5 rounded-full bg-gold" />
          </button>

          {/* Desktop — opens QuickLogModal */}
          <Button
            variant="primary"
            size="sm"
            onClick={() => setQuickLogOpen(true)}
            className="hidden sm:inline-flex gap-1.5"
          >
            <PlusCircle className="h-3.5 w-3.5" strokeWidth={2} />
            Log Today
          </Button>

          {/* Mobile icon-only */}
          <button
            onClick={() => setQuickLogOpen(true)}
            className="sm:hidden rounded-md p-2 bg-gold text-espresso hover:bg-gold-light transition-colors"
            aria-label="Log today"
          >
            <PlusCircle className="h-4 w-4" strokeWidth={2} />
          </button>
        </div>
      </header>

      <QuickLogModal open={quickLogOpen} onClose={() => setQuickLogOpen(false)} />
    </>
  );
}
