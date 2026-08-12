// src/legalLookup.js
//
// Task 4: Legal section (BNS/BNSS/BSA) lookup + citation to source clause.
//
// Two matching modes, combined:
//   1. sopLink -- every legal section in legal_sections.json lists which
//      SOP(s) it belongs to, so once we know the matched SOP we pull its
//      linked sections directly.
//   2. keyword -- an independent check against the complaint text itself,
//      in case something in the complaint (e.g. a threat) should surface a
//      section the SOP match alone wouldn't catch.
//
// extractSectionMentions() + verifySectionExists() are the anti-hallucination
// guardrail described in the guide: before showing the officer any section
// number Gemini mentions in free text, we regex out every "Section X" it
// wrote and confirm that number actually exists in our indexed legal data.
// If it doesn't, we flag it as unverified instead of presenting it as fact.

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const LEGAL_DATA_PATH = path.join(__dirname, "..", "legal_data", "legal_sections.json");

export class LegalSectionLookup {
  constructor(dataPath = LEGAL_DATA_PATH) {
    const raw = fs.readFileSync(dataPath, "utf-8");
    this.data = JSON.parse(raw);
    this.sections = this.data.sections;
  }

  bySopIds(sopIds) {
    return this.sections
      .filter((s) => (s.sop_refs || []).some((ref) => sopIds.includes(ref)))
      .map((s) => ({ ...s, matchedVia: "sop_link" }));
  }

  byKeywords(text) {
    const lower = text.toLowerCase();
    return this.sections
      .filter((s) => (s.keywords || []).some((kw) => lower.includes(kw.toLowerCase())))
      .map((s) => ({ ...s, matchedVia: "keyword" }));
  }

  /** Merged, de-duplicated lookup. sop_link matches take priority. */
  lookup(complaintText, sopIds) {
    const seen = new Map();
    for (const sec of this.bySopIds(sopIds)) {
      seen.set(`${sec.act}-${sec.section}`, sec);
    }
    for (const sec of this.byKeywords(complaintText)) {
      const key = `${sec.act}-${sec.section}`;
      if (!seen.has(key)) seen.set(key, sec);
    }
    return [...seen.values()];
  }

  /** Every section number this dataset actually contains, e.g. "BNS 318". */
  knownSectionKeys() {
    return new Set(this.sections.map((s) => `${s.act.toUpperCase()} ${s.section}`));
  }
}

/**
 * Pull every "Section X, ACT" style mention out of free text written by the LLM.
 * Matches things like "Section 318 BNS", "BNS Section 318", "Section 318(4), BNS".
 */
export function extractSectionMentions(text) {
  const pattern = /(?:(BNS|BNSS|BSA)\s+)?Section\s+(\d+[A-Za-z()0-9]*)\s*,?\s*(BNS|BNSS|BSA)?/gi;
  const mentions = [];
  let match;
  while ((match = pattern.exec(text)) !== null) {
    const act = (match[1] || match[3] || "").toUpperCase();
    const section = match[2];
    if (act) mentions.push({ act, section });
  }
  return mentions;
}

/**
 * Cross-check LLM-mentioned sections against what's actually in our dataset.
 * Returns { verified: [...], unverified: [...] } so the UI can flag anything
 * the model may have hallucinated.
 */
export function verifySectionMentions(text, lookup) {
  const known = lookup.knownSectionKeys();
  const mentions = extractSectionMentions(text);
  const verified = [];
  const unverified = [];
  for (const m of mentions) {
    // loose match: strip trailing sub-clause markers like "(4)" for the check
    const baseSection = m.section.replace(/\(.*\)/, "");
    const key = `${m.act} ${baseSection}`;
    if (known.has(key) || known.has(`${m.act} ${m.section}`)) {
      verified.push(m);
    } else {
      unverified.push(m);
    }
  }
  return { verified, unverified };
}

// Quick manual test: `npm run test-legal` (no API key needed, this is pure local data)
if (import.meta.url === `file://${process.argv[1]}`) {
  const lookup = new LegalSectionLookup();
  const results = lookup.lookup(
    "Caller pretending to be bank official asked for OTP, victim lost 45000 rupees",
    ["SOP-CYB-001"]
  );
  for (const sec of results) {
    console.log(`${sec.act} Sec. ${sec.section} — ${sec.title} | ${sec.matchedVia}`);
  }

  console.log("\n--- hallucination guardrail test ---");
  const sample = "This looks like Section 318 BNS, and possibly Section 999 BNS (made up).";
  console.log(verifySectionMentions(sample, lookup));
}