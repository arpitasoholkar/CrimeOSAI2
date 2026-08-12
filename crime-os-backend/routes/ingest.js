import { Router } from "express";
import multer from "multer";
import { ingest, IngestError } from "../lib/ingest.js";
import { saveEvidence } from "../lib/caseService.js";
import { triggerReinvestigation } from "../lib/reinvestigate.js";

const router = Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 20 * 1024 * 1024 }, // 20MB max
});

/**
 * POST /ingest
 *
 * Supports:
 * 1. JSON body: { text: "..." }
 * 2. PDF upload
 * 3. Image upload
 * 4. Audio upload
 *
 * Optional:
 * case_id -> if provided, evidence is added to an existing case.
 *            otherwise a new case is created.
 */
router.post("/", upload.single("file"), async (req, res) => {
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