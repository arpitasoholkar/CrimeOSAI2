import { Router } from "express";
import multer from "multer";
import { ingest, IngestError } from "../lib/ingest.js";
import { saveEvidence } from "../lib/caseService.js";
import { triggerReinvestigation } from "../lib/reinvestigate.js";
import { requireAuth } from "../lib/auth.js";

const router = Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 20 * 1024 * 1024 }, // 20MB max
});

/**
 * POST /ingest
 *
 * Supports:
 * 1. JSON body: { text: "...", caseName: "..." }
 * 2. PDF upload (+ caseName field)
 * 3. Image upload (+ caseName field)
 * 4. Audio upload (+ caseName field)
 *
 * Optional:
 * case_id  -> if provided, evidence is added to an existing case.
 *             otherwise a new case is created.
 * caseName -> only used when creating a new case (case_id omitted).
 *
 * Requires a logged-in officer -- that officer becomes the new case's
 * lead investigator (or is checked against the existing case's
 * investigators, though evidence upload isn't access-gated itself yet).
 */
router.post("/", requireAuth, upload.single("file"), async (req, res) => {
  try {
    // -----------------------------
    // Extract complaint information
    // -----------------------------
    const result = req.file
      ? await ingest({
          fileBuffer: req.file.buffer,
          originalname: req.file.originalname,
          mimetype: req.file.mimetype,
        })
      : await ingest({
          text: req.body.text,
        });

    // -----------------------------
    // Save to MongoDB
    // -----------------------------
    // A case_id in the request means we're adding evidence to an existing
    // case ("evidence_added"); no case_id means this complaint is creating
    // a brand new case ("initial_complaint") -- the investigation engine
    // treats those as different triggers (v1 vs a re-investigation).
    const isNewCase = !req.body.case_id;

    const savedCase = await saveEvidence({
      caseId: req.body.case_id,
      evidence: result,
      caseName: req.body.caseName,
      user: req.user,
    });

    // -----------------------------
    // Trigger AI investigation (fire-and-forget, doesn't block the response)
    // -----------------------------
    triggerReinvestigation(
      savedCase.case_id,
      isNewCase ? "initial_complaint" : "evidence_added"
    );

    // -----------------------------
    // Return saved case
    // -----------------------------
    return res.status(200).json(savedCase);
  } catch (err) {
    if (err instanceof IngestError) {
      return res.status(err.statusCode).json({
        error: err.message,
      });
    }

    console.error("[ingest route] Unexpected error:", err);

    return res.status(500).json({
      error: "Something went wrong processing this complaint.",
    });
  }
});

export default router;
