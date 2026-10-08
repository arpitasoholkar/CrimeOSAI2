// crime-os-backend/lib/reinvestigate.js
//
// Single entry point for triggering the AI investigation engine
// (crimeos-brain) whenever meaningful new information lands on a case.
//
// FIX: previously the fire-and-forget path only caught network errors.
// If the brain answered with an HTTP error (500 / 429 / bad Gemini key),
// nothing was logged and the UI still said "AI investigation triggered".
// Now every path checks res.ok, and callers can read the real outcome.

const BRAIN_URL = process.env.BRAIN_URL || "http://localhost:3001";

/**
 * @param {string} caseId
 * @param {"initial_complaint"|"evidence_added"|"legal_response_received"|"entity_added"|"manual_reinvestigation"} trigger
 * @param {{ await?: boolean }} [opts]
 *   - { await: true }  -> throws if the investigation fails (use for manual button)
 *   - default          -> fire-and-forget, errors are logged loudly
 */
export async function triggerReinvestigation(caseId, trigger, opts = {}) {
  const run = async () => {
    const res = await fetch(`${BRAIN_URL}/api/investigate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ case_id: caseId, trigger }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(data?.error || data?.detail || `Brain returned HTTP ${res.status}`);
    }
    return data;
  };

  if (opts.await) {
    return run();
  }

  run()
    .then(() => console.log(`[reinvestigate] "${trigger}" for ${caseId} completed`))
    .catch((err) =>
      console.error(`[reinvestigate] trigger "${trigger}" for ${caseId} FAILED:`, err.message)
    );
  return null;
}