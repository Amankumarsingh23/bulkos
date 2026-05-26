"use client";

import { useState } from "react";
import { Sidebar } from "./Sidebar";
import { Header } from "./Header";
import { cn } from "@/lib/utils";
import type { User } from "@supabase/supabase-js";

interface PageWrapperProps {
  user: User;
  children: React.ReactNode;
}

export function PageWrapper({ user, children }: PageWrapperProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="flex h-screen overflow-hidden bg-cream">
      <Sidebar
        user={user}
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      {/* Main column */}
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        <Header onMenuClick={() => setSidebarOpen(true)} />

        {/* Scrollable content area */}
        <main className="flex-1 overflow-y-auto">
          <div
            className={cn(
              "mx-auto w-full max-w-[1200px] px-5 py-6 lg:px-8 lg:py-8"
            )}
          >
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
