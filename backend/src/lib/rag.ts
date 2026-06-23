import type { ICrawledPage, IEmbeddingChunk } from "@/models/Site";
import { config } from "./config";

const VOYAGE_API_KEY = config.voyageApiKey;
const VOYAGE_ENDPOINT = "https://api.voyageai.com/v1/embeddings";
const EMBEDDING_MODEL = "voyage-3-lite";

const CHUNK_SIZE_CHARS = 1200;
const CHUNK_OVERLAP_CHARS = 150;

/**
 * Splits page text into overlapping chunks for embedding. Overlap preserves
 * context that would otherwise be cut at a chunk boundary.
 */
export function chunkPage(page: ICrawledPage): { text: string; sourceUrl: string }[] {
  const text = page.textContent.trim();
  if (text.length === 0) return [];
  if (text.length <= CHUNK_SIZE_CHARS) {
    return [{ text: `${page.title}\n\n${text}`, sourceUrl: page.url }];
  }

  const chunks: { text: string; sourceUrl: string }[] = [];
  let start = 0;
  while (start < text.length) {
    const end = Math.min(start + CHUNK_SIZE_CHARS, text.length);
    const chunkText = text.slice(start, end);
    chunks.push({ text: `${page.title}\n\n${chunkText}`, sourceUrl: page.url });
    if (end === text.length) break;
    start = end - CHUNK_OVERLAP_CHARS;
  }
  return chunks;
}

async function embedTexts(texts: string[]): Promise<number[][]> {
  if (!VOYAGE_API_KEY) {
    console.warn(
      "[rag] VOYAGE_API_KEY not set — falling back to a deterministic hash-based " +
        "pseudo-embedding. Set VOYAGE_API_KEY in .env.local for real semantic search."
    );
    return texts.map(hashEmbeddingFallback);
  }

  const res = await fetch(VOYAGE_ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${VOYAGE_API_KEY}`,
    },
    body: JSON.stringify({ input: texts, model: EMBEDDING_MODEL }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Voyage embeddings request failed: ${res.status} ${body}`);
  }

  interface VoyageEmbeddingResponse {
    data: { embedding: number[] }[];
  }

  const data = (await res.json()) as VoyageEmbeddingResponse;
  return data.data.map((d) => d.embedding);
}

/**
 * Deterministic fallback so the app remains demoable without a Voyage API
 * key — NOT semantically meaningful, just keeps the RAG pipeline wired
 * end-to-end. Real deployments should set VOYAGE_API_KEY.
 */
function hashEmbeddingFallback(text: string): number[] {
  const dims = 64;
  const vec = new Array(dims).fill(0);
  for (let i = 0; i < text.length; i++) {
    vec[i % dims] += text.charCodeAt(i);
  }
  const norm = Math.sqrt(vec.reduce((sum, v) => sum + v * v, 0)) || 1;
  return vec.map((v) => v / norm);
}

const EMBEDDING_BATCH_SIZE = 16;

export async function buildEmbeddingsForPages(
  pages: ICrawledPage[]
): Promise<IEmbeddingChunk[]> {
  const allChunks = pages.flatMap(chunkPage);
  if (allChunks.length === 0) return [];

  const results: IEmbeddingChunk[] = [];
  for (let i = 0; i < allChunks.length; i += EMBEDDING_BATCH_SIZE) {
    const batch = allChunks.slice(i, i + EMBEDDING_BATCH_SIZE);
    const vectors = await embedTexts(batch.map((c) => c.text));
    batch.forEach((c, idx) => {
      results.push({ text: c.text, sourceUrl: c.sourceUrl, embedding: vectors[idx] });
    });
  }
  return results;
}

function cosineSimilarity(a: number[], b: number[]): number {
  const len = Math.min(a.length, b.length);
  let dot = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < len; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  if (normA === 0 || normB === 0) return 0;
  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}

export interface RetrievedChunk {
  text: string;
  sourceUrl: string;
  score: number;
}

/**
 * Embeds the query and returns the top-K most relevant stored chunks by
 * cosine similarity. This is the RAG retrieval step used before every chat
 * response, per the "never hallucinate, always cite sources" requirement.
 */
export async function retrieveRelevantChunks(
  query: string,
  storedChunks: IEmbeddingChunk[],
  topK = 5
): Promise<RetrievedChunk[]> {
  if (storedChunks.length === 0) return [];

  const [queryEmbedding] = await embedTexts([query]);
  const scored = storedChunks.map((chunk) => ({
    text: chunk.text,
    sourceUrl: chunk.sourceUrl,
    score: cosineSimilarity(queryEmbedding, chunk.embedding),
  }));

  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, topK);
}
