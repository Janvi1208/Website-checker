import { callClaudeForJson } from "../claude";
import {
  gatherTrustSignals,
  computeBaselineTrustScore,
  classifyTrust,
  type RawTrustSignals,
} from "../trustAnalysis";
import type { ITrustAnalysis, IContactInfo } from "@/models/Site";

const SYSTEM_PROMPT = `You are the Security Agent inside SiteMind AI.
You are given REAL, deterministically-measured trust signals (not guesses) about a website, plus its contact info.
Your job is to write the reasoning paragraph and gently adjust the score by at most +/-1 point if the contact info
or content gives a clear additional signal (e.g. no contact info at all is a red flag; a real street address is reassuring).
Never contradict the measured signals you're given — incorporate them faithfully.
Respond with ONLY valid JSON, no preamble, no markdown fences.`;

interface SecurityAgentResponse {
  adjustedScore: number;
  reasoning: string;
}

export async function runSecurityAgent(
  url: string,
  homepageHtml: string,
  contactInfo: IContactInfo
): Promise<ITrustAnalysis> {
  const signals: RawTrustSignals = await gatherTrustSignals(url, homepageHtml);
  const baselineScore = computeBaselineTrustScore(signals);

  const prompt = `Measured signals for ${url}:
- HTTPS enabled: ${signals.httpsEnabled}
- Security headers present: ${signals.securityHeaders
    .filter((h) => h.present)
    .map((h) => h.name)
    .join(", ") || "none detected"}
- Security headers missing: ${signals.securityHeaders
    .filter((h) => !h.present)
    .map((h) => h.name)
    .join(", ") || "none"}
- Has privacy policy link: ${signals.hasPrivacyPolicyLink}
- Has terms of service link: ${signals.hasTermsLink}
- Server header: ${signals.serverHeader || "not disclosed"}
- Contact emails found: ${contactInfo.emails.length}
- Contact phones found: ${contactInfo.phones.length}
- Social links found: ${contactInfo.socialLinks.length}
- Baseline computed score (1-10): ${baselineScore}

Return JSON matching this exact shape:
{
  "adjustedScore": <number 1-10, baseline +/- at most 1, one decimal allowed>,
  "reasoning": "<3-5 sentences explaining the score, referencing the actual signals above>"
}`;

  const aiResult = await callClaudeForJson<SecurityAgentResponse>({
    system: SYSTEM_PROMPT,
    prompt,
    maxTokens: 600,
  });

  const finalScore = Math.max(
    1,
    Math.min(10, aiResult.adjustedScore ?? baselineScore)
  );

  return {
    trustScore: finalScore,
    classification: classifyTrust(finalScore),
    httpsEnabled: signals.httpsEnabled,
    securityHeaders: signals.securityHeaders,
    domainAgeYears: null, // requires a paid WHOIS API — see README for wiring instructions
    registrar: null,
    reasoning: aiResult.reasoning,
  };
}
