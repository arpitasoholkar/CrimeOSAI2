// crime-os-backend/scripts/seedBankDemo.js
//
// Phase 4 — Seed data for the Mock Bank Response Loop demo.
//
// Generates 15-20 synthetic cases whose evidence/entities deliberately
// REUSE a small pool of UPI IDs / phone numbers / account numbers across
// multiple cases (the way real mule-network fraud actually looks), and
// gives each case at least one "sent" or "overdue" bank request so the
// /mock-bank portal (Phase 2) has something to answer.
//
// When a bank officer answers one of these requests through /mock-bank,
// respondToLegalRequest() pushes the reply's accountNumber/kycPhone/etc.
// into case.entities[] with source: `request:<requestId>` — and because
// several OTHER cases already carry that same UPI/phone/account, the
// case's similar-case / entity-graph logic should now surface visible
// cross-case links without any extra work.
//
// Run with:
//   node scripts/seedBankDemo.js
//   node scripts/seedBankDemo.js --wipe     (delete previously seeded demo cases first)
//
// Requires MONGO_URI in .env (same as the main server).

import "dotenv/config";
import mongoose from "mongoose";
import Case from "../routes/cases/caseModel.js";
import { createHashedAuditEntry } from "../routes/audit/auditHashService.js";

const WIPE = process.argv.includes("--wipe");
const SEED_TAG = "bank-demo-seed"; // stamped into auditLog details so --wipe can find these later

// =========================================================
// SHARED ENTITY POOL
// =========================================================
// Deliberately small relative to the case count, so most identifiers
// get reused by 2-4 cases -- that's what makes the cross-case link
// graph show something once a bank response lands.

const UPI_IDS = [
  "rahul.sharma@okhdfc",
  "priya.verma@okicici",
  "amitkumar99@oksbi",
  "vikas.mule1@ybl",
  "sneha.patel@okaxis",
  "rajeshgupta@paytm",
];

const PHONES = [
  "9876501234",
  "9123456780",
  "8899001122",
  "7788990011",
  "9001122334",
];

const ACCOUNTS = [
  "50100123456789",
  "50200987654321",
  "50300456789123",
  "50400112233445",
];

const IFSCS = ["HDFC0001234", "ICIC0004567", "SBIN0007890", "UTIB0002345"];

const BANKS = [
  { name: "HDFC Bank", ifsc: "HDFC0001234" },
  { name: "ICICI Bank", ifsc: "ICIC0004567" },
  { name: "State Bank of India", ifsc: "SBIN0007890" },
  { name: "Axis Bank", ifsc: "UTIB0002345" },
];

const CITIES = [
  "Surat, Gujarat",
  "Ahmedabad, Gujarat",
  "Mumbai, Maharashtra",
  "Pune, Maharashtra",
  "Bengaluru, Karnataka",
  "Delhi",
];

const COMPLAINT_TEMPLATES = [
  (v, upi, phone, amount) =>
    `Complainant ${v} reports an unauthorized UPI transfer of Rs ${amount} to ${upi} after receiving a call from ${phone} claiming to be a bank representative offering a KYC update.`,
  (v, upi, phone, amount) =>
    `${v} states they were contacted on ${phone} regarding a fake courier/customs parcel and were tricked into paying Rs ${amount} via UPI to ${upi}.`,
  (v, upi, phone, amount) =>
    `Victim ${v} was offered a work-from-home task-based job and transferred Rs ${amount} to ${upi} as a registration fee; the number ${phone} has since gone unreachable.`,
  (v, upi, phone, amount) =>
    `${v} reports a fraudulent investment scheme advertised on social media; Rs ${amount} was moved to ${upi} on instructions received from ${phone}.`,
  (v, upi, phone, amount) =>
    `Complainant ${v} received an SMS with a fake loan-approval link, entered banking details, and Rs ${amount} was subsequently debited and routed to ${upi}; contact number used was ${phone}.`,
];

const VICTIM_NAMES = [
  "Manoj Desai", "Kavita Joshi", "Ramesh Iyer", "Anjali Nair", "Suresh Chandran",
  "Deepa Menon", "Vikram Rathod", "Pooja Shah", "Arjun Reddy", "Neha Kapoor",
  "Sanjay Bhatt", "Meera Pillai", "Rohit Malhotra", "Divya Sundaram", "Karan Oberoi",
  "Shilpa Naik", "Aditya Trivedi", "Nisha Kulkarni", "Vivek Rao", "Preeti Agarwal",
];

