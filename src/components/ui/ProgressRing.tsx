"use client";

import { useEffect, useRef } from "react";
import { motion, useMotionValue, useTransform, animate } from "framer-motion";
import { cn } from "@/lib/utils";

interface ProgressRingProps {
  value: number;       // 0–100
  size?: number;       // diameter in px
  strokeWidth?: number;
  color?: string;      // tailwind var or hex
  trackColor?: string;
  label?: string;
  sublabel?: string;
  className?: string;
  animateOnMount?: boolean;
}

export function ProgressRing({
  value,
  size = 96,
  strokeWidth = 6,
  color = "#C9A96E",
  trackColor = "#E8DCC8",
  label,
  sublabel,
  className,
  animateOnMount = true,
}: ProgressRingProps) {
  const clampedValue = Math.min(100, Math.max(0, value));
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;

  const progress = useMotionValue(animateOnMount ? 0 : clampedValue);
  const dashOffset = useTransform(
    progress,
    (v) => circumference - (v / 100) * circumference
  );

  const countRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const controls = animate(progress, clampedValue, {
      duration: 1.2,
      ease: [0.25, 0.46, 0.45, 0.94],
      onUpdate(v) {
        if (countRef.current) {
          countRef.current.textContent = `${Math.round(v)}%`;
        }
      },
    });
    return controls.stop;
  }, [clampedValue, progress]);

  return (
    <div
      className={cn("relative inline-flex flex-col items-center gap-1", className)}
      role="progressbar"
      aria-valuenow={clampedValue}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="-rotate-90">
          {/* Track */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke={trackColor}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
          />
          {/* Progress arc */}
          <motion.circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke={color}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeDasharray={circumference}
            style={{ strokeDashoffset: dashOffset }}
          />
        </svg>

        {/* Center label */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          {label !== undefined ? (
            <>
              <span className="font-display text-xs font-semibold text-espresso leading-none">
                {label}
              </span>
              {sublabel && (
                <span className="text-[10px] text-warm-gray mt-0.5 leading-none">{sublabel}</span>
              )}
            </>
          ) : (
            <span
              ref={countRef}
              className="font-display text-sm font-semibold text-espresso leading-none"
            >
              {clampedValue}%
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
