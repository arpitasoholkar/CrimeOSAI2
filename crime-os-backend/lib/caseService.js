import Case from "../routes/cases/caseModel.js";
import Counter from "../models/Counter.js";

export async function saveEvidence({ caseId, evidence }) {
  // Generate a unique complaint ID for every upload
  const complaintSeq = await getNextSequence("complaint");
  const complaintId = generateComplaintId(complaintSeq);

  // Build evidence object
  const evidenceItem = {
    complaint_id: complaintId,
    source_type: evidence.source_type,
    raw_text: evidence.raw_text,
    language: evidence.language,
    entities: evidence.entities,
  };

  // -------------------------
  // Create NEW Case
  // -------------------------
  if (!caseId) {
    const caseSeq = await getNextSequence("case");
    const newCaseId = generateCaseId(caseSeq);

    const newCase = await Case.create({
      case_id: newCaseId,
      evidence: [evidenceItem],
    });

    return newCase;
  }

  // -------------------------
  // Existing Case
  // -------------------------
  const existingCase = await Case.findOne({ case_id: caseId });

  if (!existingCase) {
    throw new Error("Case not found.");
  }

  existingCase.evidence.push(evidenceItem);

  await existingCase.save();

  return existingCase;
}

async function getNextSequence(name) {
  const counter = await Counter.findOneAndUpdate(
    { _id: name },
    { $inc: { seq: 1 } },
    {
      returnDocument:"after",
      upsert: true,
    }
  );

  return counter.seq;
}

function generateCaseId(seq) {
  return `CASE-${String(seq).padStart(6, "0")}`;
}

function generateComplaintId(seq) {
  return `CMP-${String(seq).padStart(6, "0")}`;
}