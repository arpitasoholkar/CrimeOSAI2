import Case from "./caseModel.js";
import User from "../../models/User.js";
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
  getSuggestedNextSteps,
} from "../requests/nextStepsService.js";

import {
  extractResponseFields,
} from "../requests/responseExtractService.js";

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
      title,
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

      title: title && title.trim() ? title.trim() : "Untitled Case",

      leadInvestigator: req.user?.username || null,
      investigators: req.user?.username ? [req.user.username] : [],

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

    const username = req.user?.username || null;
    const isInvestigator =
      !!username && caseData.investigators.includes(username);

    // Not on this case's investigator list -- return a stripped preview
    // instead of the full case (evidence, entities, timeline, requests,
    // etc). The frontend uses this to show a locked state with a
    // "Request Access" action rather than the full case UI.
    if (!isInvestigator) {
      const pendingRequest = username
        ? caseData.accessRequests.find(
            (r) => r.requesterUsername === username && r.status === "pending"
          )
        : null;

      return res.status(200).json({
        success: true,
        isInvestigator: false,
        hasPendingRequest: !!pendingRequest,
        case: {
          case_id: caseData.case_id,
          title: caseData.title,
          status: caseData.status,
          severity: caseData.severity,
          leadInvestigator: caseData.leadInvestigator,
          createdAt: caseData.createdAt,
        },
      });
    }

    return res.status(200).json({
      success: true,
      isInvestigator: true,
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
// CASE ACCESS CONTROL
// =========================================================
//
// POST /cases/:case_id/access-request
//
// A non-investigator asks the lead investigator for access. Rejects if
// the requester is already on the case or already has a pending request
// -- one open request per person per case at a time.
//

const requestCaseAccess = async (req, res) => {
  try {
    const { case_id } = req.params;
    const { message = null } = req.body;

    const caseData = await Case.findOne({ case_id });
    if (!caseData) {
      return res.status(404).json({ success: false, message: "Case not found" });
    }

    const requester = await User.findById(req.user.id);
    if (!requester) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    if (caseData.investigators.includes(requester.username)) {
      return res.status(400).json({
        success: false,
        message: "You already have access to this case",
      });
    }

    const existingPending = caseData.accessRequests.find(
      (r) => r.requesterUsername === requester.username && r.status === "pending"
    );
    if (existingPending) {
      return res.status(400).json({
        success: false,
        message: "You already have a pending request for this case",
      });
    }

    const requestId = `ACR-${Date.now()}`;

    caseData.accessRequests.push({
      requestId,
      requesterUsername: requester.username,
      requesterName: requester.name,
      status: "pending",
      message,
      requestedAt: new Date(),
    });

    await caseData.save();

    // Notify the lead investigator by email, if we can find one.
    if (caseData.leadInvestigator) {
      const lead = await User.findOne({ username: caseData.leadInvestigator });
      if (lead?.email) {
        const html = `
          <div style="font-family: Arial, sans-serif; font-size: 14px; color:#1a1a1a;">
            <p><strong>${requester.name}</strong> (${requester.role || "Investigator"}, ${requester.organisation || ""}) has requested access to case <strong>${caseData.case_id}</strong> — "${caseData.title}".</p>
            ${message ? `<p style="background:#f7f8fa; border-left:3px solid #0f2a4a; padding:10px 14px;">${message}</p>` : ""}
            <p>Review and respond to this request from the case's Access Requests panel in Crime OS AI.</p>
          </div>
        `;
        try {
          await sendLegalRequestEmail({
            to: lead.email,
            subject: `Access request for case ${caseData.case_id}`,
            html,
          });
        } catch (emailErr) {
          // Don't fail the request just because the notification email
          // didn't go out -- the request is still recorded and visible
          // in-app either way.
          console.error("[requestCaseAccess] Failed to send notification email:", emailErr);
        }
      }
    }

    return res.status(201).json({
      success: true,
      message: "Access request sent",
      requestId,
    });
  } catch (error) {
    console.error("Request case access error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to request case access",
      error: error.message,
    });
  }
};

// =========================================================
// POST /cases/:case_id/access-request/:requestId/approve
// POST /cases/:case_id/access-request/:requestId/reject
//
// Lead-investigator-only. Approving adds the requester to
// investigators[]; rejecting just marks the request rejected.
//

const respondToAccessRequest = (decision) => async (req, res) => {
  try {
    const { case_id, requestId } = req.params;

    const caseData = await Case.findOne({ case_id });
    if (!caseData) {
      return res.status(404).json({ success: false, message: "Case not found" });
    }

    if (caseData.leadInvestigator !== req.user.username) {
      return res.status(403).json({
        success: false,
        message: "Only this case's lead investigator can respond to access requests",
      });
    }

    const accessRequest = caseData.accessRequests.find(
      (r) => r.requestId === requestId
    );
    if (!accessRequest) {
      return res.status(404).json({ success: false, message: "Access request not found" });
    }
    if (accessRequest.status !== "pending") {
      return res.status(400).json({
        success: false,
        message: `This request was already ${accessRequest.status}`,
      });
    }

    accessRequest.status = decision;
    accessRequest.respondedAt = new Date();
    accessRequest.respondedBy = req.user.username;

    if (decision === "approved" && !caseData.investigators.includes(accessRequest.requesterUsername)) {
      caseData.investigators.push(accessRequest.requesterUsername);
    }

    await caseData.save();

    return res.status(200).json({
      success: true,
      message: `Access request ${decision}`,
      accessRequest,
    });
  } catch (error) {
    console.error("Respond to access request error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to respond to access request",
      error: error.message,
    });
  }
};

