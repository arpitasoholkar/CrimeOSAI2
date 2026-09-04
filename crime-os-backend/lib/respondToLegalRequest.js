// crime-os-backend/lib/respondToLegalRequest.js
//
// Core "a provider responded to a legal request" logic. Originally lived
// inline in caseController.js's recordLegalResponse. Extracted so it has
// exactly one implementation, callable from two different HTTP surfaces:
//
//   - caseController.recordLegalResponse   (investigator manually logs a
//     reply they received by phone/email, requireAuth'd)
//   - bankController.respondToBankRequest  (the /mock-bank demo portal
//     submitting a simulated bank reply, no investigator auth)
//
// Behavior is identical either way: validate the request is sent/overdue,
// store the response, turn structured fields into case entities, write a
// hashed audit entry, save, and fire the AI re-investigation trigger.
//
// This does NOT send an HTTP response -- callers do that themselves, since
// the two routes want slightly different response shapes/status codes.

import Case from "../routes/cases/caseModel.js";
import { createHashedAuditEntry } from "../routes/audit/auditHashService.js";
import { getSuggestedNextSteps } from "../routes/requests/nextStepsService.js";
import { triggerReinvestigation } from "./reinvestigate.js";

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

/**
 * @param {Object} params
 * @param {string} params.case_id
 * @param {string} params.requestId
 * @param {string} params.recordedBy - who/what is recording the response
 *   (an investigator's username, or e.g. "XYZ Bank - Compliance Officer"
 *   for the mock bank portal)
 * @param {string} [params.notes]
 * @param {Object} [params.data] - structured fields, e.g.
 *   { accountHolder, accountNumber, kycPhone, deviceId, ... }
 * @param {string} [params.auditAction] - override the audit action label
 *   (defaults to "LEGAL_RESPONSE_RECEIVED"); the mock bank portal uses
 *   "BANK_MOCK_RESPONSE_RECEIVED" so audit/timeline entries are honest
 *   about the response being simulated.
 *
 * @returns {{ ok: true, status: 200, body: object }
 *         | { ok: false, status: number, body: object }}
 *   Never throws for expected validation failures -- callers just forward
 *   status/body to res. Only genuinely unexpected errors (DB down, etc.)
 *   throw, and callers should catch those themselves.
 */
export async function respondToLegalRequest({
  case_id,
  requestId,
  recordedBy,
  notes,
  data = {},
  auditAction = "LEGAL_RESPONSE_RECEIVED",
}) {
  if (!recordedBy) {
    return {
      ok: false,
      status: 400,
      body: { success: false, message: "recordedBy is required" },
    };
  }

  const caseData = await Case.findOne({ case_id });

  if (!caseData) {
    return {
      ok: false,
      status: 404,
      body: { success: false, message: "Case not found" },
    };
  }

  const requestData = caseData.requests.find(
    (request) => request.requestId === requestId
  );

  if (!requestData) {
    return {
      ok: false,
      status: 404,
      body: { success: false, message: "Legal request not found" },
    };
  }

  if (!["sent", "overdue"].includes(requestData.status)) {
    return {
      ok: false,
      status: 400,
      body: {
        success: false,
        message: "A response can only be recorded for a sent (or overdue) request",
      },
    };
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
    action: auditAction,
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

  return {
    ok: true,
    status: 200,
    body: {
      success: true,
      message: "Legal response recorded successfully",
      request: requestData,
      suggestedNextSteps: getSuggestedNextSteps(requestData),
      addedEntities,
    },
  };
}
