// // src/investigationEngine.js
// //
// // Task 3: LLM prompt -> suggested investigation path from complaint + matched SOP.
// // Task 5: Confidence scoring on suggestions.
// //
// // suggest(complaintText) is the one function everything else calls. It:
// //   1. retrieves the most relevant SOP chunks (retrieval.js)
// //   2. asks Gemini to produce a structured investigation path, grounded
// //      ONLY in those SOP chunks (reduces invented steps)
// //   3. looks up + verifies legal sections (legalLookup.js)
// //   4. computes a confidence score blending retrieval similarity + Gemini's
// //      own self-rating, rather than trusting either signal alone
// //
// // NOTE: every investigation-path step and legal section gets a stable `id`
// // field. These ids let the front-end remember which items the officer had
// // selected in the most recent approval, across page reloads -- matching on
// // free-text (the action wording, the citation string) is fragile because
// // the officer can edit the step text in the textarea before approving.

// import { GoogleGenerativeAI } from "@google/generative-ai";
// import dotenv from "dotenv";
// import { SOPRetriever } from "./retrieval.js";
// import { LegalSectionLookup, verifySectionMentions } from "./legalLookup.js";

// dotenv.config();

// const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
// const reasoningModel = genAI.getGenerativeModel({ model: "gemini-flash-latest" });

// const SYSTEM_PROMPT = `You are an investigation-support assistant for police officers in India, \
// working strictly from the SOP excerpts provided to you. You are NOT a substitute for the \
// officer's judgement or for legal advice.

// Rules:
// 1. Base every investigation step ONLY on the SOP excerpts given. Do not invent steps that \
// aren't grounded in the SOP text.
// 2. If the complaint doesn't clearly match the provided SOP excerpts, say so plainly instead \
// of forcing a fit.
// 3. Do not determine anyone's guilt. Your output is a suggested procedural path for the \
// officer to review, edit, and approve.
// 4. Output ONLY valid JSON matching the schema given -- no prose outside the JSON, no \
// markdown code fences.
// 5. Rate your own confidence (0.0-1.0) honestly based on how directly the SOP excerpts \
// address this specific complaint. Do not default to a high number.`;

// function buildUserPrompt(complaintText, sopContext) {
//   return `COMPLAINT (structured extract from intake pipeline):
// ---
// ${complaintText}
// ---

// MATCHED SOP EXCERPTS (retrieved by relevance, most relevant first):
// ---
// ${sopContext}
// ---

// Produce a JSON object with this exact schema:
// {
//   "matched_sop_ids": ["<sop id(s) this complaint is governed by>"],
//   "investigation_path": [
//     {"step": 1, "action": "<specific action>", "grounded_in": "<which SOP section this comes from>"}
//   ],
//   "immediate_actions": ["<time-sensitive first actions, if the SOP specifies them>"],
//   "escalation_flag": {"required": true, "reason": "<why, if true>"},
//   "llm_confidence": 0.0,
//   "confidence_reasoning": "<one sentence on why you rated it this way>",
//   "gaps": ["<anything the complaint is missing that the officer should ask about>"]
// }`;
// }

// function buildSopContext(results) {
//   return results
//     .map(
//       ({ chunk, score }) =>
//         `[${chunk.sopId} | ${chunk.sourceFile} | relevance=${score.toFixed(2)}]\n${chunk.text}`
//     )
//     .join("\n\n---\n\n");
// }

// function scoreConfidence(retrievedResults, llmConfidence) {
//   if (retrievedResults.length === 0) {
//     return { combined: 0, breakdown: { retrievalConfidence: 0, sopAgreement: 0, llmConfidence } };
//   }
//   const topScore = retrievedResults[0].score;
//   const retrievalConfidence = Math.max(0, Math.min(1, topScore));

//   const topSopId = retrievedResults[0].chunk.sopId;
//   const agreementCount = retrievedResults.filter((r) => r.chunk.sopId === topSopId).length;
//   const sopAgreement = agreementCount / retrievedResults.length;

//   const combined = 0.5 * retrievalConfidence + 0.25 * sopAgreement + 0.25 * llmConfidence;
//   return {
//     combined,
//     breakdown: {
//       retrievalConfidence: Number(retrievalConfidence.toFixed(2)),
//       sopAgreement: Number(sopAgreement.toFixed(2)),
//       llmSelfAssessment: Number(llmConfidence.toFixed(2)),
//       combined: Number(combined.toFixed(2)),
//     },
//   };
// }

// export class InvestigationEngine {
// constructor() {
//   this.retriever = new SOPRetriever();
//   this.legalLookup = new LegalSectionLookup();

//   this._ready = false;
//   this._initPromise = null;
// }

