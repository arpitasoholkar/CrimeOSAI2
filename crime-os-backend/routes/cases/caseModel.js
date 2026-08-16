import mongoose from "mongoose";
// =========================================================
// EVIDENCE SCHEMA (from crime-os-backend / crimeos-brain)
// =========================================================
//
// Raw complaint text + extracted entities, as ingested by
// crime-os-backend at intake time.
//

const evidenceSchema = new mongoose.Schema(
  {
    complaint_id: {
      type: String,
      required: true,
    },
    source_type: {
      type: String,
      enum: ["text", "pdf", "image", "audio"],
      required: true,
    },
    raw_text: {
      type: String,
      required: true,
    },
    language: {
      type: String,
      default: "unknown",
    },
    entities: {
      names: { type: [String], default: [] },
      phone_numbers: { type: [String], default: [] },
      emails: { type: [String], default: [] },
      upi_ids: { type: [String], default: [] },
      bank_accounts: { type: [String], default: [] },
      ifsc_codes: { type: [String], default: [] },
      pan_numbers: { type: [String], default: [] },
      aadhaar_numbers: { type: [String], default: [] },
      vehicle_numbers: { type: [String], default: [] },
      amounts: {
        type: [
          {
            value: Number,
            currency: String,
            raw: String,
          },
        ],
        default: [],
      },
      dates: { type: [String], default: [] },
      times: { type: [String], default: [] },
      platforms: { type: [String], default: [] },
    },
    uploadedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { _id: false }
);

// =========================================================
// EVIDENCE FILE SCHEMA (from crimeos-summary)
// =========================================================
//
// Separate from `evidenceSchema` above -- this is for
// UPLOADED FILES (with integrity hash), not extracted text.
// Different purpose, kept as its own sub-document array.
//

const evidenceFileSchema = new mongoose.Schema(
  {
    path: {
      type: String,
      required: true,
    },
    hash: {
      type: String,
      required: true,
    },
  },
  { _id: true }
);

// =========================================================
// ENTITY SCHEMA (from crimeos-summary)
// =========================================================
//
// Flat entity list, e.g. { type: "PHONE", value: "...", confidence: 0.9 }
// Kept separate from evidenceSchema.entities (which is the
// structured extraction shape from crime-os-backend).
//

const entitySchema = new mongoose.Schema(
  {
    type: {
      type: String,
      required: true,
    },
    value: {
      type: String,
      required: true,
    },
    confidence: {
      type: Number,
      default: null,
    },
    // Optional -- only set when a location entity has real coordinates
    // (e.g. resolved from a police station / address on file). Never
    // fabricated client-side; Geographic Intelligence only plots entities
    // that actually carry these.
    lat: { type: Number, default: null },
    lng: { type: Number, default: null },
    // Where this entity came from, so the UI/graph can trace it back
    // to its source (an evidence complaint_id or a legal requestId).
    source: { type: String, default: null },
  },
  { _id: false }
);

// =========================================================
// RELATIONSHIP SCHEMA (new -- entity graph edges)
// =========================================================
//
// Deterministic graph edges between entities/case objects, built by
// the investigation engine (crimeos-brain) from real case data only --
// e.g. "UPI ID X" --sent-payment-to--> "Account Y", never invented.
//

const relationshipSchema = new mongoose.Schema(
  {
    from: { type: String, required: true },
    to: { type: String, required: true },
    type: { type: String, required: true },
    // requestId / complaint_id this relationship is grounded in, if any.
    evidenceRef: { type: String, default: null },
  },
  { _id: false }
);

// =========================================================
// INVESTIGATION VERSION SCHEMA (new)
// =========================================================
//
// Every AI (re-)investigation appends one of these instead of
// overwriting `analysis`. This is the core of the "living
// investigation" -- known/missing/findings/recommendations/entities/
// relationships as of that run, plus the delta vs the version before it.
//

const investigationVersionSchema = new mongoose.Schema(
  {
    version: { type: Number, required: true },

    trigger: {
      type: String,
      enum: [
        "initial_complaint",
        "evidence_added",
        "legal_response_received",
        "entity_added",
        "manual_reinvestigation",
      ],
      required: true,
    },

    // Short "what do we currently know" paragraph -- built from this
    // version's own known/findings, never free-floating LLM prose.
    assessment: { type: String, default: "" },

    risk: {
      type: String,
      enum: ["low", "medium", "high", "critical", null],
      default: null,
    },
    riskReasoning: { type: String, default: "" },

    confidence: { type: Number, default: null },
    confidenceBreakdown: { type: mongoose.Schema.Types.Mixed, default: null },

    known: { type: [mongoose.Schema.Types.Mixed], default: [] },
    missing: { type: [mongoose.Schema.Types.Mixed], default: [] },
    findings: { type: [mongoose.Schema.Types.Mixed], default: [] },
    recommendations: { type: [mongoose.Schema.Types.Mixed], default: [] },

    entities: { type: [entitySchema], default: [] },
    relationships: { type: [relationshipSchema], default: [] },

    matchedSopIds: { type: [String], default: [] },
    legalSections: { type: [mongoose.Schema.Types.Mixed], default: [] },
    escalation: { type: mongoose.Schema.Types.Mixed, default: null },

    supportingEvidence: { type: [String], default: [] },
    legalRequestReferences: { type: [String], default: [] },

    // Delta vs the previous version (null for version 1).
    delta: { type: mongoose.Schema.Types.Mixed, default: null },

    createdAt: { type: Date, default: Date.now },
  },
  { _id: true }
);

// =========================================================
// LEGAL / PROVIDER REQUEST SCHEMA (from crimeos-summary)
// =========================================================

// =========================================================
// CASE ACCESS REQUEST SCHEMA
// =========================================================
//
// Only the case's investigators[] can see full case data. Anyone else
// hits a stripped preview and can file one of these to ask the lead
// investigator for access -- see requestCaseAccess/respondToAccessRequest
// in caseController.js.
//

const accessRequestSchema = new mongoose.Schema(
  {
    requestId: {
      type: String,
      required: true,
    },
    requesterUsername: {
      type: String,
      required: true,
    },
    requesterName: {
      type: String,
      default: null,
    },
    status: {
      type: String,
      enum: ["pending", "approved", "rejected"],
      default: "pending",
    },
    message: {
      type: String,
      default: null,
    },
    requestedAt: {
      type: Date,
      default: Date.now,
    },
    respondedAt: {
      type: Date,
      default: null,
    },
    respondedBy: {
      type: String,
      default: null,
    },
  },
  { _id: false }
);

const requestSchema = new mongoose.Schema(
  {
    requestId: {
      type: String,
      required: true,
    },
    requestType: {
      type: String,
      required: true,
      enum: ["bank", "telecom"],
    },
    provider: {
      type: String,
      default: null,
    },
    // Officer who generated this request (User.username). Distinct from
    // `approvedBy` (who signed off on sending it) and `response.recordedBy`
    // (who logged the provider's reply) -- together these three fields
    // give a full accountability trail for who touched this request when.
    generatedBy: {
      type: String,
      default: null,
    },
    // NOTE: this is the LEGAL REQUEST status, separate from
    // the overall case `status` field below.
    status: {
      type: String,
      enum: ["draft", "approved", "sent", "overdue", "completed", "rejected"],
      default: "draft",
    },
    htmlSnapshot: {
      type: String,
      required: true,
    },
    sentAt: {
      type: Date,
      default: null,
    },
    sentTo: {
      type: String,
      default: null,
    },
    messageId: {
      type: String,
      default: null,
    },
    previewUrl: {
      type: String,
      default: null,
    },
    deadline: {
      type: Date,
      default: null,
    },
    approvedBy: {
      type: String,
      default: null,
    },
    approvedAt: {
      type: Date,
      default: null,
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },

    // ---- response received (new) ----
    // Officer-recorded response from the provider (bank/telecom). This is
    // manual entry (there's no document-parsing pipeline for responses),
    // but it's what actually drives "legal_response_received" -> new
    // entities -> re-investigation -> delta.
    response: {
      receivedAt: { type: Date, default: null },
      recordedBy: { type: String, default: null },
      notes: { type: String, default: null },
      // Free-form structured fields officer transcribes from the reply,
      // e.g. { accountHolder, kycPhone, kycAddress, deviceId, ipAddress }
      data: { type: mongoose.Schema.Types.Mixed, default: null },
    },
  },
  { _id: true }
);

// =========================================================
// CASE RESOLUTION SCHEMA (new -- "Case Completed" record)
// =========================================================
//
// Filled in once, when an investigator marks the case complete.
// Captures the closure story that the raw status enum can't: how the
// case concluded, what evidence drove that conclusion, and what
// happened to the victim -- so anyone browsing the Cases Archive later
// (including investigators who never worked the case) gets the full
// picture without having to reconstruct it from the audit log.
//

const resolutionSchema = new mongoose.Schema(
  {
    outcome: {
      type: String,
      enum: [
        "culprit_identified",
        "culprit_arrested",
        "money_recovered",
        "false_complaint",
        "withdrawn_by_complainant",
        "unable_to_resolve",
        "other",
      ],
      required: true,
    },
    // Free-text "how did it conclude" narrative.
    summary: {
      type: String,
      required: true,
    },
    // "What are the evidences" -- key evidence that drove the outcome.
    keyEvidence: {
      type: String,
      default: "",
    },
    // "What happened to the victim" -- compensation, recovery amount,
    // welfare follow-up, etc.
    victimOutcome: {
      type: String,
      default: "",
    },
    // Any recovered amount, if applicable (money-mule / fraud cases).
    amountRecovered: {
      type: Number,
      default: null,
    },
    actionsTaken: {
      type: String,
      default: "",
    },
    closedBy: {
      type: String,
      required: true,
    },
    closedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { _id: false }
);

// =========================================================
// AUDIT LOG SCHEMA (from crimeos-summary)
// =========================================================
//
// Hash-chained audit trail. Each entry links to the previous
// entry's hash for tamper detection.
//

const auditLogSchema = new mongoose.Schema(
  {
    action: {
      type: String,
      required: true,
    },
    actor: {
      type: String,
      required: true,
    },
    timestamp: {
      type: Date,
      default: Date.now,
    },
    details: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    previousHash: {
      type: String,
      default: null,
    },
    hash: {
      type: String,
      default: null,
    },
  },
  { _id: true }
);

// =========================================================
// MAIN CASE SCHEMA -- unified across all three services
// =========================================================

const caseSchema = new mongoose.Schema(
  {
    // ---- identity (crime-os-backend naming, kept as canonical) ----
    case_id: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },

    title: {
      type: String,
      default: "Untitled Case",
    },

    // ---- case access control ----
    // Only investigators[] (plus anyone the lead approves via
    // accessRequests[]) can see this case's full data. Everyone else
    // gets a stripped preview and a "Request Access" option.
    leadInvestigator: {
      type: String,
      default: null,
      index: true,
    },
    investigators: {
      type: [String],
      default: [],
    },
    accessRequests: {
      type: [accessRequestSchema],
      default: [],
    },

    // ---- status ----
    // Merged enum: includes crime-os-backend/brain's values
    // AND crimeos-summary's values, since both write to this field.
    status: {
      type: String,
      enum: [
        "pending_analysis",       // crime-os-backend / crimeos-brain
        "under_investigation",    // shared by both sides
        "investigation_approved", // crimeos-brain (approve route)
        "open",                   // crimeos-summary
        "pending_action",         // crimeos-summary
        "resolved",               // shared
        "closed",                 // crimeos-summary
      ],
      default: "pending_analysis",
    },

    severity: {
      type: String,
      enum: ["low", "medium", "high", "critical"],
      default: "medium",
    },

    // ---- case completion / archive ----
    // Set once, when any investigator on the case marks it complete.
    // A completed case is read-only and shows up in the Cases Archive
    // for EVERY authenticated investigator, not just the ones who
    // worked it -- see getCaseById / getArchivedCases in the controller.
    isCompleted: {
      type: Boolean,
      default: false,
      index: true,
    },
    resolution: {
      type: resolutionSchema,
      default: null,
    },

    // ---- crime-os-backend / crimeos-brain fields ----
    evidence: {
      type: [evidenceSchema],
      default: [],
    },

    // Legacy mirror of the latest investigationVersions[] entry's raw
    // engine output, kept for backward compatibility with anything still
    // reading `analysis` directly (e.g. AIInvestigation.jsx step approval).
    analysis: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },

    // The living investigation state -- one entry per (re-)investigation,
    // never overwritten. This is the core of Case Intelligence: known vs
    // missing, findings, recommendations, entities/relationships, and the
    // delta vs the previous version.
    investigationVersions: {
      type: [investigationVersionSchema],
      default: [],
    },

    reports: {
      type: [mongoose.Schema.Types.Mixed],
      default: [],
    },

    timeline: {
      type: [mongoose.Schema.Types.Mixed],
      default: [],
    },

    // ---- crimeos-summary fields ----
    entities: {
      type: [entitySchema],
      default: [],
    },

    requests: {
      type: [requestSchema],
      default: [],
    },

    evidenceFiles: {
      type: [evidenceFileSchema],
      default: [],
    },

    auditLog: {
      type: [auditLogSchema],
      default: [],
    },

    summary: {
      text: { type: String, default: null },
      statistics: {
        totalRequests: { type: Number, default: 0 },
        draftRequests: { type: Number, default: 0 },
        approvedRequests: { type: Number, default: 0 },
        sentRequests: { type: Number, default: 0 },
        overdueRequests: { type: Number, default: 0 },
        completedRequests: { type: Number, default: 0 },
        totalEvidenceFiles: { type: Number, default: 0 },
        // ---- investigation-version-derived stats (new) ----
        matchedSopIds: { type: [String], default: [] },
        aiConfidence: { type: Number, default: null },
        escalationRequired: { type: Boolean, default: false },
        approvedStepCount: { type: Number, default: 0 },
        approvedLegalSectionCount: { type: Number, default: 0 },
        investigationVersion: { type: Number, default: null },
        risk: { type: String, default: null },
        missingCount: { type: Number, default: 0 },
        findingsCount: { type: Number, default: 0 },
        recommendationsCount: { type: Number, default: 0 },
      },
      generatedAt: { type: Date, default: null },
    },

    processedOfflineActionIds: {
      type: [String],
      default: [],
    },

    // Officer this case is assigned to, stored as the User's `username`.
    // Powers the "cases solved / ongoing" counters on the Profile page.
    // Nullable: older/unassigned cases just don't count toward anyone.
    assignedTo: {
      type: String,
      default: null,
      index: true,
    },
  },
  { timestamps: true }
);

const Case = mongoose.models.Case || mongoose.model("Case", caseSchema);

export default Case;