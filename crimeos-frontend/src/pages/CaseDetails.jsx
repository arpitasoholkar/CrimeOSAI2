import { useCallback, useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { apiBackend, apiBrain } from '../api/api'
import {
  FileTextIcon, ImageIcon, AudioIcon, SparklesIcon, ChevronRightIcon,
  AlertTriangleIcon, TrendUpIcon, TrendDownIcon,
  HelpCircleIcon, MapPinIcon, ScaleIcon, HistoryIcon, RefreshIcon,
  CheckIcon, XCircleIcon, LinkIcon, UploadCloudIcon,
} from '../components/Icons/Icons'
import EntityGraph from '../components/CaseIntelligence/EntityGraph'
import LocationMap from '../components/CaseIntelligence/LocationMap'
import styles from './CaseDetails.module.css'

const EVIDENCE_ICON = { pdf: FileTextIcon, image: ImageIcon, audio: AudioIcon, text: FileTextIcon }

const STATUS_LABEL = {
  pending_analysis: 'Pending',
  pending_action: 'Pending',
  under_investigation: 'Under Investigation',
  investigation_approved: 'Investigation Approved',
  open: 'Under Investigation',
  resolved: 'Resolved',
  closed: 'Resolved',
}

const RISK_META = {
  low: { label: 'Low', color: 'var(--success)', bg: 'var(--success-soft)' },
  medium: { label: 'Medium', color: 'var(--warning)', bg: 'var(--warning-soft)' },
  high: { label: 'High', color: 'var(--danger)', bg: 'var(--danger-soft)' },
  critical: { label: 'Critical', color: 'var(--danger)', bg: 'var(--danger-soft)' },
}

const URGENCY_META = {
  high: { label: 'HIGH', color: 'var(--danger)' },
  medium: { label: 'MEDIUM', color: 'var(--warning)' },
  low: { label: 'LOW', color: 'var(--text-tertiary)' },
}

const TRIGGER_LABEL = {
  initial_complaint: 'Initial complaint',
  evidence_added: 'Evidence added',
  legal_response_received: 'Legal response received',
  entity_added: 'Entity added',
  manual_reinvestigation: 'Manual re-investigation',
}

function fmtPct(n) {
  return n == null ? null : `${Math.round(n * 100)}%`
}

function fmtDate(d) {
  if (!d) return ''
  return new Date(d).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })
}

