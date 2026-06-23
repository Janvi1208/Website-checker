import { callClaudeForJson } from "../claude";
import type { ICrawledPage } from "@/models/Site";

const SYSTEM_PROMPT = `You are the Research Agent inside SiteMind AI.
You read crawled website content and produce a grounded summary of what the company/product actually does.
Base every claim on the provided page content. If the content doesn't say something clearly, say it's unclear rather than guessing.
Respond with ONLY valid JSON, no preamble, no markdown fences.`;

export interface ResearchSummary {
  companyName: string;
  whatItDoes: string;
  targetAudience: string;
  keyFeatures: string[];
  confidence: "high" | "medium" | "low";
}

function buildContentDigest(pages: ICrawledPage[]): string {
  return pages
    .map((p) => `## ${p.title} (${p.url})\nHeadings: ${p.headings.join(" | ")}\n${p.textContent.slice(0, 1500)}`)
    .join("\n\n---\n\n")
    .slice(0, 14000); // keep prompt size reasonable
}

export async function runResearchAgent(
  pages: ICrawledPage[]
): Promise<ResearchSummary> {
  const digest = buildContentDigest(pages);

  const prompt = `Here is crawled content from a website (${pages.length} page(s)):

${digest}

Based ONLY on this content, return JSON matching this exact shape:
{
  "companyName": "<best-guess name of the company/product>",
  "whatItDoes": "<3-4 sentence grounded summary of what this is and what it does>",
  "targetAudience": "<1-2 sentences on who this seems built for>",
  "keyFeatures": [<4-8 features/capabilities you can actually find evidence for>],
  "confidence": "<high|medium|low based on how much clear content you had to work with>"
}`;

  return callClaudeForJson<ResearchSummary>({
    system: SYSTEM_PROMPT,
    prompt,
    maxTokens: 1200,
  });
}
