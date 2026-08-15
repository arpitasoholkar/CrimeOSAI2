// crimeos-brain/src/server.js
//
//   POST /api/suggest              -> run raw complaint text through the pipeline directly (manual testing)
//   POST /api/decision             -> log the officer's approve/edit/reject choice (in-memory, testing only)
//   GET  /api/audit-log            -> see everything logged so far (demo-only, in-memory)
//   POST /api/investigate          -> REAL integration point: crime-os-backend calls this with a
//                                      case_id + trigger, we read the case from the shared MongoDB,
//                                      run the SOP-grounded engine, and APPEND a new investigation
//                                      version (known/missing/findings/recommendations/entities/
//                                      relationships/delta) -- never overwrites the previous one.
//   POST /api/case/:id/approve     -> save the officer's selected steps/legal sections to case.reports
//   POST /api/case/:id/recommendation/:recommendationId/status
//                                   -> approve/reject one Next-Best-Action recommendation on the
//                                      latest investigation version
//   GET  /api/case/:id/similar     -> lightweight case-to-case similarity (embeddings + cosine sim)
//
// Run with: npm start   (needs GEMINI_API_KEY and MONGO_URI in .env)

import express from "express";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import { InvestigationEngine } from "./investigationEngine.js";
import { connectDB, Case } from "./db.js";
import { assembleInvestigationVersion } from "./investigationState.js";
import { createHashedAuditEntry } from "./auditHash.js";
import { embedText, cosineSimilarity } from "./embeddings.js";

dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
// NOTE: default changed from 4000 -> 3001. crimeos-frontend's apiBrain
// client (api/api.js) and crime-os-backend's reinvestigate trigger
// (lib/reinvestigate.js) both assume this service is on 3001 by default;
// they previously disagreed with this file's old 4000 default unless
// PORT was set in .env. Override with PORT= if you need something else.
const port = process.env.PORT || 3001;

app.use(express.json());
app.use(express.static(path.join(__dirname, "..", "public")));

// Minimal CORS handling -- no `cors` package installed here, and the
// frontend (Vite dev server, a different origin/port) needs this to call
// these endpoints directly from the browser.
app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
  res.header("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.sendStatus(204);
  next();
});

const engine = new InvestigationEngine();

connectDB().catch((err) => {
  console.error("Failed to connect to shared MongoDB:", err.message);
});

// In-memory audit log -- only used by the standalone /api/suggest + /api/decision
// testing routes below, unrelated to the real MongoDB-backed flow.
const auditLog = [];

// ---------- Manual testing routes (no MongoDB involved) ----------

app.post("/api/suggest", async (req, res) => {
  const { complaintText } = req.body;
  if (!complaintText || !complaintText.trim()) {
    return res.status(400).json({ error: "complaintText is required" });
  }
  try {
    const suggestion = await engine.suggest(complaintText);
    res.json(suggestion);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to generate suggestion", detail: err.message });
  }
});

app.post("/api/decision", (req, res) => {
  const { complaintText, originalSuggestion, officerDecision, officerNotes } = req.body;
  const entry = {
    complaintText,
    originalSuggestion,
    officerDecision,
    officerNotes,
    loggedAt: new Date().toISOString(),
  };
  auditLog.push(entry);
  res.json({ status: "logged", entry });
});

app.get("/api/audit-log", (req, res) => {
  res.json(auditLog);
});

// ---------- Read a case (for the case.html view page) ----------

app.get("/api/case/:case_id", async (req, res) => {
  try {
    const caseDoc = await Case.findOne({ case_id: req.params.case_id });
    if (!caseDoc) return res.status(404).json({ error: "Case not found" });
    res.json(caseDoc);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch case", detail: err.message });
  }
});

// ---------- Helpers ----------

// Cases may come from either the newer CrimeOS structure (`complaint.raw`)
// or the older `evidence[].raw_text` structure. Prefer the newer field,
// fall back to the older one.
function extractComplaintText(caseDoc) {
  if (caseDoc.complaint?.raw) {
    return caseDoc.complaint.raw;
  }
  if (caseDoc.evidence?.length) {
    return caseDoc.evidence
      .map((e) => e.raw_text)
      .filter(Boolean)
      .join("\n\n");
  }
  return "";
}

// ---------- Real integration route (shared MongoDB with her backend) ----------