function pick(arr, i) {
  return arr[i % arr.length];
}

function daysFromNow(days) {
  return new Date(Date.now() + days * 24 * 60 * 60 * 1000);
}

function daysAgo(days) {
  return new Date(Date.now() - days * 24 * 60 * 60 * 1000);
}

function buildHtmlSnapshot({ caseId, bank, accountNumber, requestId }) {
  return `
    <div class="legal-request">
      <h2>Legal Request for Account Information</h2>
      <p>Case Reference: ${caseId}</p>
      <p>Request ID: ${requestId}</p>
      <p>To: ${bank.name} (IFSC: ${bank.ifsc}) — Compliance / Nodal Officer</p>
      <p>
        Under applicable law, this office requests full KYC details, account
        holder name, registered mobile number, registered address, device
        ID(s) used for login, and IP address logs associated with account
        number <strong>${accountNumber}</strong> for the period relevant to
        this investigation.
      </p>
      <p>Please respond within the stipulated deadline.</p>
    </div>
  `.trim();
}

async function seed() {
  if (!process.env.MONGO_URI) {
    console.error("MONGO_URI is not set — add it to .env before running this script.");
    process.exit(1);
  }

  await mongoose.connect(process.env.MONGO_URI);
  console.log("Connected to MongoDB.");

  if (WIPE) {
    const { deletedCount } = await Case.deleteMany({
      "auditLog.details.seedTag": SEED_TAG,
    });
    console.log(`--wipe: removed ${deletedCount} previously seeded demo case(s).`);
  }

  const CASE_COUNT = 18; // within the 15-20 target from the phase plan
  const now = Date.now();
  const createdCaseIds = [];

  for (let i = 0; i < CASE_COUNT; i++) {
    const victim = pick(VICTIM_NAMES, i);
    const upi = pick(UPI_IDS, i);
    const phone = pick(PHONES, i);
    const account = pick(ACCOUNTS, i);
    const bank = pick(BANKS, i);
    const city = pick(CITIES, i);
    const amount = 15000 + (i % 9) * 8500;
    const template = pick(COMPLAINT_TEMPLATES, i);
    const complaintText = template(victim, upi, phone, amount);

    const caseId = `CASE-${new Date().getFullYear()}-DEMO${String(now).slice(-6)}${i}`;
    const requestId = `REQ-${caseId}-1`;

    // Cases 0-11: currently sitting with the bank (sent/overdue) — these
    // are what shows up in /mock-bank. Cases 12-17: already completed, so
    // the archive/timeline/entity-graph has some resolved history too.
    const isOverdue = i % 4 === 0;
    const isCompleted = i >= 12;
    const requestStatus = isCompleted ? "completed" : isOverdue ? "overdue" : "sent";

    const sentAt = daysAgo(isCompleted ? 10 : isOverdue ? 8 : 2);
    const deadline = isCompleted
      ? daysAgo(3)
      : isOverdue
      ? daysAgo(1) // deadline already passed -> overdue
      : daysFromNow(5);

    const auditLog = [];
    auditLog.push(
      createHashedAuditEntry({
        action: "CASE_CREATED",
        actor: "SYSTEM",
        details: { caseId, source: "seedBankDemo", seedTag: SEED_TAG },
        auditLog,
      })
    );
    auditLog.push(
      createHashedAuditEntry({
        action: "LEGAL_REQUEST_SENT",
        actor: "SYSTEM",
        details: { caseId, requestId, provider: bank.name, seedTag: SEED_TAG },
        auditLog,
      })
    );

    const requestDoc = {
      requestId,
      requestType: "bank",
      provider: bank.name,
      generatedBy: "demo.investigator",
      status: requestStatus,
      htmlSnapshot: buildHtmlSnapshot({ caseId, bank, accountNumber: account, requestId }),
      sentAt,
      sentTo: `compliance@${bank.name.toLowerCase().replace(/\s+/g, "")}.example`,
      messageId: `demo-${caseId}-1`,
      previewUrl: null,
      deadline,
      approvedBy: "demo.investigator",
      approvedAt: daysAgo(isCompleted ? 11 : isOverdue ? 9 : 3),
      createdAt: daysAgo(isCompleted ? 12 : isOverdue ? 10 : 4),
    };

    if (isCompleted) {
      requestDoc.response = {
        receivedAt: daysAgo(4),
        recordedBy: `${bank.name} — Compliance Officer`,
        notes: "Response recorded via /mock-bank demo seed.",
        data: {
          accountHolder: `${victim} (mule account)`,
          accountNumber: account,
          kycPhone: phone,
          kycAddress: `${city} (KYC on file)`,
          deviceId: `DEV-${1000 + i}`,
          ipAddress: `103.21.${i % 250}.${(i * 7) % 250}`,
        },
      };
      auditLog.push(
        createHashedAuditEntry({
          action: "BANK_MOCK_RESPONSE_RECEIVED",
          actor: `${bank.name} — Compliance Officer`,
          details: { caseId, requestId, seedTag: SEED_TAG },
          auditLog,
        })
      );
    }

    const entities = [
      { type: "UPI_ID", value: upi, confidence: 0.95, source: "evidence:intake" },
      { type: "PHONE", value: phone, confidence: 0.9, source: "evidence:intake" },
      { type: "BANK_ACCOUNT", value: account, confidence: 0.85, source: "evidence:intake" },
      { type: "AMOUNT", value: String(amount), confidence: 0.99, source: "evidence:intake" },
    ];
    if (isCompleted) {
      entities.push(
        { type: "ACCOUNT_HOLDER", value: `${victim} (mule account)`, confidence: null, source: `request:${requestId}` },
        { type: "KYC_PHONE", value: phone, confidence: null, source: `request:${requestId}` },
        { type: "DEVICE_ID", value: `DEV-${1000 + i}`, confidence: null, source: `request:${requestId}` }
      );
    }

    const caseDoc = new Case({
      case_id: caseId,
      title: `UPI Fraud — ${victim}`,
      leadInvestigator: "demo.investigator",
      investigators: ["demo.investigator"],
      status: isCompleted ? "resolved" : "under_investigation",
      severity: i % 5 === 0 ? "critical" : i % 3 === 0 ? "high" : "medium",
      isCompleted,
      resolution: isCompleted
        ? {
            outcome: "money_recovered",
            summary: `Bank confirmed KYC details for account ${account}; forwarded to cyber cell for arrest action.`,
            keyEvidence: `Bank response on ${requestId}; UPI trail via ${upi}.`,
            victimOutcome: "Partial amount frozen pending court order.",
            amountRecovered: Math.round(amount * 0.4),
            actionsTaken: "Account freeze request sent; FIR registered.",
            closedBy: "demo.investigator",
            closedAt: daysAgo(2),
          }
        : null,
      evidence: [
        {
          complaint_id: `${caseId}-C1`,
          source_type: "text",
          raw_text: complaintText,
          language: "en",
          entities: {
            names: [victim],
            phone_numbers: [phone],
            emails: [],
            upi_ids: [upi],
            bank_accounts: [account],
            ifsc_codes: [bank.ifsc],
            pan_numbers: [],
            aadhaar_numbers: [],
            vehicle_numbers: [],
            addresses: [city],
            amounts: [{ value: amount, currency: "INR", raw: `Rs ${amount}` }],
            dates: [],
            times: [],
            platforms: ["UPI"],
          },
          uploadedAt: daysAgo(isCompleted ? 14 : 6),
        },
      ],
      entities,
      requests: [requestDoc],
      evidenceFiles: [],
      auditLog,
    });

    await caseDoc.save();
    createdCaseIds.push(caseId);
    console.log(
      `Seeded ${caseId} [${requestStatus}] — upi=${upi} phone=${phone} acct=${account} bank=${bank.name}`
    );
  }

  console.log(`\nDone. Seeded ${createdCaseIds.length} cases.`);
  console.log(
    `${createdCaseIds.length - 6} are pending bank requests (sent/overdue) — check /mock-bank.`
  );
  console.log("Shared identifiers reused across cases (for cross-case links):");
  console.log("  UPI ID's:", UPI_IDS.join(", "));
  console.log("  Phones :", PHONES.join(", "));
  console.log("  Accts  :", ACCOUNTS.join(", "));

  await mongoose.disconnect();
}

seed().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});