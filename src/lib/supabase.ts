import { createClient } from "@supabase/supabase-js";
import { createPagesBrowserClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";
import { createServerComponentClient } from "@supabase/auth-helpers-nextjs";
import type { Database } from "@/types/database";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// ── Browser client (Client Components) ───────────────────────────────────────
// Use this in "use client" components via the useSupabase hook or directly.
export function createBrowserClient() {
  return createPagesBrowserClient<Database>();
}

// Singleton for use outside React (e.g. lib helpers called from the browser)
export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey);

// ── Server client (Server Components / Route Handlers) ───────────────────────
// Must be called inside a Server Component or Route Handler where cookies() works.
export function createServerClient() {
  const cookieStore = cookies();
  return createServerComponentClient<Database>({ cookies: () => cookieStore });
}
