import { HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

interface SkeletonProps extends HTMLAttributes<HTMLDivElement> {
  width?: string | number;
  height?: string | number;
  circle?: boolean;
}

function Skeleton({ className, width, height, circle, style, ...props }: SkeletonProps) {
  return (
    <div
      className={cn("shimmer", circle ? "rounded-full" : "rounded-md", className)}
      style={{ width, height, ...style }}
      aria-hidden="true"
      {...props}
    />
  );
}

function SkeletonCard({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("rounded-xl bg-ivory border border-sand/60 shadow-warm p-6", className)}
      {...props}
    >
      <Skeleton height={20} width="45%" className="mb-3" />
      <Skeleton height={14} width="80%" className="mb-2" />
      <Skeleton height={14} width="60%" className="mb-6" />
      <Skeleton height={80} />
    </div>
  );
}

function SkeletonText({ lines = 3, className }: { lines?: number; className?: string }) {
  return (
    <div className={cn("flex flex-col gap-2", className)}>
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton
          key={i}
          height={14}
          width={i === lines - 1 ? "60%" : "100%"}
        />
      ))}
    </div>
  );
}

export { Skeleton, SkeletonCard, SkeletonText };
