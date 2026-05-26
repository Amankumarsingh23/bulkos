import { createClient } from "@supabase/supabase-js";
import {
  createBrowserClient as _createBrowserClient,
  createServerClient as _createServerClient,
} from "@supabase/ssr";
import type { Database } from "@/types/database";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// ── Browser client (Client Components) ───────────────────────────────────────
export function createBrowserClient() {
  return _createBrowserClient<Database>(url, anonKey);
}

// ── Admin client (service role — server only) ─────────────────────────────────
// Lazy to avoid module-evaluation errors during `next build` when env vars aren't set.
export function createAdminClient() {
  return createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}

// ── Helper: build server client from a resolved cookie store ─────────────────
// Pass the Awaited<ReturnType<typeof cookies()>> from Next.js here.
export function buildServerClient(cookieStore: {
  getAll(): { name: string; value: string }[];
  set(name: string, value: string, options?: Record<string, unknown>): void;
}) {
  return _createServerClient<Database>(url, anonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options as Record<string, unknown>)
          );
        } catch {
          // In Server Components, cookies are read-only — ignore set errors.
        }
      },
    },
  });
}
