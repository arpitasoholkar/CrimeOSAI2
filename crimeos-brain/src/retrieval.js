// src/retrieval.js
//
// Task 1 + 2: SOP knowledge base + RAG retrieval.
//
// - loadAndChunkSOPs() reads every .md file in /sop_docs and splits it into
//   section-sized chunks (split on "## " headings).
// - buildIndex() embeds every chunk once and keeps the vectors in memory
//   (fine for a handful of SOPs -- no vector database needed for this scale).
// - search() embeds the incoming complaint text and returns the top-k most
//   similar chunks, ranked by cosine similarity.

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { embedText, cosineSimilarity } from "./embeddings.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SOP_DIR = path.join(__dirname, "..", "sop_docs");

/**
 * @typedef {Object} Chunk
 * @property {string} sopId
 * @property {string} sourceFile
 * @property {string} heading
 * @property {string} text
 */

function extractSopId(text) {
  const match = text.match(/\*\*SOP ID:\*\*\s*([A-Za-z0-9-]+)/);
  return match ? match[1] : "UNKNOWN";
}

/** @returns {Chunk[]} */
export function loadAndChunkSOPs(sopDir = SOP_DIR) {
  const chunks = [];
  const files = fs.readdirSync(sopDir).filter((f) => f.endsWith(".md"));

  for (const file of files) {
    const fullPath = path.join(sopDir, file);
    const raw = fs.readFileSync(fullPath, "utf-8");
    const sopId = extractSopId(raw);

    // split into sections on level-2 markdown headings ("## ...")
    const sections = raw.split(/\n(?=## )/);
    for (const section of sections) {
      const trimmed = section.trim();
      if (!trimmed) continue;
      const headingMatch = trimmed.match(/^##\s*(.+)/);
      const heading = headingMatch ? headingMatch[1] : "Header";
      chunks.push({ sopId, sourceFile: file, heading, text: trimmed });
    }
  }
  return chunks;
}

export class SOPRetriever {
  constructor(sopDir = SOP_DIR) {
    this.sopDir = sopDir;
    this.chunks = [];
    this.vectors = [];
  }

  /** Must be called once before search() -- embeds every chunk. */
  async buildIndex() {
    const allChunks = loadAndChunkSOPs(this.sopDir);
    if (allChunks.length === 0) {
      throw new Error(`No SOP chunks found in ${this.sopDir}`);
    }
    this.chunks = [];
    this.vectors = [];
    for (const chunk of allChunks) {
      try {
        const vec = await embedText(`${chunk.heading}\n${chunk.text}`);
        this.chunks.push(chunk);
        this.vectors.push(vec);
      } catch (err) {
        console.error(`Skipping chunk "${chunk.sopId} :: ${chunk.heading}" -- embedding failed: ${err.message}`);
      }
    }
    if (this.chunks.length === 0) {
      throw new Error("All SOP chunks failed to embed -- index is empty");
    }
    console.log(`SOP index built: ${this.chunks.length}/${allChunks.length} chunks embedded successfully.`);
  }

  /**
   * @param {string} query
   * @param {number} topK
   * @returns {Promise<{chunk: Chunk, score: number}[]>}
   */
  async search(query, topK = 5) {
    const queryVec = await embedText(query);
    const scored = this.chunks.map((chunk, i) => ({
      chunk,
      score: cosineSimilarity(queryVec, this.vectors[i]),
    }));
    scored.sort((a, b) => b.score - a.score);
    return scored.slice(0, topK);
  }

  /** Convenience: distinct SOP IDs ranked by their best matching chunk. */
  async searchSopIds(query, topK = 5) {
    const results = await this.search(query, topK);
    const best = new Map();
    for (const { chunk, score } of results) {
      if (!best.has(chunk.sopId) || score > best.get(chunk.sopId)) {
        best.set(chunk.sopId, score);
      }
    }
    return [...best.entries()].sort((a, b) => b[1] - a[1]).map(([id]) => id);
  }
}

// Quick manual test: `npm run test-retrieval`
// (needs GEMINI_API_KEY set in .env, since embedding calls hit the Gemini API)
if (import.meta.url === `file://${process.argv[1]}`) {
  const retriever = new SOPRetriever();
  await retriever.buildIndex();
  const testQuery =
    "victim received a call from someone pretending to be a bank official and lost money via UPI";
  const results = await retriever.search(testQuery, 3);
  for (const { chunk, score } of results) {
    console.log(`[${score.toFixed(3)}] ${chunk.sopId} :: ${chunk.heading} (${chunk.sourceFile})`);
  }
}