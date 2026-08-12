import crypto from "crypto";
// =========================================================
// CREATE AUDIT HASH
// =========================================================
//
// Generates a SHA-256 fingerprint for one audit entry.
//
// The hash depends on:
//
// 1. action
// 2. actor
// 3. timestamp
// 4. details
// 5. previous audit hash
//
// Because previousHash is included, every audit entry is
// cryptographically connected to the entry before it.
//
// Example:
//
// AUDIT 1
// hash = AAA
//
// AUDIT 2
// previousHash = AAA
// hash = BBB
//
// AUDIT 3
// previousHash = BBB
// hash = CCC
//
// If AUDIT 1 is modified:
//
// AAA changes
//      ↓
// AUDIT 2 previousHash no longer matches
//      ↓
// Chain verification fails
//

const createAuditHash = ({
  action,
  actor,
  timestamp,
  details,
  previousHash,
}) => {
  // -------------------------------------------------------
  // NORMALISE AUDIT DATA
  // -------------------------------------------------------
  //
  // We create one deterministic string containing the
  // important audit information.
  //

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
// CREATE HASHED AUDIT ENTRY
// =========================================================
//
// This helper creates a complete audit object.
//
// It automatically:
//
// 1. reads the previous audit hash
// 2. creates the new audit timestamp
// 3. calculates the new hash
// 4. returns the completed audit entry
//

const createHashedAuditEntry = ({
  action,
  actor,
  details = {},
  auditLog = [],
}) => {
  // -------------------------------------------------------
  // GET PREVIOUS AUDIT ENTRY
  // -------------------------------------------------------

  const previousAudit =
    auditLog.length > 0
      ? auditLog[auditLog.length - 1]
      : null;

  // -------------------------------------------------------
  // GET PREVIOUS HASH
  // -------------------------------------------------------

  const previousHash =
    previousAudit && previousAudit.hash
      ? previousAudit.hash
      : null;

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
  // RETURN COMPLETE AUDIT ENTRY
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
// VERIFY AUDIT HASH CHAIN
// =========================================================
//
// Checks every audit entry in order.
//
// For each entry:
//
// 1. Verify previousHash points to the previous audit hash
// 2. Recalculate the current audit hash
// 3. Compare stored hash with recalculated hash
//
// If any audit entry was modified, verification fails.
//

const verifyAuditChain = (auditLog = []) => {
  // -------------------------------------------------------
  // CHECK EMPTY AUDIT LOG
  // -------------------------------------------------------

  if (auditLog.length === 0) {
    return {
      valid: true,
      message: "Audit log is empty",
      totalEntries: 0,
      brokenAt: null,
    };
  }


  // -------------------------------------------------------
  // VERIFY EVERY AUDIT ENTRY
  // -------------------------------------------------------

  for (
    let index = 0;
    index < auditLog.length;
    index++
  ) {
    const currentEntry = auditLog[index];


    // -----------------------------------------------------
    // CHECK HASH EXISTS
    // -----------------------------------------------------

    if (!currentEntry.hash) {
      return {
        valid: false,

        message:
          "Audit entry does not contain a hash",

        totalEntries: auditLog.length,

        brokenAt: index,

        brokenAction: currentEntry.action,

        reason: "MISSING_HASH",
      };
    }


    // -----------------------------------------------------
    // EXPECTED PREVIOUS HASH
    // -----------------------------------------------------

    const expectedPreviousHash =
      index === 0
        ? null
        : auditLog[index - 1].hash;


    // -----------------------------------------------------
    // VERIFY CHAIN LINK
    // -----------------------------------------------------

    const storedPreviousHash =
      currentEntry.previousHash || null;

    if (
      storedPreviousHash !==
      expectedPreviousHash
    ) {
      return {
        valid: false,

        message:
          "Audit chain link is invalid",

        totalEntries: auditLog.length,

        brokenAt: index,

        brokenAction: currentEntry.action,

        reason: "PREVIOUS_HASH_MISMATCH",

        expectedPreviousHash,

        storedPreviousHash,
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

        message:
          "Audit entry data may have been modified",

        totalEntries: auditLog.length,

        brokenAt: index,

        brokenAction: currentEntry.action,

        reason: "AUDIT_HASH_MISMATCH",

        storedHash: currentEntry.hash,

        recalculatedHash,
      };
    }
  }


  // -------------------------------------------------------
  // ENTIRE CHAIN IS VALID
  // -------------------------------------------------------

  return {
    valid: true,

    message:
      "Audit hash chain is valid",

    totalEntries: auditLog.length,

    brokenAt: null,

    reason: null,
  };
};
// =========================================================
// EXPORT SERVICE
// =========================================================

export {
  createAuditHash,
  createHashedAuditEntry,
  verifyAuditChain,
};