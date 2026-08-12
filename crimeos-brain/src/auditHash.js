// crimeos-brain/src/auditHash.js
//
// Mirrors crime-os-backend/routes/audit/auditHashService.js's
// createHashedAuditEntry exactly (same SHA-256 algorithm over the same
// fields) so that audit entries the investigation engine appends
// (AI_INVESTIGATION_COMPLETED) chain-verify correctly alongside entries
// written by crime-os-backend. Kept as a small standalone copy rather
// than a cross-service import, consistent with how the Case schema is
// already duplicated between these two services.

import crypto from "crypto";

const createAuditHash = ({ action, actor, timestamp, details, previousHash }) => {
  const auditData = JSON.stringify({
    action,
    actor,
    timestamp: new Date(timestamp).toISOString(),
    details: details || {},
    previousHash: previousHash || null,
  });

  return crypto.createHash("sha256").update(auditData).digest("hex");
};

export const createHashedAuditEntry = ({ action, actor, details = {}, auditLog = [] }) => {
  const previousAudit = auditLog.length > 0 ? auditLog[auditLog.length - 1] : null;
  const previousHash = previousAudit && previousAudit.hash ? previousAudit.hash : null;
  const timestamp = new Date();

  const hash = createAuditHash({ action, actor, timestamp, details, previousHash });

  return { action, actor, timestamp, details, previousHash, hash };
};