// async init() {
//   // Already initialized
//   if (this._ready) return;

//   // First request starts the initialization
//   if (!this._initPromise) {
//     this._initPromise = this.retriever.buildIndex().then(() => {
//       this._ready = true;
//     });
//   }

//   // Everyone else waits for the same initialization
//   await this._initPromise;
// }

//   /**
//    * @param {string} complaintText
//    * @param {number} topK
//    */
//   async suggest(complaintText, topK = 5) {
//     await this.init();

//     const retrievedResults = await this.retriever.search(complaintText, topK);
//     const sopContext = buildSopContext(retrievedResults);

//     async function generateWithRetry(request, maxRetries = 3) {
//       for (let attempt = 1; attempt <= maxRetries; attempt++) {
//         try {
//           return await reasoningModel.generateContent(request);
//         } catch (err) {
//           const isRetryable = err.status === 503 || err.status === 429;
//           if (!isRetryable || attempt === maxRetries) throw err;
//           const waitMs = attempt * 2000; // 2s, 4s, 6s
//           console.log(`Gemini returned ${err.status}, retrying in ${waitMs / 1000}s (attempt ${attempt}/${maxRetries})...`);
//           await new Promise((resolve) => setTimeout(resolve, waitMs));
//         }
//       }
//     }

//     const result = await generateWithRetry({
//       contents: [{ role: "user", parts: [{ text: buildUserPrompt(complaintText, sopContext) }] }],
//       systemInstruction: SYSTEM_PROMPT,
//     });

//     let rawText = result.response.text().trim();
//     rawText = rawText.replace(/^```json/, "").replace(/^```/, "").replace(/```$/, "").trim();
//     const parsed = JSON.parse(rawText);

//     const matchedSopIds = parsed.matched_sop_ids || [];
//     const legalSections = this.legalLookup.lookup(complaintText, matchedSopIds);

//     // anti-hallucination guardrail on any section numbers mentioned in free text fields
//     const freeText = [
//       parsed.confidence_reasoning || "",
//       ...(parsed.investigation_path || []).map((s) => s.grounded_in || ""),
//     ].join(" ");
//     const sectionCheck = verifySectionMentions(freeText, this.legalLookup);

//     const llmConfidence = Number(parsed.llm_confidence ?? 0.5);
//     const { combined, breakdown } = scoreConfidence(retrievedResults, llmConfidence);

//     return {
//       matchedSopIds,
//       investigationPath: (parsed.investigation_path || []).map((s, i) => ({
//         id: `step-${i + 1}`,
//         step: s.step ?? i + 1,
//         action: s.action || "",
//         grounded_in: s.grounded_in || "",
//       })),
//       immediateActions: parsed.immediate_actions || [],
//       escalation: parsed.escalation_flag || { required: false, reason: "" },
//       legalSections: legalSections.map((s, i) => ({
//         id: `legal-${i + 1}`,
//         citation: `${s.act} Sec. ${s.section} — ${s.title}`,
//         summary: s.summary,
//         matchedVia: s.matchedVia,
//       })),
//       gaps: parsed.gaps || [],
//       confidence: combined,
//       confidenceBreakdown: breakdown,
//       unverifiedSectionMentions: sectionCheck.unverified,
//     };
//   }
// }

// // Quick manual test: `node src/investigationEngine.js` (needs GEMINI_API_KEY in .env)
// if (import.meta.url === `file://${process.argv[1]}`) {
//   const engine = new InvestigationEngine();
//   const sampleComplaint =
//     "Complainant states she received a call from a person claiming to be a bank manager, " +
//     "who asked her to share the OTP for KYC update. After sharing the OTP, Rs. 38,500 was " +
//     "debited from her account via UPI. She has the transaction reference number and the " +
//     "caller's phone number.";
//   const suggestion = await engine.suggest(sampleComplaint);
//   console.log(JSON.stringify(suggestion, null, 2));
// }


// src/investigationEngine.js
//
// Task 3: LLM prompt -> suggested investigation path from complaint + matched SOP.
// Task 5: Confidence scoring on suggestions.
//
// suggest(complaintText) is the one function everything else calls. It:
//   1. retrieves the most relevant SOP chunks (retrieval.js)
//   2. asks Gemini to produce a structured investigation path, grounded
//      ONLY in those SOP chunks (reduces invented steps)
//   3. looks up + verifies legal sections (legalLookup.js)
//   4. computes a confidence score blending retrieval similarity + Gemini's
//      own self-rating, rather than trusting either signal alone
//
// NOTE: every investigation-path step and legal section gets a stable `id`
// field. These ids let the front-end remember which items the officer had
// selected in the most recent approval, across page reloads -- matching on
// free-text (the action wording, the citation string) is fragile because
// the officer can edit the step text in the textarea before approving.

