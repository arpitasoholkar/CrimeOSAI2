// src/embeddingCache.js
//
// Persists SOP-chunk embedding vectors to disk, keyed by a hash of the
// chunk's own text. Without this, InvestigationEngine.init() (see
// investigationEngine.js) re-embeds every SOP chunk from scratch on
// every single server start -- a normal dev workflow that restarts the
// server a handful of times a day burns straight through Gemini's free
// embedding tier (1000 requests/day) before a single real complaint is
// ever investigated, which is exactly the 429 loop seen at startup.
//
// Since SOP docs change rarely, the fix is simple: only ever call the
// embedding API for a chunk whose text hash we haven't seen before.
// Everything else is served from disk, instantly and for free.

import fs from "fs";
import path from "path";
import crypto from "crypto";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DEFAULT_CACHE_FILE = ".embedding-cache.json";

function hashText(text) {
  return crypto.createHash("sha256").update(text).digest("hex");
}

/**
 * @param {string} [cacheFileName] which cache file on disk to read --
 *   defaults to the SOP-chunk cache, but callers with a different set
 *   of texts to cache (e.g. case complaint text, see server.js's
 *   /api/case/:id/similar) should pass their own filename so the two
 *   caches never collide or grow into one giant file.
 * @returns {Record<string, number[]>} hash -> embedding vector
 */
function loadCache(cacheFileName = DEFAULT_CACHE_FILE) {
  const cachePath = path.join(__dirname, "..", cacheFileName);
  try {
    const raw = fs.readFileSync(cachePath, "utf-8");
    return JSON.parse(raw);
  } catch {
    // No cache file yet (first run ever), or it's corrupt -- either way,
    // starting from an empty cache is always safe, just slower once.
    return {};
  }
}

function saveCache(cache, cacheFileName = DEFAULT_CACHE_FILE) {
  const cachePath = path.join(__dirname, "..", cacheFileName);
  try {
    fs.writeFileSync(cachePath, JSON.stringify(cache), "utf-8");
  } catch (err) {
    // A failed write just means the next restart/request re-embeds --
    // never let cache persistence break the investigation pipeline.
    console.error(`[embeddingCache] Failed to save cache to disk: ${err.message}`);
  }
}

export { hashText, loadCache, saveCache };
