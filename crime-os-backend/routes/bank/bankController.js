// crime-os-backend/routes/bank/bankController.js
//
// Backend for the /mock-bank demo portal (see crimeos-frontend/src/pages
// for the corresponding page). This is a SEPARATE persona from the
// investigator UI -- a "bank compliance officer" looking at requests sent
// to their fictional bank -- so it deliberately does NOT use requireAuth
// (an investigator JWT). It reuses the exact same Case model and the same
// respondToLegalRequest() logic that the investigator-facing
// recordLegalResponse endpoint uses; no new schema, no duplicate
// infrastructure.
//
// This is a hackathon demo simulation. Nothing here talks to a real bank.

import Case from "../cases/caseModel.js";
import { respondToLegalRequest } from "../../lib/respondToLegalRequest.js";

// =========================================================
// LIST PENDING BANK REQUESTS
// =========================================================
//
// GET /bank/requests
//
// Every request, across every case, that is currently sitting with a
// bank and awaiting a reply. Deliberately projects down to just what a
// bank officer needs to see -- no case internals (risk score, other
// entities, other requests) leak into this view.
//
const listPendingBankRequests = async (req, res) => {
  try {
    const cases = await Case.find(
      {
        requests: {
          $elemMatch: {
            requestType: "bank",
            status: { $in: ["sent", "overdue"] },
          },
        },
      },
      { case_id: 1, title: 1, requests: 1 }
    ).lean();

    const pending = [];
    for (const c of cases) {
      for (const r of c.requests || []) {
        if (r.requestType === "bank" && ["sent", "overdue"].includes(r.status)) {
          pending.push({
            case_id: c.case_id,
            case_title: c.title,
            requestId: r.requestId,
            provider: r.provider,
            status: r.status,
            sentAt: r.sentAt,
            deadline: r.deadline,
            sentTo: r.sentTo,
          });
        }
      }
    }

    // Most recently sent first -- a real inbox reads newest-on-top.
    pending.sort((a, b) => new Date(b.sentAt) - new Date(a.sentAt));

    return res.status(200).json({ success: true, requests: pending });
  } catch (error) {
    console.error("List pending bank requests error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to list pending bank requests",
      error: error.message,
    });
  }
};

// =========================================================
// GET SINGLE BANK REQUEST DETAIL
// =========================================================
//
// GET /bank/requests/:case_id/:requestId
//
const getBankRequestDetail = async (req, res) => {
  try {
    const { case_id, requestId } = req.params;

    const caseData = await Case.findOne(
      { case_id },
      { case_id: 1, title: 1, requests: 1 }
    ).lean();

    if (!caseData) {
      return res.status(404).json({ success: false, message: "Case not found" });
    }

    const requestData = (caseData.requests || []).find(
      (r) => r.requestId === requestId
    );

    if (!requestData || requestData.requestType !== "bank") {
      return res.status(404).json({ success: false, message: "Bank request not found" });
    }

    return res.status(200).json({
      success: true,
      case_id: caseData.case_id,
      case_title: caseData.title,
      request: requestData,
    });
  } catch (error) {
    console.error("Get bank request detail error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to load bank request",
      error: error.message,
    });
  }
};

// =========================================================
// RESPOND TO BANK REQUEST
// =========================================================
//
// POST /bank/requests/:case_id/:requestId/respond
//
// Body: { officerName?: string, notes?: string, data: { accountHolder,
//   accountNumber, kycPhone, kycAddress, deviceId, ipAddress, ... } }
//
// Delegates to the same respondToLegalRequest() the investigator route
// uses -- entities get attached to the case, an audit entry is written,
// and crimeos-brain re-investigation is triggered, exactly as if an
// investigator had logged the reply manually. The only difference is the
// actor name and audit action label, so it's clear in the case's audit
// trail/timeline that this response came through the simulated bank
// portal rather than being investigator-transcribed.
//
const respondToBankRequest = async (req, res) => {
  try {
    const { case_id, requestId } = req.params;
    const { officerName, notes, data = {} } = req.body;

    const result = await respondToLegalRequest({
      case_id,
      requestId,
      recordedBy: officerName || "XYZ Bank — Compliance Officer",
      notes,
      data,
      auditAction: "BANK_MOCK_RESPONSE_RECEIVED",
    });

    return res.status(result.status).json(result.body);
  } catch (error) {
    console.error("Respond to bank request error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to record bank response",
      error: error.message,
    });
  }
};

export { listPendingBankRequests, getBankRequestDetail, respondToBankRequest };
