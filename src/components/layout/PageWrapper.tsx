"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import { AnimatePresence } from "framer-motion";
import { Sidebar } from "./Sidebar";
import { Header } from "./Header";
import { PageTransition } from "@/components/ui/PageTransition";
import { ToastProvider } from "@/components/ui/Toast";
import { cn } from "@/lib/utils";
import type { User } from "@supabase/supabase-js";

interface PageWrapperProps {
  user: User;
  children: React.ReactNode;
}

export function PageWrapper({ user, children }: PageWrapperProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const pathname = usePathname();

  return (
    <ToastProvider>
      <div className="flex h-screen overflow-hidden bg-cream">
        <Sidebar
          user={user}
          isOpen={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
        />

        {/* Main column */}
        <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
          <Header onMenuClick={() => setSidebarOpen(true)} />

          {/* Scrollable content area — extra bottom pad on mobile for tab bar */}
          <main className="flex-1 overflow-y-auto">
            <div
              className={cn(
                "mx-auto w-full max-w-[1200px] px-4 py-5 sm:px-5 sm:py-6 lg:px-8 lg:py-8",
                "pb-24 lg:pb-8" // bottom padding for mobile tab bar
              )}
            >
              <AnimatePresence mode="wait" initial={false}>
                <PageTransition key={pathname}>
                  {children}
                </PageTransition>
              </AnimatePresence>
            </div>
          </main>
        </div>
      </div>
    </ToastProvider>
  );
}