export default function CaseDetails() {
  const { caseId } = useParams()
  const navigate = useNavigate()

  const [caseDoc, setCaseDoc] = useState(null)
  const [timeline, setTimeline] = useState([])
  const [similarCases, setSimilarCases] = useState({ status: 'loading', data: [] })
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(true)
  const [reinvestigating, setReinvestigating] = useState(false)
  const [actionError, setActionError] = useState(null)
  const [compareVersion, setCompareVersion] = useState(null)

  const loadCase = useCallback(() => {
    return apiBackend.get(`/cases/${caseId}`).then((res) => setCaseDoc(res.data.case))
  }, [caseId])

  useEffect(() => {
    setLoading(true)
    setError(null)
    Promise.all([
      loadCase(),
      apiBackend.get(`/cases/${caseId}/timeline`).then((res) => setTimeline(res.data.timeline || [])).catch(() => setTimeline([])),
    ])
      .catch((err) => setError(err.response?.data?.message || 'Failed to load this case.'))
      .finally(() => setLoading(false))
  }, [caseId, loadCase])

  useEffect(() => {
    setSimilarCases({ status: 'loading', data: [] })
    apiBrain
      .get(`/api/case/${caseId}/similar`)
      .then((res) => setSimilarCases({ status: 'ok', data: res.data.similarCases || [] }))
      .catch(() => setSimilarCases({ status: 'error', data: [] }))
  }, [caseId])

  const versions = caseDoc?.investigationVersions || []
  const latest = versions.length ? versions[versions.length - 1] : null
  const previous = versions.length > 1 ? versions[versions.length - 2] : null

  const handleReinvestigate = async () => {
    setReinvestigating(true)
    setActionError(null)
    try {
      await apiBackend.post(`/cases/${caseId}/reinvestigate`)
      await loadCase()
    } catch (err) {
      setActionError(err.response?.data?.message || err.response?.data?.error || 'Re-investigation failed.')
    } finally {
      setReinvestigating(false)
    }
  }

  if (loading) return <p className={styles.state}>Loading investigation…</p>
  if (error) return <p className={styles.stateError}>{error}</p>
  if (!caseDoc) return null

  return (
    <motion.div
      className={styles.wrap}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
    >
      <CaseHeader
        caseDoc={caseDoc}
        latest={latest}
        onAddEvidence={() => navigate(`/new-case?case_id=${caseDoc.case_id}`)}
        onReinvestigate={handleReinvestigate}
        reinvestigating={reinvestigating}
      />

      {actionError && <p className={styles.actionError}>{actionError}</p>}

      <CaseIntelligencePanel caseDoc={caseDoc} latest={latest} previous={previous} />

      <WhatChangedPanel latest={latest} versions={versions} />

      <GapsPanel latest={latest} />

      <NextBestActionPanel
        caseId={caseId}
        latest={latest}
        onChanged={loadCase}
      />

      <section className={styles.section}>
        <h3 className={styles.sectionTitle}>Entity &amp; Relationship Graph</h3>
        <EntityGraph entities={latest?.entities || []} relationships={latest?.relationships || []} />
      </section>

      <GeoIntelligencePanel latest={latest} />

      <EvidenceIntelligencePanel caseDoc={caseDoc} latest={latest} />

      <LegalIntelligencePanel caseId={caseId} caseDoc={caseDoc} onChanged={loadCase} />

      <TimelinePanel timeline={timeline} />

      <SimilarCasesPanel similarCases={similarCases} />

      <HistoryPanel versions={versions} compareVersion={compareVersion} setCompareVersion={setCompareVersion} />

      <Link to={`/cases/${caseId}/investigation`} className={styles.aiLink}>
        <SparklesIcon width={16} height={16} />
        <span>Open detailed step / legal-section approval view</span>
        <ChevronRightIcon width={16} height={16} />
      </Link>

      <button type="button" className={styles.backBtn} onClick={() => navigate('/')}>
        ← Back to Dashboard
      </button>
    </motion.div>
  )
}

// =========================================================
// 1. CASE HEADER
// =========================================================

function CaseHeader({ caseDoc, latest, onAddEvidence, onReinvestigate, reinvestigating }) {
  const risk = latest?.risk ? RISK_META[latest.risk] : null
  return (
    <div className={styles.header}>
      <div>
        <p className={styles.caseId}>{caseDoc.case_id}</p>
        <h2 className={styles.title}>{caseDoc.title || 'Untitled Case'}</h2>
        <div className={styles.headerMeta}>
          <span className={styles.statusBadge}>{STATUS_LABEL[caseDoc.status] || caseDoc.status}</span>
          {risk && (
            <span className={styles.riskBadge} style={{ color: risk.color, background: risk.bg }}>
              {risk.label} risk
            </span>
          )}
          <span className={styles.metaText}>Updated {fmtDate(caseDoc.updatedAt)}</span>
        </div>
      </div>
      <div className={styles.headerActions}>
        <button type="button" className={styles.secondaryBtn} onClick={onAddEvidence}>
          <UploadCloudIcon width={14} height={14} /> Add Evidence
        </button>
        <button type="button" className={styles.primaryBtn} onClick={onReinvestigate} disabled={reinvestigating}>
          <RefreshIcon width={14} height={14} /> {reinvestigating ? 'Re-investigating…' : 'Re-investigate'}
        </button>
      </div>
    </div>
  )
}

// =========================================================
// 2. CASE INTELLIGENCE
// =========================================================

