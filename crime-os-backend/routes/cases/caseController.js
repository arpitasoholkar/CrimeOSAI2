import Case from "./caseModel.js";
import {
  createHashedAuditEntry,
  verifyAuditChain,
} from "../audit/auditHashService.js";

import {
  fillTemplate,
} from "../requests/templateService.js";

import {
  sendLegalRequestEmail,
} from "../requests/emailService.js";

import {
  generateCaseSummary,
} from "../summary/summaryService.js";

import { triggerReinvestigation } from "../../lib/reinvestigate.js";
// =========================================================
// CREATE CASE
// =========================================================
//
// POST /cases
//

const createCase = async (req, res) => {
  try {
    // =====================================================
    // READ INGESTION DATA
    // =====================================================

    const {
      text,
      entities = [],
      language = "en",
      source_type = "unknown",
    } = req.body;

    // =====================================================
    // VALIDATE COMPLAINT TEXT
    // =====================================================

    if (!text) {
      return res.status(400).json({
        success: false,
        message: "Complaint text is required",
      });
    }

    // =====================================================
    // GENERATE CASE ID
    // =====================================================

    const caseId =
      `CASE-${new Date().getFullYear()}-${Date.now()}`;

    // =====================================================
    // CREATE CASE OBJECT
    // =====================================================

    const newCase = new Case({
      case_id: caseId,

      complaint: {
        raw: text,

        structured: {
          language,
          sourceType: source_type,
        },
      },

      status: "open",

      severity: "medium",

      entities,

      requests: [],

      evidenceFiles: [],

      auditLog: [],
    });

    // =====================================================
    // CREATE HASHED AUDIT ENTRY
    // =====================================================

    const auditEntry = createHashedAuditEntry({
      action: "CASE_CREATED",

      actor: "SYSTEM",

      details: {
        caseId: newCase.case_id,
        severity: newCase.severity,
        source: source_type,
      },

      auditLog: newCase.auditLog,
    });

    // =====================================================
    // ADD HASHED AUDIT ENTRY
    // =====================================================

    newCase.auditLog.push(auditEntry);

    // =====================================================
    // SAVE CASE
    // =====================================================

    await newCase.save();

    // =====================================================
    // RESPONSE
    // =====================================================

    return res.status(201).json({
      success: true,
      message: "Case created successfully",
      case: newCase,
    });
  } catch (error) {
    console.error(
      "Create case failed:",
      error.message
    );

    return res.status(500).json({
      success: false,
      message: "Failed to create case",
      error: error.message,
    });
  }
};

// =========================================================
// GET CASE BY CASE ID
// =========================================================
//
// GET /cases/:id
//

const getCaseById = async (req, res) => {
  try {
    const caseData = await Case.findOne({
      case_id: req.params.case_id,
    });

    if (!caseData) {
      return res.status(404).json({
        success: false,
        message: "Case not found",
      });
    }

    return res.status(200).json({
      success: true,
      case: caseData,
    });
  } catch (error) {
    console.error("Get case error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch case",
      error: error.message,
    });
  }
};

// =========================================================
// GENERATE LEGAL REQUEST
// =========================================================
//
// POST /cases/:id/requests/generate
//

