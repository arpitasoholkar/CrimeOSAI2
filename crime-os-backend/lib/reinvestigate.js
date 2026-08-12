// crime-os-backend/lib/reinvestigate.js
//
// Single entry point for triggering the AI investigation engine
// (crimeos-brain) whenever meaningful new information lands on a case.
//
// Deliberately NOT called on every trivial update -- only from the
// handful of places in this backend that represent genuinely new
// investigation-relevant information:
//
//   - routes/ingest.js            -> evidence_added / initial_complaint
//   - evidenceController.js       -> evidence_added (file upload)
//   - caseController.js           -> legal_response_received
//   - caseController.js           -> manual_reinvestigation (officer button)
//
// This keeps the "when do we re-run the AI" decision in one place instead
// of scattered across route handlers, and keeps it off the hot path of
// the HTTP response (fire-and-forget, like the existing /ingest trigger).

const BRAIN_URL = process.env.BRAIN_URL || "http://localhost:3001";

/**
 * @param {string} caseId
 * @param {"initial_complaint"|"evidence_added"|"legal_response_received"|"entity_added"|"manual_reinvestigation"} trigger
 * @param {{ await?: boolean }} [opts] - pass { await: true } for the manual
 *   "Re-investigate" button, where the officer is waiting on the result.
 */
export async function triggerReinvestigation(caseId, trigger, opts = {}) {
  const run = () =>
    fetch(`${BRAIN_URL}/api/investigate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ case_id: caseId, trigger }),
    });

  if (opts.await) {
    const res = await run();
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(data?.error || "Re-investigation failed");
    }
    return data;
  }

  // Fire-and-forget -- never let a failed/slow AI call break the request
  // that triggered it (evidence upload, legal response, etc still succeed).
  run().catch((err) =>
    console.error(`[reinvestigate] trigger "${trigger}" for ${caseId} failed:`, err.message)
  );
  return null;
}
