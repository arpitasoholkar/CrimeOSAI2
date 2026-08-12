// src/investigationState.js
//
// Turns one call to InvestigationEngine.suggest() (SOP-grounded steps,
// legal sections, gaps, confidence -- see investigationEngine.js) plus
// the case's actual stored data (evidence, entities, legal requests)
// into a single versioned "investigation state":
//
//   { known, missing, findings, recommendations, entities,
//     relationships, risk, confidence, assessment, delta, ... }
//
// Three ground rules, enforced throughout this file:
//
//   1. `known`, `findings`, `entities`, `relationships` are built ONLY
//      from data that actually exists on the case document (evidence,
//      case.entities, requests). Nothing here calls the LLM.
//   2. `missing`/`recommendations` combine a small deterministic gap
//      catalog (domain knowledge, same pattern as legalLookup.js) with
//      the LLM's own free-text `gaps` -- the catalog only fires when the
//      case's real entity/request state matches its `appliesIf` check.
//   3. Every field that came from the LLM (assessment reasoning inputs,
//      confidence, legalSections, matchedSopIds, escalation) is carried
//      through unmodified from engine.suggest() -- never re-worded or
//      strengthened here.

// ---------------------------------------------------------------------
// ENTITY EXTRACTION (deterministic)
// ---------------------------------------------------------------------

// Evidence-side structured extraction (see extractEntities.js) -> a
// canonical entity type + human label, in display priority order.
const EVIDENCE_ENTITY_MAP = [
  ["names", "PERSON_MENTIONED", "Name mentioned"],
  ["phone_numbers", "PHONE", "Phone number"],
  ["emails", "EMAIL", "Email"],
  ["upi_ids", "UPI_ID", "UPI ID"],
  ["bank_accounts", "BANK_ACCOUNT", "Bank account"],
  ["ifsc_codes", "IFSC_CODE", "IFSC code"],
  ["pan_numbers", "PAN", "PAN number"],
  ["aadhaar_numbers", "AADHAAR", "Aadhaar number"],
  ["vehicle_numbers", "VEHICLE", "Vehicle number"],
  ["platforms", "PLATFORM", "Platform"],
];

function extractEntitiesAndKnown(caseDoc) {
  const entities = [];
  const seen = new Set();

  const pushEntity = (type, value, source) => {
    if (!value) return;
    const key = `${type}::${value}`;
    if (seen.has(key)) return;
    seen.add(key);
    entities.push({ type, value: String(value), confidence: null, source });
  };

  const known = [];
  let hasComplainant = false;
  let totalAmount = null;
  let currency = null;

  for (const ev of caseDoc.evidence || []) {
    hasComplainant = true;
    for (const [field, type] of EVIDENCE_ENTITY_MAP.map(([f, t]) => [f, t])) {
      for (const value of ev.entities?.[field] || []) {
        pushEntity(type, value, ev.complaint_id);
      }
    }
    for (const amt of ev.entities?.amounts || []) {
      if (typeof amt.value === "number") {
        totalAmount = (totalAmount || 0) + amt.value;
        currency = amt.currency || currency || "INR";
        pushEntity("TRANSACTION_AMOUNT", amt.raw || `${amt.value}`, ev.complaint_id);
      }
    }
  }

  // Entities recorded later from legal-request responses (see
  // caseController.recordLegalResponse) -- already typed + sourced.
  for (const e of caseDoc.entities || []) {
    pushEntity(e.type, e.value, e.source);
  }

  if (hasComplainant) {
    known.push({
      label: "Complainant",
      detail: "Complaint recorded with supporting evidence on file.",
      source: caseDoc.evidence[0]?.complaint_id || null,
    });
  }
  if (totalAmount != null) {
    known.push({
      label: "Transaction amount",
      detail: `${currency || "INR"} ${totalAmount.toLocaleString("en-IN")}`,
      source: caseDoc.evidence[0]?.complaint_id || null,
    });
  }
  const upi = entities.find((e) => e.type === "UPI_ID");
  if (upi) known.push({ label: "UPI ID", detail: upi.value, source: upi.source });
  const phone = entities.find((e) => e.type === "PHONE");
  if (phone) known.push({ label: "Phone number", detail: phone.value, source: phone.source });
  const bankAccount = entities.find((e) => e.type === "BANK_ACCOUNT");
  if (bankAccount) known.push({ label: "Receiving account (raw)", detail: bankAccount.value, source: bankAccount.source });

  for (const req of caseDoc.requests || []) {
    if (["sent", "completed", "overdue"].includes(req.status)) {
      known.push({
        label: `${req.requestType === "bank" ? "Bank" : "Telecom"} legal request`,
        detail: `${req.requestId} — ${req.status}`,
        source: req.requestId,
      });
    }
  }

  return { entities, known, totalAmount };
}

