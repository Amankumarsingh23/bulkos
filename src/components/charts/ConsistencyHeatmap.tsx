"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import type { ConsistencyCell } from "@/lib/analytics";

interface Props {
  data: ConsistencyCell[];
}

const LEVEL_COLORS = {
  0: "bg-sand/40",
  1: "bg-gold/25",
  2: "bg-gold/55",
  3: "bg-gold",
};

const DAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export function ConsistencyHeatmap({ data }: Props) {
  const [hovered, setHovered] = useState<ConsistencyCell | null>(null);

  if (!data.length) {
    return (
      <div className="h-40 flex items-center justify-center text-sm text-warm-gray">
        Not enough data yet
      </div>
    );
  }

  // Group into weeks (every 7 cells from the data already grouped Mon→Sun)
  const weeks: ConsistencyCell[][] = [];
  for (let i = 0; i < data.length; i += 7) {
    weeks.push(data.slice(i, i + 7));
  }

  const loggedDays = data.filter((d) => d.level > 0).length;
  const totalDays = data.length;
  const pct = Math.round((loggedDays / totalDays) * 100);

  return (
    <div>
      <div className="flex items-center justify-between mb-3 text-xs text-warm-gray">
        <span>{loggedDays} of {totalDays} days logged ({pct}%)</span>
        <div className="flex items-center gap-1">
          <span>Less</span>
          {([0, 1, 2, 3] as const).map((l) => (
            <span
              key={l}
              className={`inline-block h-3 w-3 rounded-sm ${LEVEL_COLORS[l]}`}
            />
          ))}
          <span>More</span>
        </div>
      </div>

      <div className="flex gap-1">
        {/* Day labels */}
        <div className="flex flex-col gap-1 mr-1">
          {DAY_LABELS.map((d) => (
            <span key={d} className="h-5 text-[10px] text-warm-gray leading-5 w-7 text-right pr-1">
              {d}
            </span>
          ))}
        </div>

        {/* Grid */}
        <div className="flex gap-1 overflow-x-auto pb-1">
          {weeks.map((week, wi) => (
            <div key={wi} className="flex flex-col gap-1">
              {week.map((cell, di) => (
                <div key={di} className="relative">
                  <motion.div
                    className={`h-5 w-5 rounded-sm cursor-default ${LEVEL_COLORS[cell.level]}`}
                    whileHover={{ scale: 1.3 }}
                    onMouseEnter={() => setHovered(cell)}
                    onMouseLeave={() => setHovered(null)}
                  />
                  {hovered === cell && (
                    <div className="absolute z-20 bottom-7 left-1/2 -translate-x-1/2 bg-espresso text-cream text-[10px] rounded-lg px-2 py-1 whitespace-nowrap shadow-lg pointer-events-none">
                      {new Date(cell.date).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                      {" — "}
                      {cell.level === 0 ? "No log" : cell.level === 1 ? "Partial" : cell.level === 2 ? "Good" : "Full"}
                    </div>
                  )}
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
