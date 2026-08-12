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
 */

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_MODEL = "gemini-2.5-flash";
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;

const PLACEHOLDER_VALUES = ["YOUR_GEMINI_API_KEY_HERE", "", undefined];
const REQUEST_TIMEOUT_MS = 30_000;

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

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(`${GEMINI_URL}?key=${GEMINI_API_KEY}`, {
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

    if (!response.ok) {
      const errBody = await response.text();
      console.error("[llmExtract] Gemini API returned an error:", response.status, errBody);
      return { names: [], language: "unknown", source: "fallback_api_error" };
    }

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
  } finally {
    clearTimeout(timeoutId);
  }
}

export { extractNamesAndLanguage };