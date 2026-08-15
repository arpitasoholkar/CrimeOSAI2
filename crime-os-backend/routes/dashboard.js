import express from "express";
import Case from "./cases/caseModel.js";

const router = express.Router();

// =========================================================
// DASHBOARD ROUTES
// =========================================================
//
// Powers crimeos-frontend's Dashboard page:
//   GET /api/stats            -> hero stat counters
//   GET /api/cases?limit=4    -> recent cases list
//   GET /api/activity?limit=4 -> recent activity feed (from auditLog)
//

// ---------------------------------------------------------
// Status -> dashboard bucket helpers
// ---------------------------------------------------------
// The unified Case schema's `status` enum spans values written by
// crime-os-backend/crimeos-brain ("pending_analysis", "under_investigation",
// "investigation_approved") and by crimeos-summary ("open", "pending_action",
// "closed"). The dashboard only cares about four buckets.

const PENDING_STATUSES = ["pending_analysis", "open", "pending_action"];
const INVESTIGATION_STATUSES = ["under_investigation", "investigation_approved"];
const RESOLVED_STATUSES = ["resolved", "closed"];

function statusBucket(status) {
  if (INVESTIGATION_STATUSES.includes(status)) return "underInvestigation";
  if (RESOLVED_STATUSES.includes(status)) return "resolved";
  return "pending"; // default bucket, covers PENDING_STATUSES + anything unmapped
}

function statusLabel(status) {
  if (INVESTIGATION_STATUSES.includes(status)) return "Under Investigation";
  if (RESOLVED_STATUSES.includes(status)) return "Resolved";
  return "Pending";
}

function riskLabel(severity) {
  if (severity === "high" || severity === "critical") return "High";
  if (severity === "low") return "Low";
  return "Medium";
}

// CaseCard only knows how to render 'pdf' | 'image' | 'audio' icons and
// falls back to a generic file icon for anything else, so map both
// evidence sources (extracted text evidence + uploaded evidence files)
// into that shape.
function evidenceChips(caseDoc) {
  const fromText = (caseDoc.evidence || []).map((e) => ({ type: e.source_type }));
  const fromFiles = (caseDoc.evidenceFiles || []).map((f) => {
    const ext = (f.path || "").split(".").pop()?.toLowerCase();
    if (["png", "jpg", "jpeg", "gif", "webp"].includes(ext)) return { type: "image" };
    if (["mp3", "wav", "m4a", "ogg"].includes(ext)) return { type: "audio" };
    return { type: "pdf" };
  });
  return [...fromText, ...fromFiles];
}

