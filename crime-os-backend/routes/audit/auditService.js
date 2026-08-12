const crypto = require("crypto");

// =========================================================
// HASH-CHAINED AUDIT SERVICE
// =========================================================
//
// Creates and verifies cryptographically linked audit logs.
//
// Every audit entry stores:
//
// previousHash
//      ↓
// current audit data
//      ↓
// SHA-256
//      ↓
// hash
//
// Changing an old audit entry breaks the chain.
//

// =========================================================
// CREATE AUDIT HASH
// =========================================================

const createAuditHash = ({
  action,
  actor,
  timestamp,
  details,
  previousHash,
}) => {
  // -------------------------------------------------------
  // CREATE DETERMINISTIC AUDIT DATA
  // -------------------------------------------------------

  const auditData = JSON.stringify({
    action,
    actor,
    timestamp: new Date(timestamp).toISOString(),
    details: details || {},
    previousHash: previousHash || null,
  });

  // -------------------------------------------------------
  // SHA-256 HASH
  // -------------------------------------------------------

  return crypto
    .createHash("sha256")
    .update(auditData)
    .digest("hex");
};


// =========================================================
// CREATE CHAINED AUDIT ENTRY
// =========================================================

const createAuditEntry = ({
  action,
  actor,
  details = {},
  auditLog = [],
}) => {
  // -------------------------------------------------------
  // GET PREVIOUS AUDIT ENTRY
  // -------------------------------------------------------

  const previousEntry =
    auditLog.length > 0
      ? auditLog[auditLog.length - 1]
      : null;


  // -------------------------------------------------------
  // GET PREVIOUS HASH
  // -------------------------------------------------------

  const previousHash =
    previousEntry?.hash || null;


  // -------------------------------------------------------
  // CREATE TIMESTAMP
  // -------------------------------------------------------

  const timestamp = new Date();


  // -------------------------------------------------------
  // CREATE CURRENT HASH
  // -------------------------------------------------------

  const hash = createAuditHash({
    action,
    actor,
    timestamp,
    details,
    previousHash,
  });


  // -------------------------------------------------------
  // RETURN AUDIT ENTRY
  // -------------------------------------------------------

  return {
    action,
    actor,
    timestamp,
    details,
    previousHash,
    hash,
  };
};


// =========================================================
// VERIFY AUDIT CHAIN
// =========================================================

const verifyAuditChain = (auditLog = []) => {
  for (
    let index = 0;
    index < auditLog.length;
    index++
  ) {
    const currentEntry = auditLog[index];

    const expectedPreviousHash =
      index === 0
        ? null
        : auditLog[index - 1].hash;


    // -----------------------------------------------------
    // VERIFY PREVIOUS HASH LINK
    // -----------------------------------------------------

    if (
      (currentEntry.previousHash || null) !==
      (expectedPreviousHash || null)
    ) {
      return {
        valid: false,
        brokenAt: index,
        reason: "PREVIOUS_HASH_MISMATCH",
      };
    }


    // -----------------------------------------------------
    // RECALCULATE CURRENT HASH
    // -----------------------------------------------------

    const recalculatedHash = createAuditHash({
      action: currentEntry.action,
      actor: currentEntry.actor,
      timestamp: currentEntry.timestamp,
      details: currentEntry.details,
      previousHash: currentEntry.previousHash,
    });


    // -----------------------------------------------------
    // VERIFY CURRENT HASH
    // -----------------------------------------------------

    if (currentEntry.hash !== recalculatedHash) {
      return {
        valid: false,
        brokenAt: index,
        reason: "AUDIT_HASH_MISMATCH",
      };
    }
  }


  // -------------------------------------------------------
  // CHAIN VALID
  // -------------------------------------------------------

  return {
    valid: true,
    brokenAt: null,
    reason: null,
  };
};


// =========================================================
// EXPORT SERVICE
// =========================================================

export {
  createAuditHash,
  createAuditEntry,
  verifyAuditChain,
};