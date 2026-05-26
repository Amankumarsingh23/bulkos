import { HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

type BadgeVariant = "default" | "gold" | "sage" | "terracotta" | "rose" | "sky";

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
  dot?: boolean;
}

const variantClasses: Record<BadgeVariant, string> = {
  default:    "bg-sand/60 text-charcoal border border-sand",
  gold:       "bg-gold/15 text-gold-dark border border-gold/30",
  sage:       "bg-sage/15 text-sage border border-sage/30",
  terracotta: "bg-terracotta/15 text-terracotta border border-terracotta/30",
  rose:       "bg-rose/10 text-rose border border-rose/25",
  sky:        "bg-sky/15 text-sky border border-sky/30",
};

const dotClasses: Record<BadgeVariant, string> = {
  default:    "bg-warm-gray",
  gold:       "bg-gold",
  sage:       "bg-sage",
  terracotta: "bg-terracotta",
  rose:       "bg-rose",
  sky:        "bg-sky",
};

function Badge({ className, variant = "default", dot = false, children, ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium leading-none",
        variantClasses[variant],
        className
      )}
      {...props}
    >
      {dot && (
        <span className={cn("h-1.5 w-1.5 rounded-full flex-shrink-0", dotClasses[variant])} />
      )}
      {children}
    </span>
  );
}

export { Badge };
export type { BadgeVariant };
