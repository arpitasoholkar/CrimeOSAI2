/**
 * extractFromFile.js
 *
 * Handles pulling raw text out of non-text file formats.
 * Currently: PDF. Image OCR and audio transcription get added here later
 * (Steps 5-6) following the same pattern — buffer in, plain text out.
 */

import { PDFParse } from "pdf-parse";

/**
 * Extract raw text from a PDF file buffer.
 * Strips page-count markers (e.g. "-- 1 of 1 --") and collapses
 * line-wrap whitespace/newlines into single spaces, since PDFs often
 * break numbers/words across lines in ways that would otherwise corrupt
 * downstream regex matches (e.g. "Rs.\n7500").
 * @param {Buffer} buffer - the raw PDF file contents
 * @returns {Promise<string>} extracted, cleaned text
 */
async function extractTextFromPDF(buffer) {
  const parser = new PDFParse({ data: buffer });
  try {
    const result = await parser.getText();
    return cleanExtractedText(result.text);
  } finally {
    await parser.destroy();
  }
}

function cleanExtractedText(rawText) {
  return rawText
    .replace(/--\s*\d+\s*of\s*\d+\s*--/g, "") // strip page markers
    .replace(/\s+/g, " ") // collapse all whitespace/newlines to single spaces
    .trim();
}

export { extractTextFromPDF };
