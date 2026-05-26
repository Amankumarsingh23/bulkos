"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  LayoutDashboard,
  PlusCircle,
  BarChart3,
  Brain,
  Target,
  Settings,
  LogOut,
  X,
} from "lucide-react";
import { createBrowserClient } from "@/lib/supabase";
import { cn } from "@/lib/utils";
import type { User } from "@supabase/supabase-js";

const NAV_ITEMS = [
  { label: "Dashboard",   href: "/dashboard",  icon: LayoutDashboard },
  { label: "Log Entry",   href: "/log",        icon: PlusCircle      },
  { label: "Analytics",   href: "/analytics",  icon: BarChart3       },
  { label: "AI Insights", href: "/insights",   icon: Brain           },
  { label: "Goals",       href: "/goals",      icon: Target          },
  { label: "Settings",    href: "/settings",   icon: Settings        },
] as const;

interface SidebarProps {
  user: User;
  isOpen: boolean;
  onClose: () => void;
}

export function Sidebar({ user, isOpen, onClose }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createBrowserClient();

  const displayName =
    (user.user_metadata?.full_name as string | undefined) ?? user.email ?? "User";
  const initials = displayName
    .split(" ")
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push("/login");
  }

  const sidebarContent = (
    <div className="flex h-full flex-col">
      {/* Logo */}
      <div className="flex items-center justify-between px-6 pt-7 pb-8">
        <Link href="/" onClick={onClose} className="flex items-center gap-2.5 group">
          <span className="h-7 w-7 rounded-md bg-gold flex items-center justify-center shadow-warm">
            <span className="font-display text-xs font-bold text-espresso">B</span>
          </span>
          <span className="font-display text-xl font-semibold text-espresso group-hover:text-gold transition-colors duration-200">
            Bulk<span className="text-gold">OS</span>
          </span>
        </Link>

        {/* Close button — mobile only */}
        <button
          onClick={onClose}
          className="lg:hidden rounded-md p-1 text-warm-gray hover:text-charcoal hover:bg-sand/50 transition-colors"
          aria-label="Close menu"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 space-y-0.5 overflow-y-auto">
        {NAV_ITEMS.map(({ label, href, icon: Icon }) => {
          const active = pathname === href;
          return (
            <Link
              key={href}
              href={href}
              onClick={onClose}
              className={cn(
                "relative flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-all duration-150",
                active
                  ? "bg-gold/10 text-espresso font-medium"
                  : "text-warm-gray hover:bg-ivory hover:text-charcoal font-normal"
              )}
            >
              {/* Active gold left border */}
              {active && (
                <motion.span
                  layoutId="active-pill"
                  className="absolute left-0 top-1.5 bottom-1.5 w-0.5 rounded-full bg-gold"
                  transition={{ type: "spring", stiffness: 400, damping: 30 }}
                />
              )}
              <Icon
                className={cn(
                  "h-4 w-4 flex-shrink-0 transition-colors duration-150",
                  active ? "text-gold" : "text-warm-gray"
                )}
                strokeWidth={active ? 2 : 1.75}
              />
              {label}
            </Link>
          );
        })}
      </nav>

      {/* User + Logout */}
      <div className="mt-auto px-3 pb-5 pt-4 border-t border-sand/60">
        <div className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-ivory transition-colors duration-150 group">
          {/* Avatar */}
          <div className="h-8 w-8 rounded-full bg-gold/20 border border-gold/30 flex items-center justify-center flex-shrink-0">
            <span className="font-display text-xs font-semibold text-gold-dark">{initials}</span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium text-charcoal truncate">{displayName}</p>
            <p className="text-[11px] text-warm-gray truncate">{user.email}</p>
          </div>
          <button
            onClick={handleLogout}
            title="Sign out"
            className="opacity-0 group-hover:opacity-100 transition-opacity duration-150 rounded p-1 text-warm-gray hover:text-rose"
          >
            <LogOut className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* ── Desktop sidebar (always visible) ──────────────────────────── */}
      <aside className="hidden lg:flex flex-col w-[280px] flex-shrink-0 h-screen sticky top-0 bg-ivory border-r border-sand/70 shadow-warm">
        {sidebarContent}
      </aside>

      {/* ── Mobile sidebar (slide-in overlay) ─────────────────────────── */}
      <AnimatePresence>
        {isOpen && (
          <>
            <motion.div
              key="backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-0 z-40 bg-espresso/30 backdrop-blur-sm lg:hidden"
              onClick={onClose}
            />
            <motion.aside
              key="drawer"
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
              className="fixed inset-y-0 left-0 z-50 w-[280px] bg-ivory border-r border-sand/70 shadow-warm-lg lg:hidden"
            >
              {sidebarContent}
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
