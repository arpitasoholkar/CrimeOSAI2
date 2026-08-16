/**
 * llmExtract.js
 *
 * Calls the Gemini API to extract person names and detect language
 * (including romanized Hindi/Gujarati) from complaint text.
 *
 * SETUP:
 * 1. Get a free API key from https://aistudio.google.com ("Get API key")
 * 2. Copy .env.example to .env
 * 3. Paste your key into .env as GEMINI_API_KEY=...
 *
 * Until a real key is set, this module safely falls back to returning
 * empty names + "unknown" language rather than crashing the server —
 * so the rest of the pipeline keeps working while you're setting up.
 *
 * FIX: "gemini-2.5-flash" was retired ("no longer available to new
 * users" — 404) and every call here was silently failing into the
 * empty-fallback path. Same underlying issue investigationEngine.js
 * (crimeos-brain) already hit and fixed; this file has its own,
 * separate Gemini call and needed the same fix independently.
 *
 * Deliberately does NOT default to reading crimeos-brain's GEMINI_MODEL
 * env var -- that's a different service's config knob, and chaining to
 * it means an alias problem set there (e.g. "-latest", which resolved
 * to a model with a much stricter free-tier quota) would silently leak
 * into this module too. LLM_EXTRACT_MODEL is this module's own,
 * independent override.
 */

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const PRIMARY_MODEL = process.env.LLM_EXTRACT_MODEL || "gemini-2.0-flash";
const FALLBACK_MODEL = process.env.LLM_EXTRACT_FALLBACK_MODEL || "gemini-2.5-flash";

const PLACEHOLDER_VALUES = ["YOUR_GEMINI_API_KEY_HERE", "", undefined];
const REQUEST_TIMEOUT_MS = 30_000;

function buildUrl(model) {
  return `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;
}

// Pulls Gemini's own suggested wait time out of the error body (either
// the structured RetryInfo details, or the "Please retry in Ns" text
// form seen in raw REST error bodies) instead of guessing with a fixed
// schedule that's often far too short for a real quota reset.
function extractRetryDelayMs(errBody) {
  const structuredMatch = errBody.match(/"retryDelay"\s*:\s*"(\d+(?:\.\d+)?)s"/);
  if (structuredMatch) return parseFloat(structuredMatch[1]) * 1000;

  const textMatch = errBody.match(/retry in (\d+(?:\.\d+)?)s/i);
  if (textMatch) return parseFloat(textMatch[1]) * 1000;

  return null;
}

// Single model, with retries on 429 (rate limit) / 503 (overloaded).
// Returns the raw fetch Response on success. Throws an Error carrying
// { status, body } on the final failed attempt, or immediately for a
// non-retryable status (e.g. 404 model-not-found, 400 bad request).
async function generateWithRetry(model, prompt, maxRetries = 3) {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

    let response;
    try {
      response = await fetch(`${buildUrl(model)}?key=${GEMINI_API_KEY}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0,
            responseMimeType: "application/json",
          },
        }),
        signal: controller.signal,
      });
    } finally {
      clearTimeout(timeoutId);
    }

    if (response.ok) return response;

    const errBody = await response.text();
    const isRetryable = response.status === 429 || response.status === 503;

    if (!isRetryable || attempt === maxRetries) {
      const err = new Error(errBody);
      err.status = response.status;
      throw err;
    }

    const serverDelay = extractRetryDelayMs(errBody);
    const waitMs = serverDelay ?? attempt * 2000; // fall back to 2s, 4s, 6s if no hint given
    console.log(
      `[llmExtract] Gemini (${model}) returned ${response.status}, retrying in ${(waitMs / 1000).toFixed(1)}s (attempt ${attempt}/${maxRetries})...`
    );
    await new Promise((resolve) => setTimeout(resolve, waitMs));
  }
}

async function extractNamesAndLanguage(text) {
  if (PLACEHOLDER_VALUES.includes(GEMINI_API_KEY)) {
    console.warn(
      "[llmExtract] GEMINI_API_KEY not set (still a placeholder) — skipping LLM call, using fallback."
    );
    return { names: [], language: "unknown", source: "fallback_no_key" };
  }

  const prompt = `You are analyzing a cyber-crime complaint filed with Indian police. The text may be in English, Hindi, Gujarati, or a mix — including romanized Hindi/Gujarati written using English letters (e.g. "mujhe paisa chahiye").

Return ONLY a JSON object, with no other text and no markdown code fences, in exactly this shape:
{
  "names": ["array of person names mentioned in the text — exclude company names, app names, and platform names"],
  "language": "one of: en, hi, gu, hi-en, gu-en, unknown"
}

Complaint text:
"""
${text}
"""`;

  let response;
  try {
    response = await generateWithRetry(PRIMARY_MODEL, prompt);
  } catch (primaryErr) {
    const isRetryable = primaryErr.status === 429 || primaryErr.status === 503;
    if (!isRetryable) {
      console.error("[llmExtract] Gemini API returned an error:", primaryErr.status, primaryErr.message);
      return { names: [], language: "unknown", source: "fallback_api_error" };
    }
    console.log(
      `[llmExtract] Primary model (${PRIMARY_MODEL}) exhausted retries on ${primaryErr.status}, falling back to ${FALLBACK_MODEL}...`
    );
    try {
      response = await generateWithRetry(FALLBACK_MODEL, prompt);
    } catch (fallbackErr) {
      console.error("[llmExtract] Gemini API returned an error:", fallbackErr.status, fallbackErr.message);
      return { names: [], language: "unknown", source: "fallback_api_error" };
    }
  }

  try {
    const data = await response.json();
    const rawText = data?.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!rawText) {
      console.error("[llmExtract] Gemini response had no text content:", JSON.stringify(data));
      return { names: [], language: "unknown", source: "fallback_empty_response" };
    }

    const cleaned = rawText.replace(/```json|```/g, "").trim();
    const parsed = JSON.parse(cleaned);

    return {
      names: Array.isArray(parsed.names) ? parsed.names : [],
      language: parsed.language || "unknown",
      source: "llm",
    };
  } catch (err) {
    if (err.name === "AbortError") {
      console.error(`[llmExtract] Gemini API call timed out after ${REQUEST_TIMEOUT_MS / 1000}s`);
      return { names: [], language: "unknown", source: "fallback_timeout" };
    }
    console.error("[llmExtract] Failed to call or parse Gemini response:", err.message);
    return { names: [], language: "unknown", source: "fallback_exception" };
  }
}

export { extractNamesAndLanguage };