"use client";

import { useState, useEffect, Suspense, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { NavBar } from "@/components/NavBar";
import { TrustBadge } from "@/components/TrustBadge";
import { apiFetch } from "@/lib/api";

interface SiteSummary {
  _id: string;
  url: string;
  domain: string;
  status: "pending" | "crawling" | "analyzing" | "ready" | "failed";
  createdAt: string;
  trustAnalysis?: { trustScore: number };
  visionAnalysis?: { uiScore: number };
  businessModel?: { modelType: string };
}

function DashboardContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const autoUrl = searchParams.get("url");

  const [sites, setSites] = useState<SiteSummary[]>([]);
  const [loadingSites, setLoadingSites] = useState(true);
  const [url, setUrl] = useState("");
  const [analyzing, setAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [user, setUser] = useState<{ name: string } | null>(null);
  const [autoStarted, setAutoStarted] = useState(false);

  const loadSites = useCallback(async () => {
    const { ok, data } = await apiFetch<{ sites: SiteSummary[] }>("/api/sites");
    if (ok) {
      setSites(data.sites || []);
    }
    setLoadingSites(false);
  }, []);

  useEffect(() => {
    apiFetch<{ user: { name: string } | null }>("/api/auth/me").then(({ data }) => {
      if (!data.user) {
        router.push("/login");
      } else {
        setUser(data.user);
      }
    });
    loadSites();
  }, [router, loadSites]);

  const startAnalysis = useCallback(
    async (targetUrl: string) => {
      setError(null);
      setAnalyzing(true);
      try {
        const { ok, data } = await apiFetch<{ siteId: string; error?: string }>(
          "/api/sites/analyze",
          { method: "POST", json: { url: targetUrl } }
        );
        if (!ok) {
          setError(data.error || "Analysis failed.");
          setAnalyzing(false);
          return;
        }
        router.push(`/sites/${data.siteId}`);
      } catch {
        setError("Couldn't reach the server. Try again.");
        setAnalyzing(false);
      }
    },
    [router]
  );

  // Auto-start a scan if the user arrived from the landing-page hero input.
  useEffect(() => {
    if (autoUrl && user && !autoStarted) {
      setAutoStarted(true);
      setUrl(autoUrl);
      startAnalysis(autoUrl);
    }
  }, [autoUrl, user, autoStarted, startAnalysis]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!url.trim() || analyzing) return;
    startAnalysis(url.trim());
  }

  return (
    <div className="min-h-screen">
      <NavBar userName={user?.name} />

      <main className="mx-auto max-w-5xl px-6 py-12">
        <div className="mb-10">
          <h1 className="font-display text-2xl font-semibold text-ivory">
            Analyze a new website
          </h1>
          <p className="mt-1 text-sm text-muted">
            Paste a URL. We&apos;ll crawl it, score it, and let you chat with what we find.
          </p>

          <form onSubmit={handleSubmit} className="mt-5 flex gap-3">
            <input
              type="text"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://example.com"
              disabled={analyzing}
              className="input-field flex-1 font-mono"
            />
            <button type="submit" disabled={analyzing || !url.trim()} className="btn-primary shrink-0">
              {analyzing ? (
                <>
                  <span className="h-1.5 w-1.5 animate-pulse_dot rounded-full bg-ink" />
                  Scanning…
                </>
              ) : (
                "Scan site"
              )}
            </button>
          </form>
          {analyzing && (
            <p className="mt-2 font-mono text-xs text-muted">
              This usually takes 30-90 seconds — crawling, screenshots, and five analysis agents are running.
            </p>
          )}
          {error && (
            <p className="mt-3 rounded-lg border border-alert/30 bg-alert/10 px-3 py-2 text-sm text-alert">
              {error}
            </p>
          )}
        </div>

        <div className="border-t border-border pt-8">
          <div className="mb-4 flex items-baseline justify-between">
            <h2 className="font-display text-base font-semibold text-ivory">
              Past analyses
            </h2>
            <span className="readout-label">{sites.length} total</span>
          </div>

          {loadingSites ? (
            <p className="text-sm text-muted">Loading…</p>
          ) : sites.length === 0 ? (
            <div className="panel p-8 text-center">
              <p className="text-sm text-muted">
                No scans yet. Paste a URL above to run your first analysis.
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {sites.map((site) => (
                <Link
                  key={site._id}
                  href={`/sites/${site._id}`}
                  className="panel flex items-center justify-between p-4 transition-colors hover:bg-surface-raised"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-mono text-sm text-ivory">{site.domain}</p>
                    <p className="mt-0.5 text-xs text-muted">
                      {new Date(site.createdAt).toLocaleDateString(undefined, {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </p>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    {site.businessModel?.modelType && (
                      <span className="readout-label hidden sm:inline">
                        {site.businessModel.modelType}
                      </span>
                    )}
                    {site.status === "ready" && site.trustAnalysis ? (
                      <TrustBadge
                        classification={
                          site.trustAnalysis.trustScore >= 7
                            ? "Safe"
                            : site.trustAnalysis.trustScore >= 4
                            ? "Medium Risk"
                            : "High Risk"
                        }
                        score={site.trustAnalysis.trustScore}
                      />
                    ) : (
                      <StatusPill status={site.status} />
                    )}
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

function StatusPill({ status }: { status: SiteSummary["status"] }) {
  if (status === "failed") {
    return (
      <span className="rounded-full border border-alert/30 bg-alert/10 px-3 py-1 font-mono text-xs text-alert">
        Failed
      </span>
    );
  }
  return (
    <span className="rounded-full border border-border bg-surface-raised px-3 py-1 font-mono text-xs text-muted">
      {status}…
    </span>
  );
}

export default function DashboardPage() {
  return (
    <Suspense fallback={null}>
      <DashboardContent />
    </Suspense>
  );
}