app.post("/api/investigate", async (req, res) => {
  const { case_id, trigger } = req.body;
  if (!case_id) {
    return res.status(400).json({ error: "case_id is required" });
  }

  try {
    let caseDoc = await Case.findOne({ case_id });
    if (!caseDoc) {
      caseDoc = await Case.findOne({ caseId: case_id });
    }
    if (!caseDoc) return res.status(404).json({ error: "Case not found" });

    const complaintText = extractComplaintText(caseDoc);

    if (!complaintText.trim()) {
      return res.status(400).json({
        error: "No complaint/evidence text found for this case",
      });
    }

    const suggestion = await engine.suggest(complaintText);

    // Trigger defaults to "initial_complaint" for a case's first
    // investigation, "manual_reinvestigation" otherwise, unless the
    // caller (evidence upload / legal response / ingest) told us exactly
    // what happened.
    const resolvedTrigger =
      trigger || (caseDoc.investigationVersions?.length ? "manual_reinvestigation" : "initial_complaint");

    const newVersion = await assembleInvestigationVersion(caseDoc, suggestion, resolvedTrigger);

    caseDoc.investigationVersions = caseDoc.investigationVersions || [];
    caseDoc.investigationVersions.push(newVersion);

    // Legacy mirror for anything still reading `analysis` directly
    // (AIInvestigation.jsx's step/legal-section approval flow).
    caseDoc.analysis = { ...suggestion, generatedAt: new Date().toISOString() };
    caseDoc.status = "under_investigation";

    const savedVersion = caseDoc.investigationVersions[caseDoc.investigationVersions.length - 1];

    caseDoc.auditLog = caseDoc.auditLog || [];
    caseDoc.auditLog.push(
      createHashedAuditEntry({
        action: "AI_INVESTIGATION_COMPLETED",
        actor: "AI_ENGINE",
        details: {
          version: savedVersion.version,
          trigger: resolvedTrigger,
          risk: savedVersion.risk,
          confidence: savedVersion.confidence,
          newFindingsCount: savedVersion.delta?.newFindings?.length ?? savedVersion.findings.length,
          newEntitiesCount: savedVersion.delta?.newEntities?.length ?? savedVersion.entities.length,
        },
        auditLog: caseDoc.auditLog,
      })
    );

    await caseDoc.save();

    res.json({
      status: "updated",
      case_id,
      version: savedVersion,
      analysis: caseDoc.analysis,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Investigation failed", detail: err.message });
  }
});

// ---------- Approve / reject a single recommendation on the latest
// investigation version (used by the "Next Best Action" card) ----------

app.post("/api/case/:case_id/recommendation/:recommendationId/status", async (req, res) => {
  const { status, decidedBy } = req.body; // status: 'approved' | 'rejected'
  if (!["approved", "rejected"].includes(status)) {
    return res.status(400).json({ error: "status must be 'approved' or 'rejected'" });
  }

  try {
    const caseDoc = await Case.findOne({ case_id: req.params.case_id });
    if (!caseDoc) return res.status(404).json({ error: "Case not found" });

    const versions = caseDoc.investigationVersions || [];
    const latest = versions[versions.length - 1];
    if (!latest) return res.status(400).json({ error: "No investigation version yet for this case" });

    const rec = latest.recommendations.find((r) => r.id === req.params.recommendationId);
    if (!rec) return res.status(404).json({ error: "Recommendation not found" });

    rec.status = status;

    caseDoc.auditLog = caseDoc.auditLog || [];
    caseDoc.auditLog.push(
      createHashedAuditEntry({
        action: status === "approved" ? "RECOMMENDATION_APPROVED" : "RECOMMENDATION_REJECTED",
        actor: decidedBy || "unspecified",
        details: { recommendationId: rec.id, action: rec.action, version: latest.version },
        auditLog: caseDoc.auditLog,
      })
    );

    await caseDoc.save();

    res.json({ status: "ok", recommendation: rec });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to update recommendation", detail: err.message });
  }
});

// ---------- Similar cases (lightweight RAG over other cases'
// complaint text -- genuinely new, no prior case-to-case similarity
// existed in this codebase; SOP retrieval in retrieval.js is separate) ----------

app.get("/api/case/:case_id/similar", async (req, res) => {
  try {
    const caseDoc = await Case.findOne({ case_id: req.params.case_id });
    if (!caseDoc) return res.status(404).json({ error: "Case not found" });

    const complaintText = extractComplaintText(caseDoc);
    if (!complaintText.trim()) {
      return res.json({ case_id: req.params.case_id, similarCases: [] });
    }

    const others = await Case.find({ case_id: { $ne: req.params.case_id } });
    const candidates = others
      .map((c) => ({ caseDoc: c, text: extractComplaintText(c) }))
      .filter((c) => c.text.trim());

    if (!candidates.length) {
      return res.json({ case_id: req.params.case_id, similarCases: [] });
    }

    const targetVec = await embedText(complaintText);
    const scored = [];
    for (const c of candidates) {
      try {
        const vec = await embedText(c.text);
        const score = cosineSimilarity(targetVec, vec);
        const latest = (c.caseDoc.investigationVersions || []).slice(-1)[0];
        const sharedEntityTypes = latest
          ? [...new Set(latest.entities.map((e) => e.type))].filter((t) =>
              (caseDoc.investigationVersions?.slice(-1)[0]?.entities || []).some((e) => e.type === t)
            )
          : [];
        scored.push({
          caseId: c.caseDoc.case_id,
          title: c.caseDoc.title,
          similarity: Number(score.toFixed(2)),
          sharedEntityTypes,
        });
      } catch (err) {
        console.error(`[similar] embedding failed for ${c.caseDoc.case_id}:`, err.message);
      }
    }

    scored.sort((a, b) => b.similarity - a.similarity);

    res.json({ case_id: req.params.case_id, similarCases: scored.slice(0, 5) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to find similar cases", detail: err.message });
  }
});

app.post("/api/case/:case_id/approve", async (req, res) => {
  const { steps, legalSections, officerNotes, decidedBy } = req.body;

  try {
    const caseDoc = await Case.findOne({ case_id: req.params.case_id });
    if (!caseDoc) return res.status(404).json({ error: "Case not found" });

    const reportEntry = {
      approvedSteps: steps || [],
      approvedLegalSections: legalSections || [],
      officerNotes: officerNotes || "",
      decidedBy: decidedBy || "unspecified",
      decidedAt: new Date().toISOString(),
    };

    caseDoc.reports = caseDoc.reports || [];
    caseDoc.reports.push(reportEntry);
    caseDoc.status = "investigation_approved";
    await caseDoc.save();

    res.json({ status: "approved", case_id: req.params.case_id, report: reportEntry });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to save officer decision", detail: err.message });
  }
});

// NOTE: the old /api/case/:case_id/crimeos-summary route (built a summary
// from the latest approved report only) has been retired -- it duplicated
// crime-os-backend's POST /cases/:case_id/summary/generate, which now reads
// from the latest investigation version and is the single canonical
// "Current Investigation Assessment" source (see summaryService.js).

app.listen(port, () => {
  console.log(`AI service running at http://localhost:${port}`);
});
