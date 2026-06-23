import OpenAI from "openai";
import { config } from "./config";

export const groq = new OpenAI({
  apiKey: config.groqApiKey,
  baseURL: "https://api.groq.com/openai/v1",
});

// For backward compatibility
export const anthropic = groq;

export const TEXT_MODEL = config.groqModel;
export const VISION_MODEL = config.groqModel;

/**
 * Calls Groq via OpenAI-compatible API and asks for strict JSON back. 
 * Strips markdown code fences defensively in case the model wraps the JSON despite instructions.
 */
export async function callClaudeForJson<T>(params: {
  system: string;
  prompt: string;
  images?: { mediaType: string; base64Data: string }[];
  maxTokens?: number;
}): Promise<T> {
  const { system, prompt, images, maxTokens = 2000 } = params;

  let fullPrompt = prompt;
  if (images && images.length > 0) {
    // Note: Groq doesn't support images in the same way as Anthropic
    // For now, we'll ignore images and just use the text prompt
    console.warn("[callClaudeForJson] Groq does not support image analysis in this version. Images are ignored.");
  }

  const response = await groq.chat.completions.create({
    model: TEXT_MODEL,
    max_tokens: maxTokens,
    messages: [
      { role: "system", content: system },
      { role: "user", content: fullPrompt },
    ],
  });

  const rawText = response.choices[0]?.message?.content || "{}";

  const cleaned = rawText
    .trim()
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/```\s*$/i, "");

  try {
    return JSON.parse(cleaned) as T;
  } catch (err) {
    console.error("[callClaudeForJson] Failed to parse JSON:", cleaned, err);
    throw new Error("AI returned an unexpected response format.");
  }
}

export async function callClaudeForText(params: {
  system: string;
  prompt: string;
  maxTokens?: number;
}): Promise<string> {
  const { system, prompt, maxTokens = 1500 } = params;
  const response = await groq.chat.completions.create({
    model: TEXT_MODEL,
    max_tokens: maxTokens,
    messages: [
      { role: "system", content: system },
      { role: "user", content: prompt },
    ],
  });
  return response.choices[0]?.message?.content || "";
}