const generateLegalRequest = async (req, res) => {
  try {
    const {
      requestType,
      provider = null,
    } = req.body;

    // -----------------------------------------------------
    // VALIDATE REQUEST TYPE
    // -----------------------------------------------------

    if (!requestType) {
      return res.status(400).json({
        success: false,
        message: "requestType is required",
      });
    }

    if (!["telecom", "bank"].includes(requestType)) {
      return res.status(400).json({
        success: false,
        message:
          "requestType must be either telecom or bank",
      });
    }

    // -----------------------------------------------------
    // FIND CASE
    // -----------------------------------------------------

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
    // GENERATE HTML SNAPSHOT
    // -----------------------------------------------------

    const filledHtml = fillTemplate(
      caseData.toObject(),
      requestType
    );

    // -----------------------------------------------------
    // GENERATE REQUEST ID
    // -----------------------------------------------------

    const requestId = `REQ-${Date.now()}`;

    // -----------------------------------------------------
    // CREATE REQUEST
    // -----------------------------------------------------

    const newRequest = {
      requestId,

      requestType,

      provider,

      status: "draft",

      htmlSnapshot: filledHtml,

      createdAt: new Date(),
    };

    // -----------------------------------------------------
    // ATTACH REQUEST
    // -----------------------------------------------------

    caseData.requests.push(newRequest);

    // -----------------------------------------------------
    // AUDIT LOG
    // -----------------------------------------------------

    const auditEntry = createHashedAuditEntry({
      action: "REQUEST_GENERATED",

      actor: "SYSTEM",

      details: {
        requestId,
        requestType,
        provider,
      },

      auditLog: caseData.auditLog,
    });

    caseData.auditLog.push(auditEntry);

    // -----------------------------------------------------
    // SAVE CASE
    // -----------------------------------------------------

    await caseData.save();

    const savedRequest =
      caseData.requests[
        caseData.requests.length - 1
      ];

    return res.status(201).json({
      success: true,

      message:
        "Legal request generated successfully",

      request: savedRequest,
    });
  } catch (error) {
    console.error(
      "Generate legal request error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Failed to generate legal request",
      error: error.message,
    });
  }
};

// =========================================================
// APPROVE LEGAL REQUEST
// =========================================================
//
// POST /cases/:case_id/requests/:requestId/approve
//
// Flow:
//
// draft
//   ↓
// approved
//

const approveLegalRequest = async (req, res) => {
  try {
    // -----------------------------------------------------
    // GET REQUEST DATA
    // -----------------------------------------------------

    const { approvedBy } = req.body;

    const { case_id, requestId } = req.params;

    // -----------------------------------------------------
    // VALIDATE OFFICER
    // -----------------------------------------------------

    if (!approvedBy) {
      return res.status(400).json({
        success: false,
        message: "approvedBy is required",
      });
    }

    // -----------------------------------------------------
    // FIND CASE
    // -----------------------------------------------------

    const caseData = await Case.findOne({
      case_id,
    });

    if (!caseData) {
      return res.status(404).json({
        success: false,
        message: "Case not found",
      });
    }

    // -----------------------------------------------------
    // FIND REQUEST
    // -----------------------------------------------------

    const requestData = caseData.requests.find(
      (request) =>
        request.requestId === requestId
    );

    if (!requestData) {
      return res.status(404).json({
        success: false,
        message: "Legal request not found",
      });
    }

    // -----------------------------------------------------
    // CHECK REQUEST STATUS
    // -----------------------------------------------------

    if (requestData.status !== "draft") {
      return res.status(400).json({
        success: false,
        message:
          "Only draft requests can be approved",
      });
    }

    // -----------------------------------------------------
    // APPROVE REQUEST
    // -----------------------------------------------------

    requestData.status = "approved";

    requestData.approvedBy = approvedBy;

    requestData.approvedAt = new Date();

    // -----------------------------------------------------
    // CREATE HASHED AUDIT ENTRY
    // -----------------------------------------------------

    const auditEntry = createHashedAuditEntry({
      action: "REQUEST_APPROVED",

      actor: approvedBy,

      details: {
        requestId,
        requestType: requestData.requestType,
        provider: requestData.provider,
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

      message:
        "Legal request approved successfully",

      request: requestData,
    });
  } catch (error) {
    console.error(
      "Approve legal request error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Failed to approve legal request",
      error: error.message,
    });
  }
};

// =========================================================
// DISPATCH LEGAL REQUEST
// =========================================================
//
// POST /cases/:case_id/requests/:requestId/dispatch
//
// Flow:
//
// approved
//    ↓
// Send mock email
//    ↓
// sent
//    ↓
// Assign SLA deadline
//