function CaseIntelligencePanel({ caseDoc, latest, previous }) {
  if (!latest) {
    return (
      <section className={styles.section}>
        <h3 className={styles.sectionTitle}>Case Intelligence</h3>
        <p className={styles.empty}>No AI investigation has run yet for this case. Click "Re-investigate" above to run one.</p>
      </section>
    )
  }

  const risk = RISK_META[latest.risk] || null
  const order = ['low', 'medium', 'high', 'critical']
  const riskTrend = previous && previous.risk !== latest.risk
    ? (order.indexOf(latest.risk) > order.indexOf(previous.risk) ? 'up' : 'down')
    : null

  return (
    <section className={styles.section}>
      <h3 className={styles.sectionTitle}>Case Intelligence</h3>

      <div className={styles.intelGrid}>
        <div className={styles.intelStat}>
          <p className={styles.intelLabel}>Risk level</p>
          <p className={styles.intelValueRow}>
            {risk ? (
              <span className={styles.riskBadge} style={{ color: risk.color, background: risk.bg }}>{risk.label}</span>
            ) : <span className={styles.notAvailable}>Not available</span>}
            {riskTrend === 'up' && <TrendUpIcon width={14} height={14} color="var(--danger)" />}
            {riskTrend === 'down' && <TrendDownIcon width={14} height={14} color="var(--success)" />}
          </p>
        </div>

        <div className={styles.intelStat}>
          <p className={styles.intelLabel}>AI confidence</p>
          <p className={styles.intelValue}>{fmtPct(latest.confidence) || <span className={styles.notAvailable}>Not available</span>}</p>
        </div>

        <div className={styles.intelStat}>
          <p className={styles.intelLabel}>Evidence on file</p>
          <p className={styles.intelValue}>{(caseDoc.evidence?.length || 0) + (caseDoc.evidenceFiles?.length || 0)}</p>
        </div>

        <div className={styles.intelStat}>
          <p className={styles.intelLabel}>Critical gaps</p>
          <p className={styles.intelValue}>{latest.missing?.length ?? 0}</p>
        </div>

        <div className={styles.intelStat}>
          <p className={styles.intelLabel}>Recommended actions</p>
          <p className={styles.intelValue}>{latest.recommendations?.filter((r) => r.status === 'pending').length ?? 0}</p>
        </div>

        <div className={styles.intelStat}>
          <p className={styles.intelLabel}>Investigation version</p>
          <p className={styles.intelValue}>v{latest.version}</p>
        </div>
      </div>

      <div className={styles.assessmentBox}>
        <p className={styles.assessmentLabel}>Current AI Assessment</p>
        <p className={styles.assessmentText}>{latest.assessment}</p>
        {latest.riskReasoning && <p className={styles.riskReasoning}>{latest.riskReasoning}</p>}
      </div>

      {latest.escalation?.required && (
        <div className={styles.escalation}>
          <AlertTriangleIcon width={15} height={15} />
          <span>Escalation recommended — {latest.escalation.reason}</span>
        </div>
      )}
    </section>
  )
}

// =========================================================
// 3. WHAT CHANGED
// =========================================================

