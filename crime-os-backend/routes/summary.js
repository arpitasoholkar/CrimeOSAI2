// // import express from "express";
// // import Case from "../models/Case.js";

// // const router = express.Router();

// // router.post("/import-summary", async (req, res) => {
// //   try {
// //     const {
// //       case_id,
// //       status,
// //       complaintText,
// //       confidence,
// //       approvedSteps,
// //       approvedLegalSections,
// //     } = req.body;

// //     if (!case_id) {
// //       return res.status(400).json({
// //         success: false,
// //         message: "case_id is required",
// //       });
// //     }

// //     let crimeCase = await Case.findOne({ caseId: case_id });

// //     if (!crimeCase) {
// //       crimeCase = new Case({
// //         caseId: case_id,
// //       });
// //     }

// //     crimeCase.status = status || crimeCase.status;

// //     crimeCase.analysis = {
// //       ...(crimeCase.analysis || {}),
// //       complaintText,
// //       confidence,
// //       approvedSteps,
// //       approvedLegalSections,
// //     };

// //     crimeCase.summary = {
// //       text: complaintText,
// //       generatedAt: new Date(),
// //     };

// //     await crimeCase.save();

// //     res.json({
// //       success: true,
// //       message: "Brain summary imported successfully",
// //       case: crimeCase,
// //     });
// //   } catch (err) {
// //     console.error(err);

// //     res.status(500).json({
// //       success: false,
// //       message: err.message,
// //     });
// //   }
// // });

// // export default router;



// import express from "express";
// import Case from "./cases/caseModel.js";


// const router = express.Router();

// router.post("/import-summary", async (req, res) => {
//   try {
//     const {
//       case_id,
//       status,
//       complaintText,
//       confidence,
//       approvedSteps = [],
//       approvedLegalSections = [],
//     } = req.body;

//     if (!case_id) {
//       return res.status(400).json({
//         success: false,
//         message: "case_id is required",
//       });
//     }

//     let crimeCase = await Case.findOne({ case_id });

//     if (!crimeCase) {
//       crimeCase = new Case({
//         case_id,
//         status: "pending_analysis",
//       });
//     }

//     const validStatuses = [
//       "pending_analysis",
//       "under_investigation",
//       "investigation_approved",
//       "open",
//       "pending_action",
//       "resolved",
//       "closed",
//     ];

//     if (status && validStatuses.includes(status)) {
//       crimeCase.status = status;
//     }

//     crimeCase.analysis = {
//       ...(crimeCase.analysis || {}),
//       complaintText,
//       confidence,
//       approvedSteps,
//       approvedLegalSections,
//       importedFrom: "Brain",
//       importedAt: new Date(),
//     };

//   crimeCase.summary = {
//     text: complaintText,
//     generatedAt: new Date(),

//     statistics: {
//         confidence: confidence ?? 0,
//         approvedSteps: approvedSteps.length,
//         approvedLegalSections: approvedLegalSections.length,
//     },

//     approvedSteps,
//     approvedLegalSections,
// };
//     await crimeCase.save();

//     return res.status(200).json({
//       success: true,
//       message: "Brain summary imported successfully",
//       case: crimeCase,
//     });
//   } catch (err) {
//     console.error(err);

//     return res.status(500).json({
//       success: false,
//       message: err.message,
//     });
//   }
// });

// export default router;



import express from "express";
import Case from "./cases/caseModel.js";

const router = express.Router();

router.post("/import-summary", async (req, res) => {
  try {
    const {
      case_id,
      status,
      complaintText,
      confidence,
      approvedSteps = [],
      approvedLegalSections = [],
    } = req.body;

    if (!case_id) {
      return res.status(400).json({
        success: false,
        message: "case_id is required",
      });
    }

    let crimeCase = await Case.findOne({ case_id });

    if (!crimeCase) {
      crimeCase = new Case({
        case_id,
        status: "pending_analysis",
      });
    }

    const validStatuses = [
      "pending_analysis",
      "under_investigation",
      "investigation_approved",
      "open",
      "pending_action",
      "resolved",
      "closed",
    ];

    if (status && validStatuses.includes(status)) {
      crimeCase.status = status;
    }

    const importedAt = new Date();

    crimeCase.analysis = {
      ...(crimeCase.analysis || {}),
      complaintText,
      confidence,
      approvedSteps,
      approvedLegalSections,
      importedFrom: "Brain",
      importedAt,
    };

    crimeCase.summary = {
      text: complaintText,
      generatedAt: importedAt,

      statistics: {
        confidence: confidence ?? 0,
        approvedSteps: approvedSteps.length,
        approvedLegalSections: approvedLegalSections.length,
      },

      approvedSteps,
      approvedLegalSections,
    };

    // Keep `reports` in sync with this approval so summaryService
    // (which reads the latest entry in `reports`) never shows a
    // stale decision from an earlier approval round.
    crimeCase.reports = [
      ...(crimeCase.reports || []),
      {
        approvedSteps,
        approvedLegalSections,
        decidedAt: importedAt,
        decidedBy: "Brain",
        officerNotes: "",
      },
    ];

    await crimeCase.save();

    return res.status(200).json({
      success: true,
      message: "Brain summary imported successfully",
      case: crimeCase,
    });
  } catch (err) {
    console.error(err);

    return res.status(500).json({
      success: false,
      message: err.message,
    });
  }
});

export default router;