"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { NavBar } from "@/components/NavBar";
import { apiFetch } from "@/lib/api";

export default function SettingsPage() {
  const router = useRouter();
  const [user, setUser] = useState<{ name: string; email: string } | null>(null);

  useEffect(() => {
    apiFetch<{ user: { name: string; email: string } | null }>("/api/auth/me").then(
      ({ data }) => {
        if (!data.user) router.push("/login");
        else setUser(data.user);
      }
    );
  }, [router]);

  if (!user) return null;

  return (
    <div className="min-h-screen">
      <NavBar userName={user.name} />

      <main className="mx-auto max-w-2xl px-6 py-12">
        <h1 className="font-display text-2xl font-semibold text-ivory">Settings</h1>

        <div className="mt-8">
          <h2 className="readout-label mb-3">Account</h2>
          <div className="panel divide-y divide-border">
            <Row label="Name" value={user.name} />
            <Row label="Email" value={user.email} />
          </div>
        </div>

        <div className="mt-8">
          <h2 className="readout-label mb-3">About this analysis pipeline</h2>
          <div className="panel space-y-3 p-5 text-sm text-muted">
            <p>
              SiteMind AI is a portfolio project demonstrating a full crawl → analyze →
              embed → chat pipeline. Each scan runs five agents — research, UX, security,
              competitor, and revenue — plus a clone-cost estimator.
            </p>
            <p>
              Screenshots are captured via a third-party screenshot service, and chat
              answers are grounded in retrieval over the site&apos;s own crawled content
              (RAG), with sources shown for every answer.
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between p-4">
      <span className="text-sm text-muted">{label}</span>
      <span className="text-sm text-ivory">{value}</span>
    </div>
  );
}
