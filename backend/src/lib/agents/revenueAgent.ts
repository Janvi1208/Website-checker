import { callClaudeForJson } from "../claude";
import type { IBusinessModel, ICrawledPage } from "@/models/Site";
import type { ResearchSummary } from "./researchAgent";

const SYSTEM_PROMPT = `You are the Revenue Agent inside SiteMind AI.
You classify a company's business model based on grounded evidence from its website (pricing pages, language, signup flows).
Respond with ONLY valid JSON, no preamble, no markdown fences.`;

export async function runRevenueAgent(
  research: ResearchSummary,
  pricingText: string | null,
  pages: ICrawledPage[]
): Promise<IBusinessModel> {
  const pricingExcerpt = pricingText
    ? pricingText.slice(0, 1500)
    : "No dedicated pricing page was found during crawling.";

  const homepageExcerpt = pages
    .find((p) => p.isHomepage)
    ?.textContent.slice(0, 1000) || "";

  const prompt = `Company: ${research.companyName}
What it does: ${research.whatItDoes}

Pricing page content (if found):
${pricingExcerpt}

Homepage content excerpt:
${homepageExcerpt}

Classify the business model. Return JSON matching this exact shape:
{
  "modelType": "<one of: SaaS, Marketplace, Ecommerce, Subscription, Ad-based, Lead Generation, Other>",
  "reasoning": "<3-4 sentences explaining why, citing specific evidence from the content above>",
  "monetizationSignals": [<3-6 short strings, specific evidence found, e.g. "Tiered pricing page with monthly/annual toggle">]
}`;

  return callClaudeForJson<IBusinessModel>({
    system: SYSTEM_PROMPT,
    prompt,
    maxTokens: 800,
  });
}
