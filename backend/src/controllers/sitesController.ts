import type { Request, Response } from "express";
import Site from "../models/Site";
import { crawlWebsite } from "../lib/crawler";
import { detectTechnologies } from "../lib/techDetection";
import { captureScreenshots } from "../lib/screenshot";
import { buildEmbeddingsForPages, retrieveRelevantChunks } from "../lib/rag";
import { callClaudeForText } from "../lib/claude";
import { runResearchAgent } from "../lib/agents/researchAgent";
import { runUxAgent } from "../lib/agents/uxAgent";
import { runSecurityAgent } from "../lib/agents/securityAgent";
import { runCompetitorAgent } from "../lib/agents/competitorAgent";
import { runRevenueAgent } from "../lib/agents/revenueAgent";
import { runCostEstimator } from "../lib/agents/costEstimatorAgent";

function extractDomain(url: string): string {
  try {
    const u = new URL(url.startsWith("http") ? url : `https://${url}`);
    return u.hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

export async function listSites(req: Request, res: Response) {
  const sites = await Site.find({ userId: req.session!.userId })
    .select(
      "url domain status createdAt trustAnalysis.trustScore visionAnalysis.uiScore businessModel.modelType"
    )
    .sort({ createdAt: -1 })
    .lean();

  res.json({ sites });
}

export async function getSite(req: Request, res: Response) {
  const site = await Site.findOne({ _id: req.params.id, userId: req.session!.userId });
  if (!site) {
    res.status(404).json({ error: "Analysis not found." });
    return;
  }

  const siteObj = site.toObject();
  siteObj.embeddings = siteObj.embeddings?.map((e: { text: string; sourceUrl: string }) => ({
    text: e.text,
    sourceUrl: e.sourceUrl,
  }));

  res.json({ site: siteObj });
}

export async function deleteSite(req: Request, res: Response) {
  const result = await Site.deleteOne({ _id: req.params.id, userId: req.session!.userId });
  if (result.deletedCount === 0) {
    res.status(404).json({ error: "Analysis not found." });
    return;
  }
  res.json({ success: true });
}

export async function analyzeSite(req: Request, res: Response) {
  const inputUrl = (req.body?.url as string | undefined)?.trim();
  if (!inputUrl) {
    res.status(400).json({ error: "Please provide a website URL." });
    return;
  }

  const normalizedUrl = inputUrl.startsWith("http") ? inputUrl : `https://${inputUrl}`;
  const domain = extractDomain(normalizedUrl);

  const site = await Site.create({
    userId: req.session!.userId,
    url: normalizedUrl,
    domain,
    status: "crawling",
  });

  try {
    // --- Step 1: Crawl -------------------------------------------------
    const crawlResult = await crawlWebsite(normalizedUrl);
    site.pages = crawlResult.pages;
    site.contactInfo = crawlResult.contactInfo;
    site.pricingText = crawlResult.pricingText;
    site.faqs = crawlResult.faqs;
    site.status = "analyzing";
    await site.save();

    const homepageHtml = crawlResult.rawHomepageHtml || "";

    // --- Independent steps that don't need the research summary --------
    const screenshotsPromise = captureScreenshots(normalizedUrl);
    const techStackPromise = detectTechnologies(normalizedUrl, homepageHtml);
    const embeddingsPromise = buildEmbeddingsForPages(crawlResult.pages);

    // --- Research agent feeds competitor + revenue agents --------------
    const research = await runResearchAgent(crawlResult.pages);

    const [screenshots, techStack, embeddings, competitors, businessModel] =
      await Promise.all([
        screenshotsPromise,
        techStackPromise,
        embeddingsPromise,
        runCompetitorAgent(research).catch((err) => {
          console.error("[analyze] competitor agent failed:", err);
          return [];
        }),
        runRevenueAgent(research, crawlResult.pricingText, crawlResult.pages),
      ]);

    site.screenshots = screenshots;
    site.techStack = techStack;
    site.embeddings = embeddings;
    site.competitors = competitors;
    site.businessModel = businessModel;
    await site.save();

    // --- Vision analysis (needs screenshots) ----------------------------
    const visionAnalysis = await runUxAgent(screenshots).catch((err) => {
      console.error("[analyze] UX agent failed:", err);
      return null;
    });
    site.visionAnalysis = visionAnalysis;
    await site.save();

    // --- Security agent --------------------------------------------------
    const trustAnalysis = await runSecurityAgent(
      normalizedUrl,
      homepageHtml,
      crawlResult.contactInfo
    );
    site.trustAnalysis = trustAnalysis;
    await site.save();

    // --- Cost estimator ---------------------------------------------------
    const costEstimate = await runCostEstimator(research, techStack, visionAnalysis);
    site.costEstimate = costEstimate;

    site.status = "ready";
    await site.save();

    res.json({ siteId: site._id.toString() });
  } catch (err) {
    console.error("[analyze] pipeline failed:", err);
    site.status = "failed";
    site.errorMessage =
      err instanceof Error ? err.message : "Analysis failed for an unknown reason.";
    await site.save();
    res.status(500).json({ error: site.errorMessage, siteId: site._id.toString() });
  }
}

const CHAT_SYSTEM_PROMPT = `You are SiteMind AI's chat assistant. You answer questions about ONE specific website,
using only the retrieved context chunks and structured analysis data provided to you below.

Rules:
- Ground every factual claim in the provided context or analysis data. Do not invent facts about the company.
- If the retrieved context doesn't contain enough information to answer confidently, say so plainly rather than guessing.
- When you use a specific page's content, mention which page it came from (by URL) so the user can verify it.
- Keep answers concise and direct — a few sentences to a short paragraph unless the question asks for a list or comparison.
- You may also reference the structured analysis (trust score, tech stack, competitors, business model, cost estimate) when relevant — that data was generated by SiteMind AI's own analysis agents, not the crawled page content, so don't claim it came from a specific page.`;

export async function chatWithSite(req: Request, res: Response) {
  const userMessage = (req.body?.message as string | undefined)?.trim();
  if (!userMessage) {
    res.status(400).json({ error: "Please enter a question." });
    return;
  }

  const site = await Site.findOne({ _id: req.params.id, userId: req.session!.userId });
  if (!site) {
    res.status(404).json({ error: "Analysis not found." });
    return;
  }
  if (site.status !== "ready") {
    res.status(409).json({ error: "This site's analysis isn't ready yet." });
    return;
  }

  const retrieved = await retrieveRelevantChunks(userMessage, site.embeddings, 5);
  const contextBlock = retrieved.length
    ? retrieved
        .map((r, i) => `[${i + 1}] Source: ${r.sourceUrl}\n${r.text.slice(0, 1000)}`)
        .join("\n\n")
    : "No closely matching content chunks were found for this question.";

  const analysisSummary = `
Structured analysis data for this site (generated by SiteMind AI, not from page content):
- Trust score: ${site.trustAnalysis?.trustScore ?? "not analyzed"} (${site.trustAnalysis?.classification ?? "n/a"})
- Detected tech stack: ${site.techStack.map((t: { name: string }) => t.name).join(", ") || "none confidently detected"}
- Business model: ${site.businessModel?.modelType ?? "not analyzed"}
- UI/UX scores: UI ${site.visionAnalysis?.uiScore ?? "n/a"}, UX ${site.visionAnalysis?.uxScore ?? "n/a"}, Accessibility ${site.visionAnalysis?.accessibilityScore ?? "n/a"}
- Competitors identified: ${site.competitors.map((c: { name: string }) => c.name).join(", ") || "none identified"}
- Clone cost estimate: $${site.costEstimate?.estimatedCostUsd.low ?? "?"}-$${site.costEstimate?.estimatedCostUsd.high ?? "?"}, ~${site.costEstimate?.estimatedTimelineWeeks ?? "?"} weeks
`.trim();

  const prompt = `Question about ${site.url}: "${userMessage}"

Retrieved content chunks:
${contextBlock}

${analysisSummary}

Answer the question using the rules in your system prompt.`;

  const answer = await callClaudeForText({ system: CHAT_SYSTEM_PROMPT, prompt, maxTokens: 1000 });
  const sources = Array.from(new Set(retrieved.map((r) => r.sourceUrl)));

  site.chatHistory.push({ role: "user", content: userMessage, createdAt: new Date() });
  site.chatHistory.push({ role: "assistant", content: answer, sources, createdAt: new Date() });
  await site.save();

  res.json({ answer, sources });
}

export async function getChatHistory(req: Request, res: Response) {
  const site = await Site.findOne({ _id: req.params.id, userId: req.session!.userId }).select(
    "chatHistory"
  );
  if (!site) {
    res.status(404).json({ error: "Analysis not found." });
    return;
  }
  res.json({ chatHistory: site.chatHistory });
}
