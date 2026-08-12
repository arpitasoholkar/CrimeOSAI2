/**
 * extractFromImage.js
 *
 * Runs OCR (Optical Character Recognition) on an uploaded image to pull
 * out raw text — e.g. screenshots of chats, photos of handwritten notes,
 * fake payment receipts, etc.
 *
 * Uses tesseract.js (pure JS, no Python/system Tesseract install needed).
 */

import { createWorker } from "tesseract.js";

// Default CDN (jsdelivr) may be blocked on some networks/sandboxes.
// GitHub's raw content mirror hosts the same trained data and tends to
// be reachable more broadly. Override if you hit network issues.
const LANG_PATH = "https://raw.githubusercontent.com/tesseract-ocr/tessdata/main";

/**
 * Extract raw text from an image file buffer via OCR.
 * @param {Buffer} buffer - the raw image file contents (jpg/png/etc)
 * @returns {Promise<string>} extracted, cleaned text
 */
async function extractTextFromImage(buffer) {
  const worker = await createWorker("eng", 1, {
    langPath: LANG_PATH,
    gzip: false,
  });
  try {
    const { data } = await worker.recognize(buffer);
    return cleanOcrText(data.text);
  } finally {
    await worker.terminate();
  }
}

function cleanOcrText(rawText) {
  return rawText.replace(/\s+/g, " ").trim();
}

export { extractTextFromImage };
