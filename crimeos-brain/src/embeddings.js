// crimeos-brain/src/embeddings.js
//
// FIX: on a Gemini 429 (quota/rate limit) this used to wait only 2s/4s and
// give up, which is far too short for real quota resets. It now honours the
// retry delay Google sends back (when it is short enough to wait for), and
// throws an error tagged with .status so callers can fall back gracefully.

import { GoogleGenerativeAI } from "@google/generative-ai";
import dotenv from "dotenv";
dotenv.config();

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const embeddingModel = genAI.getGenerativeModel({ model: "gemini-embedding-001" });

// Longest we are willing to block a request waiting for quota to reset.
const MAX_WAIT_MS = 35_000;

function extractRetryDelayMs(err) {
  const detail = err?.errorDetails?.find(
    (d) => d["@type"] === "type.googleapis.com/google.rpc.RetryInfo"
  );
  const raw = detail?.retryDelay; // e.g. "28s"
  if (!raw) return null;
  const seconds = parseFloat(raw);
  return Number.isFinite(seconds) ? Math.ceil(seconds * 1000) + 500 : null;
}

export async function embedText(text, maxRetries = 3) {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const result = await embeddingModel.embedContent(text);
      const values = result?.embedding?.values;
      if (!values || !Array.isArray(values) || values.length === 0) {
        throw new Error("Embedding API returned no vector values");
      }
      return values;
    } catch (err) {
      const retryable = err.status === 503 || err.status === 429;
      const serverDelay = extractRetryDelayMs(err);
      const waitMs = serverDelay ?? attempt * 2000;

      // Give up if: not retryable, out of attempts, or Google says to wait
      // longer than we can reasonably block (e.g. daily quota exhausted).
      if (!retryable || attempt === maxRetries || waitMs > MAX_WAIT_MS) {
        const wrapped = new Error(`embedText failed after ${attempt} attempt(s): ${err.message}`);
        wrapped.status = err.status;
        throw wrapped;
      }

      console.log(
        `Embedding call failed (${err.status || "unknown"}), retrying in ${(waitMs / 1000).toFixed(1)}s (attempt ${attempt}/${maxRetries})...`
      );
      await new Promise((r) => setTimeout(r, waitMs));
    }
  }
}

export function cosineSimilarity(vecA, vecB) {
  if (!vecA || !vecB) return 0; // defensive: never crash on a missing vector
  let dot = 0, normA = 0, normB = 0;
  for (let i = 0; i < vecA.length; i++) {
    dot += vecA[i] * vecB[i];
    normA += vecA[i] * vecA[i];
    normB += vecB[i] * vecB[i];
  }
  if (normA === 0 || normB === 0) return 0;
  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}