// ---------------------------------------------------------------------
// RELATIONSHIP EXTRACTION (deterministic)
// ---------------------------------------------------------------------

function extractRelationships(caseDoc, entities) {
  const relationships = [];
  const complainantId = caseDoc.evidence?.[0]?.complaint_id || "Complainant";

  const upi = entities.find((e) => e.type === "UPI_ID");
  const bankAccount = entities.find((e) => e.type === "BANK_ACCOUNT");
  const accountHolder = entities.find((e) => e.type === "ACCOUNT_HOLDER");
  const accountNumber = entities.find((e) => e.type === "ACCOUNT_NUMBER") || bankAccount;
  const kycPhone = entities.find((e) => e.type === "KYC_PHONE");
  const phone = entities.find((e) => e.type === "PHONE");
  const deviceId = entities.find((e) => e.type === "DEVICE_ID");
  const ipAddress = entities.find((e) => e.type === "IP_ADDRESS");

  if (upi) {
    relationships.push({
      from: "Complainant",
      to: upi.value,
      type: "sent-payment-to",
      evidenceRef: upi.source,
    });
  }
  if (upi && bankAccount) {
    relationships.push({
      from: upi.value,
      to: bankAccount.value,
      type: "linked-to",
      evidenceRef: bankAccount.source,
    });
  }
  if (accountNumber && accountHolder) {
    relationships.push({
      from: accountNumber.value,
      to: accountHolder.value,
      type: "owned-by",
      evidenceRef: accountHolder.source,
    });
  }
  if (accountHolder && kycPhone) {
    relationships.push({
      from: accountHolder.value,
      to: kycPhone.value,
      type: "registered-phone",
      evidenceRef: kycPhone.source,
    });
  }
  if (phone && (deviceId || ipAddress)) {
    relationships.push({
      from: phone.value,
      to: (deviceId || ipAddress).value,
      type: "used-device",
      evidenceRef: (deviceId || ipAddress).source,
    });
  }

  return relationships;
}

// ---------------------------------------------------------------------
// GAP CATALOG (domain knowledge, same pattern as legalLookup.js)
// ---------------------------------------------------------------------

const GAP_CATALOG = [
  {
    id: "account_owner",
    label: "Account Owner",
    whyItMatters: "Required to establish who controls the receiving account and link the transaction to a real, identifiable person.",
    suggestedMethod: "Request account-holder / KYC records from the bank.",
    urgency: "high",
    requestType: "bank",
    appliesIf: (ctx) => ctx.hasBankOrUpi && !ctx.hasAccountHolder,
  },
  {
    id: "kyc_details",
    label: "KYC Information",
    whyItMatters: "Confirms the identity and registered contact details tied to the receiving account.",
    suggestedMethod: "Request KYC records (registered phone, address) from the bank.",
    urgency: "high",
    requestType: "bank",
    appliesIf: (ctx) => ctx.hasBankOrUpi && !ctx.hasKyc,
  },
  {
    id: "device_ip",
    label: "Device / IP Attribution",
    whyItMatters: "Links the transaction or communication to a specific device or location, supporting attribution.",
    suggestedMethod: "Request call detail records / IP logs from the telecom provider.",
    urgency: "medium",
    requestType: "telecom",
    appliesIf: (ctx) => ctx.hasPhone && !ctx.hasDeviceOrIp,
  },
  {
    id: "beneficiary_confirmation",
    label: "Beneficiary Confirmation",
    whyItMatters: "Confirms whether the identified account holder actually controls the funds, or is themselves a mule/victim.",
    suggestedMethod: "Interview or formally question the identified account holder.",
    urgency: "medium",
    requestType: null,
    appliesIf: (ctx) => ctx.hasAccountHolder,
  },
];

