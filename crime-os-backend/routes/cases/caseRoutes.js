import express from "express";

import {
  createCase,
  getCaseById,
  requestCaseAccess,
  approveCaseAccess,
  rejectCaseAccess,
  getMyCases,
  getMyAccessRequests,
  getIncomingAccessRequests,
  markCaseComplete,
  getArchivedCases,
  generateLegalRequest,
  approveLegalRequest,
  dispatchLegalRequest,
  recordLegalResponse,
  suggestLegalResponseFields,
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

router.post("/", requireAuth, createCase);

/* ===========================
   CASE ACCESS CONTROL
   (must come before /:case_id so "/my" and "/access-requests/..."
   aren't swallowed as a case_id param)
=========================== */

router.get("/my", requireAuth, getMyCases);

router.get(
  "/access-requests/mine",
  requireAuth,
  getMyAccessRequests
);

router.get(
  "/access-requests/incoming",
  requireAuth,
  getIncomingAccessRequests
);

/* ===========================
   CASE COMPLETION / ARCHIVE
   (must also come before /:case_id so "/archive/all" isn't
   swallowed as a case_id param)
=========================== */

router.get("/archive/all", requireAuth, getArchivedCases);

router.get("/:case_id", requireAuth, getCaseById);

router.post("/:case_id/complete", requireAuth, markCaseComplete);

router.post(
  "/:case_id/access-request",
  requireAuth,
  requestCaseAccess
);

router.post(
  "/:case_id/access-request/:requestId/approve",
  requireAuth,
  approveCaseAccess
);

router.post(
  "/:case_id/access-request/:requestId/reject",
  requireAuth,
  rejectCaseAccess
);

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

router.post(
  "/:case_id/request/:requestId/response/extract",
  requireAuth,
  suggestLegalResponseFields
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