"use client";

import { InputHTMLAttributes, forwardRef, useId } from "react";
import { cn } from "@/lib/utils";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
  icon?: React.ReactNode;
}

const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, error, hint, icon, id: propId, ...props }, ref) => {
    const generatedId = useId();
    const id = propId ?? generatedId;

    return (
      <div className="flex flex-col gap-1.5">
        <div className="relative">
          {/* Floating label */}
          {label && (
            <label
              htmlFor={id}
              className={cn(
                "absolute left-3.5 text-warm-gray pointer-events-none select-none",
                "transition-all duration-200 origin-top-left",
                // default position — sits inside the input
                "top-3 text-sm peer-placeholder-shown:top-3 peer-placeholder-shown:text-sm",
                // floated position — sits above
                "peer-focus:-top-2 peer-focus:text-xs peer-focus:text-gold",
                "peer-not-placeholder-shown:-top-2 peer-not-placeholder-shown:text-xs",
                // background chip so label sits over border cleanly
                "peer-focus:bg-cream peer-focus:px-1 peer-focus:-left-[1px]",
                "peer-not-placeholder-shown:bg-cream peer-not-placeholder-shown:px-1 peer-not-placeholder-shown:-left-[1px]",
                error && "peer-focus:text-rose"
              )}
            >
              {label}
            </label>
          )}

          <input
            ref={ref}
            id={id}
            placeholder=" "
            className={cn(
              "peer w-full rounded-md border bg-cream px-3.5 text-sm text-charcoal",
              "placeholder-transparent",
              "transition-colors duration-200",
              "focus:outline-none focus:ring-2 focus:ring-gold/40 focus:border-gold",
              "disabled:cursor-not-allowed disabled:opacity-50",
              label ? "pt-4 pb-2 h-12" : "h-10 py-0",
              icon ? "pr-10" : "",
              error
                ? "border-rose/60 focus:border-rose focus:ring-rose/30"
                : "border-sand hover:border-warm-gray/60",
              className
            )}
            {...props}
          />

          {icon && (
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-warm-gray pointer-events-none">
              {icon}
            </span>
          )}
        </div>

        {error && (
          <p className="text-xs text-rose flex items-center gap-1">
            <span>·</span> {error}
          </p>
        )}
        {hint && !error && (
          <p className="text-xs text-warm-gray">{hint}</p>
        )}
      </div>
    );
  }
);

Input.displayName = "Input";
export { Input };