function WhatChangedPanel({ latest, versions }) {
  const [expanded, setExpanded] = useState(false)
  const delta = latest?.delta

  if (!latest) return null

  if (!delta) {
    return (
      <section className={styles.section}>
        <h3 className={styles.sectionTitle}>⭐ What Changed</h3>
        <p className={styles.empty}>No previous investigation to compare — this is the first investigation version.</p>
      </section>
    )
  }

  const hasChanges =
    delta.newFindings.length || delta.newEntities.length || delta.newRelationships.length ||
    delta.riskChange || delta.confidenceChange || delta.newKnown.length ||
    delta.resolvedMissing.length || delta.newMissing.length || delta.newRecommendations.length

  return (
    <section className={styles.section}>
      <div className={styles.evidenceHead}>
        <h3 className={styles.sectionTitle} style={{ margin: 0 }}>
          ⭐ What Changed <span className={styles.metaText}>v{delta.fromVersion} → v{delta.toVersion}</span>
        </h3>
      </div>

      {!hasChanges ? (
        <p className={styles.empty}>No new changes detected in this re-investigation.</p>
      ) : (
        <div className={styles.changeList}>
          {delta.newFindings.map((f, i) => (
            <div key={`nf-${i}`} className={styles.changeItem}>
              <span className={styles.changeTagAdd}>+ NEW FINDING</span>
              <p>{f.text}</p>
            </div>
          ))}
          {delta.newEntities.map((e, i) => (
            <div key={`ne-${i}`} className={styles.changeItem}>
              <span className={styles.changeTagAdd}>+ NEW ENTITY</span>
              <p>{e.type.replace(/_/g, ' ')}: {e.value}</p>
            </div>
          ))}
          {delta.newRelationships.map((r, i) => (
            <div key={`nr-${i}`} className={styles.changeItem}>
              <span className={styles.changeTagAdd}>+ NEW RELATIONSHIP</span>
              <p>{r.from} → {r.type.replace(/-/g, ' ')} → {r.to}</p>
            </div>
          ))}
          {delta.riskChange && (
            <div className={styles.changeItem}>
              <span className={styles.changeTagRisk}>↑ RISK CHANGE</span>
              <p>{delta.riskChange.from || 'unknown'} → {delta.riskChange.to}</p>
            </div>
          )}
          {delta.confidenceChange && (
            <div className={styles.changeItem}>
              <span className={styles.changeTagRisk}>CONFIDENCE CHANGE</span>
              <p>{fmtPct(delta.confidenceChange.from)} → {fmtPct(delta.confidenceChange.to)}</p>
            </div>
          )}
          {delta.resolvedMissing.map((m, i) => (
            <div key={`rm-${i}`} className={styles.changeItem}>
              <span className={styles.changeTagResolve}>✓ RESOLVED</span>
              <p>{m.label}</p>
            </div>
          ))}
          {delta.newMissing.map((m, i) => (
            <div key={`nm-${i}`} className={styles.changeItem}>
              <span className={styles.changeTagGap}>? NEW GAP</span>
              <p>{m.label}</p>
            </div>
          ))}
        </div>
      )}

      {versions.length > 1 && (
        <button type="button" className={styles.linkBtn} onClick={() => setExpanded((v) => !v)}>
          {expanded ? 'Hide full comparison' : 'View Full Comparison'}
        </button>
      )}

      {expanded && <FullComparison versions={versions} />}
    </section>
  )
}

function FullComparison({ versions }) {
  const curr = versions[versions.length - 1]
  const prev = versions[versions.length - 2]
  if (!prev) return null
  return (
    <div className={styles.comparisonGrid}>
      <div>
        <p className={styles.comparisonHead}>Previous State — v{prev.version}</p>
        <p className={styles.rawText}>{prev.assessment}</p>
        <p className={styles.metaText}>Known: {prev.known.length} · Missing: {prev.missing.length} · Findings: {prev.findings.length}</p>
      </div>
      <div>
        <p className={styles.comparisonHead}>Current State — v{curr.version}</p>
        <p className={styles.rawText}>{curr.assessment}</p>
        <p className={styles.metaText}>Known: {curr.known.length} · Missing: {curr.missing.length} · Findings: {curr.findings.length}</p>
      </div>
    </div>
  )
}

// =========================================================
// 4. INVESTIGATION GAPS (Known vs Missing)
// =========================================================

function GapsPanel({ latest }) {
  if (!latest) return null
  return (
    <section className={styles.section}>
      <h3 className={styles.sectionTitle}>Investigation Gaps</h3>
      <div className={styles.gapsGrid}>
        <div>
          <p className={styles.gapsHead}><CheckIcon width={14} height={14} color="var(--success)" /> Known</p>
          {latest.known.length ? (
            <ul className={styles.gapsList}>
              {latest.known.map((k, i) => (
                <li key={i}><strong>{k.label}:</strong> {k.detail}</li>
              ))}
            </ul>
          ) : <p className={styles.empty}>Nothing confirmed yet.</p>}
        </div>
        <div>
          <p className={styles.gapsHead}><HelpCircleIcon width={14} height={14} color="var(--warning)" /> Missing</p>
          {latest.missing.length ? (
            <div className={styles.missingList}>
              {latest.missing.map((m) => (
                <div key={m.id} className={styles.missingCard}>
                  <p className={styles.missingLabel}>{m.label}</p>
                  <p className={styles.missingWhy}><strong>Why it matters:</strong> {m.whyItMatters}</p>
                  <p className={styles.missingMethod}><strong>Suggested method:</strong> {m.suggestedMethod}</p>
                  {m.supportingEvidence?.length > 0 && (
                    <p className={styles.missingEvidence}><strong>Supporting evidence:</strong> {m.supportingEvidence.join(', ')}</p>
                  )}
                </div>
              ))}
            </div>
          ) : <p className={styles.empty}>No open information gaps identified.</p>}
        </div>
      </div>
    </section>
  )
}

