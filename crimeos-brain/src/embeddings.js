// // src/embeddings.js
// //
// // Two jobs:
// //   1. Turn a piece of text into a vector (list of numbers) using Gemini's
// //      embedding model, so similar-meaning text ends up with similar numbers.
// //   2. Compare two vectors with cosine similarity, so we can rank "how close"
// //      a complaint is to each SOP/legal chunk.

// import { GoogleGenerativeAI } from "@google/generative-ai";
// import dotenv from "dotenv";
// dotenv.config();

// const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
// const embeddingModel = genAI.getGenerativeModel({ model: "gemini-embedding-001" });

// /**
//  * Convert a string of text into an embedding vector.
//  * @param {string} text
//  * @returns {Promise<number[]>}
//  */
// export async function embedText(text) {
//   const result = await embeddingModel.embedContent(text);
//   return result.embedding.values; // an array of floats, e.g. [0.012, -0.045, ...]
// }

// /**
//  * Cosine similarity between two vectors of the same length.
//  * Returns a number between -1 and 1 (in practice, close to 0..1 for text).
//  * 1 = identical meaning, 0 = unrelated.
//  */
// export function cosineSimilarity(vecA, vecB) {
//   let dot = 0;
//   let normA = 0;
//   let normB = 0;
//   for (let i = 0; i < vecA.length; i++) {
//     dot += vecA[i] * vecB[i];
//     normA += vecA[i] * vecA[i];
//     normB += vecB[i] * vecB[i];
//   }
//   if (normA === 0 || normB === 0) return 0;
//   return dot / (Math.sqrt(normA) * Math.sqrt(normB));
// }


// src/embeddings.js

import { GoogleGenerativeAI } from "@google/generative-ai";
import dotenv from "dotenv";
dotenv.config();

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const embeddingModel = genAI.getGenerativeModel({ model: "gemini-embedding-001" });

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
      if (!retryable || attempt === maxRetries) {
        throw new Error(`embedText failed after ${attempt} attempt(s): ${err.message}`);
      }
      const waitMs = attempt * 2000;
      console.log(`Embedding call failed (${err.status || "unknown"}), retrying in ${waitMs / 1000}s (attempt ${attempt}/${maxRetries})...`);
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