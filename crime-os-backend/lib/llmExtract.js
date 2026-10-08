/**
 * llmExtract.js
 *
 * Calls the Gemini API to extract person names, addresses and detect language
 * from complaint text.
 *
 * Model strategy:
 *
 *   Primary  -> gemini-flash-lite-latest
 *   Fallback -> gemini-flash-latest
 *
 * Both can be overridden through:
 *
 *   LLM_EXTRACT_MODEL
 *   LLM_EXTRACT_FALLBACK_MODEL
 */

import dotenv from "dotenv";

dotenv.config();

const GEMINI_API_KEY =
  process.env.GEMINI_API_KEY;

const PRIMARY_MODEL =
  process.env.LLM_EXTRACT_MODEL ||
  "gemini-flash-lite-latest";

const FALLBACK_MODEL =
  process.env.LLM_EXTRACT_FALLBACK_MODEL ||
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

  /*
   * Structured RetryInfo.
   */
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

  /*
   * Plain-text error:
   * "Please retry in 28s"
   */
  const textMatch =
    errBody.match(
      /retry in (\d+(?:\.\d+)?)s/i
    );

  if (textMatch) {
    return (
      Math.ceil(
        parseFloat(textMatch[1])
      ) * 1000
    ) + 500;
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

    /*
     * Don't block the request for an
     * unreasonable quota reset time.
     */
    if (
      waitMs > MAX_WAIT_MS
    ) {
      const err =
        new Error(
          `Gemini requested a retry delay of ${(
            waitMs / 1000
          ).toFixed(1)}s, which exceeds the maximum wait time.`
        );

      err.status =
        response.status;

      err.body =
        errBody;

      throw err;
    }

    console.log(
      `[llmExtract] Gemini (${model}) returned ${
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

async function extractNamesAndLanguage(
  text
) {
  if (
    PLACEHOLDER_VALUES.includes(
      GEMINI_API_KEY
    )
  ) {
    console.warn(
      "[llmExtract] GEMINI_API_KEY not set — skipping LLM call, using fallback."
    );

    return {
      names: [],
      addresses: [],
      language: "unknown",
      source: "fallback_no_key",
    };
  }

  if (
    !text ||
    !text.trim()
  ) {
    return {
      names: [],
      addresses: [],
      language: "unknown",
      source: "empty_input",
    };
  }

  const prompt = `You are analyzing a cyber-crime complaint filed with Indian police. The text may be in English, Hindi, Gujarati, or a mix — including romanized Hindi/Gujarati written using English letters (e.g. "mujhe paisa chahiye").

Return ONLY a JSON object, with no other text and no markdown code fences, in exactly this shape:

{
  "names": ["array of person names mentioned in the text — exclude company names, app names, and platform names"],
  "addresses": ["array of physical places/addresses mentioned in the text — shop fronts, delivery addresses, meeting spots, localities, landmarks, or any text describing where something happened or where someone can be found. Write each as the fullest address-like phrase found in the text (e.g. 'Shop No. 12, MG Road, Near City Mall, Surat' rather than just 'Surat'). Exclude bare city/state names with no other context. Empty array if none are mentioned."],
  "language": "one of: en, hi, gu, hi-en, gu-en, unknown"
}

Complaint text:
"""
${text}
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
        "[llmExtract] Primary Gemini API error:",
        primaryErr.status,
        primaryErr.message
      );

      return {
        names: [],
        addresses: [],
        language: "unknown",
        source: "fallback_api_error",
      };
    }

    console.log(
      `[llmExtract] Primary model (${PRIMARY_MODEL}) exhausted retries on ${primaryErr.status}, falling back to ${FALLBACK_MODEL}...`
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
        "[llmExtract] Both Gemini models failed:",
        fallbackErr.status,
        fallbackErr.message
      );

      return {
        names: [],
        addresses: [],
        language: "unknown",
        source: "fallback_api_error",
      };
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
        "[llmExtract] Gemini response had no text content:",
        JSON.stringify(data)
      );

      return {
        names: [],
        addresses: [],
        language: "unknown",
        source:
          "fallback_empty_response",
      };
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

    return {
      names: Array.isArray(
        parsed.names
      )
        ? parsed.names
        : [],

      addresses:
        Array.isArray(
          parsed.addresses
        )
          ? parsed.addresses
          : [],

      language:
        parsed.language ||
        "unknown",

      source: "llm",
    };
  } catch (err) {
    console.error(
      "[llmExtract] Failed to parse Gemini response:",
      err.message
    );

    return {
      names: [],
      addresses: [],
      language: "unknown",
      source:
        "fallback_exception",
    };
  }
}

export {
  extractNamesAndLanguage,
};