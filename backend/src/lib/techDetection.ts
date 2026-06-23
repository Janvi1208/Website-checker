import type { ITechDetection } from "@/models/Site";

interface Signature {
  name: string;
  category: string;
  test: (html: string, headers: Headers | null) => boolean;
  evidence: string;
  confidence: number;
}

const SIGNATURES: Signature[] = [
  {
    name: "Next.js",
    category: "framework",
    test: (html) => /__NEXT_DATA__|_next\/static/i.test(html),
    evidence: "Found __NEXT_DATA__ or _next/static asset paths",
    confidence: 95,
  },
  {
    name: "React",
    category: "framework",
    test: (html) => /data-reactroot|react-dom|__REACT_DEVTOOLS/i.test(html),
    evidence: "Found React-specific markers in page source",
    confidence: 80,
  },
  {
    name: "Vue.js",
    category: "framework",
    test: (html) => /data-v-app|__VUE__|vue\.js|vue\.runtime/i.test(html),
    evidence: "Found Vue runtime markers",
    confidence: 85,
  },
  {
    name: "Angular",
    category: "framework",
    test: (html) => /ng-version|ng-app|angular\.js/i.test(html),
    evidence: "Found Angular framework markers",
    confidence: 85,
  },
  {
    name: "WordPress",
    category: "cms",
    test: (html) => /wp-content|wp-includes|wp-json/i.test(html),
    evidence: "Found wp-content/wp-includes paths",
    confidence: 95,
  },
  {
    name: "Shopify",
    category: "ecommerce",
    test: (html) => /cdn\.shopify\.com|Shopify\.theme/i.test(html),
    evidence: "Found Shopify CDN assets or theme object",
    confidence: 95,
  },
  {
    name: "Webflow",
    category: "cms",
    test: (html) => /webflow\.com|data-wf-page/i.test(html),
    evidence: "Found Webflow page data attributes",
    confidence: 90,
  },
  {
    name: "Squarespace",
    category: "cms",
    test: (html) => /squarespace\.com|static1\.squarespace/i.test(html),
    evidence: "Found Squarespace asset references",
    confidence: 90,
  },
  {
    name: "Laravel",
    category: "backend",
    test: (html, headers) =>
      /laravel_session/i.test(html) ||
      (headers?.get("set-cookie") || "").toLowerCase().includes("laravel"),
    evidence: "Found Laravel session cookie reference",
    confidence: 75,
  },
  {
    name: "Django",
    category: "backend",
    test: (html, headers) =>
      (headers?.get("set-cookie") || "").toLowerCase().includes("csrftoken") ||
      /csrfmiddlewaretoken/i.test(html),
    evidence: "Found Django CSRF token pattern",
    confidence: 70,
  },
  {
    name: "Firebase",
    category: "infrastructure",
    test: (html) => /firebaseapp\.com|firebase\.js|firebaseio\.com/i.test(html),
    evidence: "Found Firebase SDK or hosting references",
    confidence: 85,
  },
  {
    name: "Cloudflare",
    category: "infrastructure",
    test: (_html, headers) =>
      (headers?.get("server") || "").toLowerCase().includes("cloudflare") ||
      !!headers?.get("cf-ray"),
    evidence: "Found cf-ray header or Cloudflare server signature",
    confidence: 90,
  },
  {
    name: "Vercel",
    category: "infrastructure",
    test: (_html, headers) => !!headers?.get("x-vercel-id"),
    evidence: "Found x-vercel-id response header",
    confidence: 90,
  },
  {
    name: "Google Analytics",
    category: "analytics",
    test: (html) => /gtag\(|google-analytics\.com|googletagmanager\.com/i.test(html),
    evidence: "Found gtag.js or Google Tag Manager script",
    confidence: 90,
  },
  {
    name: "Meta Pixel",
    category: "analytics",
    test: (html) => /connect\.facebook\.net.*fbevents/i.test(html),
    evidence: "Found Facebook Pixel (fbevents.js) script",
    confidence: 85,
  },
  {
    name: "HubSpot",
    category: "marketing",
    test: (html) => /js\.hs-scripts\.com|hubspot\.com/i.test(html),
    evidence: "Found HubSpot tracking script",
    confidence: 85,
  },
  {
    name: "Intercom",
    category: "support",
    test: (html) => /widget\.intercom\.io/i.test(html),
    evidence: "Found Intercom widget script",
    confidence: 90,
  },
  {
    name: "Stripe",
    category: "payments",
    test: (html) => /js\.stripe\.com/i.test(html),
    evidence: "Found Stripe.js script tag",
    confidence: 85,
  },
  {
    name: "jQuery",
    category: "library",
    test: (html) => /jquery(\.min)?\.js/i.test(html),
    evidence: "Found jQuery script reference",
    confidence: 70,
  },
  {
    name: "Tailwind CSS",
    category: "library",
    test: (html) => /tailwind/i.test(html),
    evidence: "Found Tailwind-related class names or references",
    confidence: 55,
  },
];

export async function detectTechnologies(
  url: string,
  html: string
): Promise<ITechDetection[]> {
  let headers: Headers | null = null;
  try {
    const res = await fetch(url, {
      method: "GET",
      headers: { "User-Agent": "Mozilla/5.0 (compatible; SiteMindAI/1.0)" },
    });
    headers = res.headers;
  } catch {
    headers = null;
  }

  const results: ITechDetection[] = [];
  for (const sig of SIGNATURES) {
    if (sig.test(html, headers)) {
      results.push({
        name: sig.name,
        category: sig.category,
        confidence: sig.confidence,
        evidence: sig.evidence,
      });
    }
  }

  return results.sort((a, b) => b.confidence - a.confidence);
}
