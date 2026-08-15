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
    if (!caseData.entities) {
        return null;
    }

    const entity = caseData.entities.find(
        (item) =>
            item.type &&
            item.type.toUpperCase() === entityType.toUpperCase()
    );

    return entity ? entity.value : null;
};

// Same as findEntity, but tries a list of type names in order and
// returns the first one that has a value. Useful because upstream
// extraction/ingest paths don't always agree on a single type label
// for the same kind of fact (e.g. "UPI_ID" vs "UPI").
const findEntityAny = (caseData, entityTypes) => {
    for (const type of entityTypes) {
        const value = findEntity(caseData, type);
        if (value) return value;
    }
    return null;
};


// ---------------------------------------------------------
// HELPER: ONE-LINE FACTUAL CONTEXT (request-type scoped)
// ---------------------------------------------------------
//
// IMPORTANT: this deliberately does NOT reproduce the full raw
// complaint. An external provider (telecom operator, bank) only
// needs enough context to understand *why* the specific number
// or account it holds is being asked about -- not the complainant's
// entire narrative, unrelated suspects, other UPI IDs, or amounts
// that have nothing to do with the identifier this particular
// request concerns.
//
// If none of the fields we need are available, we return null and
// the template simply omits the context block rather than falling
// back to a wall of raw text.
//
const buildBriefContext = (caseData, requestType, scopedValue) => {
    const incidentDate = findEntityAny(caseData, ["INCIDENT_DATE", "DATE"]);

    if (requestType === "telecom") {
        if (!scopedValue) return null;
        return (
            `The number ${scopedValue} is stated to have been used to contact ` +
            `the complainant in relation to this cybercrime complaint` +
            (incidentDate ? ` on or around ${incidentDate}` : "") +
            `. Records are sought solely to identify the subscriber and usage ` +
            `pattern associated with this number.`
        );
    }

    if (requestType === "bank") {
        if (!scopedValue) return null;
        return (
            `The account/UPI identifier ${scopedValue} is stated to have received ` +
            `funds connected to this cybercrime complaint` +
            (incidentDate ? ` on or around ${incidentDate}` : "") +
            `. Records are sought solely to identify the account holder and ` +
            `trace the flow of funds through this identifier.`
        );
    }

    return null;
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
// `context.requestId` and `context.officer` are optional but should
// be passed by the caller when available -- they scope the letter to
// a specific request and put a named, accountable officer on it
// instead of an anonymous "SYSTEM" sender.
//
const fillTemplate = (caseData, requestType, context = {}) => {
    let templateFileName;

    if (requestType === "telecom") {
        templateFileName = "telecomRequest.hbs";
    } else if (requestType === "bank") {
        templateFileName = "bankRequest.hbs";
    } else {
        throw new Error(`Unsupported request type: ${requestType}`);
    }

    const templatePath = path.join(
        __dirname,
        "templates",
        templateFileName
    );

    const templateSource = fs.readFileSync(templatePath, "utf8");
    const template = Handlebars.compile(templateSource);

    const officer = context.officer || {};

    const slaDays = requestType === "telecom" ? 3 : 5;

    let templateData;

    if (requestType === "telecom") {
        const phoneNumber =
            context.phoneNumber ||
            findEntity(caseData, "PHONE") ||
            "Not identified";

        templateData = {
            caseId: caseData.case_id,
            requestId: context.requestId || null,
            requestDate: new Date().toLocaleDateString("en-IN"),
            severity: caseData.severity || "Not classified",
            provider: context.provider || null,
            phoneNumber,
            incidentDate:
                findEntityAny(caseData, ["INCIDENT_DATE", "DATE"]) ||
                "Not specified",
            briefContext: buildBriefContext(caseData, "telecom", phoneNumber),
            slaDays,
            officerName: officer.name || "Investigating Officer",
            officerRole: officer.role || null,
            officerBadge: officer.badgeNumber || null,
            issuingOrganisation:
                officer.organisation || "Cyber Crime Investigation Unit",
        };
    } else {
        const accountIdentifier =
            context.accountIdentifier ||
            findEntityAny(caseData, ["UPI_ID", "UPI", "BANK_ACCOUNT", "ACCOUNT_NUMBER"]) ||
            "Not identified";

        const amount =
            context.amount ||
            findEntityAny(caseData, ["AMOUNT", "TRANSACTION_AMOUNT"]) ||
            "Not specified";

        templateData = {
            caseId: caseData.case_id,
            requestId: context.requestId || null,
            requestDate: new Date().toLocaleDateString("en-IN"),
            severity: caseData.severity || "Not classified",
            provider: context.provider || null,
            accountIdentifier,
            amount,
            transactionRef:
                findEntityAny(caseData, ["TRANSACTION_REF", "TXN_REF", "REFERENCE"]) ||
                "Not specified",
            incidentDate:
                findEntityAny(caseData, ["INCIDENT_DATE", "DATE"]) ||
                "Not specified",
            briefContext: buildBriefContext(caseData, "bank", accountIdentifier),
            slaDays,
            officerName: officer.name || "Investigating Officer",
            officerRole: officer.role || null,
            officerBadge: officer.badgeNumber || null,
            issuingOrganisation:
                officer.organisation || "Cyber Crime Investigation Unit",
        };
    }

    return template(templateData);
};


export {
    fillTemplate,
    findEntity,
    findEntityAny,
};