function timeAgo(date) {
  if (!date) return "";
  const diffMs = Date.now() - new Date(date).getTime();
  const minutes = Math.floor(diffMs / 60000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} hour${hours === 1 ? "" : "s"} ago`;
  const days = Math.floor(hours / 24);
  if (days === 1) return "Yesterday";
  return `${days} days ago`;
}

// Maps the audit trail's action codes (set in caseController.js /
// evidenceController.js) to the ActivityFeed component's known types,
// falling back to 'status_updated' for anything else (e.g. request
// lifecycle actions like REQUEST_SENT).
const ACTION_TYPE_MAP = {
  CASE_CREATED: "case_created",
  EVIDENCE_UPLOADED: "evidence_uploaded",
  EVIDENCE_VERIFIED: "evidence_uploaded",
  SUMMARY_GENERATED: "report_generated",
  REQUEST_GENERATED: "report_generated",
};

const ACTION_LABEL_MAP = {
  CASE_CREATED: "New case created",
  EVIDENCE_UPLOADED: "Evidence added",
  EVIDENCE_VERIFIED: "Evidence verified",
  SUMMARY_GENERATED: "Summary generated",
  REQUEST_GENERATED: "Legal request generated",
  REQUEST_APPROVED: "Legal request approved",
  REQUEST_SENT: "Legal request sent",
};

function activityType(action) {
  return ACTION_TYPE_MAP[action] || "status_updated";
}

function activityLabel(action) {
  return ACTION_LABEL_MAP[action] || action.replace(/_/g, " ").toLowerCase();
}

// =========================================================
// GET /api/stats
// =========================================================

router.get("/stats", async (req, res) => {
  try {
    const cases = await Case.find({}, "status").lean();

    const stats = { total: cases.length, pending: 0, underInvestigation: 0, resolved: 0 };

    for (const c of cases) {
      stats[statusBucket(c.status)] += 1;
    }

    res.json(stats);
  } catch (err) {
    console.error("[dashboard] Failed to compute stats:", err);
    res.status(500).json({ error: "Failed to load dashboard stats" });
  }
});

// =========================================================
// GET /api/cases?limit=4
// GET /api/cases?page=1&limit=20&status=pending&q=CASE-2026
// =========================================================
//
// Backward compatible: a bare `?limit=4` call (used by the Dashboard's
// "Recent Investigations" panel) still just returns a plain array, capped
// at 100, most-recently-updated first.
//
// When `page` is supplied (used by the full Cases page) the route instead
// paginates and returns `{ cases, total, page, pageCount }` so the frontend
// can render "showing X of Y" / page controls instead of silently truncating
// the list at 100 records.
//
// `status` filters by the same dashboard bucket used for the stat cards
// (pending | underInvestigation | resolved), and `q` does a case-insensitive
// match against case_id and title.

const STATUS_BUCKET_VALUES = {
  pending: PENDING_STATUSES,
  underInvestigation: INVESTIGATION_STATUSES,
  resolved: RESOLVED_STATUSES,
};

function escapeRegExp(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

router.get("/cases", async (req, res) => {
  try {
    const { status, q } = req.query;
    const isPaginated = req.query.page !== undefined;

    const filter = {};

    if (status && STATUS_BUCKET_VALUES[status]) {
      filter.status = { $in: STATUS_BUCKET_VALUES[status] };
    }

    if (q && q.trim()) {
      const re = new RegExp(escapeRegExp(q.trim()), "i");
      filter.$or = [{ case_id: re }, { title: re }];
    }

    const shape = (c) => {
      const chips = evidenceChips(c);
      return {
        id: c.case_id,
        title: c.title || "Untitled Case",
        status: statusLabel(c.status),
        evidence: chips.slice(0, 3),
        extraEvidence: Math.max(0, chips.length - 3),
        risk: riskLabel(c.severity),
        updated: timeAgo(c.updatedAt),
      };
    };

    if (!isPaginated) {
      // Legacy behaviour for the Dashboard widget.
      const limit = Math.min(parseInt(req.query.limit, 10) || 20, 100);

      const cases = await Case.find(filter)
        .sort({ updatedAt: -1 })
        .limit(limit)
        .lean();

      return res.json(cases.map(shape));
    }

    // Full, paginated Cases page.
    const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 20, 1), 100);
    const page = Math.max(parseInt(req.query.page, 10) || 1, 1);

    const [total, cases] = await Promise.all([
      Case.countDocuments(filter),
      Case.find(filter)
        .sort({ updatedAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
    ]);

    res.json({
      cases: cases.map(shape),
      total,
      page,
      pageCount: Math.max(Math.ceil(total / limit), 1),
    });
  } catch (err) {
    console.error("[dashboard] Failed to load cases:", err);
    res.status(500).json({ error: "Failed to load cases" });
  }
});

// =========================================================
// GET /api/activity?limit=4
// =========================================================

router.get("/activity", async (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit, 10) || 20, 100);

    // Audit entries live nested inside each case, so pull recent cases
    // (capped generously) and flatten+sort their auditLog entries rather
    // than every case in the DB.
    const cases = await Case.find({}, "case_id auditLog")
      .sort({ updatedAt: -1 })
      .limit(50)
      .lean();

    const entries = [];
    for (const c of cases) {
      for (const entry of c.auditLog || []) {
        entries.push({
          id: String(entry._id),
          caseId: c.case_id,
          type: activityType(entry.action),
          label: activityLabel(entry.action),
          timestamp: entry.timestamp,
        });
      }
    }

    entries.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

    const shaped = entries.slice(0, limit).map((e) => ({
      id: e.id,
      caseId: e.caseId,
      type: e.type,
      label: e.label,
      time: timeAgo(e.timestamp),
    }));

    res.json(shaped);
  } catch (err) {
    console.error("[dashboard] Failed to load activity feed:", err);
    res.status(500).json({ error: "Failed to load activity feed" });
  }
});

export default router;
