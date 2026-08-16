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
 * 2. Single or multiple file upload under the "files" field
 *    (any mix of PDF / image / audio in one request, + caseName field).
 *    The older single-file field name "file" is still accepted for
 *    backwards compatibility with older clients.
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
router.post(
  "/",
  requireAuth,
  upload.fields([
    { name: "files", maxCount: 20 },
    { name: "file", maxCount: 1 }, // legacy single-file clients
  ]),
  async (req, res) => {
    try {
      // -----------------------------
      // Collect uploaded files (new multi-file field first, fall back to
      // the legacy single-file field so old clients keep working)
      // -----------------------------
      const uploadedFiles = [
        ...(req.files?.files || []),
        ...(req.files?.file || []),
      ];

      // A case_id in the request means we're adding evidence to an existing
      // case ("evidence_added"); no case_id means this complaint is creating
      // a brand new case ("initial_complaint") -- the investigation engine
      // treats those as different triggers (v1 vs a re-investigation).
      const isNewCase = !req.body.case_id;
      let caseId = req.body.case_id;
      let savedCase;

      if (uploadedFiles.length > 0) {
        // -----------------------------
        // Extract + save each file as its own evidence item, one at a
        // time, chaining them onto the same case (the first file either
        // creates the case or attaches to the given case_id; every file
        // after that attaches to the case_id we now have).
        // -----------------------------
        for (const uploadedFile of uploadedFiles) {
          const result = await ingest({
            fileBuffer: uploadedFile.buffer,
            originalname: uploadedFile.originalname,
            mimetype: uploadedFile.mimetype,
          });

          savedCase = await saveEvidence({
            caseId,
            evidence: result,
            caseName: req.body.caseName,
            user: req.user,
          });

          caseId = savedCase.case_id;
        }
      } else {
        // -----------------------------
        // Plain text complaint, no files
        // -----------------------------
        const result = await ingest({ text: req.body.text });

        savedCase = await saveEvidence({
          caseId,
          evidence: result,
          caseName: req.body.caseName,
          user: req.user,
        });
      }

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
  }
);

export default router;
