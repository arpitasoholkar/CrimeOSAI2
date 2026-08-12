import {
  processOfflineAction,
} from "./offlineService.js";

// =========================================================
// SYNC OFFLINE ACTIONS
// =========================================================
//
// POST /cases/:id/offline/sync
//
// Expected body:
//
// {
//   "actor": "Officer Sharma",
//
//   "actions": [
//     {
//       "clientActionId": "OFFLINE-001",
//       "actionType": "ADD_CASE_NOTE",
//       "payload": {
//         "note": "Victim contacted again"
//       }
//     }
//   ]
// }
//
// Flow:
//
// Offline actions
//       ↓
// Receive action queue
//       ↓
// Replay actions ONE BY ONE
//       ↓
// Detect duplicate retries
//       ↓
// Store success / failure for every action
//       ↓
// Return sync report
//

const syncOfflineActions = async (req, res) => {
  try {
    // -----------------------------------------------------
    // GET REQUEST DATA
    // -----------------------------------------------------

    const caseId = req.params.id;

    const {
      actions,
      actor = "SYSTEM",
    } = req.body;


    // -----------------------------------------------------
    // VALIDATE ACTION QUEUE
    // -----------------------------------------------------

    if (
      !Array.isArray(actions) ||
      actions.length === 0
    ) {
      return res.status(400).json({
        success: false,

        message:
          "At least one offline action is required",
      });
    }


    // -----------------------------------------------------
    // SYNC RESULTS
    // -----------------------------------------------------

    const results = [];


    // -----------------------------------------------------
    // PROCESS ACTIONS IN ORDER
    // -----------------------------------------------------
    //
    // IMPORTANT:
    //
    // We deliberately use for...of instead of forEach.
    //
    // Why?
    //
    // for...of
    //    ↓
    // await action 1
    //    ↓
    // await action 2
    //    ↓
    // await action 3
    //
    // This preserves the original offline action order.
    //

    for (const action of actions) {
      try {
        // -------------------------------------------------
        // VALIDATE CLIENT ACTION ID
        // -------------------------------------------------

        if (!action.clientActionId) {
          throw new Error(
            "clientActionId is required"
          );
        }


        // -------------------------------------------------
        // PROCESS OFFLINE ACTION
        // -------------------------------------------------
        //
        // IMPORTANT:
        //
        // clientActionId MUST be passed to the service.
        //
        // The service uses it to detect whether an offline
        // action has already been processed.
        //
        // Same clientActionId
        //        ↓
        // duplicate retry
        //        ↓
        // skip action
        //

        const syncResult =
          await processOfflineAction({
            caseId,

            clientActionId:
              action.clientActionId,

            actionType:
              action.actionType,

            payload:
              action.payload || {},

            actor,
          });


        // -------------------------------------------------
        // SUCCESS RESULT
        // -------------------------------------------------

        results.push({
          clientActionId:
            action.clientActionId,

          success: true,

          actionType:
            action.actionType,

          skipped:
            syncResult.skipped || false,

          synced:
            syncResult,
        });
      } catch (error) {
        // -------------------------------------------------
        // FAILED ACTION
        // -------------------------------------------------
        //
        // One failed offline action should NOT stop the
        // remaining queue.
        //

        results.push({
          clientActionId:
            action.clientActionId || null,

          success: false,

          actionType:
            action.actionType || null,

          skipped: false,

          error: error.message,
        });
      }
    }


    // -----------------------------------------------------
    // CALCULATE SYNC STATISTICS
    // -----------------------------------------------------

    const syncedActions = results.filter(
      (result) => result.success
    ).length;

    const failedActions =
      results.length - syncedActions;


    // -----------------------------------------------------
    // RESPONSE
    // -----------------------------------------------------

    return res.status(200).json({
      success: failedActions === 0,

      message:
        failedActions === 0
          ? "Offline actions synced successfully"
          : "Offline sync completed with failures",

      caseId,

      statistics: {
        totalActions: results.length,
        syncedActions,
        failedActions,
      },

      results,
    });
  } catch (error) {
    console.error(
      "Offline sync error:",
      error
    );

    return res.status(500).json({
      success: false,

      message:
        "Failed to sync offline actions",

      error: error.message,
    });
  }
};


// =========================================================
// EXPORT CONTROLLER
// =========================================================

export {
  syncOfflineActions,
};