// =========================================================
// 5. NEXT BEST ACTION
// =========================================================

function NextBestActionPanel({ caseId, latest, onChanged }) {
  const [busyId, setBusyId] = useState(null)
  const [decidedBy, setDecidedBy] = useState('')
  const [err, setErr] = useState(null)

  const pending = (latest?.recommendations || []).filter((r) => r.status === 'pending')

  const decide = async (rec, status) => {
    setErr(null)
    if (!decidedBy.trim()) {
      setErr('Enter officer name / badge ID before approving or rejecting.')
      return
    }
    setBusyId(rec.id)
    try {
      await apiBrain.post(`/api/case/${caseId}/recommendation/${rec.id}/status`, { status, decidedBy })
      if (status === 'approved' && rec.requestType) {
        await apiBackend.post(`/cases/${caseId}/request/generate`, { requestType: rec.requestType })
      }
      await onChanged()
    } catch (e) {
      setErr(e.response?.data?.message || e.response?.data?.error || 'Failed to update recommendation.')
    } finally {
      setBusyId(null)
    }
  }

  if (!latest) return null

  return (
    <section className={styles.section}>
      <h3 className={styles.sectionTitle}>⭐ Next Best Action</h3>

      <input
        type="text"
        className={styles.input}
        placeholder="Officer name / badge ID (required to approve/reject)"
        value={decidedBy}
        onChange={(e) => setDecidedBy(e.target.value)}
        style={{ marginBottom: 12 }}
      />
      {err && <p className={styles.actionError}>{err}</p>}

      {pending.length ? (
        <div className={styles.recList}>
          {pending.map((rec) => {
            const urgency = URGENCY_META[rec.urgency] || URGENCY_META.low
            return (
              <div key={rec.id} className={styles.recCard}>
                <div className={styles.recHead}>
                  <p className={styles.recAction}>{rec.action.toUpperCase()}</p>
                  <span className={styles.urgencyBadge} style={{ color: urgency.color }}>{urgency.label}</span>
                </div>
                <p className={styles.recWhy}><strong>Why:</strong> {rec.why}</p>
                {rec.supportingEvidence?.length > 0 && (
                  <p className={styles.recEvidence}><strong>Supporting evidence:</strong> {rec.supportingEvidence.join(', ')}</p>
                )}
                <div className={styles.recActions}>
                  <button type="button" className={styles.secondaryBtn} disabled={busyId === rec.id} onClick={() => decide(rec, 'rejected')}>
                    <XCircleIcon width={14} height={14} /> Reject
                  </button>
                  <button type="button" className={styles.primaryBtn} disabled={busyId === rec.id} onClick={() => decide(rec, 'approved')}>
                    <CheckIcon width={14} height={14} /> {busyId === rec.id ? 'Saving…' : 'Approve'}
                  </button>
                </div>
                {rec.requestType && (
                  <p className={styles.metaText}>Approving generates a draft {rec.requestType} legal request — it still needs separate approval &amp; dispatch below.</p>
                )}
              </div>
            )
          })}
        </div>
      ) : (
        <p className={styles.empty}>No pending recommendations — every AI-suggested action has been reviewed.</p>
      )}
    </section>
  )
}

// =========================================================
// 9. GEOGRAPHIC INTELLIGENCE
// =========================================================

