"use client";

import { HTMLAttributes } from "react";
import { motion, HTMLMotionProps } from "framer-motion";
import { cn } from "@/lib/utils";

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  animate?: boolean;
  hover?: boolean;
}

function Card({ className, animate = true, hover = false, children, ...props }: CardProps) {
  const Comp = animate ? motion.div : "div";
  const motionProps = animate
    ? {
        initial: { opacity: 0, y: 8 },
        animate: { opacity: 1, y: 0 },
        transition: { duration: 0.3, ease: [0.25, 0.46, 0.45, 0.94] },
        ...(hover && {
          whileHover: { y: -2, boxShadow: "0 8px 40px rgba(60,50,40,0.14)" },
        }),
      }
    : {};

  return (
    <Comp
      className={cn(
        "rounded-xl bg-ivory border border-sand/60 shadow-warm",
        "transition-shadow duration-200",
        className
      )}
      {...(motionProps as HTMLMotionProps<"div">)}
      {...(props as HTMLMotionProps<"div">)}
    >
      {children}
    </Comp>
  );
}

function CardHeader({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("px-6 pt-5 pb-0 flex items-start justify-between", className)}
      {...props}
    />
  );
}

function CardTitle({ className, ...props }: HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h3
      className={cn("font-display text-lg text-espresso leading-snug", className)}
      {...props}
    />
  );
}

function CardDescription({ className, ...props }: HTMLAttributes<HTMLParagraphElement>) {
  return (
    <p className={cn("mt-1 text-sm text-warm-gray leading-relaxed", className)} {...props} />
  );
}

function CardContent({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("p-6", className)} {...props} />;
}

function CardFooter({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("px-6 pb-5 pt-0 flex items-center gap-3 border-t border-sand/50 mt-0 pt-4", className)}
      {...props}
    />
  );
}

export { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter };
