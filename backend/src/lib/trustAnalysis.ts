import type { ITrustAnalysis } from "@/models/Site";

const SECURITY_HEADERS_TO_CHECK = [
  "strict-transport-security",
  "content-security-policy",
  "x-frame-options",
  "x-content-type-options",
  "referrer-policy",
  "permissions-policy",
];

export interface RawTrustSignals {
  httpsEnabled: boolean;
  securityHeaders: { name: string; present: boolean }[];
  serverHeader: string | null;
  hasPrivacyPolicyLink: boolean;
  hasTermsLink: boolean;
}

export async function gatherTrustSignals(
  url: string,
  homepageHtml: string
): Promise<RawTrustSignals> {
  let httpsEnabled = url.startsWith("https://");
  let headers: Headers | null = null;

  try {
    const res = await fetch(url, {
      headers: { "User-Agent": "Mozilla/5.0 (compatible; SiteMindAI/1.0)" },
    });
    headers = res.headers;
    httpsEnabled = res.url.startsWith("https://");
  } catch {
    headers = null;
  }

  const securityHeaders = SECURITY_HEADERS_TO_CHECK.map((name) => ({
    name,
    present: !!headers?.get(name),
  }));

  return {
    httpsEnabled,
    securityHeaders,
    serverHeader: headers?.get("server") || null,
    hasPrivacyPolicyLink: /privacy[\s-]?policy/i.test(homepageHtml),
    hasTermsLink: /terms[\s-]?(of)?[\s-]?(service|use)/i.test(homepageHtml),
  };
}

/**
 * Combines deterministic signals into a baseline score (0-10), before any
 * LLM reasoning is layered on top. This keeps the score grounded in real
 * checks rather than purely model judgment.
 */
export function computeBaselineTrustScore(signals: RawTrustSignals): number {
  let score = 5; // neutral baseline

  score += signals.httpsEnabled ? 1.5 : -2;

  const presentHeaders = signals.securityHeaders.filter((h) => h.present).length;
  score += Math.min(presentHeaders * 0.4, 2);

  if (signals.hasPrivacyPolicyLink) score += 0.75;
  if (signals.hasTermsLink) score += 0.5;

  return Math.max(1, Math.min(10, Math.round(score * 10) / 10));
}

export function classifyTrust(score: number): ITrustAnalysis["classification"] {
  if (score >= 7) return "Safe";
  if (score >= 4) return "Medium Risk";
  return "High Risk";
}