function buildContext(entities, caseDoc) {
  const hasType = (t) => entities.some((e) => e.type === t);
  return {
    hasBankOrUpi: hasType("BANK_ACCOUNT") || hasType("UPI_ID"),
    hasAccountHolder: hasType("ACCOUNT_HOLDER"),
    hasKyc: hasType("KYC_PHONE") || hasType("KYC_ADDRESS"),
    hasPhone: hasType("PHONE"),
    hasDeviceOrIp: hasType("DEVICE_ID") || hasType("IP_ADDRESS"),
  };
}

function buildMissing(entities, caseDoc, llmGaps) {
  const ctx = buildContext(entities, caseDoc);
  const missing = [];

  for (const gap of GAP_CATALOG) {
    if (!gap.appliesIf(ctx)) continue;
    missing.push({
      id: gap.id,
      label: gap.label,
      whyItMatters: gap.whyItMatters,
      suggestedMethod: gap.suggestedMethod,
      urgency: gap.urgency,
      requestType: gap.requestType,
      supportingEvidence: [
        ...new Set(
          entities
            .filter((e) => ["UPI_ID", "BANK_ACCOUNT", "PHONE"].includes(e.type))
            .map((e) => e.source)
            .filter(Boolean)
        ),
      ],
    });
  }

  // Fold in the LLM's own free-text gaps as supplementary, generically-
  // labelled items -- real (it came from SOP-grounded analysis of the
  // complaint) but without a fabricated why/method beyond what's honest.
  for (const [i, gapText] of (llmGaps || []).entries()) {
    const alreadyCovered = missing.some((m) =>
      gapText.toLowerCase().includes(m.label.toLowerCase())
    );
    if (alreadyCovered || !gapText?.trim()) continue;
    missing.push({
      id: `ai-gap-${i + 1}`,
      label: gapText,
      whyItMatters: "Identified by AI analysis as missing from the complaint against SOP requirements.",
      suggestedMethod: "Officer review — clarify with complainant or investigation team.",
      urgency: "low",
      requestType: null,
      supportingEvidence: [],
    });
  }

  return missing;
}

function buildRecommendations(missing, suggestion) {
  const recommendations = [];

  for (const m of missing) {
    if (!m.requestType) continue; // no actionable request for this gap (yet)
    recommendations.push({
      id: `rec-${m.id}`,
      action: `Request ${m.label.toLowerCase()}`,
      why: m.whyItMatters,
      supportingEvidence: m.supportingEvidence,
      urgency: m.urgency,
      requestType: m.requestType,
      relatedMissingId: m.id,
      status: "pending",
    });
  }

  for (const [i, action] of (suggestion.immediateActions || []).entries()) {
    recommendations.push({
      id: `rec-immediate-${i + 1}`,
      action,
      why: "Time-sensitive action identified by SOP-grounded analysis of this complaint.",
      supportingEvidence: [],
      urgency: "high",
      requestType: null,
      relatedMissingId: null,
      status: "pending",
    });
  }

  return recommendations;
}

// ---------------------------------------------------------------------
// FINDINGS (deterministic, evidence-grounded)
// ---------------------------------------------------------------------

