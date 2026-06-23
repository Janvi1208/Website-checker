import { callClaudeForJson } from "../claude";
import type {
  ICostEstimate,
  ITechDetection,
  IVisionAnalysis,
} from "@/models/Site";
import type { ResearchSummary } from "./researchAgent";

const SYSTEM_PROMPT = `You are the Cost Estimator inside SiteMind AI.
You estimate realistic engineering effort to build a clone of an analyzed website/product, based on its
detected complexity, tech stack, and feature surface. Use realistic industry day-rate assumptions
(roughly $50-$150/hr blended rate depending on apparent complexity) and be conservative — most projects
take longer than founders expect. Respond with ONLY valid JSON, no preamble, no markdown fences.`;

interface CostEstimateResponse {
  frontendHours: number;
  backendHours: number;
  aiHours: number;
  infraHours: number;
  suggestedTeamSize: number;
  estimatedCostLow: number;
  estimatedCostHigh: number;
  estimatedTimelineWeeks: number;
  reasoning: string;
}

export async function runCostEstimator(
  research: ResearchSummary,
  techStack: ITechDetection[],
  visionAnalysis: IVisionAnalysis | null
): Promise<ICostEstimate> {
  const prompt = `Product: ${research.companyName}
What it does: ${research.whatItDoes}
Key features detected: ${research.keyFeatures.join(", ")}
Detected tech stack: ${techStack.map((t) => `${t.name} (${t.category})`).join(", ") || "none confidently detected"}
UI complexity score (0-100, higher = more polished/complex): ${visionAnalysis?.uiScore ?? "unknown"}

Estimate the effort to build a comparable clone from scratch. Return JSON matching this exact shape:
{
  "frontendHours": <integer>,
  "backendHours": <integer>,
  "aiHours": <integer, 0 if no AI features detected>,
  "infraHours": <integer>,
  "suggestedTeamSize": <integer, 1-6>,
  "estimatedCostLow": <integer USD>,
  "estimatedCostHigh": <integer USD>,
  "estimatedTimelineWeeks": <integer>,
  "reasoning": "<3-4 sentences justifying the estimate, referencing the actual feature set>"
}`;

  const result = await callClaudeForJson<CostEstimateResponse>({
    system: SYSTEM_PROMPT,
    prompt,
    maxTokens: 800,
  });

  const totalHours =
    result.frontendHours + result.backendHours + result.aiHours + result.infraHours;

  return {
    frontendHours: result.frontendHours,
    backendHours: result.backendHours,
    aiHours: result.aiHours,
    infraHours: result.infraHours,
    totalHours,
    suggestedTeamSize: result.suggestedTeamSize,
    estimatedCostUsd: { low: result.estimatedCostLow, high: result.estimatedCostHigh },
    estimatedTimelineWeeks: result.estimatedTimelineWeeks,
    reasoning: result.reasoning,
  };
}
