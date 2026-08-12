import Case from "../cases/caseModel.js";

import {
  createHashedAuditEntry,
} from "../audit/auditHashService.js";

import {
  calculateFileHash,
} from "./hashService.js";

import { triggerReinvestigation } from "../../lib/reinvestigate.js";
// =========================================================
// UPLOAD EVIDENCE
// =========================================================
//
// POST /cases/:id/evidence
//
// Flow:
//
// 1. Multer receives and stores the file
// 2. req.file is created
// 3. Find the case
// 4. Calculate SHA-256 hash
// 5. Store file path + hash in MongoDB
// 6. Create hash-chained audit entry
// 7. Save the case
//

const uploadEvidence = async (req, res) => {
  try {
    // -----------------------------------------------------
    // CHECK FILE
    // -----------------------------------------------------

    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "Evidence file is required",
      });
    }


    // -----------------------------------------------------
    // FIND CASE
    // -----------------------------------------------------
    // FIX: was `Case.findOne({ caseId: req.params.id })` -- the schema's
    // identity field is `case_id`, and this route's param is `:case_id`
    // (see caseRoutes.js), not `:id`. Both were wrong, so this endpoint
    // 404'd on every request.

    const caseData = await Case.findOne({
      case_id: req.params.case_id,
    });

    if (!caseData) {
      return res.status(404).json({
        success: false,
        message: "Case not found",
      });
    }


    // -----------------------------------------------------
    // CALCULATE SHA-256 HASH
    // -----------------------------------------------------

    const fileHash = await calculateFileHash(
      req.file.path
    );


    // -----------------------------------------------------
    // CREATE EVIDENCE RECORD
    // -----------------------------------------------------

    const evidenceFile = {
      path: req.file.path,
      hash: fileHash,
    };


    // -----------------------------------------------------
    // ATTACH EVIDENCE TO CASE
    // -----------------------------------------------------

    caseData.evidenceFiles.push(evidenceFile);


    // -----------------------------------------------------
    // GET SAVED MONGOOSE SUBDOCUMENT
    // -----------------------------------------------------
    //
    // After pushing the evidence object into the Mongoose
    // array, Mongoose creates its _id.
    //

    const savedEvidence =
      caseData.evidenceFiles[
        caseData.evidenceFiles.length - 1
      ];


    // -----------------------------------------------------
    // CREATE HASHED AUDIT ENTRY
    // -----------------------------------------------------

    const auditEntry = createHashedAuditEntry({
      action: "EVIDENCE_UPLOADED",

      actor: "SYSTEM",

      details: {
        evidenceId: savedEvidence._id,
        path: savedEvidence.path,
        hash: savedEvidence.hash,
      },

      auditLog: caseData.auditLog,
    });


    // -----------------------------------------------------
    // ADD AUDIT ENTRY
    // -----------------------------------------------------

    caseData.auditLog.push(auditEntry);


    // -----------------------------------------------------
    // SAVE CASE
    // -----------------------------------------------------

    await caseData.save();


    // -----------------------------------------------------
    // TRIGGER RE-INVESTIGATION
    // -----------------------------------------------------
    // New evidence file is meaningful new information -- let the AI
    // re-assess the case. Fire-and-forget so this response isn't delayed.

    triggerReinvestigation(caseData.case_id, "evidence_added");


    // -----------------------------------------------------
    // RESPONSE
    // -----------------------------------------------------

    return res.status(201).json({
      success: true,

      message: "Evidence uploaded successfully",

      evidence: savedEvidence,
    });
  } catch (error) {
    console.error(
      "Upload evidence error:",
      error
    );

    return res.status(500).json({
      success: false,
      message: "Failed to upload evidence",
      error: error.message,
    });
  }
};


// =========================================================
// VERIFY EVIDENCE INTEGRITY
// =========================================================
//
// GET /cases/:id/evidence/:evidenceId/verify
//
// Flow:
//
// 1. Find the case
// 2. Find the evidence record
// 3. Calculate the CURRENT file hash
// 4. Compare it with the STORED hash
// 5. Create hash-chained audit entry
// 6. Return INTACT or TAMPERED
//

const verifyEvidence = async (req, res) => {
  try {
    // -----------------------------------------------------
    // FIND CASE
    // -----------------------------------------------------
    // FIX: same case_id/param-name bug as uploadEvidence above.

    const caseData = await Case.findOne({
      case_id: req.params.case_id,
    });

    if (!caseData) {
      return res.status(404).json({
        success: false,
        message: "Case not found",
      });
    }


    // -----------------------------------------------------
    // FIND EVIDENCE
    // -----------------------------------------------------

    const evidence = caseData.evidenceFiles.id(
      req.params.evidenceId
    );

    if (!evidence) {
      return res.status(404).json({
        success: false,
        message: "Evidence not found",
      });
    }


    // -----------------------------------------------------
    // CALCULATE CURRENT FILE HASH
    // -----------------------------------------------------

    const currentHash = await calculateFileHash(
      evidence.path
    );


    // -----------------------------------------------------
    // COMPARE HASHES
    // -----------------------------------------------------

    const integrity =
      currentHash === evidence.hash;

    const status = integrity
      ? "INTACT"
      : "TAMPERED";


    // -----------------------------------------------------
    // GET ACTOR
    // -----------------------------------------------------

    const verifiedBy =
      req.query.verifiedBy || "SYSTEM";


    // -----------------------------------------------------
    // CREATE HASHED AUDIT ENTRY
    // -----------------------------------------------------

    const auditEntry = createHashedAuditEntry({
      action: "EVIDENCE_VERIFIED",

      actor: verifiedBy,

      details: {
        evidenceId: evidence._id,
        storedHash: evidence.hash,
        currentHash,
        integrity,
        status,
      },

      auditLog: caseData.auditLog,
    });


    // -----------------------------------------------------
    // ADD AUDIT ENTRY
    // -----------------------------------------------------

    caseData.auditLog.push(auditEntry);


    // -----------------------------------------------------
    // SAVE CASE
    // -----------------------------------------------------

    await caseData.save();


    // -----------------------------------------------------
    // RESPONSE
    // -----------------------------------------------------

    return res.status(200).json({
      success: true,

      integrity,

      status,

      evidenceId: evidence._id,

      storedHash: evidence.hash,

      currentHash,
    });
  } catch (error) {
    console.error(
      "Verify evidence error:",
      error
    );

    return res.status(500).json({
      success: false,
      message: "Failed to verify evidence",
      error: error.message,
    });
  }
};


// =========================================================
// EXPORT
// =========================================================

export {
  uploadEvidence,
  verifyEvidence,
};