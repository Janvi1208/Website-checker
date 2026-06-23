import { callClaudeForJson } from "../claude";
import type { ICompetitor } from "@/models/Site";
import type { ResearchSummary } from "./researchAgent";

const SYSTEM_PROMPT = `You are the Competitor Agent inside SiteMind AI.
Find and analyze real competitors of a given company based on the description provided.
For each competitor, give a one-line positioning statement, a rough price comparison, and the single
biggest differentiator versus the analyzed company. If you can't confidently identify competitors, return fewer items rather than inventing them.
Respond with ONLY a JSON array (no prose, no markdown fences) matching:
[{"name": "...", "url": "...", "positioning": "...", "priceComparison": "...", "keyDifference": "..."}]`;

export async function runCompetitorAgent(
  research: ResearchSummary
): Promise<ICompetitor[]> {
  const prompt = `Company: ${research.companyName}
What it does: ${research.whatItDoes}
Target audience: ${research.targetAudience}
Key features: ${research.keyFeatures.join(", ")}

Based on this description, identify 3-5 real competitors to this company. Then respond with ONLY the JSON array described in your instructions — no other text.`;

  try {
    const competitors = await callClaudeForJson<ICompetitor[]>({
      system: SYSTEM_PROMPT,
      prompt,
      maxTokens: 1500,
    });
    return Array.isArray(competitors) ? competitors.slice(0, 5) : [];
  } catch (err) {
    console.error("[runCompetitorAgent] Failed to get competitors:", err);
    return [];
  }
}

