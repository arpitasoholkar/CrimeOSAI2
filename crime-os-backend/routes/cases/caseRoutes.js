import express from "express";

import {
  createCase,
  getCaseById,
  generateLegalRequest,
  approveLegalRequest,
  dispatchLegalRequest,
  recordLegalResponse,
  manualReinvestigate,
  getInvestigationVersions,
  generateSummary,
  verifyCaseAuditChain,
  getCaseTimeline,
} from "./caseController.js";

import { syncOfflineActions } from "../offline/offlineController.js";

import upload from "../evidence/uploadMiddleware.js";
import { requireAuth } from "../../lib/auth.js";

import {
  uploadEvidence,
  verifyEvidence,
} from "../evidence/evidenceController.js";

const router = express.Router();

/* ===========================
   CASES
=========================== */

router.post("/", createCase);

router.get("/:case_id", getCaseById);

/* ===========================
   LEGAL REQUESTS
   (require a logged-in officer so every request/approval/response
   carries a named, accountable user rather than "SYSTEM")
=========================== */

router.post("/:case_id/request/generate", requireAuth, generateLegalRequest);

router.post(
  "/:case_id/request/:requestId/approve",
  requireAuth,
  approveLegalRequest
);

router.post(
  "/:case_id/request/:requestId/dispatch",
  requireAuth,
  dispatchLegalRequest
);

router.post(
  "/:case_id/request/:requestId/response",
  requireAuth,
  recordLegalResponse
);

/* ===========================
   INVESTIGATION (living state)
=========================== */

router.post(
  "/:case_id/reinvestigate",
  manualReinvestigate
);

router.get(
  "/:case_id/investigation/versions",
  getInvestigationVersions
);

/* ===========================
   EVIDENCE
=========================== */

router.post(
  "/:case_id/evidence/upload",
  upload.single("file"),
  uploadEvidence
);

router.post(
  "/:case_id/evidence/:evidenceId/verify",
  verifyEvidence
);

/* ===========================
   SUMMARY
=========================== */

router.post(
  "/:case_id/summary/generate",
  generateSummary
);

/* ===========================
   AUDIT
=========================== */

router.get(
  "/:case_id/audit/verify",
  verifyCaseAuditChain
);

router.get(
  "/:case_id/timeline",
  getCaseTimeline
);

/* ===========================
   OFFLINE SYNC
=========================== */

router.post(
  "/offline/sync",
  syncOfflineActions
);

export default router;