import { GoogleGenerativeAI } from "@google/generative-ai";
import dotenv from "dotenv";
import { SOPRetriever } from "./retrieval.js";
import { LegalSectionLookup, verifySectionMentions } from "./legalLookup.js";

dotenv.config();

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// IMPORTANT: don't point at a `-latest` alias in production. Aliases can move
// underneath you onto a newer/lower-quota model without any code change on
// your end -- that's exactly what happened here: `gemini-flash-latest`
// silently started resolving to `gemini-3.7-flash`, whose free tier only
// allows 5 requests/minute, so requests started 429'ing almost immediately.
// Pin to an explicit, stable model string and make it overridable via env
// so you can swap models without a redeploy the next time Google deprecates one.
const PRIMARY_MODEL = process.env.GEMINI_MODEL || "gemini-2.5-flash-lite";
// Used only if the primary model's retries are exhausted on a 429/503 -
// spreads load across two separate per-model quotas instead of hammering one.
const FALLBACK_MODEL = process.env.GEMINI_FALLBACK_MODEL || "gemini-2.0-flash-lite";

const reasoningModel = genAI.getGenerativeModel({ model: PRIMARY_MODEL });
const fallbackReasoningModel = genAI.getGenerativeModel({ model: FALLBACK_MODEL });

const SYSTEM_PROMPT = `You are an investigation-support assistant for police officers in India, \
working strictly from the SOP excerpts provided to you. You are NOT a substitute for the \
officer's judgement or for legal advice.

Rules:
1. Base every investigation step ONLY on the SOP excerpts given. Do not invent steps that \
aren't grounded in the SOP text.
2. If the complaint doesn't clearly match the provided SOP excerpts, say so plainly instead \
of forcing a fit.
3. Do not determine anyone's guilt. Your output is a suggested procedural path for the \
officer to review, edit, and approve.
4. Output ONLY valid JSON matching the schema given -- no prose outside the JSON, no \
markdown code fences.
5. Rate your own confidence (0.0-1.0) honestly based on how directly the SOP excerpts \
address this specific complaint. Do not default to a high number.`;

function buildUserPrompt(complaintText, sopContext) {
  return `COMPLAINT (structured extract from intake pipeline):
---
${complaintText}
---

MATCHED SOP EXCERPTS (retrieved by relevance, most relevant first):
---
${sopContext}
---

Produce a JSON object with this exact schema:
{
  "matched_sop_ids": ["<sop id(s) this complaint is governed by>"],
  "investigation_path": [
    {"step": 1, "action": "<specific action>", "grounded_in": "<which SOP section this comes from>"}
  ],
  "immediate_actions": ["<time-sensitive first actions, if the SOP specifies them>"],
  "escalation_flag": {"required": true, "reason": "<why, if true>"},
  "llm_confidence": 0.0,
  "confidence_reasoning": "<one sentence on why you rated it this way>",
  "gaps": ["<anything the complaint is missing that the officer should ask about>"]
}`;
}

function buildSopContext(results) {
  return results
    .map(
      ({ chunk, score }) =>
        `[${chunk.sopId} | ${chunk.sourceFile} | relevance=${score.toFixed(2)}]\n${chunk.text}`
    )
    .join("\n\n---\n\n");
}

function scoreConfidence(retrievedResults, llmConfidence) {
  if (retrievedResults.length === 0) {
    return { combined: 0, breakdown: { retrievalConfidence: 0, sopAgreement: 0, llmConfidence } };
  }
  const topScore = retrievedResults[0].score;
  const retrievalConfidence = Math.max(0, Math.min(1, topScore));

  const topSopId = retrievedResults[0].chunk.sopId;
  const agreementCount = retrievedResults.filter((r) => r.chunk.sopId === topSopId).length;
  const sopAgreement = agreementCount / retrievedResults.length;

  const combined = 0.5 * retrievalConfidence + 0.25 * sopAgreement + 0.25 * llmConfidence;
  return {
    combined,
    breakdown: {
      retrievalConfidence: Number(retrievalConfidence.toFixed(2)),
      sopAgreement: Number(sopAgreement.toFixed(2)),
      llmSelfAssessment: Number(llmConfidence.toFixed(2)),
      combined: Number(combined.toFixed(2)),
    },
  };
}

export class InvestigationEngine {
constructor() {
  this.retriever = new SOPRetriever();
  this.legalLookup = new LegalSectionLookup();

  this._ready = false;
  this._initPromise = null;
}

async init() {
  // Already initialized
  if (this._ready) return;

  // First request starts the initialization
  if (!this._initPromise) {
    this._initPromise = this.retriever.buildIndex().then(() => {
      this._ready = true;
    });
  }

  // Everyone else waits for the same initialization
  await this._initPromise;
}

