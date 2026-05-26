import type { NextConfig } from "next";

// Validate required environment variables at build time.
// This gives a clear error message instead of a cryptic runtime failure.
const REQUIRED_ENV = [
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
] as const;

// During `next build` the env vars must be present (unless explicitly skipped
// via SKIP_ENV_VALIDATION=1 for Docker / CI scenarios that inject them later).
if (process.env.SKIP_ENV_VALIDATION !== "1") {
  for (const key of REQUIRED_ENV) {
    if (!process.env[key]) {
      throw new Error(
        `Missing required environment variable: ${key}\n` +
        `Copy .env.local.example → .env.local and fill in your Supabase credentials.`
      );
    }
  }
}

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      // Supabase Storage (avatars / uploads)
      {
        protocol: "https",
        hostname: "*.supabase.co",
        pathname: "/storage/v1/object/public/**",
      },
    ],
  },
};

export default nextConfig;