const approveCaseAccess = respondToAccessRequest("approved");
const rejectCaseAccess = respondToAccessRequest("rejected");

// =========================================================
// GET /cases/my
//
// Cases the logged-in officer is an investigator on.
//

const getMyCases = async (req, res) => {
  try {
    const cases = await Case.find(
      { investigators: req.user.username },
      "case_id title status severity updatedAt leadInvestigator investigators"
    )
      .sort({ updatedAt: -1 })
      .lean();

    return res.status(200).json({ success: true, cases });
  } catch (error) {
    console.error("Get my cases error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch your cases",
      error: error.message,
    });
  }
};

// =========================================================
// GET /cases/access-requests/mine
//
// The logged-in officer's own outgoing access requests, across all
// cases, newest first -- for their personal status panel.
//

const getMyAccessRequests = async (req, res) => {
  try {
    const cases = await Case.find(
      { "accessRequests.requesterUsername": req.user.username },
      "case_id title accessRequests"
    ).lean();

    const requests = [];
    for (const c of cases) {
      for (const r of c.accessRequests) {
        if (r.requesterUsername === req.user.username) {
          requests.push({
            case_id: c.case_id,
            caseTitle: c.title,
            ...r,
          });
        }
      }
    }

    requests.sort((a, b) => new Date(b.requestedAt) - new Date(a.requestedAt));

    return res.status(200).json({ success: true, requests });
  } catch (error) {
    console.error("Get my access requests error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch your access requests",
      error: error.message,
    });
  }
};

// =========================================================
// GET /cases/access-requests/incoming
//
// Pending requests waiting on the logged-in officer to approve/reject,
// across every case they lead.
//

const getIncomingAccessRequests = async (req, res) => {
  try {
    const cases = await Case.find(
      { leadInvestigator: req.user.username },
      "case_id title accessRequests"
    ).lean();

    const requests = [];
    for (const c of cases) {
      for (const r of c.accessRequests) {
        if (r.status === "pending") {
          requests.push({
            case_id: c.case_id,
            caseTitle: c.title,
            ...r,
          });
        }
      }
    }

    requests.sort((a, b) => new Date(b.requestedAt) - new Date(a.requestedAt));

    return res.status(200).json({ success: true, requests });
  } catch (error) {
    console.error("Get incoming access requests error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch incoming access requests",
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
    // GENERATE REQUEST ID
    // -----------------------------------------------------

    const requestId = `REQ-${Date.now()}`;

    // -----------------------------------------------------
    // IDENTIFY THE REQUESTING OFFICER
    // -----------------------------------------------------
    //
    // Prefer the logged-in user (req.user, set by requireAuth on this
    // route). Falls back to whoever the case is assigned to if the
    // request somehow arrives without a session. This is what lets the
    // letter carry a named, accountable officer instead of "SYSTEM".
    //
    let officer = null;
    const officerUsername = req.user?.username || caseData.assignedTo;
    if (officerUsername) {
      officer = await User.findOne({ username: officerUsername }).lean();
    }

    // -----------------------------------------------------
    // GENERATE HTML SNAPSHOT
    // -----------------------------------------------------
    //
    // Scoped to only the identifier this specific request concerns --
    // see templateService.js. We do NOT hand the provider the full
    // raw complaint text or unrelated case entities.
    //

    const filledHtml = fillTemplate(
      caseData.toObject(),
      requestType,
      { requestId, provider, officer }
    );

    // -----------------------------------------------------
    // CREATE REQUEST
    // -----------------------------------------------------

    const newRequest = {
      requestId,

      requestType,

      provider,

      status: "draft",

      htmlSnapshot: filledHtml,

      generatedBy: officer?.username || null,

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

      suggestedNextSteps: getSuggestedNextSteps(savedRequest),
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

    const { approvedBy: approvedByBody } = req.body;
    const approvedBy = approvedByBody || req.user?.username;

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

      suggestedNextSteps: getSuggestedNextSteps(requestData),
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

      suggestedNextSteps: getSuggestedNextSteps(requestData),

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
    const { recordedBy: recordedByBody, notes, data = {} } = req.body;
    const recordedBy = recordedByBody || req.user?.username;

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

      suggestedNextSteps: getSuggestedNextSteps(requestData),
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
// SUGGEST LEGAL RESPONSE FIELDS (LLM-assisted, read-only)
// =========================================================
//
// POST /cases/:case_id/request/:requestId/response/extract
//
// Takes the raw text of a provider's reply and returns suggested
// values for the recordLegalResponse fields. Does NOT save anything
// to the case -- the officer reviews/edits the suggestions client-side
// and then calls the existing recordLegalResponse endpoint to actually
// commit them. Keeps a human in the loop before anything becomes
// case evidence.
//

const suggestLegalResponseFields = async (req, res) => {
  try {
    const { case_id, requestId } = req.params;
    const { replyText } = req.body;

    if (!replyText || !replyText.trim()) {
      return res.status(400).json({
        success: false,
        message: "replyText is required",
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
          "Response fields can only be suggested for a sent (or overdue) request",
      });
    }

    const suggestion = await extractResponseFields(
      replyText,
      requestData.requestType
    );

    return res.status(200).json({
      success: true,
      message:
        suggestion.source === "llm"
          ? "Suggested fields extracted from reply"
          : "Could not run extraction -- review and enter fields manually",
      ...suggestion,
    });
  } catch (error) {
    console.error("Suggest legal response fields error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to extract suggested fields",
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
  requestCaseAccess,
  approveCaseAccess,
  rejectCaseAccess,
  getMyCases,
  getMyAccessRequests,
  getIncomingAccessRequests,
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
};