"use client";

import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { apiFetch } from "@/lib/api";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const pendingUrl = searchParams.get("url");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const { ok, data } = await apiFetch<{ error?: string }>("/api/auth/login", {
        method: "POST",
        json: { email, password },
      });
      if (!ok) {
        setError(data.error || "Something went wrong.");
        setLoading(false);
        return;
      }
      const destination = pendingUrl
        ? `/dashboard?url=${encodeURIComponent(pendingUrl)}`
        : "/dashboard";
      router.push(destination);
      router.refresh();
    } catch {
      setError("Couldn't reach the server. Try again.");
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-6">
      <div className="w-full max-w-sm">
        <Link href="/" className="mb-8 flex items-center justify-center gap-2">
          <ScanMark />
          <span className="font-display text-base font-semibold">
            SiteMind <span className="text-signal">AI</span>
          </span>
        </Link>

        <div className="panel p-6">
          <h1 className="font-display text-lg font-semibold text-ivory">Welcome back</h1>

          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            <div>
              <label className="readout-label mb-1.5 block">Email</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="input-field"
                placeholder="jane@company.com"
              />
            </div>
            <div>
              <label className="readout-label mb-1.5 block">Password</label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="input-field"
                placeholder="••••••••"
              />
            </div>

            {error && (
              <p className="rounded-lg border border-alert/30 bg-alert/10 px-3 py-2 text-sm text-alert">
                {error}
              </p>
            )}

            <button type="submit" disabled={loading} className="btn-primary w-full">
              {loading ? "Signing in…" : "Sign in"}
            </button>
          </form>
        </div>

        <p className="mt-5 text-center text-sm text-muted">
          Don&apos;t have an account?{" "}
          <Link href="/register" className="text-signal hover:underline">
            Create one
          </Link>
        </p>
      </div>
    </div>
  );
}

function ScanMark() {
  return (
    <svg width="20" height="20" viewBox="0 0 22 22" fill="none">
      <rect x="2" y="2" width="18" height="18" rx="4" stroke="#3DDC84" strokeWidth="1.5" />
      <line x1="2" y1="11" x2="20" y2="11" stroke="#3DDC84" strokeWidth="1.5" />
      <circle cx="11" cy="11" r="2.5" fill="#3DDC84" />
    </svg>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
  );
}
