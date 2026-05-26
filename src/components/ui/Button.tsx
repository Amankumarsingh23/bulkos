"use client";

import { ButtonHTMLAttributes, forwardRef } from "react";
import { motion, HTMLMotionProps } from "framer-motion";
import { cn } from "@/lib/utils";

type Variant = "primary" | "secondary" | "ghost" | "danger";
type Size = "sm" | "md" | "lg";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
}

const variantClasses: Record<Variant, string> = {
  primary:
    "bg-gold text-espresso font-medium shadow-warm hover:bg-gold-light active:bg-gold-dark border border-gold/20",
  secondary:
    "bg-transparent text-charcoal border border-sand hover:border-gold hover:text-gold active:bg-ivory",
  ghost:
    "bg-transparent text-warm-gray hover:text-charcoal hover:bg-ivory active:bg-sand border border-transparent",
  danger:
    "bg-rose/10 text-rose border border-rose/20 hover:bg-rose/20 active:bg-rose/30",
};

const sizeClasses: Record<Size, string> = {
  sm: "h-8 px-3 text-xs rounded-sm gap-1.5",
  md: "h-10 px-5 text-sm rounded-sm gap-2",
  lg: "h-12 px-7 text-base rounded-md gap-2.5",
};

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "primary", size = "md", loading, children, disabled, ...props }, ref) => {
    return (
      <motion.button
        ref={ref}
        whileHover={{ y: -1, transition: { duration: 0.15 } }}
        whileTap={{ y: 0, scale: 0.98, transition: { duration: 0.1 } }}
        disabled={disabled || loading}
        className={cn(
          "relative inline-flex items-center justify-center font-sans tracking-wide transition-colors duration-200",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold focus-visible:ring-offset-2 focus-visible:ring-offset-cream",
          "disabled:pointer-events-none disabled:opacity-40 select-none",
          variantClasses[variant],
          sizeClasses[size],
          className
        )}
        {...(props as HTMLMotionProps<"button">)}
      >
        {loading && (
          <span className="absolute inset-0 flex items-center justify-center">
            <span className="h-4 w-4 rounded-full border-2 border-current border-t-transparent animate-spin" />
          </span>
        )}
        <span className={cn("flex items-center gap-inherit", loading && "opacity-0")}>
          {children}
        </span>
      </motion.button>
    );
  }
);

Button.displayName = "Button";
export { Button };
