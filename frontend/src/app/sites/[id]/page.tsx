"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { NavBar } from "@/components/NavBar";
import { ScoreReadout } from "@/components/ScoreReadout";
import { TrustBadge } from "@/components/TrustBadge";
import { TechStackList } from "@/components/TechStackList";
import { CompetitorTable } from "@/components/CompetitorTable";
import { ChatPanel } from "@/components/ChatPanel";
import { apiFetch } from "@/lib/api";

interface CrawledPage {
  url: string;
  title: string;
  headings: string[];
  textContent: string;
  links: string[];
  isHomepage: boolean;
}

interface ContactInfo {
  emails: string[];
  phones: string[];
  socialLinks: string[];
  address?: string;
}

interface Screenshot {
  label: string;
  dataUrl: string;
  viewport: "desktop" | "mobile";
}

interface VisionAnalysis {
  uiScore: number;
  uxScore: number;
  accessibilityScore: number;
  conversionScore: number;
  colorPalette: string[];
  typographyNotes: string;
  layoutNotes: string;
  ctaNotes: string;
  navigationNotes: string;
  mobileResponsivenessNotes: string;
  recommendations: string[];
}

interface TechDetection {
  name: string;
  category: string;
  confidence: number;
  evidence: string;
}

interface TrustAnalysis {
  trustScore: number;
  classification: "Safe" | "Medium Risk" | "High Risk";
  httpsEnabled: boolean;
  securityHeaders: { name: string; present: boolean }[];
  domainAgeYears: number | null;
  registrar: string | null;
  reasoning: string;
}

interface Competitor {
  name: string;
  url: string;
  positioning: string;
  priceComparison: string;
  keyDifference: string;
}

interface BusinessModel {
  modelType: string;
  reasoning: string;
  monetizationSignals: string[];
}

interface CostEstimate {
  frontendHours: number;
  backendHours: number;
  aiHours: number;
  infraHours: number;
  totalHours: number;
  suggestedTeamSize: number;
  estimatedCostUsd: { low: number; high: number };
  estimatedTimelineWeeks: number;
  reasoning: string;
}

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  sources?: string[];
}

interface SiteDetail {
  _id: string;
  url: string;
  domain: string;
  status: "pending" | "crawling" | "analyzing" | "ready" | "failed";
  errorMessage?: string;
  pages: CrawledPage[];
  contactInfo: ContactInfo;
  faqs: { question: string; answer: string }[];
  screenshots: Screenshot[];
  visionAnalysis: VisionAnalysis | null;
  techStack: TechDetection[];
  trustAnalysis: TrustAnalysis | null;
  competitors: Competitor[];
  businessModel: BusinessModel | null;
  costEstimate: CostEstimate | null;
  chatHistory: ChatMessage[];
}

type TabId = "overview" | "design" | "trust" | "market" | "cost" | "chat";

const TABS: { id: TabId; label: string }[] = [
  { id: "overview", label: "Overview" },
  { id: "design", label: "Design & UX" },
  { id: "trust", label: "Trust & Tech" },
  { id: "market", label: "Market" },
  { id: "cost", label: "Clone Cost" },
  { id: "chat", label: "Chat" },
];

