import { cn } from "@/lib/utils";

interface PageWrapperProps {
  children: React.ReactNode;
  className?: string;
}

export function PageWrapper({ children, className }: PageWrapperProps) {
  return (
    <main className={cn("flex-1 overflow-y-auto p-6", className)}>
      {children}
    </main>
  );
}
