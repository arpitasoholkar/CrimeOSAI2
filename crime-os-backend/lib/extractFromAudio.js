/**
 * extractFromAudio.js
 *
 * Transcribes audio complaints (voice notes, call recordings) using the
 * Gemini API's native audio support — same key as lib/llmExtract.js,
 * no separate transcription service needed.
 *
 * Supports common formats: mp3, wav, m4a, ogg, webm, flac.
 * Files are sent inline as base64, which works well up to ~20MB
 * (Gemini's inline request limit) — comfortably covers a voice-note-length
 * complaint recording.
 */

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_MODEL = "gemini-3.6-flash";
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;

const PLACEHOLDER_VALUES = ["YOUR_GEMINI_API_KEY_HERE", "", undefined];
const REQUEST_TIMEOUT_MS = 30_000;

const MIME_BY_EXTENSION = {
  ".mp3": "audio/mp3",
  ".wav": "audio/wav",
  ".m4a": "audio/mp4",
  ".ogg": "audio/ogg",
  ".webm": "audio/webm",
  ".flac": "audio/flac",
  ".mpeg": "audio/mp3",
  ".mpga": "audio/mpeg",
  ".mp2": "audio/mpeg",
};

/**
 * Transcribe an audio file buffer to text via Gemini.
 * @param {Buffer} buffer - raw audio file contents
 * @param {string} mimeType - e.g. "audio/mp3" (from multer's detected mimetype)
 * @returns {Promise<{text: string, source: string}>}
 */
async function transcribeAudio(buffer, mimeType) {
  if (PLACEHOLDER_VALUES.includes(GEMINI_API_KEY)) {
    console.warn(
      "[extractFromAudio] GEMINI_API_KEY not set (still a placeholder) — cannot transcribe."
    );
    return { text: "", source: "fallback_no_key" };
  }

  const prompt =
    "Transcribe this audio recording exactly as spoken. It may be in English, Hindi, Gujarati, or a mix. Do NOT translate — transcribe in the original language(s) spoken, using the appropriate script (or romanized if that's how it's naturally spoken). " +
    "IMPORTANT: when the speaker says an email address or UPI ID out loud (e.g. \"fraud at ok SBI\", \"rajesh at the rate paytm\"), write it in its proper compact written form with no spaces around the @ (e.g. \"fraud@oksbi\", \"rajesh@paytm\") rather than transcribing it word-for-word with spaces. Do the same for phone numbers spoken digit-by-digit — write them as a single continuous number. " +
    "Return ONLY the transcription text, with no commentary, labels, or formatting.";

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(`${GEMINI_URL}?key=${GEMINI_API_KEY}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              { text: prompt },
              {
                inline_data: {
                  mime_type: mimeType,
                  data: buffer.toString("base64"),
                },
              },
            ],
          },
        ],
        generationConfig: { temperature: 0 },
      }),
      signal: controller.signal,
    });

    if (!response.ok) {
  const errBody = await response.text();

  console.error("========== GEMINI AUDIO ERROR ==========");
  console.error("STATUS:", response.status);
  console.error("BODY:", errBody);
  console.error("MIME:", mimeType);
  console.error("SIZE:", buffer.length);
  console.error("========================================");

  return {
    text: "",
    source: "fallback_api_error",
  };
}

    const data = await response.json();
    const transcript = data?.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!transcript) {
      console.error("[extractFromAudio] Gemini response had no text content:", JSON.stringify(data));
      return { text: "", source: "fallback_empty_response" };
    }

    return { text: transcript.trim(), source: "llm" };
  } catch (err) {
    if (err.name === "AbortError") {
      console.error(`[extractFromAudio] Gemini API call timed out after ${REQUEST_TIMEOUT_MS / 1000}s`);
      return { text: "", source: "fallback_timeout" };
    }
    console.error("[extractFromAudio] Failed to call Gemini:", err.message);
    return { text: "", source: "fallback_exception" };
  } finally {
    clearTimeout(timeoutId);
  }
}

export { transcribeAudio, MIME_BY_EXTENSION };