export default function SiteAnalysisPage() {
  const params = useParams();
  const router = useRouter();
  const siteId = params.id as string;

  const [site, setSite] = useState<SiteDetail | null>(null);
  const [user, setUser] = useState<{ name: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<TabId>("overview");

  const loadSite = useCallback(async () => {
    const { ok, data } = await apiFetch<{ site: SiteDetail; error?: string }>(
      `/api/sites/${siteId}`
    );
    if (!ok) {
      setError(data.error || "Couldn't load this analysis.");
      setLoading(false);
      return;
    }
    setSite(data.site);
    setLoading(false);
    return data.site;
  }, [siteId]);

  useEffect(() => {
    apiFetch<{ user: { name: string } | null }>("/api/auth/me").then(({ data }) => {
      if (!data.user) router.push("/login");
      else setUser(data.user);
    });
    loadSite();
  }, [router, loadSite]);

  // Poll while analysis is still in progress (covers the case where the
  // user navigates here directly via a saved link mid-analysis).
  useEffect(() => {
    if (!site || site.status === "ready" || site.status === "failed") return;
    const interval = setInterval(loadSite, 4000);
    return () => clearInterval(interval);
  }, [site, loadSite]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="readout-label">Loading analysis…</p>
      </div>
    );
  }

  if (error || !site) {
    return (
      <div className="flex min-h-screen items-center justify-center px-6">
        <div className="panel max-w-sm p-6 text-center">
          <p className="text-sm text-alert">{error || "Analysis not found."}</p>
        </div>
      </div>
    );
  }

  if (site.status !== "ready") {
    return (
      <div className="min-h-screen">
        <NavBar userName={user?.name} />
        <div className="flex flex-col items-center justify-center px-6 py-32 text-center">
          <div className="relative mb-6 h-16 w-16 overflow-hidden rounded-xl border border-border bg-surface">
            <div className="absolute inset-x-0 h-8 bg-scan-gradient animate-scan" />
          </div>
          <p className="font-mono text-sm text-signal">{site.status}…</p>
          <p className="mt-2 max-w-sm text-sm text-muted">
            {site.status === "failed"
              ? site.errorMessage
              : "Crawling, scoring, and indexing this site. This page updates automatically."}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <NavBar userName={user?.name} />

      <main className="mx-auto max-w-5xl px-6 py-10">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="font-mono text-lg text-ivory">{site.domain}</p>
            <a
              href={site.url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-muted hover:text-signal"
            >
              {site.url} ↗
            </a>
          </div>
          {site.trustAnalysis && (
            <TrustBadge
              classification={site.trustAnalysis.classification}
              score={site.trustAnalysis.trustScore}
            />
          )}
        </div>

        {/* Tabs */}
        <div className="mb-8 flex gap-1 overflow-x-auto border-b border-border">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`shrink-0 border-b-2 px-4 py-2.5 text-sm font-medium transition-colors ${
                activeTab === tab.id
                  ? "border-signal text-ivory"
                  : "border-transparent text-muted hover:text-ivory"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {activeTab === "overview" && <OverviewTab site={site} />}
        {activeTab === "design" && <DesignTab site={site} />}
        {activeTab === "trust" && <TrustTab site={site} />}
        {activeTab === "market" && <MarketTab site={site} />}
        {activeTab === "cost" && <CostTab site={site} />}
        {activeTab === "chat" && (
          <ChatPanel siteId={siteId} initialHistory={site.chatHistory || []} />
        )}
      </main>
    </div>
  );
}

function SectionHeader({ label, title }: { label: string; title: string }) {
  return (
    <div className="mb-4">
      <span className="readout text-xs">{label}</span>
      <h2 className="mt-1 font-display text-lg font-semibold text-ivory">{title}</h2>
    </div>
  );
}

function OverviewTab({ site }: { site: SiteDetail }) {
  return (
    <div className="space-y-8">
      <div>
        <SectionHeader label="01" title="What this site does" />
        <div className="panel p-5">
          <p className="text-sm leading-relaxed text-ivory">
            {site.pages?.find((p: CrawledPage) => p.isHomepage)?.title || "Untitled page"}
          </p>
          <p className="mt-3 text-sm leading-relaxed text-muted">
            {site.businessModel?.reasoning || "Business reasoning not yet available."}
          </p>
        </div>
      </div>

      {site.contactInfo && (
        <div>
          <SectionHeader label="02" title="Contact information found" />
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <InfoBlock label="Emails" items={site.contactInfo.emails} />
            <InfoBlock label="Phones" items={site.contactInfo.phones} />
            <InfoBlock label="Social links" items={site.contactInfo.socialLinks} />
          </div>
        </div>
      )}

      {site.faqs && site.faqs.length > 0 && (
        <div>
          <SectionHeader label="03" title="FAQs detected" />
          <div className="panel divide-y divide-border">
            {site.faqs.map((faq: { question: string; answer: string }, i: number) => (
              <div key={i} className="p-4">
                <p className="text-sm font-medium text-ivory">{faq.question}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      <div>
        <SectionHeader label="04" title={`Pages crawled (${site.pages?.length || 0})`} />
        <div className="panel divide-y divide-border">
          {site.pages?.map((page: CrawledPage) => (
            <a
              key={page.url}
              href={page.url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-between p-3 hover:bg-surface-raised"
            >
              <span className="truncate text-sm text-ivory">{page.title}</span>
              <span className="shrink-0 pl-3 font-mono text-xs text-muted">
                {page.isHomepage ? "home" : "↗"}
              </span>
            </a>
          ))}
        </div>
      </div>
    </div>
  );
}

function InfoBlock({ label, items }: { label: string; items: string[] }) {
  return (
    <div className="panel-raised p-4">
      <p className="readout-label mb-2">{label}</p>
      {items && items.length > 0 ? (
        <ul className="space-y-1">
          {items.map((item) => (
            <li key={item} className="truncate font-mono text-xs text-ivory">
              {item}
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-xs text-muted">None found</p>
      )}
    </div>
  );
}

function DesignTab({ site }: { site: SiteDetail }) {
  const v = site.visionAnalysis;
  if (!v || v.uiScore === 0) {
    return (
      <div className="panel p-8 text-center">
        <p className="text-sm text-muted">
          Visual analysis isn&apos;t available — screenshots couldn&apos;t be captured for this site.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <SectionHeader label="05" title="Design scores" />
        <div className="panel grid grid-cols-2 gap-6 p-6 sm:grid-cols-4">
          <ScoreReadout label="UI" value={v.uiScore} />
          <ScoreReadout label="UX" value={v.uxScore} />
          <ScoreReadout label="Accessibility" value={v.accessibilityScore} />
          <ScoreReadout label="Conversion" value={v.conversionScore} />
        </div>
      </div>

      {site.screenshots && site.screenshots.length > 0 && (
        <div>
          <SectionHeader label="06" title="Screenshots" />
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {site.screenshots.map((s: Screenshot) => (
              <div key={s.label} className="panel overflow-hidden">
                {/* eslint-disable-next-line @next/next/no-img-element -- base64 data URL, not a static asset next/image can optimize */}
                <img src={s.dataUrl} alt={s.label} className="w-full" />
                <p className="readout-label p-3">{s.viewport}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {v.colorPalette?.length > 0 && (
        <div>
          <SectionHeader label="07" title="Color palette observed" />
          <div className="flex gap-3">
            {v.colorPalette.map((hex: string) => (
              <div key={hex} className="text-center">
                <div
                  className="h-12 w-12 rounded-lg border border-border"
                  style={{ backgroundColor: hex }}
                />
                <p className="mt-1 font-mono text-[10px] text-muted">{hex}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <NoteCard title="Typography" body={v.typographyNotes} />
        <NoteCard title="Layout" body={v.layoutNotes} />
        <NoteCard title="Call-to-action" body={v.ctaNotes} />
        <NoteCard title="Navigation" body={v.navigationNotes} />
        <NoteCard title="Mobile responsiveness" body={v.mobileResponsivenessNotes} />
      </div>

      {v.recommendations?.length > 0 && (
        <div>
          <SectionHeader label="08" title="Recommendations" />
          <ul className="panel divide-y divide-border">
            {v.recommendations.map((rec: string, i: number) => (
              <li key={i} className="p-4 text-sm text-ivory">
                {rec}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function NoteCard({ title, body }: { title: string; body: string }) {
  return (
    <div className="panel-raised p-4">
      <p className="readout-label mb-2">{title}</p>
      <p className="text-sm leading-relaxed text-ivory">{body}</p>
    </div>
  );
}

function TrustTab({ site }: { site: SiteDetail }) {
  const t = site.trustAnalysis;
  return (
    <div className="space-y-8">
      {t && (
        <div>
          <SectionHeader label="09" title="Trust & safety" />
          <div className="panel p-5">
            <div className="mb-4 flex items-center justify-between">
              <TrustBadge classification={t.classification} score={t.trustScore} />
              <span className="readout-label">
                {t.httpsEnabled ? "HTTPS enabled" : "HTTPS not detected"}
              </span>
            </div>
            <p className="text-sm leading-relaxed text-ivory">{t.reasoning}</p>
            <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3">
              {t.securityHeaders.map((h: { name: string; present: boolean }) => (
                <div
                  key={h.name}
                  className={`rounded-lg border px-3 py-2 font-mono text-[11px] ${
                    h.present
                      ? "border-signal/30 bg-signal/10 text-signal"
                      : "border-border bg-surface-raised text-muted"
                  }`}
                >
                  {h.present ? "✓" : "✗"} {h.name}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      <div>
        <SectionHeader label="10" title="Technology stack" />
        <TechStackList items={site.techStack || []} />
      </div>
    </div>
  );
}

function MarketTab({ site }: { site: SiteDetail }) {
  return (
    <div className="space-y-8">
      {site.businessModel && (
        <div>
          <SectionHeader label="11" title="Business model" />
          <div className="panel p-5">
            <p className="readout text-sm">{site.businessModel.modelType}</p>
            <p className="mt-3 text-sm leading-relaxed text-ivory">
              {site.businessModel.reasoning}
            </p>
            {site.businessModel.monetizationSignals?.length > 0 && (
              <ul className="mt-4 space-y-1.5">
                {site.businessModel.monetizationSignals.map((s: string, i: number) => (
                  <li key={i} className="flex gap-2 text-sm text-muted">
                    <span className="text-signal">•</span> {s}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}

      <div>
        <SectionHeader label="12" title="Competitors" />
        <CompetitorTable competitors={site.competitors || []} />
      </div>
    </div>
  );
}

function CostTab({ site }: { site: SiteDetail }) {
  const c = site.costEstimate;
  if (!c) {
    return (
      <div className="panel p-8 text-center">
        <p className="text-sm text-muted">Cost estimate not available.</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <SectionHeader label="13" title="Clone cost estimate" />
        <div className="panel p-6">
          <div className="flex flex-wrap items-baseline gap-2">
            <span className="readout text-3xl">
              ${c.estimatedCostUsd.low.toLocaleString()}–${c.estimatedCostUsd.high.toLocaleString()}
            </span>
            <span className="readout-label">
              · {c.estimatedTimelineWeeks} weeks · team of {c.suggestedTeamSize}
            </span>
          </div>
          <p className="mt-4 text-sm leading-relaxed text-ivory">{c.reasoning}</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <HourBlock label="Frontend" hours={c.frontendHours} />
        <HourBlock label="Backend" hours={c.backendHours} />
        <HourBlock label="AI" hours={c.aiHours} />
        <HourBlock label="Infra" hours={c.infraHours} />
      </div>
    </div>
  );
}

function HourBlock({ label, hours }: { label: string; hours: number }) {
  return (
    <div className="panel-raised p-4 text-center">
      <p className="readout text-lg">{hours}h</p>
      <p className="readout-label mt-1">{label}</p>
    </div>
  );
}
