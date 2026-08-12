// Node's built-in file system module.
// We use this to read our .hbs template files.
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import Handlebars from "handlebars";

// FIX: this is an ES module ("type": "module" in package.json) -- __dirname
// isn't a global here the way it is in CommonJS. Every other file in this
// codebase derives it from import.meta.url; this one never did, so
// fillTemplate() threw `ReferenceError: __dirname is not defined` on every
// call -- the actual cause of "Failed to generate legal request".
const __dirname = path.dirname(fileURLToPath(import.meta.url));


// ---------------------------------------------------------
// HELPER: FIND AN ENTITY BY TYPE
// ---------------------------------------------------------
//
// Example case entities:
//
// [
//   { type: "PHONE", value: "9876543210" },
//   { type: "AMOUNT", value: "85000" }
// ]
//
// If we call:
// findEntity(caseData, "PHONE")
//
// it returns:
// "9876543210"
//
const findEntity = (caseData, entityType) => {
    // Safety check in case entities does not exist.
    if (!caseData.entities) {
        return null;
    }

    // Find the first entity whose type matches.
    const entity = caseData.entities.find(
        (item) =>
            item.type &&
            item.type.toUpperCase() === entityType.toUpperCase()
    );

    // Return its value if found.
    return entity ? entity.value : null;
};


// ---------------------------------------------------------
// HELPER: GET RAW COMPLAINT TEXT
// ---------------------------------------------------------
//
// FIX: the live Case schema has no `complaint.raw` field -- complaint
// text actually lives in `evidence[].raw_text` (see caseModel.js). This
// always fell through to "Complaint information unavailable" before.
// Kept the `complaint.raw`/`complaint.text` check too, in case that
// shape shows up from another intake path later.
//
const getComplaintText = (caseData) => {
    if (caseData.complaint?.raw) return caseData.complaint.raw;
    if (caseData.complaint?.text) return caseData.complaint.text;
    if (caseData.evidence?.length) {
        return caseData.evidence
            .map((e) => e.raw_text)
            .filter(Boolean)
            .join("\n\n") || "Complaint information unavailable";
    }
    return "Complaint information unavailable";
};


// ---------------------------------------------------------
// MAIN FUNCTION: FILL A LEGAL REQUEST TEMPLATE
// ---------------------------------------------------------
//
// requestType can currently be:
//
// "telecom"
// "bank"
//
// The function:
//
// 1. Chooses the correct .hbs file
// 2. Reads the template
// 3. Extracts useful case information
// 4. Replaces Handlebars placeholders
// 5. Returns completed HTML
//
const fillTemplate = (caseData, requestType) => {
    let templateFileName;

    // Decide which legal request template we need.
    if (requestType === "telecom") {
        templateFileName = "telecomRequest.hbs";
    } else if (requestType === "bank") {
        templateFileName = "bankRequest.hbs";
    } else {
        throw new Error(`Unsupported request type: ${requestType}`);
    }


    // Build the complete path to the template.
    //
    // __dirname currently means:
    // backend/src/requests
    //
    // So we go into:
    // templates/<filename>
    //
    const templatePath = path.join(
        __dirname,
        "templates",
        templateFileName
    );


    // Read the .hbs file as normal text.
    const templateSource = fs.readFileSync(
        templatePath,
        "utf8"
    );


    // Compile the Handlebars template.
    //
    // After compiling, template() becomes a function.
    const template = Handlebars.compile(templateSource);


    // Extract entities Person A may have detected.
    const phoneNumber =
        findEntity(caseData, "PHONE") ||
        "Phone number not identified";

    const amount =
        findEntity(caseData, "AMOUNT") ||
        findEntity(caseData, "TRANSACTION_AMOUNT") ||
        "Amount not identified";


    // Create the data object used by Handlebars.
    //
    // The keys here match placeholders in our .hbs files.
    //
    // Example:
    //
    // caseId -> {{caseId}}
    // amount -> {{amount}}
    //
    const templateData = {
        caseId: caseData.case_id,

        requestDate: new Date().toLocaleDateString("en-IN"),

        severity: caseData.severity || "Not classified",

        complaint: getComplaintText(caseData),

        phoneNumber,

        amount,
    };


    // Replace all {{placeholders}} with real values.
    const filledHtml = template(templateData);


    // Return the final HTML request.
    return filledHtml;
};


// Export the function so controllers can use it later.
export {
    fillTemplate,
};