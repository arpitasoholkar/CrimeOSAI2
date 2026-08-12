const cron = require("node-cron");

const Case = require("../cases/caseModel");

const {
  createHashedAuditEntry,
} = require("../audit/auditHashService");
// =========================================================
// CHECK REQUEST DEADLINES
// =========================================================
//
// This function scans all cases that contain legal requests.
//
// For each request:
//
// sent
//   ↓
// deadline passed?
//   ↓ YES
// overdue
//

const checkRequestDeadlines = async () => {
  try {
    console.log("Checking legal request deadlines...");

    // Find cases that contain at least one request.
    const cases = await Case.find({
      "requests.0": {
        $exists: true,
      },
    });

    const currentTime = new Date();

    // -----------------------------------------------------
    // CHECK EVERY CASE
    // -----------------------------------------------------

    for (const caseData of cases) {
      let caseChanged = false;

      // ---------------------------------------------------
      // CHECK EVERY REQUEST INSIDE THE CASE
      // ---------------------------------------------------

      for (const request of caseData.requests) {
        // Only sent requests should be monitored.
        if (request.status !== "sent") {
          continue;
        }

        // Ignore requests without a deadline.
        if (!request.deadline) {
          continue;
        }

        // -------------------------------------------------
        // DEADLINE EXPIRED
        // -------------------------------------------------

        if (request.deadline < currentTime) {
  // -------------------------------------------------
  // MARK REQUEST OVERDUE
  // -------------------------------------------------

  request.status = "overdue";

  // -------------------------------------------------
  // CREATE HASHED AUDIT ENTRY
  // -------------------------------------------------

  const auditEntry = createHashedAuditEntry({
    action: "REQUEST_OVERDUE",

    actor: "SYSTEM",

    details: {
      requestId: request.requestId,
      requestType: request.requestType,
      provider: request.provider,
      deadline: request.deadline,
    },

    auditLog: caseData.auditLog,
  });

  // -------------------------------------------------
  // ADD AUDIT ENTRY ONCE
  // -------------------------------------------------

  caseData.auditLog.push(auditEntry);

  caseChanged = true;

  console.log(
    `Request ${request.requestId} marked overdue`
  );
}
      }

      // Save only if something changed.
      if (caseChanged) {
        await caseData.save();
      }
    }

    console.log("Deadline check completed");
  } catch (error) {
    console.error(
      "Deadline check failed:",
      error.message
    );
  }
};


// =========================================================
// START SLA MONITOR
// =========================================================
//
// Cron expression:
//
// */1 * * * *
//
// Means:
//
// Run every 1 minute.
//
// This is intentionally fast for our hackathon demo.
// A real system could run every hour.
//

const startSLAMonitor = () => {
  console.log("SLA deadline monitor started");

  cron.schedule("*/1 * * * *", async () => {
    await checkRequestDeadlines();
  });
};


// =========================================================
// EXPORT SERVICE
// =========================================================

export {
  startSLAMonitor,
  checkRequestDeadlines,
};