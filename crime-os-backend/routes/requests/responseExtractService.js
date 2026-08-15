/**
 * responseExtractService.js
 *
 * Given the raw text of a provider's reply to a legal request (bank or
 * telecom), asks Gemini to pull out the structured fields that
 * recordLegalResponse() expects -- so an officer can paste in the reply
 * and get a pre-filled form instead of transcribing every field by hand.
 *
 * IMPORTANT: this only ever returns *suggested* values. Nothing here
 * writes to the case -- the officer must review and submit them via the
 * existing POST /cases/:case_id/request/:requestId/response endpoint,
 * same as if they'd typed them in manually. That keeps a human in the
 * loop before anything becomes case evidence.
 *
 * Reuses the same Gemini call pattern as lib/llmExtract.js, including
 * its no-key fallback so the app keeps working without GEMINI_API_KEY set.
 */

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_MODEL = "gemini-2.5-flash";
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;

const PLACEHOLDER_VALUES = ["YOUR_GEMINI_API_KEY_HERE", "", undefined];
const REQUEST_TIMEOUT_MS = 30_000;

// Matches the `data` fields recordLegalResponse() knows how to turn into
// case entities (see ENTITY_TYPE_LABELS in caseController.js). Kept as a
// single source of truth here so the prompt and the response shape can't
// drift apart from what the record endpoint actually accepts.
const RESPONSE_FIELDS = {
  telecom: ["kycPhone", "kycAddress", "simOwner", "towerLocation", "deviceId"],
  bank: ["accountHolder", "accountNumber", "kycAddress", "ipAddress", "deviceId"],
};

const FIELD_DESCRIPTIONS = {
  accountHolder: "the name of the account holder / registered subscriber",
  accountNumber: "bank account number, if present",
  kycPhone: "phone number on file in the provider's KYC/subscriber records",
  kycAddress: "address on file in the provider's KYC/subscriber records",
  deviceId: "device or IMEI identifier, if present",
  ipAddress: "IP address, if present",
  simOwner: "name of the SIM card's registered owner",
  towerLocation: "cell tower location description, if present",
};

const emptyResult = (requestType, source) => ({
  fields: RESPONSE_FIELDS[requestType].reduce((acc, f) => ({ ...acc, [f]: null }), {}),
  notes: null,
  source,
});

async function extractResponseFields(replyText, requestType) {
  const fieldNames = RESPONSE_FIELDS[requestType];
  if (!fieldNames) {
    throw new Error(`Unsupported request type for extraction: ${requestType}`);
  }

  if (!replyText || !replyText.trim()) {
    return emptyResult(requestType, "empty_input");
  }

  if (PLACEHOLDER_VALUES.includes(GEMINI_API_KEY)) {
    console.warn(
      "[responseExtractService] GEMINI_API_KEY not set — skipping LLM call, returning empty fields."
    );
    return emptyResult(requestType, "fallback_no_key");
  }

  const fieldList = fieldNames
    .map((f) => `  - "${f}": ${FIELD_DESCRIPTIONS[f]}`)
    .join("\n");

  const prompt = `You are helping an investigating officer read a ${requestType === "telecom" ? "telecom operator's" : "bank's"} reply to a lawful records request, and pull out only the following fields if they are stated in the text. Do not infer or guess a value that isn't actually present in the text -- use null for anything not clearly stated.

Fields to extract:
${fieldList}

Also include a "notes" field: a short (1-2 sentence) plain-language summary of anything else useful in the reply that doesn't fit the fields above (e.g. "Provider states the account was closed in 2024" or "No matching subscriber found"). Use null if there's nothing further to note.

Return ONLY a JSON object with exactly this shape, no other text, no markdown fences:
{
  "fields": { ${fieldNames.map((f) => `"${f}": string | null`).join(", ")} },
  "notes": string | null
}

Reply text:
"""
${replyText}
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
      console.error(
        "[responseExtractService] Gemini API returned an error:",
        response.status,
        errBody
      );
      return emptyResult(requestType, "fallback_api_error");
    }

    const data = await response.json();
    const rawText = data?.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!rawText) {
      console.error(
        "[responseExtractService] Gemini response had no text content:",
        JSON.stringify(data)
      );
      return emptyResult(requestType, "fallback_empty_response");
    }

    const cleaned = rawText.replace(/```json|```/g, "").trim();
    const parsed = JSON.parse(cleaned);

    // Only keep fields we actually asked for, and only non-empty strings --
    // guards against the model inventing extra keys or returning "" instead
    // of null.
    const fields = {};
    for (const f of fieldNames) {
      const value = parsed?.fields?.[f];
      fields[f] = typeof value === "string" && value.trim() ? value.trim() : null;
    }

    return {
      fields,
      notes: typeof parsed?.notes === "string" && parsed.notes.trim() ? parsed.notes.trim() : null,
      source: "llm",
    };
  } catch (err) {
    if (err.name === "AbortError") {
      console.error(
        `[responseExtractService] Gemini API call timed out after ${REQUEST_TIMEOUT_MS / 1000}s`
      );
      return emptyResult(requestType, "fallback_timeout");
    }
    console.error("[responseExtractService] Failed to call or parse Gemini response:", err.message);
    return emptyResult(requestType, "fallback_exception");
  } finally {
    clearTimeout(timeoutId);
  }
}

export { extractResponseFields, RESPONSE_FIELDS };
