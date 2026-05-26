import { createMiddlewareClient } from "@supabase/auth-helpers-nextjs";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import type { Database } from "@/types/database";

// Routes that logged-in users should NOT visit (redirect → app)
const AUTH_ROUTES = new Set(["/login", "/signup"]);

// Routes that never require a session
const PUBLIC_ROUTES = new Set([
  "/login",
  "/signup",
  "/forgot-password",
  "/reset-password",
  "/terms",
  "/privacy",
]);

export async function middleware(req: NextRequest) {
  const res = NextResponse.next();
  const { pathname } = req.nextUrl;

  // Let Next.js internals and static files through
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/api") ||
    pathname.startsWith("/auth") ||      // Supabase OAuth callback
    pathname.includes(".")               // static assets
  ) {
    return res;
  }

  const supabase = createMiddlewareClient<Database>({ req, res });

  // Refresh session cookie if expiring — critical for SSR auth
  const {
    data: { session },
  } = await supabase.auth.getSession();

  const isPublic = PUBLIC_ROUTES.has(pathname);
  const isAuthRoute = AUTH_ROUTES.has(pathname);

  // Logged-in user hitting /login or /signup → send to app
  if (isAuthRoute && session) {
    return NextResponse.redirect(new URL("/", req.url));
  }

  // Unauthenticated user hitting a protected route → send to login
  if (!isPublic && !session) {
    const loginUrl = new URL("/login", req.url);
    loginUrl.searchParams.set("next", pathname);
    return NextResponse.redirect(loginUrl);
  }

  return res;
}

export const config = {
  matcher: [
    /*
     * Match all paths except Next.js internals.
     * Explicit exclusions keep the middleware fast.
     */
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
};
