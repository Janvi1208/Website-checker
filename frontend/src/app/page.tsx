import Link from "next/link";
import { HeroScanInput } from "@/components/HeroScanInput";

const FEATURES = [
  {
    label: "UX",
    title: "Design quality scoring",
    desc: "Vision AI reads real screenshots and scores UI, UX, accessibility, and conversion potential.",
  },
  {
    label: "SEC",
    title: "Trust & safety analysis",
    desc: "HTTPS, security headers, and policy presence, checked directly — not guessed.",
  },
  {
    label: "TCH",
    title: "Tech stack detection",
    desc: "Frameworks, CMS, hosting, analytics, and payment tools, identified with confidence scores.",
  },
  {
    label: "MKT",
    title: "Competitor discovery",
    desc: "Live web search surfaces real competitors with pricing and positioning comparisons.",
  },
  {
    label: "REV",
    title: "Business model analysis",
    desc: "SaaS, marketplace, ecommerce, or lead-gen — classified with grounded reasoning.",
  },
  {
    label: "EST",
    title: "Clone cost estimator",
    desc: "Hours, team size, budget, and timeline to rebuild what you're looking at.",
  },
];

export default function LandingPage() {
  return (
    <div className="min-h-screen">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-6 py-6">
        <div className="flex items-center gap-2">
          <ScanMark />
          <span className="font-display text-base font-semibold tracking-tight">
            SiteMind <span className="text-signal">AI</span>
          </span>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/login" className="text-sm text-muted hover:text-ivory">
            Sign in
          </Link>
          <Link href="/register" className="btn-secondary px-4 py-2 text-sm">
            Create account
          </Link>
        </div>
      </header>

      {/* Hero */}
      <section className="relative mx-auto flex max-w-4xl flex-col items-center px-6 pt-16 pb-24 text-center">
        <div className="readout-label mb-5 flex items-center gap-2 rounded-full border border-border px-3 py-1.5">
          <span className="h-1.5 w-1.5 rounded-full bg-signal" />
          Reads any public website in under a minute
        </div>
        <h1 className="font-display text-4xl font-semibold leading-[1.1] tracking-tight text-balance sm:text-5xl">
          Paste a URL.
          <br />
          <span className="text-signal">Read</span> the website.
        </h1>
        <p className="mt-5 max-w-lg text-balance text-base text-muted">
          SiteMind AI crawls a site, scores its design, checks its trust signals,
          finds its competitors, and lets you chat with everything it found —
          grounded in what&apos;s actually on the page.
        </p>
        <div className="mt-10 w-full">
          <HeroScanInput />
        </div>
      </section>

      {/* Feature grid — structured like a diagnostic readout panel */}
      <section className="mx-auto max-w-6xl px-6 pb-24">
        <div className="mb-8 flex items-baseline justify-between border-b border-border pb-4">
          <h2 className="font-display text-xl font-semibold">What gets analyzed</h2>
          <span className="readout-label">6 of 10 signal groups shown</span>
        </div>
        <div className="grid grid-cols-1 gap-px overflow-hidden rounded-xl border border-border bg-border sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((f) => (
            <div key={f.title} className="bg-ink p-6">
              <span className="readout text-xs">{f.label}</span>
              <h3 className="mt-3 font-display text-base font-semibold text-ivory">
                {f.title}
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-muted">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* How it works - real sequence, so numbering is earned here */}
      <section className="mx-auto max-w-4xl px-6 pb-28">
        <div className="mb-8 border-b border-border pb-4">
          <h2 className="font-display text-xl font-semibold">How a scan runs</h2>
        </div>
        <ol className="space-y-6">
          {[
            ["01", "Crawl", "Homepage and key pages are fetched and parsed — content, nav, pricing, FAQs, contact info."],
            ["02", "Capture", "Desktop and mobile screenshots are taken for visual analysis."],
            ["03", "Analyze", "Five agents run in parallel: research, UX, security, competitors, and business model."],
            ["04", "Index", "Page content is chunked and embedded for retrieval-grounded chat."],
            ["05", "Chat", "Ask anything. Every answer is grounded in the crawled content, with sources shown."],
          ].map(([num, title, desc]) => (
            <li key={num} className="flex gap-5">
              <span className="readout shrink-0 text-sm">{num}</span>
              <div>
                <h3 className="font-display text-sm font-semibold text-ivory">{title}</h3>
                <p className="mt-1 text-sm text-muted">{desc}</p>
              </div>
            </li>
          ))}
        </ol>
      </section>

      <footer className="border-t border-border px-6 py-8 text-center text-xs text-muted">
        SiteMind AI — built as a demonstration project.
      </footer>
    </div>
  );
}

function ScanMark() {
  return (
    <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
      <rect x="2" y="2" width="18" height="18" rx="4" stroke="#3DDC84" strokeWidth="1.5" />
      <line x1="2" y1="11" x2="20" y2="11" stroke="#3DDC84" strokeWidth="1.5" />
      <circle cx="11" cy="11" r="2.5" fill="#3DDC84" />
    </svg>
  );
}
