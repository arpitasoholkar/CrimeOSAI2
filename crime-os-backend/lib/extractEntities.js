/**
 * extractEntities.js
 *
 * Person A's real regex extraction script (rebuilt — original file was lost).
 * Keep the RETURN SHAPE exactly as-is — that's the JSON contract
 * the rest of the team (Person B) is building against.
 */

function extractEntities(rawText) {
  const text = rawText || "";

  // --- Phone numbers ---
  // Handles any spacing/dash grouping: 9876543210 | +91 9876543210 |
  // +91-98765-43210 | 98765 43210 | 0-prefixed
  const phoneRegex = /(?:\+91[\-\s]?)?0?[6-9](?:[\-\s]?\d){9}\b/g;
  const phone_numbers = [
    ...new Set(
      (text.match(phoneRegex) || []).map((n) => n.replace(/[\s\-]/g, ""))
    ),
  ];

  // --- UPI IDs vs Emails ---
  // Real UPI handles never have a dot after the @ (e.g. fraud@oksbi,
  // vikas@paytm, 9876543210@ybl). Real emails always have a dot + TLD
  // after the @ (e.g. ops@test.org, fraudhelp@gmail.com). We use that
  // distinction rather than a hardcoded bank-handle whitelist, since
  // whitelists go stale as new UPI providers appear.
  // Matches are deduped by TEXT POSITION (not string equality) because
  // a truncated UPI-style match ("fraudhelp@gmail") and the full email
  // match ("fraudhelp@gmail.com") are different strings at overlapping
  // positions in the source text.
  //
  // Speech transcriptions often render "fraud at oksbi" as "fraud @ oksbi"
  // with stray spaces around the @ — tolerate a single space on either
  // side so audio-sourced complaints don't lose these matches. This does
  // NOT touch the raw_text field itself, only the copy used for matching.
  const textForEmailUpi = text.replace(/\s*@\s*/g, "@");

  const emailRegex = /\b[\w.\-]{2,64}@[\w\-]+(?:\.[\w\-]+)*\.[a-zA-Z]{2,24}\b/g;
  const emailMatches = [...textForEmailUpi.matchAll(emailRegex)].map((m) => ({
    raw: m[0],
    start: m.index,
    end: m.index + m[0].length,
  }));
  const emails = [...new Set(emailMatches.map((m) => m.raw))];

  const upiRegex = /\b[\w.\-]{2,64}@[a-zA-Z]{2,24}\b/g;
  const upiMatches = [...textForEmailUpi.matchAll(upiRegex)].map((m) => ({
    raw: m[0],
    start: m.index,
    end: m.index + m[0].length,
  }));
  const overlapsEmail = (u) =>
    emailMatches.some((e) => u.start < e.end && e.start < u.end);
  const upi_ids = [
    ...new Set(upiMatches.filter((u) => !overlapsEmail(u)).map((u) => u.raw)),
  ];

  // --- IFSC codes ---
  // Standardized RBI format: 4 letters (bank code) + literal 0 + 6
  // alphanumeric (branch code), e.g. SBIN0000456. Very low false-positive
  // rate since almost nothing else matches this exact shape.
  const ifscRegex = /\b[A-Z]{4}0[A-Z0-9]{6}\b/g;
  const ifsc_codes = [...new Set(text.match(ifscRegex) || [])];

  // --- Bank account numbers (9-18 digit sequences) ---
  // Excludes: phone number digits, and numbers immediately preceded by a
  // "MICR" label — MICR codes are also bare 9-digit numbers and would
  // otherwise be indistinguishable from a real account number. We can
  // only catch this because labelled documents (like bank detail cards)
  // put the label right before the number.
  const phoneDigitSuffixes = phone_numbers.map((p) => p.replace(/^\+?91/, "").replace(/^0/, ""));
  const bankRegex = /\b\d{9,18}\b/g;
  const bankMatches = [...text.matchAll(bankRegex)];
  const bank_accounts = [
    ...new Set(
      bankMatches
        .filter((m) => {
          const num = m[0];
          const precedingText = text.slice(Math.max(0, m.index - 20), m.index);
          const isMicr = /MICR[^0-9]{0,10}$/i.test(precedingText);
          const isPhoneDigits = phoneDigitSuffixes.some(
            (p) => p === num || p.endsWith(num) || num.endsWith(p)
          );
          return !isMicr && !isPhoneDigits;
        })
        .map((m) => m[0])
    ),
  ];

  // --- Amounts (INR, USD, EUR) ---
  // Handles prefix symbols/codes (₹5000, $50, €50, USD 50, EUR 50)
  // and suffix words (5000 rupees, 50 dollars, 50 euros).
  // Number pattern requires digit-grouped commas (not stray punctuation)
  // and overlapping prefix/suffix matches for the same mention are deduped.
  const NUMBER = "\\d+(?:,\\d{3})*(?:\\.\\d{1,2})?";
  const currencyDefs = [
    { code: "INR", prefix: "₹|Rs\\.?|INR", suffix: "rupees?|rs\\.?|inr" },
    { code: "USD", prefix: "\\$|USD", suffix: "dollars?|usd" },
    { code: "EUR", prefix: "€|EUR", suffix: "euros?|eur" },
  ];

  const findMatches = (regex) =>
    [...text.matchAll(regex)].map((m) => ({
      raw: m[0],
      start: m.index,
      end: m.index + m[0].length,
    }));
  const overlaps = (a, b) => a.start < b.end && b.start < a.end;

  let amounts = [];
  for (const { code, prefix, suffix } of currencyDefs) {
    const prefixRegex = new RegExp(`(?:${prefix})\\s?(?:${NUMBER})`, "gi");
    const suffixRegex = new RegExp(`\\b(?:${NUMBER})\\s?(?:${suffix})\\b`, "gi");

    const prefixMatches = findMatches(prefixRegex);
    const suffixMatches = findMatches(suffixRegex).filter(
      (s) => !prefixMatches.some((p) => overlaps(p, s))
    );

    for (const { raw } of [...prefixMatches, ...suffixMatches]) {
      const value = parseFloat(
        raw.replace(/[₹$€]/g, "").replace(new RegExp(prefix + "|" + suffix, "gi"), "").replace(/,/g, "").trim()
      );
      amounts.push({ value, currency: code, raw: raw.trim() });
    }
  }
  amounts.sort((a, b) => text.indexOf(a.raw) - text.indexOf(b.raw));

  // --- Dates (dd/mm/yyyy, dd-mm-yyyy, yyyy-mm-dd, dd.mm.yyyy) ---
  const dateRegex = /\b(?:\d{1,2}[\/\-.]\d{1,2}[\/\-.]\d{2,4}|\d{4}-\d{2}-\d{2})\b/g;
  const dates = [...new Set(text.match(dateRegex) || [])];

  // --- Platforms (simple keyword match — extend as needed) ---
  const platformKeywords = [
    "WhatsApp", "Telegram", "Instagram", "Facebook", "PhonePe",
    "Google Pay", "GPay", "Paytm", "Amazon", "Flipkart", "OLX"
  ];
  const platforms = platformKeywords.filter((kw) =>
    new RegExp(`\\b${kw}\\b`, "i").test(text)
  );

  // --- Names ---
  // Placeholder only — real implementation should call the LLM-based
  // name extraction function (Step 4). Left empty here on purpose.
  const names = [];

  return {
    names,
    phone_numbers,
    upi_ids,
    emails,
    bank_accounts,
    ifsc_codes,
    amounts,
    dates,
    platforms,
  };
}

/**
 * Lightweight script-based language detection.
 * Not a full language ID model — just checks which Unicode script
 * dominates the text. Good enough to distinguish English / Hindi /
 * Gujarati / mixed for routing purposes.
 */
function detectLanguage(text) {
  const devanagariCount = (text.match(/[\u0900-\u097F]/g) || []).length;
  const gujaratiCount = (text.match(/[\u0A80-\u0AFF]/g) || []).length;
  const latinLetterCount = (text.match(/[a-zA-Z]/g) || []).length;

  const total = devanagariCount + gujaratiCount + latinLetterCount;
  if (total === 0) return "unknown";

  if (devanagariCount > 0 && gujaratiCount === 0 && latinLetterCount > 0) return "hi-en";
  if (gujaratiCount > 0 && devanagariCount === 0 && latinLetterCount > 0) return "gu-en";
  if (devanagariCount > latinLetterCount && devanagariCount > gujaratiCount) return "hi";
  if (gujaratiCount > latinLetterCount && gujaratiCount > devanagariCount) return "gu";
  if (latinLetterCount > 0) return "en";

  return "unknown";
}

export { extractEntities, detectLanguage };