function buildFindings(entities) {
  const findings = [];
  const find = (type) => entities.find((e) => e.type === type);

  const upi = find("UPI_ID");
  const amount = find("TRANSACTION_AMOUNT");
  if (upi && amount) {
    findings.push({
      text: `Transaction of ${amount.value} to UPI ID ${upi.value} confirmed from complainant's evidence.`,
      supportingEvidence: [upi.source, amount.source].filter(Boolean),
    });
  } else if (upi) {
    findings.push({
      text: `Payment to UPI ID ${upi.value} confirmed from complainant's evidence.`,
      supportingEvidence: [upi.source].filter(Boolean),
    });
  }

  const bankAccount = find("BANK_ACCOUNT");
  if (bankAccount) {
    findings.push({
      text: `Receiving account ${bankAccount.value} identified.`,
      supportingEvidence: [bankAccount.source].filter(Boolean),
    });
  }

  const accountHolder = find("ACCOUNT_HOLDER");
  if (accountHolder) {
    findings.push({
      text: `Account holder identified as ${accountHolder.value}.`,
      supportingEvidence: [accountHolder.source].filter(Boolean),
    });
  }

  const kycPhone = find("KYC_PHONE");
  const kycAddress = find("KYC_ADDRESS");
  if (kycPhone || kycAddress) {
    const parts = [kycPhone?.value, kycAddress?.value].filter(Boolean).join(", ");
    findings.push({
      text: `KYC contact details obtained (${parts}).`,
      supportingEvidence: [kycPhone?.source, kycAddress?.source].filter(Boolean),
    });
  }

  const deviceId = find("DEVICE_ID");
  const ipAddress = find("IP_ADDRESS");
  if (deviceId || ipAddress) {
    const parts = [deviceId?.value, ipAddress?.value].filter(Boolean).join(", ");
    findings.push({
      text: `Device/IP attribution obtained (${parts}).`,
      supportingEvidence: [deviceId?.source, ipAddress?.source].filter(Boolean),
    });
  }

  return findings;
}

// ---------------------------------------------------------------------
// RISK
// ---------------------------------------------------------------------

const RISK_LEVELS = ["low", "medium", "high", "critical"];

function computeRisk(caseDoc, suggestion, missing) {
  let level = RISK_LEVELS.indexOf(caseDoc.severity || "medium");
  if (level < 0) level = 1;
  const reasons = [`Base severity classification: ${caseDoc.severity || "medium"}.`];

  if (suggestion.escalation?.required) {
    level = Math.min(level + 1, RISK_LEVELS.length - 1);
    reasons.push(`AI flagged escalation: ${suggestion.escalation.reason || "reason not specified"}.`);
  }

  const criticalGaps = missing.filter((m) => m.urgency === "high").length;
  if (criticalGaps >= 2) {
    reasons.push(`${criticalGaps} high-urgency information gaps remain open.`);
  }

  return { risk: RISK_LEVELS[level], riskReasoning: reasons.join(" ") };
}

// ---------------------------------------------------------------------
// ASSESSMENT (deterministic synthesis -- the "Current Investigation
// Assessment" text lives here, built only from known/findings/missing)
// ---------------------------------------------------------------------

function buildAssessment(known, findings, missing) {
  const parts = [];
  if (findings.length) {
    parts.push(`The investigation currently establishes that ${findings.map((f) => f.text.replace(/\.$/, "")).join("; ")}.`);
  } else if (known.length) {
    parts.push(`The investigation has recorded ${known.map((k) => k.label.toLowerCase()).join(", ")}, with analysis in progress.`);
  } else {
    parts.push("Complaint recorded; awaiting evidence extraction.");
  }

  if (missing.length) {
    parts.push(`${missing.length} information gap${missing.length === 1 ? "" : "s"} remain${missing.length === 1 ? "s" : ""} open.`);
  } else {
    parts.push("No open information gaps identified.");
  }

  return parts.join(" ");
}

