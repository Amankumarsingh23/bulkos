"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Info } from "lucide-react";
import { cn } from "@/lib/utils";

interface ChartCardProps {
  title: string;
  subtitle?: string;
  tooltip?: string;
  className?: string;
  headerRight?: React.ReactNode;
  children: React.ReactNode;
}

export function ChartCard({
  title,
  subtitle,
  tooltip,
  className,
  headerRight,
  children,
}: ChartCardProps) {
  const [showTooltip, setShowTooltip] = useState(false);

  return (
    <div
      className={cn(
        "bg-ivory rounded-2xl border border-sand/60 shadow-warm-md p-5 md:p-6",
        className
      )}
    >
      <div className="flex items-start justify-between mb-4">
        <div>
          <div className="flex items-center gap-1.5">
            <h3 className="font-display text-base font-semibold text-espresso">{title}</h3>
            {tooltip && (
              <div className="relative">
                <button
                  type="button"
                  onMouseEnter={() => setShowTooltip(true)}
                  onMouseLeave={() => setShowTooltip(false)}
                  onFocus={() => setShowTooltip(true)}
                  onBlur={() => setShowTooltip(false)}
                  className="text-warm-gray hover:text-charcoal transition-colors"
                  aria-label="Chart info"
                >
                  <Info className="h-3.5 w-3.5" />
                </button>
                {showTooltip && (
                  <motion.div
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="absolute left-0 top-6 z-20 w-56 rounded-xl bg-espresso text-cream text-xs px-3 py-2 shadow-lg"
                  >
                    {tooltip}
                  </motion.div>
                )}
              </div>
            )}
          </div>
          {subtitle && (
            <p className="text-xs text-warm-gray mt-0.5">{subtitle}</p>
          )}
        </div>
        {headerRight && <div className="flex items-center gap-2">{headerRight}</div>}
      </div>
      {children}
    </div>
  );
}
