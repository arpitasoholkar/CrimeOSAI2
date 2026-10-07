// crime-os-backend/routes/bank/bankRoutes.js
//
// Mounted at /bank in index.js. No requireAuth on purpose -- the bank
// officer is a different persona from the logged-in investigator, and for
// the demo this is opened in a second browser tab with no login step.
// This is a hackathon prototype simulation; do not reuse this
// no-auth pattern for anything touching real provider data.

import express from "express";
import {
  listPendingBankRequests,
  getBankRequestDetail,
  respondToBankRequest,
} from "./bankController.js";

const router = express.Router();

router.get("/requests", listPendingBankRequests);
router.get("/requests/:case_id/:requestId", getBankRequestDetail);
router.post("/requests/:case_id/:requestId/respond", respondToBankRequest);

export default router;
