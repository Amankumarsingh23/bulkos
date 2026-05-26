"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Eye, EyeOff, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { useAuth } from "@/hooks/useAuth";

export default function LoginPage() {
  const router = useRouter();
  const { signIn, signInWithGoogle } = useAuth();

  const [form, setForm] = useState({ email: "", password: "" });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function set(field: keyof typeof form) {
    return (e: React.ChangeEvent<HTMLInputElement>) => {
      setForm((f) => ({ ...f, [field]: e.target.value }));
      setError(null);
    };
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.email || !form.password) return;
    setLoading(true);
    setError(null);
    const { error } = await signIn(form.email, form.password);
    if (error) {
      setError(error.message);
      setLoading(false);
    } else {
      router.push("/dashboard");
    }
  }

  async function handleGoogle() {
    setGoogleLoading(true);
    const { error } = await signInWithGoogle();
    if (error) {
      setError(error.message);
      setGoogleLoading(false);
    }
    // OAuth redirects away — no need to reset loading
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] }}
      className="w-full max-w-[420px]"
    >
      {/* Logo */}
      <div className="text-center mb-8">
        <div className="inline-flex items-center justify-center h-12 w-12 rounded-xl bg-gold shadow-warm mb-4">
          <span className="font-display text-lg font-bold text-espresso">B</span>
        </div>
        <h1 className="font-display text-3xl font-semibold text-espresso">
          Bulk<span className="text-gold">OS</span>
        </h1>
        <p className="mt-1.5 text-sm text-warm-gray">Track your transformation.</p>
      </div>

      {/* Card */}
      <div className="bg-ivory rounded-2xl border border-sand/60 shadow-warm-md px-7 py-8">
        <h2 className="font-display text-xl text-espresso mb-6">Welcome back</h2>

        {/* Error banner */}
        {error && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            className="mb-5 px-4 py-3 rounded-lg bg-rose/10 border border-rose/20 text-sm text-rose"
          >
            {error}
          </motion.div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Email"
            type="email"
            value={form.email}
            onChange={set("email")}
            autoComplete="email"
            required
          />
          <Input
            label="Password"
            type={showPassword ? "text" : "password"}
            value={form.password}
            onChange={set("password")}
            autoComplete="current-password"
            required
            icon={
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="text-warm-gray hover:text-charcoal transition-colors"
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            }
          />

          <div className="flex justify-end">
            <Link
              href="/forgot-password"
              className="text-xs text-warm-gray hover:text-gold transition-colors"
            >
              Forgot password?
            </Link>
          </div>

          <Button type="submit" variant="primary" size="md" loading={loading} className="w-full mt-1">
            Sign in
            <ArrowRight className="h-3.5 w-3.5" />
          </Button>
        </form>

        {/* Divider */}
        <div className="relative my-5">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-sand" />
          </div>
          <div className="relative flex justify-center">
            <span className="bg-ivory px-3 text-xs text-warm-gray">or continue with</span>
          </div>
        </div>

        {/* Google OAuth */}
        <button
          type="button"
          onClick={handleGoogle}
          disabled={googleLoading}
          className="w-full h-10 flex items-center justify-center gap-2.5 rounded-md border border-sand hover:border-gold/60 bg-cream hover:bg-ivory text-sm text-charcoal transition-all duration-200 disabled:opacity-50 disabled:pointer-events-none"
        >
          {googleLoading ? (
            <span className="h-4 w-4 rounded-full border-2 border-warm-gray border-t-transparent animate-spin" />
          ) : (
            <GoogleIcon />
          )}
          Continue with Google
        </button>
      </div>

      {/* Footer link */}
      <p className="mt-5 text-center text-sm text-warm-gray">
        Don&apos;t have an account?{" "}
        <Link href="/signup" className="text-gold hover:text-gold-dark font-medium transition-colors">
          Sign up
        </Link>
      </p>
    </motion.div>
  );
}

function GoogleIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 48 48" aria-hidden="true">
      <path fill="#FFC107" d="M43.611 20.083H42V20H24v8h11.303c-1.649 4.657-6.08 8-11.303 8-6.627 0-12-5.373-12-12s5.373-12 12-12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 12.955 4 4 12.955 4 24s8.955 20 20 20 20-8.955 20-20c0-1.341-.138-2.65-.389-3.917z"/>
      <path fill="#FF3D00" d="m6.306 14.691 6.571 4.819C14.655 15.108 19.026 12 24 12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 16.318 4 9.656 8.337 6.306 14.691z"/>
      <path fill="#4CAF50" d="M24 44c5.166 0 9.86-1.977 13.409-5.192l-6.19-5.238A11.91 11.91 0 0 1 24 36c-5.202 0-9.619-3.317-11.283-7.946l-6.522 5.025C9.505 39.556 16.227 44 24 44z"/>
      <path fill="#1976D2" d="M43.611 20.083H42V20H24v8h11.303a12.04 12.04 0 0 1-4.087 5.571l.003-.002 6.19 5.238C36.971 39.205 44 34 44 24c0-1.341-.138-2.65-.389-3.917z"/>
    </svg>
  );
}
