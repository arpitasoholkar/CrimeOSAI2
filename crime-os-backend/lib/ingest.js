/**
 * ingest.js
 *
 * THE final wrapper for Person A's stage:
 *   raw complaint (any format) -> ingest() -> structured JSON
 *
 * This is the single entry point the rest of the pipeline (steps 1-6)
 * builds up to. It's deliberately decoupled from Express — you can call
 * it directly from a script, a test file, or a different server
 * framework entirely, not just through the /ingest HTTP route.
 *
 * Usage:
 *   import { ingest } from "./lib/ingest.js";
 *
 *   // Plain text
 *   const result = await ingest({ text: "Sir, I got a call from..." });
 *
 *   // File (PDF / image / audio) — pass a Buffer + filename
 *   const result = await ingest({
 *     fileBuffer: buffer,
 *     originalname: "complaint.pdf",
 *     mimetype: "application/pdf", // optional — filename extension is enough
 *   });
 */

import { extractEntities, detectLanguage } from "./extractEntities.js";
import { extractNamesAndLanguage } from "./llmExtract.js";
import { extractTextFromPDF } from "./extractFromFile.js";
import { extractTextFromImage } from "./extractFromImage.js";
import { transcribeAudio, MIME_BY_EXTENSION } from "./extractFromAudio.js";

const IMAGE_MIME_TYPES = ["image/jpeg", "image/png", "image/webp", "image/bmp"];
const IMAGE_EXTENSIONS = [".jpg", ".jpeg", ".png", ".webp", ".bmp"];
const AUDIO_MIME_TYPES = [
  "audio/mp3", "audio/mpeg", "audio/wav", "audio/x-wav",
  "audio/mp4", "audio/ogg", "audio/webm", "audio/flac", "video/mpeg",
];
const AUDIO_EXTENSIONS = Object.keys(MIME_BY_EXTENSION);

/**
 * Custom error type so callers (like the Express route) can tell the
 * difference between "bad input" (400/422) and a genuine server crash (500).
 */
class IngestError extends Error {
  constructor(message, statusCode = 422) {
    super(message);
    this.name = "IngestError";
    this.statusCode = statusCode;
  }
}

/**
 * The single entry point: raw complaint (any format) -> structured JSON.
 *
 * @param {Object} input
 * @param {string} [input.text] - raw complaint text (for text-based input)
 * @param {Buffer} [input.fileBuffer] - raw file bytes (for PDF/image/audio input)
 * @param {string} [input.originalname] - original filename, used to detect type by extension
 * @param {string} [input.mimetype] - MIME type if known (browser/multer-provided); extension is used as a fallback
 * @returns {Promise<Object>} the JSON contract: { complaint_id, raw_text, entities, language, source_type }
 */
async function ingest({ text, fileBuffer, originalname = "", mimetype = "" } = {}) {
  let resolvedText;
  let source_type;

  if (fileBuffer) {
    const filenameLower = originalname.toLowerCase();
    const isPDF = mimetype === "application/pdf" || filenameLower.endsWith(".pdf");
    const isImage =
      IMAGE_MIME_TYPES.includes(mimetype) ||
      IMAGE_EXTENSIONS.some((ext) => filenameLower.endsWith(ext));
    const isAudio =
      AUDIO_MIME_TYPES.includes(mimetype) ||
      AUDIO_EXTENSIONS.some((ext) => filenameLower.endsWith(ext));

    if (isPDF) {
      try {
        resolvedText = await extractTextFromPDF(fileBuffer);
      } catch (err) {
        console.error("[ingest] Failed to extract text from PDF:", err.message);
        throw new IngestError(
          "Could not extract text from this PDF. It may be scanned/image-only or corrupted."
        );
      }
      if (!resolvedText || !resolvedText.trim()) {
        throw new IngestError(
          "No extractable text found in this PDF. It may be a scanned image rather than real text."
        );
      }
      source_type = "pdf";
    } else if (isImage) {
      try {
        resolvedText = await extractTextFromImage(fileBuffer);
      } catch (err) {
        console.error("[ingest] Failed to run OCR on image:", err.message);
        throw new IngestError("Could not run OCR on this image. It may be corrupted or an unsupported format.");
      }
      if (!resolvedText || !resolvedText.trim()) {
        throw new IngestError("No text detected in this image via OCR.");
      }
      source_type = "image";
    } else if (isAudio) {
      const audioMime =
        MIME_BY_EXTENSION[AUDIO_EXTENSIONS.find((ext) => filenameLower.endsWith(ext))] ||
        mimetype;
      const transcription = await transcribeAudio(fileBuffer, audioMime);

      if (!transcription.text) {
        throw new IngestError(
          transcription.source === "fallback_no_key"
            ? "Audio transcription requires GEMINI_API_KEY to be set in .env."
            : "Could not transcribe this audio file. It may be corrupted, silent, or an unsupported format."
        );
      }
      resolvedText = transcription.text;
      source_type = "audio";
    } else {
      throw new IngestError(
        "Unsupported file type. Supported: PDF, JPG/PNG/WEBP/BMP, MP3/WAV/M4A/OGG/WEBM/FLAC.",
        400
      );
    }
  } else if (text && typeof text === "string" && text.trim()) {
    resolvedText = text;
    source_type = "text";
  } else {
    throw new IngestError(
      "Must provide either non-empty 'text' or a 'fileBuffer' (PDF/image/audio).",
      400
    );
  }

  const entities = extractEntities(resolvedText);
  const llmResult = await extractNamesAndLanguage(resolvedText);

  entities.names = llmResult.names;
  // Physical places/addresses mentioned in the complaint text -- this is
  // what feeds the Geographic Intelligence map's "ADDRESS" entity type
  // (see investigationState.js EVIDENCE_ENTITY_MAP). Without this, no
  // evidence-side entity ever had lat/lng, so the map stayed empty for
  // every case until a bank/telecom legal response came back with a
  // KYC_ADDRESS/TOWER_LOCATION -- even when the complaint text itself
  // clearly named a real place.
  entities.addresses = llmResult.addresses;

  const language =
    llmResult.language && llmResult.language !== "unknown"
      ? llmResult.language
      : detectLanguage(resolvedText);

  return {
    raw_text: resolvedText,
    entities,
    language,
    source_type,
  };
}

export { ingest, IngestError };