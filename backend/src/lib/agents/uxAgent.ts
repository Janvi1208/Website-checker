import { callClaudeForJson } from "../claude";
import type { IVisionAnalysis, IScreenshot } from "@/models/Site";

const SYSTEM_PROMPT = `You are the UX Agent inside SiteMind AI, a website intelligence platform.
You analyze website screenshots like a senior product designer doing a UX audit.
Be specific and reference what you actually see in the image — colors, spacing, button placement, font choices.
Be honest and critical where warranted; don't inflate scores. Respond with ONLY valid JSON, no preamble, no markdown fences.`;

interface VisionResponseShape {
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

export async function runUxAgent(
  screenshots: IScreenshot[]
): Promise<IVisionAnalysis> {
  const desktopShot = screenshots.find((s) => s.viewport === "desktop");
  const mobileShot = screenshots.find((s) => s.viewport === "mobile");

  const images = [desktopShot, mobileShot]
    .filter((s): s is IScreenshot => !!s)
    .map((s) => {
      const match = s.dataUrl.match(/^data:(image\/\w+);base64,(.+)$/);
      return match ? { mediaType: match[1], base64Data: match[2] } : null;
    })
    .filter((x): x is { mediaType: string; base64Data: string } => !!x);

  if (images.length === 0) {
    // No screenshots available (e.g. screenshot service unreachable) — return
    // a clearly-labeled empty result rather than fabricating visual scores.
    return {
      uiScore: 0,
      uxScore: 0,
      accessibilityScore: 0,
      conversionScore: 0,
      colorPalette: [],
      typographyNotes: "Not analyzed — no screenshots were captured.",
      layoutNotes: "Not analyzed — no screenshots were captured.",
      ctaNotes: "Not analyzed — no screenshots were captured.",
      navigationNotes: "Not analyzed — no screenshots were captured.",
      mobileResponsivenessNotes: "Not analyzed — no screenshots were captured.",
      recommendations: [],
    };
  }

  const prompt = `You're shown ${images.length} screenshot(s) of a website${
    mobileShot ? " (desktop view, then mobile view)" : " (desktop view)"
  }.

Analyze the visual design and UX. Return JSON matching this exact shape:
{
  "uiScore": <0-100 integer, visual polish>,
  "uxScore": <0-100 integer, usability and flow>,
  "accessibilityScore": <0-100 integer, contrast/readability/structure>,
  "conversionScore": <0-100 integer, how well it drives the user to act>,
  "colorPalette": [<3-6 hex codes you observe, as strings like "#1A2B3C">],
  "typographyNotes": "<2-3 sentences on font choices, hierarchy, sizing>",
  "layoutNotes": "<2-3 sentences on layout, whitespace, visual hierarchy>",
  "ctaNotes": "<2-3 sentences on call-to-action placement and clarity>",
  "navigationNotes": "<2-3 sentences on nav structure and findability>",
  "mobileResponsivenessNotes": "<2-3 sentences; if no mobile screenshot, say so>",
  "recommendations": [<4-6 specific, actionable recommendations as strings>]
}`;

  const result = await callClaudeForJson<VisionResponseShape>({
    system: SYSTEM_PROMPT,
    prompt,
    images,
    maxTokens: 1800,
  });

  return result;
}
