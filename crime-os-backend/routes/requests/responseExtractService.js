/**
 * responseExtractService.js
 *
 * Given the raw text of a provider's reply to a legal request
 * (bank or telecom), asks Gemini to pull out structured fields.
 *
 * IMPORTANT:
 * This only returns suggested values.
 * Nothing here writes directly to the case.
 *
 * The officer must review and submit the values through the
 * existing recordLegalResponse() flow.
 *
 * Model strategy:
 *
 *   Primary  -> gemini-flash-lite-latest
 *   Fallback -> gemini-flash-latest
 *
 * Both can be overridden through:
 *
 *   RESPONSE_EXTRACT_MODEL
 *   RESPONSE_EXTRACT_FALLBACK_MODEL
 */

import dotenv from "dotenv";

dotenv.config();

const GEMINI_API_KEY =
  process.env.GEMINI_API_KEY;

const PRIMARY_MODEL =
  process.env.RESPONSE_EXTRACT_MODEL ||
  "gemini-flash-lite-latest";

const FALLBACK_MODEL =
  process.env.RESPONSE_EXTRACT_FALLBACK_MODEL ||
  "gemini-flash-latest";

const PLACEHOLDER_VALUES = [
  "YOUR_GEMINI_API_KEY_HERE",
  "",
  undefined,
];

const REQUEST_TIMEOUT_MS = 30_000;
const MAX_WAIT_MS = 35_000;