const dispatchLegalRequest = async (req, res) => {
  try {
    // -----------------------------------------------------
    // GET REQUEST DATA
    // -----------------------------------------------------

    const { providerEmail } = req.body;

    const { case_id, requestId } = req.params;

    // -----------------------------------------------------
    // VALIDATE PROVIDER EMAIL
    // -----------------------------------------------------

    if (!providerEmail) {
      return res.status(400).json({
        success: false,
        message:
          "providerEmail is required",
      });
    }

    // -----------------------------------------------------
    // FIND CASE
    // -----------------------------------------------------

    const caseData = await Case.findOne({
      case_id,
    });

    if (!caseData) {
      return res.status(404).json({
        success: false,
        message: "Case not found",
      });
    }

    // -----------------------------------------------------
    // FIND REQUEST
    // -----------------------------------------------------

    const requestData = caseData.requests.find(
      (request) =>
        request.requestId === requestId
    );

    if (!requestData) {
      return res.status(404).json({
        success: false,
        message: "Legal request not found",
      });
    }

    // -----------------------------------------------------
    // CHECK REQUEST STATUS
    // -----------------------------------------------------

    if (requestData.status !== "approved") {
      return res.status(400).json({
        success: false,
        message:
          "Only approved requests can be dispatched",
      });
    }

    // -----------------------------------------------------
    // CREATE EMAIL SUBJECT
    // -----------------------------------------------------

    const subject =
      `Legal Request - ${caseData.case_id} - ${requestData.requestType}`;

    // -----------------------------------------------------
    // SEND MOCK EMAIL
    // -----------------------------------------------------

    const dispatchResult =
      await sendLegalRequestEmail({
        to: providerEmail,
        subject,
        html: requestData.htmlSnapshot,
      });

    // -----------------------------------------------------
    // MARK REQUEST AS SENT
    // -----------------------------------------------------

    requestData.status = "sent";

    requestData.sentAt = new Date();

    requestData.sentTo = providerEmail;

    requestData.messageId =
      dispatchResult.messageId;

    requestData.previewUrl =
      dispatchResult.previewUrl;
    requestData.delivered = dispatchResult.delivered || false;

    // -----------------------------------------------------
    // ASSIGN SLA DEADLINE
    // -----------------------------------------------------

    const slaDays =
      requestData.requestType === "telecom"
        ? 3
        : 5;

    const deadline =
      new Date(requestData.sentAt);

    deadline.setDate(
      deadline.getDate() + slaDays
    );

    requestData.deadline = deadline;

    // -----------------------------------------------------
    // CREATE HASHED AUDIT ENTRY
    // -----------------------------------------------------

    const auditEntry = createHashedAuditEntry({
      action: "REQUEST_SENT",

      actor: "SYSTEM",

      details: {
        requestId,
        requestType: requestData.requestType,
        provider: requestData.provider,
        sentTo: providerEmail,
        messageId: dispatchResult.messageId,
        slaDays,
        deadline: requestData.deadline,
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

      message:
        "Legal request dispatched successfully",

      request: requestData,

      previewUrl:
        dispatchResult.previewUrl,
    });
  } catch (error) {
    console.error(
      "Dispatch legal request error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Failed to dispatch legal request",
      error: error.message,
    });
  }
};
// =========================================================
// RECORD LEGAL REQUEST RESPONSE
// =========================================================
//
// POST /cases/:case_id/request/:requestId/response
//

