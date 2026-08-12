// =========================================================
// CURRENT INVESTIGATION ASSESSMENT SERVICE
// =========================================================
//
// Builds the officer-facing "what do we currently know about this
// case?" summary. Intentionally deterministic -- no LLM call happens
// here; the prose about the investigation itself (`assessment`) was
// already built deterministically by crimeos-brain's
// investigationState.js from the LATEST investigation version's own
// known/findings/missing, so this service only has to read it and
// layer on the request/evidence bookkeeping stats.
//
// Case
//   ↓
// Latest investigation version (known/findings/missing/risk/confidence)
//   ↓
// + Legal request + evidence-file bookkeeping stats
//   ↓
// Current Investigation Assessment
//
// If no investigation has run yet, this falls back to the raw
// complaint text and says so plainly -- never invents an assessment.

// =========================================================
// GENERATE CASE SUMMARY
// =========================================================

const generateCaseSummary = (caseData) => {
  const caseId = caseData.case_id;
  const severity = caseData.severity || "unknown";
  const caseStatus = caseData.status || "unknown";

  const complaint =
    caseData.complaint?.raw ||
    caseData.evidence?.[0]?.raw_text ||
    "No complaint available";

  // -------------------------------------------------------
  // LATEST INVESTIGATION VERSION (crimeos-brain output)
  // -------------------------------------------------------

  const versions = caseData.investigationVersions || [];
  const latestVersion = versions.length ? versions[versions.length - 1] : null;

  // -------------------------------------------------------
  // LEGAL REQUEST STATISTICS
  // -------------------------------------------------------

  const requests = caseData.requests || [];
  const totalRequests = requests.length;
  const draftRequests = requests.filter((r) => r.status === "draft").length;
  const approvedRequests = requests.filter((r) => r.status === "approved").length;
  const sentRequests = requests.filter((r) => r.status === "sent").length;
  const overdueRequests = requests.filter((r) => r.status === "overdue").length;
  const completedRequests = requests.filter((r) => r.status === "completed").length;

  // -------------------------------------------------------
  // EVIDENCE STATISTICS
  // -------------------------------------------------------

  const evidenceFiles = caseData.evidenceFiles?.length
    ? caseData.evidenceFiles
    : caseData.evidence || [];
  const totalEvidenceFiles = evidenceFiles.length;

  // -------------------------------------------------------
  // LATEST OFFICER-APPROVED STEP/LEGAL-SECTION DECISION
  // -------------------------------------------------------
  // Still comes from `reports` (written by the AIInvestigation approval
  // flow) -- unrelated to investigation versioning, unchanged.

  const reports = caseData.reports || [];
  const latestReport = reports.length ? reports[reports.length - 1] : null;
  const approvedStepCount = latestReport?.approvedSteps?.length || 0;
  const approvedLegalSectionCount = latestReport?.approvedLegalSections?.length || 0;

  // -------------------------------------------------------
  // BUILD READABLE ASSESSMENT
  // -------------------------------------------------------

  const summaryParts = [];

  summaryParts.push(`Case ${caseId} is a ${severity} severity case.`);

  if (latestVersion) {
    summaryParts.push(latestVersion.assessment);
    summaryParts.push(
      `Current risk level: ${latestVersion.risk || "not available"}.`
    );
    summaryParts.push(
      latestVersion.confidence != null
        ? `AI confidence: ${(latestVersion.confidence * 100).toFixed(0)}%.`
        : "Confidence: not available from analysis."
    );
  } else {
    summaryParts.push(`Complaint: ${complaint}`);
    summaryParts.push("No AI investigation has been run yet for this case.");
  }

  if (latestReport) {
    summaryParts.push(
      `The officer${latestReport.decidedBy ? ` (${latestReport.decidedBy})` : ""} approved ${approvedStepCount} investigation step(s) and ${approvedLegalSectionCount} legal section(s) on ${latestReport.decidedAt || "an unspecified date"}.`
    );
    if (latestReport.officerNotes) {
      summaryParts.push(`Officer notes: ${latestReport.officerNotes}`);
    }
  }

  summaryParts.push(`${totalRequests} legal request(s) are associated with this case.`);
  if (draftRequests > 0) summaryParts.push(`${draftRequests} request(s) are in draft status.`);
  if (approvedRequests > 0) summaryParts.push(`${approvedRequests} request(s) are approved.`);
  if (sentRequests > 0) summaryParts.push(`${sentRequests} request(s) have been sent.`);
  if (overdueRequests > 0) summaryParts.push(`${overdueRequests} request(s) are overdue.`);
  if (completedRequests > 0) summaryParts.push(`${completedRequests} request(s) are completed.`);

  summaryParts.push(`${totalEvidenceFiles} evidence file(s) are attached.`);
  summaryParts.push(`The current case status is ${caseStatus}.`);

  // -------------------------------------------------------
  // RETURN STRUCTURED SUMMARY
  // -------------------------------------------------------

  return {
    text: summaryParts.join(" "),

    statistics: {
      totalRequests,
      draftRequests,
      approvedRequests,
      sentRequests,
      overdueRequests,
      completedRequests,
      totalEvidenceFiles,

      matchedSopIds: latestVersion?.matchedSopIds || [],
      aiConfidence: latestVersion?.confidence ?? null,
      escalationRequired: !!latestVersion?.escalation?.required,
      approvedStepCount,
      approvedLegalSectionCount,

      // New: investigation-version-derived stats for the Case
      // Intelligence header (critical gaps / recommended actions counts).
      investigationVersion: latestVersion?.version ?? null,
      risk: latestVersion?.risk ?? null,
      missingCount: latestVersion?.missing?.length ?? 0,
      findingsCount: latestVersion?.findings?.length ?? 0,
      recommendationsCount: latestVersion?.recommendations?.length ?? 0,
    },

    generatedAt: new Date(),
  };
};

// =========================================================
// EXPORT SERVICE
// =========================================================

export { generateCaseSummary };