function GeoIntelligencePanel({ latest }) {
  const located = (latest?.entities || []).filter((e) => e.lat != null && e.lng != null)

  const markers = located.map((e, i) => ({
    id: `${e.type}-${i}`,
    label: e.type.replace(/_/g, ' '),
    lat: e.lat,
    lng: e.lng,
    type: e.type,
    detail: e.geocodedDisplayName || e.value,
  }))

  return (
    <section className={styles.section}>
      <h3 className={styles.sectionTitle}><MapPinIcon width={15} height={15} /> Geographic Intelligence</h3>
      {located.length ? (
        <div className={styles.geoLayout}>
          <LocationMap markers={markers} />
          <ul className={styles.geoList}>
            {located.map((e, i) => (
              <li key={i} className={styles.geoItem}>
                <span className={styles.geoDot} />
                <div>
                  <p className={styles.geoLabel}>{e.type.replace(/_/g, ' ')} <span className={styles.metaText}>· {e.value}</span></p>
                  <p className={styles.metaText}>{e.geocodedDisplayName || `${e.lat.toFixed(4)}, ${e.lng.toFixed(4)}`}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>
      ) : (
        <p className={styles.empty}>No geographic intelligence available for this case yet. Addresses mentioned in the complaint, or recorded from bank/telecom legal responses (KYC address, tower location), are geocoded automatically once the AI (re-)investigates the case.</p>
      )}
    </section>
  )
}

// =========================================================
// 7. EVIDENCE INTELLIGENCE
// =========================================================

function EvidenceIntelligencePanel({ caseDoc, latest }) {
  return (
    <section className={styles.section}>
      <h3 className={styles.sectionTitle}>Evidence Intelligence</h3>

      {latest?.findings?.length > 0 && (
        <div className={styles.findingsList}>
          {latest.findings.map((f, i) => (
            <div key={i} className={styles.findingCard}>
              <p className={styles.findingText}>{f.text}</p>
              {f.supportingEvidence?.length > 0 && (
                <p className={styles.findingSupport}>
                  Supported by: {f.supportingEvidence.map((s, i) => <span key={`${s}-${i}`} className={styles.entityChip} style={{ marginRight: 6 }}>{s}</span>)}
                </p>
              )}
            </div>
          ))}
        </div>
      )}

      <p className={styles.subHead}>Uploaded Evidence ({(caseDoc.evidence || []).length + (caseDoc.evidenceFiles || []).length})</p>
      <div className={styles.evidenceList}>
        {(caseDoc.evidence || []).map((ev) => {
          const Icon = EVIDENCE_ICON[ev.source_type] || FileTextIcon
          return (
            <div key={ev.complaint_id} className={styles.evidenceCard}>
              <div className={styles.evidenceHead}>
                <span className={styles.evidenceType}><Icon width={14} height={14} /> {ev.source_type}</span>
                <span className={styles.complaintId}>{ev.complaint_id}</span>
              </div>
              <p className={styles.rawText}>{ev.raw_text}</p>
            </div>
          )
        })}
        {(caseDoc.evidenceFiles || []).map((ef) => (
          <div key={ef._id} className={styles.evidenceCard}>
            <div className={styles.evidenceHead}>
              <span className={styles.evidenceType}><FileTextIcon width={14} height={14} /> file</span>
              <span className={styles.complaintId}>{ef.path?.split('/').pop()}</span>
            </div>
            <p className={styles.rawText}>SHA-256: {ef.hash}</p>
          </div>
        ))}
        {!(caseDoc.evidence || []).length && !(caseDoc.evidenceFiles || []).length && (
          <p className={styles.empty}>No evidence uploaded yet.</p>
        )}
      </div>
    </section>
  )
}

// =========================================================
// 10. LEGAL INTELLIGENCE
// =========================================================

function LegalIntelligencePanel({ caseId, caseDoc, onChanged }) {
  const requests = caseDoc.requests || []
  const latest = (caseDoc.investigationVersions || []).slice(-1)[0]

  return (
    <section className={styles.section}>
      <h3 className={styles.sectionTitle}><ScaleIcon width={15} height={15} /> Legal Intelligence</h3>

      {latest?.legalSections?.length > 0 ? (
        <div className={styles.legalSections}>
          <p className={styles.subHead}>Relevant legal sections (AI-matched)</p>
          {latest.legalSections.map((s) => (
            <div key={s.id} className={styles.legalSectionCard}>
              <p className={styles.legalCitation}>{s.citation}</p>
              <p className={styles.legalSummary}>{s.summary}</p>
            </div>
          ))}
        </div>
      ) : (
        <p className={styles.empty}>No legal sections matched by analysis yet.</p>
      )}

      <p className={styles.subHead}>Legal Requests ({requests.length})</p>
      {requests.length ? (
        <div className={styles.requestList}>
          {requests.map((req) => (
            <LegalRequestCard key={req.requestId} caseId={caseId} req={req} onChanged={onChanged} />
          ))}
        </div>
      ) : (
        <p className={styles.empty}>No legal requests generated yet. Approve a Next Best Action above to generate one.</p>
      )}
    </section>
  )
}

function LegalRequestCard({ caseId, req, onChanged }) {
  const [expanded, setExpanded] = useState(false)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState(null)
  const [actor, setActor] = useState('')
  const [providerEmail, setProviderEmail] = useState('')
  const [responseData, setResponseData] = useState({ accountHolder: '', kycPhone: '', kycAddress: '', deviceId: '', ipAddress: '' })

  const STATUS_COLOR = {
    draft: 'var(--text-tertiary)', approved: 'var(--accent)', sent: 'var(--warning)',
    overdue: 'var(--danger)', completed: 'var(--success)', rejected: 'var(--danger)',
  }

  const run = async (fn) => {
    setBusy(true); setErr(null)
    try { await fn(); await onChanged() }
    catch (e) { setErr(e.response?.data?.message || 'Action failed.') }
    finally { setBusy(false) }
  }

  return (
    <div className={styles.requestCard}>
      <div className={styles.requestHead} onClick={() => setExpanded((v) => !v)}>
        <div>
          <p className={styles.requestType}>{req.requestType} — {req.requestId}</p>
          {req.deadline && <p className={styles.metaText}>SLA deadline: {fmtDate(req.deadline)}</p>}
        </div>
        <span className={styles.requestStatus} style={{ color: STATUS_COLOR[req.status] }}>{req.status.toUpperCase()}</span>
      </div>

      {expanded && (
        <div className={styles.requestBody}>
          {err && <p className={styles.actionError}>{err}</p>}
          <input className={styles.input} placeholder="Officer name / badge ID" value={actor} onChange={(e) => setActor(e.target.value)} />

          {req.status === 'draft' && (
            <button type="button" className={styles.primaryBtn} disabled={busy || !actor.trim()}
              onClick={() => run(() => apiBackend.post(`/cases/${caseId}/request/${req.requestId}/approve`, { approvedBy: actor }))}>
              Approve Request
            </button>
          )}

          {req.status === 'approved' && (
            <>
              <input className={styles.input} placeholder="Provider email" value={providerEmail} onChange={(e) => setProviderEmail(e.target.value)} />
              <button type="button" className={styles.primaryBtn} disabled={busy || !providerEmail.trim()}
                onClick={() => run(() => apiBackend.post(`/cases/${caseId}/request/${req.requestId}/dispatch`, { providerEmail }))}>
                Dispatch Request
              </button>
            </>
          )}

          {(req.status === 'sent' || req.status === 'overdue') && (
            <div className={styles.responseForm}>
              <p className={styles.subHead}>Record provider response</p>
              {req.requestType === 'bank' ? (
                <>
                  <input className={styles.input} placeholder="Account holder name" value={responseData.accountHolder} onChange={(e) => setResponseData({ ...responseData, accountHolder: e.target.value })} />
                  <input className={styles.input} placeholder="KYC phone" value={responseData.kycPhone} onChange={(e) => setResponseData({ ...responseData, kycPhone: e.target.value })} />
                  <input className={styles.input} placeholder="KYC address" value={responseData.kycAddress} onChange={(e) => setResponseData({ ...responseData, kycAddress: e.target.value })} />
                </>
              ) : (
                <>
                  <input className={styles.input} placeholder="Device ID" value={responseData.deviceId} onChange={(e) => setResponseData({ ...responseData, deviceId: e.target.value })} />
                  <input className={styles.input} placeholder="IP address" value={responseData.ipAddress} onChange={(e) => setResponseData({ ...responseData, ipAddress: e.target.value })} />
                </>
              )}
              <button type="button" className={styles.primaryBtn} disabled={busy || !actor.trim()}
                onClick={() => run(() => apiBackend.post(`/cases/${caseId}/request/${req.requestId}/response`, { recordedBy: actor, data: responseData }))}>
                {busy ? 'Saving…' : 'Record Response & Re-investigate'}
              </button>
            </div>
          )}

          {req.status === 'completed' && req.response && (
            <div className={styles.rawText}>
              Recorded by {req.response.recordedBy} on {fmtDate(req.response.receivedAt)}.
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// =========================================================
// 11. INVESTIGATION TIMELINE
// =========================================================

const AI_ACTIONS = new Set(['AI_INVESTIGATION_COMPLETED', 'RECOMMENDATION_APPROVED', 'RECOMMENDATION_REJECTED'])

function TimelinePanel({ timeline }) {
  return (
    <section className={styles.section}>
      <h3 className={styles.sectionTitle}>Investigation Timeline</h3>
      {timeline.length ? (
        <ul className={styles.timeline}>
          {timeline.map((t) => (
            <li key={t.sequence} className={AI_ACTIONS.has(t.action) ? styles.timelineAi : styles.timelineItem}>
              {AI_ACTIONS.has(t.action) && <SparklesIcon width={12} height={12} />}
              <span>
                <strong>{t.action.replace(/_/g, ' ')}</strong> — {t.actor} · {fmtDate(t.timestamp)}
              </span>
            </li>
          ))}
        </ul>
      ) : (
        <p className={styles.empty}>No timeline events recorded yet.</p>
      )}
    </section>
  )
}

// =========================================================
// 12. SIMILAR CASES
// =========================================================

function SimilarCasesPanel({ similarCases }) {
  return (
    <section className={styles.section}>
      <h3 className={styles.sectionTitle}><LinkIcon width={15} height={15} /> Similar Cases</h3>
      {similarCases.status === 'loading' && <p className={styles.empty}>Looking for similar cases…</p>}
      {similarCases.status === 'error' && <p className={styles.empty}>Similar-case analysis is unavailable right now.</p>}
      {similarCases.status === 'ok' && (
        similarCases.data.length ? (
          <div className={styles.similarList}>
            {similarCases.data.map((c) => (
              <Link key={c.caseId} to={`/cases/${c.caseId}`} className={styles.similarCard}>
                <p className={styles.similarTitle}>{c.caseId} — {c.title || 'Untitled Case'}</p>
                <p className={styles.metaText}>{fmtPct(c.similarity)} similarity{c.sharedEntityTypes?.length ? ` · shared: ${c.sharedEntityTypes.join(', ').toLowerCase()}` : ''}</p>
              </Link>
            ))}
          </div>
        ) : <p className={styles.empty}>No similar cases found.</p>
      )}
    </section>
  )
}

// =========================================================
// 13. AI INVESTIGATION HISTORY
// =========================================================

function HistoryPanel({ versions }) {
  if (!versions.length) {
    return (
      <section className={styles.section}>
        <h3 className={styles.sectionTitle}><HistoryIcon width={15} height={15} /> AI Investigation History</h3>
        <p className={styles.empty}>No previous investigation.</p>
      </section>
    )
  }

  return (
    <section className={styles.section}>
      <h3 className={styles.sectionTitle}><HistoryIcon width={15} height={15} /> AI Investigation History</h3>
      <div className={styles.historyList}>
        {[...versions].reverse().map((v, i) => (
          <div key={v.version} className={styles.historyItem}>
            <div className={styles.historyDot} />
            <div>
              <p className={styles.historyTitle}>
                v{v.version} — {TRIGGER_LABEL[v.trigger] || v.trigger}
                {i === 0 && <span className={styles.currentBadge}>CURRENT</span>}
              </p>
              <p className={styles.metaText}>{fmtDate(v.createdAt)}</p>
              <p className={styles.metaText}>
                Risk: {v.risk || 'n/a'} · Confidence: {fmtPct(v.confidence) || 'n/a'} · {v.findings.length} finding(s) · {v.recommendations.length} recommendation(s)
              </p>
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}