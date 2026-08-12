import Case from "../cases/caseModel.js";

import {
  createHashedAuditEntry,
} from "../audit/auditHashService.js";
// =========================================================
// SUPPORTED OFFLINE ACTIONS
// =========================================================
//
// These are actions the backend currently knows how to
// replay after the frontend reconnects.
//
// Example:
//
// User is offline
//      ↓
// Frontend stores an action locally
//      ↓
// Internet returns
//      ↓
// Frontend sends action to backend
//      ↓
// Backend replays action
//

const SUPPORTED_OFFLINE_ACTIONS = [
  "ADD_CASE_NOTE",
  "UPDATE_CASE_STATUS",
];


// =========================================================
// PROCESS ADD CASE NOTE
// =========================================================
//
// Offline action:
//
// {
//   actionType: "ADD_CASE_NOTE",
//   payload: {
//     note: "Victim contacted again"
//   }
// }
//

const processAddCaseNote = async ({
  caseData,
  payload,
  actor,
}) => {
  // -------------------------------------------------------
  // VALIDATE NOTE
  // -------------------------------------------------------

  if (
    !payload.note ||
    typeof payload.note !== "string"
  ) {
    throw new Error(
      "A valid note is required"
    );
  }


  // -------------------------------------------------------
  // CREATE HASHED AUDIT ENTRY
  // -------------------------------------------------------
  //
  // Notes are stored in the audit history for the
  // hackathon demo.
  //

  const auditEntry = createHashedAuditEntry({
    action: "CASE_NOTE_ADDED",

    actor,

    details: {
      note: payload.note,
      source: "OFFLINE_SYNC",
    },

    auditLog: caseData.auditLog,
  });


  // -------------------------------------------------------
  // ADD AUDIT ENTRY
  // -------------------------------------------------------

  caseData.auditLog.push(auditEntry);


  // -------------------------------------------------------
  // RETURN ACTION RESULT
  // -------------------------------------------------------

  return {
    action: "CASE_NOTE_ADDED",
    note: payload.note,
  };
};


// =========================================================
// PROCESS CASE STATUS UPDATE
// =========================================================
//
// Offline action:
//
// {
//   actionType: "UPDATE_CASE_STATUS",
//   payload: {
//     status: "under_investigation"
//   }
// }
//

const processCaseStatusUpdate = async ({
  caseData,
  payload,
  actor,
}) => {
  // -------------------------------------------------------
  // ALLOWED CASE STATUSES
  // -------------------------------------------------------

  const allowedStatuses = [
    "open",
    "under_investigation",
    "pending_action",
    "resolved",
    "closed",
  ];


  // -------------------------------------------------------
  // VALIDATE STATUS
  // -------------------------------------------------------

  if (
    !payload.status ||
    !allowedStatuses.includes(payload.status)
  ) {
    throw new Error(
      "Invalid case status"
    );
  }


  // -------------------------------------------------------
  // SAVE PREVIOUS STATUS
  // -------------------------------------------------------

  const previousStatus = caseData.status;


  // -------------------------------------------------------
  // UPDATE CASE STATUS
  // -------------------------------------------------------

  caseData.status = payload.status;


  // -------------------------------------------------------
  // CREATE HASHED AUDIT ENTRY
  // -------------------------------------------------------

  const auditEntry = createHashedAuditEntry({
    action: "CASE_STATUS_UPDATED",

    actor,

    details: {
      previousStatus,
      newStatus: payload.status,
      source: "OFFLINE_SYNC",
    },

    auditLog: caseData.auditLog,
  });


  // -------------------------------------------------------
  // ADD AUDIT ENTRY
  // -------------------------------------------------------

  caseData.auditLog.push(auditEntry);


  // -------------------------------------------------------
  // RETURN ACTION RESULT
  // -------------------------------------------------------

  return {
    action: "CASE_STATUS_UPDATED",
    previousStatus,
    newStatus: payload.status,
  };
};


// =========================================================
// PROCESS OFFLINE ACTION
// =========================================================
//
// This is the main router for offline actions.
//
// clientActionId
//      ↓
// Check whether already processed
//      ↓
// YES → skip safely
//      ↓
// NO → execute action
//      ↓
// Mark clientActionId as processed
//      ↓
// Save case
//
// This makes offline retries IDEMPOTENT.
//

const processOfflineAction = async ({
  caseId,
  clientActionId,
  actionType,
  payload = {},
  actor = "SYSTEM",
}) => {
  // -------------------------------------------------------
  // VALIDATE CLIENT ACTION ID
  // -------------------------------------------------------

  if (
    !clientActionId ||
    typeof clientActionId !== "string"
  ) {
    throw new Error(
      "clientActionId is required"
    );
  }


  // -------------------------------------------------------
  // CHECK ACTION TYPE
  // -------------------------------------------------------

  if (
    !SUPPORTED_OFFLINE_ACTIONS.includes(actionType)
  ) {
    throw new Error(
      `Unsupported offline action: ${actionType}`
    );
  }


  // -------------------------------------------------------
  // FIND CASE
  // -------------------------------------------------------

  const caseData = await Case.findOne({
    caseId,
  });

  if (!caseData) {
    throw new Error("Case not found");
  }


  // -------------------------------------------------------
  // ENSURE PROCESSED IDS ARRAY EXISTS
  // -------------------------------------------------------
  //
  // Older MongoDB case documents may have been created
  // before processedOfflineActionIds was added to the
  // schema.
  //

  if (!caseData.processedOfflineActionIds) {
    caseData.processedOfflineActionIds = [];
  }


  // -------------------------------------------------------
  // IDEMPOTENCY CHECK
  // -------------------------------------------------------
  //
  // A mobile/offline client may retry the same action if
  // it did not receive the previous HTTP response.
  //
  // If the clientActionId was already processed
  // successfully, do NOT execute the action again.
  //

  if (
    caseData.processedOfflineActionIds.includes(
      clientActionId
    )
  ) {
    return {
      caseId: caseData.caseId,
      actionType,
      skipped: true,
      reason: "ALREADY_PROCESSED",
    };
  }


  // -------------------------------------------------------
  // PROCESS ACTION
  // -------------------------------------------------------

  let result;


  if (actionType === "ADD_CASE_NOTE") {
    result = await processAddCaseNote({
      caseData,
      payload,
      actor,
    });
  }


  if (actionType === "UPDATE_CASE_STATUS") {
    result = await processCaseStatusUpdate({
      caseData,
      payload,
      actor,
    });
  }


  // -------------------------------------------------------
  // MARK ACTION AS PROCESSED
  // -------------------------------------------------------
  //
  // IMPORTANT:
  //
  // We store clientActionId only AFTER the action has
  // executed successfully.
  //
  // Failed actions remain retryable.
  //

  caseData.processedOfflineActionIds.push(
    clientActionId
  );


  // -------------------------------------------------------
  // SAVE CASE
  // -------------------------------------------------------
  //
  // The action result, hashed audit entry and processed
  // clientActionId are persisted together.
  //

  await caseData.save();


  // -------------------------------------------------------
  // RETURN RESULT
  // -------------------------------------------------------

  return {
    caseId: caseData.caseId,
    actionType,
    skipped: false,
    result,
  };
};


// =========================================================
// EXPORT SERVICE
// =========================================================

export {
  SUPPORTED_OFFLINE_ACTIONS,
  processOfflineAction,
};