const recordLegalResponse = async (req, res) => {
  try {
    const { case_id, requestId } = req.params;
    const { recordedBy, notes, data = {} } = req.body;

    if (!recordedBy) {
      return res.status(400).json({
        success: false,
        message: "recordedBy is required",
      });
    }

    const caseData = await Case.findOne({ case_id });

    if (!caseData) {
      return res.status(404).json({
        success: false,
        message: "Case not found",
      });
    }

    const requestData = caseData.requests.find(
      (request) => request.requestId === requestId
    );

    if (!requestData) {
      return res.status(404).json({
        success: false,
        message: "Legal request not found",
      });
    }

    if (!["sent", "overdue"].includes(requestData.status)) {
      return res.status(400).json({
        success: false,
        message:
          "A response can only be recorded for a sent (or overdue) request",
      });
    }

    // -----------------------------------------------------
    // MARK REQUEST COMPLETED
    // -----------------------------------------------------

    requestData.status = "completed";
    requestData.response = {
      receivedAt: new Date(),
      recordedBy,
      notes: notes || null,
      data,
    };

    // -----------------------------------------------------
    // ATTACH STRUCTURED FIELDS AS CASE ENTITIES
    // -----------------------------------------------------

    const ENTITY_TYPE_LABELS = {
      accountHolder: "ACCOUNT_HOLDER",
      kycPhone: "KYC_PHONE",
      kycAddress: "KYC_ADDRESS",
      accountNumber: "ACCOUNT_NUMBER",
      deviceId: "DEVICE_ID",
      ipAddress: "IP_ADDRESS",
      simOwner: "SIM_OWNER",
      towerLocation: "TOWER_LOCATION",
    };

    const addedEntities = [];
    for (const [field, value] of Object.entries(data)) {
      if (!value || typeof value !== "string" || !value.trim()) continue;
      const type = ENTITY_TYPE_LABELS[field] || field.toUpperCase();
      const entity = {
        type,
        value: value.trim(),
        confidence: null,
        source: `request:${requestId}`,
      };
      caseData.entities.push(entity);
      addedEntities.push(entity);
    }

    // -----------------------------------------------------
    // AUDIT LOG
    // -----------------------------------------------------

    const auditEntry = createHashedAuditEntry({
      action: "LEGAL_RESPONSE_RECEIVED",
      actor: recordedBy,
      details: {
        requestId,
        requestType: requestData.requestType,
        provider: requestData.provider,
        fieldsRecorded: Object.keys(data),
      },
      auditLog: caseData.auditLog,
    });

    caseData.auditLog.push(auditEntry);

    await caseData.save();

    // -----------------------------------------------------
    // TRIGGER RE-INVESTIGATION
    // -----------------------------------------------------

    triggerReinvestigation(caseData.case_id, "legal_response_received");

    return res.status(200).json({
      success: true,
      message: "Legal response recorded successfully",
      request: requestData,
      addedEntities,
    });
  } catch (error) {
    console.error("Record legal response error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to record legal response",
      error: error.message,
    });
  }
};

// =========================================================
// MANUAL RE-INVESTIGATION
// =========================================================
//
// POST /cases/:case_id/reinvestigate
//

const manualReinvestigate = async (req, res) => {
  try {
    const { case_id } = req.params;

    const caseData = await Case.findOne({ case_id });

    if (!caseData) {
      return res.status(404).json({
        success: false,
        message: "Case not found",
      });
    }

    const result = await triggerReinvestigation(
      case_id,
      "manual_reinvestigation",
      { await: true }
    );

    return res.status(200).json({
      success: true,
      message: "Re-investigation complete",
      ...result,
    });
  } catch (error) {
    console.error("Manual reinvestigation error:", error);

    return res.status(502).json({
      success: false,
      message: "Failed to re-investigate case",
      error: error.message,
    });
  }
};

// =========================================================
// GET INVESTIGATION VERSIONS
// =========================================================
//
// GET /cases/:case_id/investigation/versions
//

const getInvestigationVersions = async (req, res) => {
  try {
    const caseData = await Case.findOne(
      { case_id: req.params.case_id },
      "case_id investigationVersions"
    ).lean();

    if (!caseData) {
      return res.status(404).json({
        success: false,
        message: "Case not found",
      });
    }

    return res.status(200).json({
      success: true,
      caseId: caseData.case_id,
      versions: caseData.investigationVersions || [],
    });
  } catch (error) {
    console.error("Get investigation versions error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to get investigation versions",
      error: error.message,
    });
  }
};

// =========================================================
// GENERATE CASE SUMMARY
// =========================================================
//
// POST /cases/:id/summary/generate
//