function buildUrl(model) {
  return `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;
}

function extractRetryDelayMs(errBody) {
  if (!errBody) return null;

  const structuredMatch =
    errBody.match(
      /"retryDelay"\s*:\s*"(\d+(?:\.\d+)?)s"/
    );

  if (structuredMatch) {
    return (
      Math.ceil(
        parseFloat(
          structuredMatch[1]
        ) * 1000
      ) + 500
    );
  }

  const textMatch =
    errBody.match(
      /retry in (\d+(?:\.\d+)?)s/i
    );

  if (textMatch) {
    return (
      Math.ceil(
        parseFloat(
          textMatch[1]
        ) * 1000
      ) + 500
    );
  }

  return null;
}

async function generateWithRetry(
  model,
  prompt,
  maxRetries = 3
) {
  for (
    let attempt = 1;
    attempt <= maxRetries;
    attempt++
  ) {
    const controller =
      new AbortController();

    const timeoutId = setTimeout(
      () =>
        controller.abort(),
      REQUEST_TIMEOUT_MS
    );

    let response;

    try {
      response = await fetch(
        `${buildUrl(model)}?key=${GEMINI_API_KEY}`,
        {
          method: "POST",

          headers: {
            "Content-Type":
              "application/json",
          },

          body: JSON.stringify({
            contents: [
              {
                parts: [
                  {
                    text: prompt,
                  },
                ],
              },
            ],

            generationConfig: {
              temperature: 0,
              responseMimeType:
                "application/json",
            },
          }),

          signal:
            controller.signal,
        }
      );
    } catch (err) {
      if (
        err.name ===
        "AbortError"
      ) {
        const timeoutError =
          new Error(
            `Gemini request timed out after ${
              REQUEST_TIMEOUT_MS / 1000
            } seconds`
          );

        timeoutError.status =
          408;

        throw timeoutError;
      }

      throw err;
    } finally {
      clearTimeout(timeoutId);
    }

    if (response.ok) {
      return response;
    }

    const errBody =
      await response.text();

    const isRetryable =
      response.status === 429 ||
      response.status === 503;

    if (
      !isRetryable ||
      attempt === maxRetries
    ) {
      const err =
        new Error(errBody);

      err.status =
        response.status;

      err.body =
        errBody;

      throw err;
    }

    const serverDelay =
      extractRetryDelayMs(
        errBody
      );

    const waitMs =
      serverDelay ??
      attempt * 2000;

    if (
      waitMs > MAX_WAIT_MS
    ) {
      const err =
        new Error(
          `Gemini requested a retry delay of ${(
            waitMs / 1000
          ).toFixed(1)}s, exceeding the maximum wait time.`
        );

      err.status =
        response.status;

      err.body =
        errBody;

      throw err;
    }

    console.log(
      `[responseExtractService] Gemini (${model}) returned ${
        response.status
      }, retrying in ${(
        waitMs / 1000
      ).toFixed(
        1
      )}s (attempt ${attempt}/${maxRetries})...`
    );

    await new Promise(
      (resolve) =>
        setTimeout(
          resolve,
          waitMs
        )
    );
  }
}

/*
 * These are the exact fields that
 * recordLegalResponse() understands.
 */
const RESPONSE_FIELDS = {
  telecom: [
    "kycPhone",
    "kycAddress",
    "simOwner",
    "towerLocation",
    "deviceId",
  ],

  bank: [
    "accountHolder",
    "accountNumber",
    "kycAddress",
    "ipAddress",
    "deviceId",
  ],
};

const FIELD_DESCRIPTIONS = {
  accountHolder:
    "the name of the account holder / registered subscriber",

  accountNumber:
    "bank account number, if present",

  kycPhone:
    "phone number on file in the provider's KYC/subscriber records",

  kycAddress:
    "address on file in the provider's KYC/subscriber records",

  deviceId:
    "device or IMEI identifier, if present",

  ipAddress:
    "IP address, if present",

  simOwner:
    "name of the SIM card's registered owner",

  towerLocation:
    "cell tower location description, if present",
};

const emptyResult = (
  requestType,
  source
) => ({
  fields:
    RESPONSE_FIELDS[
      requestType
    ].reduce(
      (acc, field) => {
        acc[field] = null;
        return acc;
      },
      {}
    ),

  notes: null,

  source,
});

async function extractResponseFields(
  replyText,
  requestType
) {
  const fieldNames =
    RESPONSE_FIELDS[
      requestType
    ];

  if (!fieldNames) {
    throw new Error(
      `Unsupported request type for extraction: ${requestType}`
    );
  }

  if (
    !replyText ||
    !replyText.trim()
  ) {
    return emptyResult(
      requestType,
      "empty_input"
    );
  }

  if (
    PLACEHOLDER_VALUES.includes(
      GEMINI_API_KEY
    )
  ) {
    console.warn(
      "[responseExtractService] GEMINI_API_KEY not set — skipping LLM call."
    );

    return emptyResult(
      requestType,
      "fallback_no_key"
    );
  }

  const fieldList =
    fieldNames
      .map(
        (field) =>
          `  - "${field}": ${FIELD_DESCRIPTIONS[field]}`
      )
      .join("\n");

  const prompt = `You are helping an investigating officer read a ${
    requestType === "telecom"
      ? "telecom operator's"
      : "bank's"
  } reply to a lawful records request, and pull out only the following fields if they are stated in the text.

Do not infer or guess a value that isn't actually present in the text.
Use null for anything not clearly stated.

Fields to extract:

${fieldList}

Also include a "notes" field: a short (1-2 sentence) plain-language summary of anything else useful in the reply that doesn't fit the fields above.

Examples:
- "Provider states the account was closed in 2024"
- "No matching subscriber found"

Use null if there is nothing further to note.

Return ONLY a JSON object with exactly this shape, no other text and no markdown fences:

{
  "fields": {
${fieldNames
  .map(
    (field) =>
      `    "${field}": string | null`
  )
  .join(",\n")}
  },
  "notes": string | null
}

Reply text:
"""
${replyText}
"""`;

  let response;

  /*
   * Primary model.
   */
  try {
    response =
      await generateWithRetry(
        PRIMARY_MODEL,
        prompt
      );
  } catch (primaryErr) {
    const isRetryable =
      primaryErr?.status ===
        429 ||
      primaryErr?.status ===
        503;

    if (!isRetryable) {
      console.error(
        "[responseExtractService] Primary Gemini API error:",
        primaryErr.status,
        primaryErr.message
      );

      return emptyResult(
        requestType,
        "fallback_api_error"
      );
    }

    console.log(
      `[responseExtractService] Primary model (${PRIMARY_MODEL}) exhausted retries on ${primaryErr.status}, falling back to ${FALLBACK_MODEL}...`
    );

    /*
     * Fallback model.
     */
    try {
      response =
        await generateWithRetry(
          FALLBACK_MODEL,
          prompt
        );
    } catch (fallbackErr) {
      console.error(
        "[responseExtractService] Both Gemini models failed:",
        fallbackErr.status,
        fallbackErr.message
      );

      return emptyResult(
        requestType,
        "fallback_api_error"
      );
    }
  }

  try {
    const data =
      await response.json();

    const rawText =
      data?.candidates?.[0]
        ?.content?.parts?.[0]
        ?.text;

    if (!rawText) {
      console.error(
        "[responseExtractService] Gemini response had no text content:",
        JSON.stringify(data)
      );

      return emptyResult(
        requestType,
        "fallback_empty_response"
      );
    }

    const cleaned =
      rawText
        .replace(
          /```json|```/g,
          ""
        )
        .trim();

    const parsed =
      JSON.parse(cleaned);

    /*
     * Only keep the fields that we explicitly
     * asked for.
     */
    const fields = {};

    for (const field of fieldNames) {
      const value =
        parsed?.fields?.[field];

      fields[field] =
        typeof value === "string" &&
        value.trim()
          ? value.trim()
          : null;
    }

    return {
      fields,

      notes:
        typeof parsed?.notes ===
          "string" &&
        parsed.notes.trim()
          ? parsed.notes.trim()
          : null,

      source: "llm",
    };
  } catch (err) {
    console.error(
      "[responseExtractService] Failed to parse Gemini response:",
      err.message
    );

    return emptyResult(
      requestType,
      "fallback_exception"
    );
  }
}

export {
  extractResponseFields,
  RESPONSE_FIELDS,
};