  /**
   * @param {string} complaintText
   * @param {number} topK
   */
  async suggest(complaintText, topK = 5) {
    await this.init();

    const retrievedResults = await this.retriever.search(complaintText, topK);
    const sopContext = buildSopContext(retrievedResults);

    // Pulls the server-suggested wait time out of the error payload (e.g. a 429
    // quota error telling us "retryDelay": "28s") instead of guessing with a
    // fixed schedule that's often far too short for real quota resets.
    function extractRetryDelayMs(err) {
      const detail = err?.errorDetails?.find(
        (d) => d["@type"] === "type.googleapis.com/google.rpc.RetryInfo"
      );
      const raw = detail?.retryDelay; // e.g. "28s"
      if (!raw) return null;
      const seconds = parseFloat(raw);
      return Number.isFinite(seconds) ? seconds * 1000 : null;
    }

    async function generateWithRetry(model, request, maxRetries = 3) {
      for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
          return await model.generateContent(request);
        } catch (err) {
          const isRetryable = err.status === 503 || err.status === 429;
          if (!isRetryable || attempt === maxRetries) throw err;
          const serverDelay = extractRetryDelayMs(err);
          const waitMs = serverDelay ?? attempt * 2000; // fall back to 2s, 4s, 6s if no hint given
          console.log(
            `Gemini returned ${err.status}, retrying in ${(waitMs / 1000).toFixed(1)}s (attempt ${attempt}/${maxRetries})...`
          );
          await new Promise((resolve) => setTimeout(resolve, waitMs));
        }
      }
    }

    let result;
    try {
      result = await generateWithRetry(reasoningModel, {
        contents: [{ role: "user", parts: [{ text: buildUserPrompt(complaintText, sopContext) }] }],
        systemInstruction: SYSTEM_PROMPT,
      });
    } catch (primaryErr) {
      const isRetryable = primaryErr.status === 503 || primaryErr.status === 429;
      if (!isRetryable) throw primaryErr;
      console.log(`Primary model (${PRIMARY_MODEL}) exhausted retries on ${primaryErr.status}, falling back to ${FALLBACK_MODEL}...`);
      result = await generateWithRetry(fallbackReasoningModel, {
        contents: [{ role: "user", parts: [{ text: buildUserPrompt(complaintText, sopContext) }] }],
        systemInstruction: SYSTEM_PROMPT,
      });
    }

    let rawText = result.response.text().trim();
    rawText = rawText.replace(/^```json/, "").replace(/^```/, "").replace(/```$/, "").trim();
    const parsed = JSON.parse(rawText);

    const matchedSopIds = parsed.matched_sop_ids || [];
    const legalSections = this.legalLookup.lookup(complaintText, matchedSopIds);

    // anti-hallucination guardrail on any section numbers mentioned in free text fields
    const freeText = [
      parsed.confidence_reasoning || "",
      ...(parsed.investigation_path || []).map((s) => s.grounded_in || ""),
    ].join(" ");
    const sectionCheck = verifySectionMentions(freeText, this.legalLookup);

    const llmConfidence = Number(parsed.llm_confidence ?? 0.5);
    const { combined, breakdown } = scoreConfidence(retrievedResults, llmConfidence);

    return {
      matchedSopIds,
      investigationPath: (parsed.investigation_path || []).map((s, i) => ({
        id: `step-${i + 1}`,
        step: s.step ?? i + 1,
        action: s.action || "",
        grounded_in: s.grounded_in || "",
      })),
      immediateActions: parsed.immediate_actions || [],
      escalation: parsed.escalation_flag || { required: false, reason: "" },
      legalSections: legalSections.map((s, i) => ({
        id: `legal-${i + 1}`,
        citation: `${s.act} Sec. ${s.section} — ${s.title}`,
        summary: s.summary,
        matchedVia: s.matchedVia,
      })),
      gaps: parsed.gaps || [],
      confidence: combined,
      confidenceBreakdown: breakdown,
      unverifiedSectionMentions: sectionCheck.unverified,
    };
  }
}

// Quick manual test: `node src/investigationEngine.js` (needs GEMINI_API_KEY in .env)
if (import.meta.url === `file://${process.argv[1]}`) {
  const engine = new InvestigationEngine();
  const sampleComplaint =
    "Complainant states she received a call from a person claiming to be a bank manager, " +
    "who asked her to share the OTP for KYC update. After sharing the OTP, Rs. 38,500 was " +
    "debited from her account via UPI. She has the transaction reference number and the " +
    "caller's phone number.";
  const suggestion = await engine.suggest(sampleComplaint);
  console.log(JSON.stringify(suggestion, null, 2));
}