const generateSummary = async (req, res) => {
  try {
    // -----------------------------------------------------
    // GET CASE ID
    // -----------------------------------------------------

    const { case_id } = req.params;

    const caseData = await Case.findOne({ case_id });

    if (!caseData) {
      return res.status(404).json({
        success: false,
        message: "Case not found",
      });
    }


    // -----------------------------------------------------
    // GENERATE SUMMARY
    // -----------------------------------------------------

    const generatedSummary =
      generateCaseSummary(caseData);


    // -----------------------------------------------------
    // SAVE SUMMARY SNAPSHOT
    // -----------------------------------------------------

    caseData.summary = generatedSummary;


    // -----------------------------------------------------
    // ADD AUDIT LOG
    // -----------------------------------------------------

    const auditEntry = createHashedAuditEntry({
      action: "SUMMARY_GENERATED",

      actor: "SYSTEM",

      details: {
        totalRequests:
          generatedSummary.statistics.totalRequests,

        overdueRequests:
          generatedSummary.statistics.overdueRequests,

        totalEvidenceFiles:
          generatedSummary.statistics.totalEvidenceFiles,

        matchedSopIds:
          generatedSummary.statistics.matchedSopIds,

        approvedStepCount:
          generatedSummary.statistics.approvedStepCount,

        approvedLegalSectionCount:
          generatedSummary.statistics.approvedLegalSectionCount,
      },

      auditLog: caseData.auditLog,
    });

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
      message: "Case summary generated successfully",
      summary: caseData.summary,
    });
  } catch (error) {
    console.error(
      "Generate case summary error:",
      error
    );

    return res.status(500).json({
      success: false,
      message: "Failed to generate case summary",
      error: error.message,
    });
  }
};


// =========================================================
// VERIFY AUDIT HASH CHAIN
// =========================================================
//
// GET /cases/:id/audit/verify
//

const verifyCaseAuditChain = async (req, res) => {
  try {
    // -----------------------------------------------------
    // FIND CASE
    // -----------------------------------------------------

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
    // VERIFY AUDIT CHAIN
    // -----------------------------------------------------

    const verification = verifyAuditChain(
      caseData.auditLog
    );


    // -----------------------------------------------------
    // RESPONSE
    // -----------------------------------------------------

    return res.status(200).json({
      success: true,

      caseId: caseData.case_id,

      integrityStatus: verification.valid
        ? "VALID"
        : "TAMPERING_DETECTED",

      verification,
    });
  } catch (error) {
    console.error(
      "Verify audit chain error:",
      error
    );

    return res.status(500).json({
      success: false,
      message: "Failed to verify audit chain",
      error: error.message,
    });
  }
};


// =========================================================
// GET CASE TIMELINE
// =========================================================
//
// GET /cases/:id/timeline
//

const getCaseTimeline = async (req, res) => {
  try {
    // -----------------------------------------------------
    // FIND CASE
    // -----------------------------------------------------

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
    // BUILD TIMELINE
    // -----------------------------------------------------

    const timeline = caseData.auditLog.map(
      (auditEntry, index) => {
        return {
          sequence: index + 1,

          action: auditEntry.action,

          actor: auditEntry.actor,

          timestamp: auditEntry.timestamp,

          details: auditEntry.details,

          integrity: {
            hash: auditEntry.hash,

            previousHash:
              auditEntry.previousHash,
          },
        };
      }
    );


    // -----------------------------------------------------
    // SORT TIMELINE
    // -----------------------------------------------------

    timeline.sort((a, b) => {
      return (
        new Date(a.timestamp) -
        new Date(b.timestamp)
      );
    });


    // -----------------------------------------------------
    // RESPONSE
    // -----------------------------------------------------

    return res.status(200).json({
      success: true,

      caseId: caseData.case_id,

      totalEvents: timeline.length,

      timeline,
    });
  } catch (error) {
    console.error(
      "Get case timeline error:",
      error
    );

    return res.status(500).json({
      success: false,
      message: "Failed to get case timeline",
      error: error.message,
    });
  }
};


// =========================================================
// EXPORT CONTROLLERS
// =========================================================

export {
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
};