// ---------------------------------------------------------------------
// DELTA
// ---------------------------------------------------------------------

function computeDelta(prev, curr) {
  if (!prev) return null;

  const byKey = (arr, keyFn) => new Set((arr || []).map(keyFn));

  const prevFindingKeys = byKey(prev.findings, (f) => f.text);
  const currFindingKeys = byKey(curr.findings, (f) => f.text);
  const prevEntityKeys = byKey(prev.entities, (e) => `${e.type}::${e.value}`);
  const prevRelKeys = byKey(prev.relationships, (r) => `${r.from}::${r.type}::${r.to}`);
  const prevMissingIds = byKey(prev.missing, (m) => m.id);
  const currMissingIds = byKey(curr.missing, (m) => m.id);
  const prevKnownLabels = byKey(prev.known, (k) => k.label);
  const prevRecIds = byKey(prev.recommendations, (r) => r.id);

  return {
    fromVersion: prev.version,
    toVersion: curr.version,
    newFindings: curr.findings.filter((f) => !prevFindingKeys.has(f.text)),
    removedFindings: prev.findings.filter((f) => !currFindingKeys.has(f.text)),
    newEntities: curr.entities.filter((e) => !prevEntityKeys.has(`${e.type}::${e.value}`)),
    newRelationships: curr.relationships.filter((r) => !prevRelKeys.has(`${r.from}::${r.type}::${r.to}`)),
    riskChange: prev.risk !== curr.risk ? { from: prev.risk, to: curr.risk } : null,
    confidenceChange:
      prev.confidence != null && curr.confidence != null && Math.abs(prev.confidence - curr.confidence) > 0.02
        ? { from: prev.confidence, to: curr.confidence }
        : null,
    newKnown: curr.known.filter((k) => !prevKnownLabels.has(k.label)),
    resolvedMissing: prev.missing.filter((m) => !currMissingIds.has(m.id)),
    newMissing: curr.missing.filter((m) => !prevMissingIds.has(m.id)),
    newRecommendations: curr.recommendations.filter((r) => !prevRecIds.has(r.id)),
  };
}

// ---------------------------------------------------------------------
// PUBLIC: assemble one full investigation version
// ---------------------------------------------------------------------

export function assembleInvestigationVersion(caseDoc, suggestion, trigger) {
  const { entities, known } = extractEntitiesAndKnown(caseDoc);
  const relationships = extractRelationships(caseDoc, entities);
  const missing = buildMissing(entities, caseDoc, suggestion.gaps);
  const recommendations = buildRecommendations(missing, suggestion);
  const findings = buildFindings(entities);
  const { risk, riskReasoning } = computeRisk(caseDoc, suggestion, missing);
  const assessment = buildAssessment(known, findings, missing);

  const existingVersions = caseDoc.investigationVersions || [];
  const version = existingVersions.length + 1;
  const prevVersion = existingVersions[existingVersions.length - 1] || null;

  const supportingEvidence = [
    ...new Set([
      ...(caseDoc.evidence || []).map((e) => e.complaint_id),
      ...findings.flatMap((f) => f.supportingEvidence || []),
    ]),
  ].filter(Boolean);

  const newVersion = {
    version,
    trigger,
    assessment,
    risk,
    riskReasoning,
    confidence: suggestion.confidence ?? null,
    confidenceBreakdown: suggestion.confidenceBreakdown || null,
    known,
    missing,
    findings,
    recommendations,
    entities,
    relationships,
    matchedSopIds: suggestion.matchedSopIds || [],
    legalSections: suggestion.legalSections || [],
    escalation: suggestion.escalation || null,
    supportingEvidence,
    legalRequestReferences: (caseDoc.requests || []).map((r) => r.requestId),
    createdAt: new Date(),
  };

  newVersion.delta = computeDelta(prevVersion, newVersion);

  return newVersion;
}