// // import { useCallback, useEffect, useRef, useState } from 'react'
// // import { motion } from 'framer-motion'
// // import { useParams, useNavigate, Link } from 'react-router-dom'
// // import { apiBackend, apiBrain } from '../api/api'
// // import {
// //   FileTextIcon, ImageIcon, AudioIcon, SparklesIcon, ChevronRightIcon,
// //   AlertTriangleIcon, TrendUpIcon, TrendDownIcon,
// //   HelpCircleIcon, MapPinIcon, ScaleIcon, HistoryIcon, RefreshIcon,
// //   CheckIcon, XCircleIcon, LinkIcon, UploadCloudIcon, LockIcon,
// // } from '../components/Icons/Icons'
// // import EntityGraph from '../components/CaseIntelligence/EntityGraph'
// // import LocationMap from '../components/CaseIntelligence/LocationMap'
// // import EyeLoader from '../components/EyeLoader/EyeLoader'
// // import styles from './CaseDetails.module.css'

// // const EVIDENCE_ICON = { pdf: FileTextIcon, image: ImageIcon, audio: AudioIcon, text: FileTextIcon }

// // const STATUS_LABEL = {
// //   pending_analysis: 'Pending',
// //   pending_action: 'Pending',
// //   under_investigation: 'Under Investigation',
// //   investigation_approved: 'Investigation Approved',
// //   open: 'Under Investigation',
// //   resolved: 'Resolved',
// //   closed: 'Resolved',
// // }

// // const RISK_META = {
// //   low: { label: 'Low', color: 'var(--success)', bg: 'var(--success-soft)' },
// //   medium: { label: 'Medium', color: 'var(--warning)', bg: 'var(--warning-soft)' },
// //   high: { label: 'High', color: 'var(--danger)', bg: 'var(--danger-soft)' },
// //   critical: { label: 'Critical', color: 'var(--danger)', bg: 'var(--danger-soft)' },
// // }

// // const URGENCY_META = {
// //   high: { label: 'HIGH', color: 'var(--danger)' },
// //   medium: { label: 'MEDIUM', color: 'var(--warning)' },
// //   low: { label: 'LOW', color: 'var(--text-tertiary)' },
// // }

// // const TRIGGER_LABEL = {
// //   initial_complaint: 'Initial complaint',
// //   evidence_added: 'Evidence added',
// //   legal_response_received: 'Legal response received',
// //   entity_added: 'Entity added',
// //   manual_reinvestigation: 'Manual re-investigation',
// // }

// // function fmtPct(n) {
// //   return n == null ? null : `${Math.round(n * 100)}%`
// // }

// // function fmtDate(d) {
// //   if (!d) return ''
// //   return new Date(d).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })
// // }

// // export default function CaseDetails() {
// //   const { caseId } = useParams()
// //   const navigate = useNavigate()

// //   const [caseDoc, setCaseDoc] = useState(null)
// //   const [isInvestigator, setIsInvestigator] = useState(true)
// //   const [isArchivedView, setIsArchivedView] = useState(false)
// //   const [requestStatus, setRequestStatus] = useState(null)
// //   const [timeline, setTimeline] = useState([])
// //   const [similarCases, setSimilarCases] = useState({ status: 'loading', data: [] })
// //   const [error, setError] = useState(null)
// //   const [loading, setLoading] = useState(true)
// //   const [loadingStartedAt] = useState(() => Date.now())
// //   const [reinvestigating, setReinvestigating] = useState(false)
// //   const [actionError, setActionError] = useState(null)
// //   const [compareVersion, setCompareVersion] = useState(null)
// //   const [requesting, setRequesting] = useState(false)
// //   const [showCompleteModal, setShowCompleteModal] = useState(false)

// //   const loadCase = useCallback(() => {
// //     return apiBackend.get(`/cases/${caseId}`).then((res) => {
// //       setCaseDoc(res.data.case)
// //       setIsInvestigator(res.data.isInvestigator !== false)
// //       setIsArchivedView(!!res.data.isArchivedView)
// //       setRequestStatus(res.data.myAccessRequestStatus ?? null)
// //     })
// //   }, [caseId])

// //   useEffect(() => {
// //     setLoading(true)
// //     setError(null)
// //     loadCase()
// //       .catch((err) => setError(err.response?.data?.message || 'Failed to load this case.'))
// //       .finally(() => {
// //         const elapsed = Date.now() - loadingStartedAt
// //         const remaining = Math.max(0, 1200 - elapsed)
// //         window.setTimeout(() => setLoading(false), remaining)
// //       })
// //   }, [caseId, loadCase])

// //   const canViewFullCase = isInvestigator || isArchivedView

// //   useEffect(() => {
// //     if (!canViewFullCase) return
// //     apiBackend.get(`/cases/${caseId}/timeline`).then((res) => setTimeline(res.data.timeline || [])).catch(() => setTimeline([]))
// //   }, [caseId, canViewFullCase])

// //   useEffect(() => {
// //     if (!canViewFullCase) return
// //     setSimilarCases({ status: 'loading', data: [] })
// //     apiBrain
// //       .get(`/api/case/${caseId}/similar`)
// //       .then((res) => setSimilarCases({ status: 'ok', data: res.data.similarCases || [] }))
// //       .catch(() => setSimilarCases({ status: 'error', data: [] }))
// //   }, [caseId, canViewFullCase])

// //   const handleRequestAccess = async () => {
// //     setRequesting(true)
// //     try {
// //       await apiBackend.post(`/cases/${caseId}/access-request`)
// //       setRequestStatus('pending')
// //     } catch (err) {
// //       setActionError(err.response?.data?.message || 'Could not send the access request.')
// //     } finally {
// //       setRequesting(false)
// //     }
// //   }

// //   const versions = caseDoc?.investigationVersions || []
// //   const latest = versions.length ? versions[versions.length - 1] : null
// //   const previous = versions.length > 1 ? versions[versions.length - 2] : null

// //   const handleReinvestigate = async () => {
// //     setReinvestigating(true)
// //     setActionError(null)
// //     try {
// //       await apiBackend.post(`/cases/${caseId}/reinvestigate`)
// //       await loadCase()
// //     } catch (err) {
// //       setActionError(err.response?.data?.message || err.response?.data?.error || 'Re-investigation failed.')
// //     } finally {
// //       setReinvestigating(false)
// //     }
// //   }

// //   if (loading) return <EyeLoader label="Loading investigation…" />
// //   if (error) return <p className={styles.stateError}>{error}</p>
// //   if (!caseDoc) return null

// //   if (!isInvestigator && !isArchivedView) {
// //     const risk = caseDoc.severity ? RISK_META[caseDoc.severity] : null
// //     return (
// //       <motion.div
// //         className={styles.wrap}
// //         initial={{ opacity: 0, y: 8 }}
// //         animate={{ opacity: 1, y: 0 }}
// //         transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
// //       >
// //         <div className={styles.header}>
// //           <div>
// //             <p className={styles.caseId}>{caseDoc.case_id}</p>
// //             <h2 className={styles.title}>{caseDoc.title || 'Untitled Case'}</h2>
// //             <div className={styles.headerMeta}>
// //               <span className={styles.statusBadge}>{STATUS_LABEL[caseDoc.status] || caseDoc.status}</span>
// //               {risk && (
// //                 <span className={styles.riskBadge} style={{ color: risk.color, background: risk.bg }}>
// //                   {risk.label} risk
// //                 </span>
// //               )}
// //             </div>
// //           </div>
// //         </div>

// //         <section className={styles.section} style={{ textAlign: 'center', padding: '48px 20px' }}>
// //           <LockIcon width={28} height={28} style={{ opacity: 0.6, marginBottom: 12 }} />
// //           <p className={styles.title} style={{ fontSize: 16 }}>You don't have access to this case</p>
// //           <p className={styles.empty} style={{ marginBottom: 18 }}>
// //             Request access from the lead investigator to view evidence, findings, and the full case record.
// //           </p>
// //           {actionError && <p className={styles.actionError} style={{ marginBottom: 12 }}>{actionError}</p>}
// //           {requestStatus === 'pending' ? (
// //             <span className={styles.statusBadge}>Access Requested</span>
// //           ) : requestStatus === 'rejected' ? (
// //             <span className={styles.statusBadge} style={{ color: 'var(--danger)', background: 'var(--danger-soft)' }}>
// //               Access Rejected
// //             </span>
// //           ) : (
// //             <button type="button" className={styles.secondaryBtn} disabled={requesting} onClick={handleRequestAccess}>
// //               {requesting ? 'Requesting…' : 'Request Access'}
// //             </button>
// //           )}
// //         </section>

// //         <button type="button" className={styles.backBtn} onClick={() => navigate('/')}>
// //           ← Back to Dashboard
// //         </button>
// //       </motion.div>
// //     )
// //   }

// //   return (
// //     <motion.div
// //       className={styles.wrap}
// //       initial={{ opacity: 0, y: 8 }}
// //       animate={{ opacity: 1, y: 0 }}
// //       transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
// //     >
// //       <CaseHeader
// //         caseDoc={caseDoc}
// //         latest={latest}
// //         isInvestigator={isInvestigator}
// //         isArchivedView={isArchivedView}
// //         onAddEvidence={() => navigate(`/new-case?case_id=${caseDoc.case_id}`)}
// //         onReinvestigate={handleReinvestigate}
// //         reinvestigating={reinvestigating}
// //         onMarkComplete={() => setShowCompleteModal(true)}
// //       />

// //       {actionError && <p className={styles.actionError}>{actionError}</p>}

// //       {caseDoc.isCompleted && caseDoc.resolution && (
// //         <ResolutionPanel resolution={caseDoc.resolution} />
// //       )}

// //       {showCompleteModal && (
// //         <CompleteCaseModal
// //           caseId={caseId}
// //           onClose={() => setShowCompleteModal(false)}
// //           onCompleted={async () => {
// //             setShowCompleteModal(false)
// //             await loadCase()
// //           }}
// //         />
// //       )}

// //       <CaseIntelligencePanel caseDoc={caseDoc} latest={latest} previous={previous} />

// //       <WhatChangedPanel latest={latest} versions={versions} />

// //       <GapsPanel latest={latest} />

// //       <NextBestActionPanel
// //         caseId={caseId}
// //         latest={latest}
// //         onChanged={loadCase}
// //         readOnly={caseDoc.isCompleted}
// //       />

// //       <section className={styles.section}>
// //         <h3 className={styles.sectionTitle}>Entity &amp; Relationship Graph</h3>
// //         <EntityGraph entities={latest?.entities || []} relationships={latest?.relationships || []} />
// //       </section>

// //       <GeoIntelligencePanel latest={latest} />

// //       <EvidenceIntelligencePanel caseDoc={caseDoc} latest={latest} />

// //       <LegalIntelligencePanel caseId={caseId} caseDoc={caseDoc} onChanged={loadCase} readOnly={caseDoc.isCompleted} />

// //       <TimelinePanel timeline={timeline} />

// //       <SimilarCasesPanel similarCases={similarCases} />

// //       <HistoryPanel versions={versions} compareVersion={compareVersion} setCompareVersion={setCompareVersion} />

// //       <Link to={`/cases/${caseId}/investigation`} className={styles.aiLink}>
// //         <SparklesIcon width={16} height={16} />
// //         <span>Open detailed step / legal-section approval view</span>
// //         <ChevronRightIcon width={16} height={16} />
// //       </Link>

// //       <button type="button" className={styles.backBtn} onClick={() => navigate('/')}>
// //         ← Back to Dashboard
// //       </button>
// //     </motion.div>
// //   )
// // }

// // // =========================================================
// // // 1. CASE HEADER
// // // =========================================================

// // function CaseHeader({ caseDoc, latest, isInvestigator, isArchivedView, onAddEvidence, onReinvestigate, reinvestigating, onMarkComplete }) {
// //   const risk = latest?.risk ? RISK_META[latest.risk] : null
// //   const isCompleted = !!caseDoc.isCompleted
// //   // Archived viewers, and any case that's already been marked complete,
// //   // are read-only -- no evidence uploads, re-investigation, or closing
// //   // it a second time.
// //   const canEdit = isInvestigator && !isArchivedView && !isCompleted

// //   return (
// //     <div className={styles.header}>
// //       <div>
// //         <p className={styles.caseId}>{caseDoc.case_id}</p>
// //         <h2 className={styles.title}>{caseDoc.title || 'Untitled Case'}</h2>
// //         <div className={styles.headerMeta}>
// //           <span className={styles.statusBadge}>
// //             {isCompleted ? 'Case Completed' : STATUS_LABEL[caseDoc.status] || caseDoc.status}
// //           </span>
// //           {risk && (
// //             <span className={styles.riskBadge} style={{ color: risk.color, background: risk.bg }}>
// //               {risk.label} risk
// //             </span>
// //           )}
// //           <span className={styles.metaText}>Updated {fmtDate(caseDoc.updatedAt)}</span>
// //           {isArchivedView && <span className={styles.metaText}>· Viewing from Cases Archive (read-only)</span>}
// //         </div>
// //       </div>
// //       {canEdit && (
// //         <div className={styles.headerActions}>
// //           <button type="button" className={styles.secondaryBtn} onClick={onAddEvidence}>
// //             <UploadCloudIcon width={14} height={14} /> Add Evidence
// //           </button>
// //           <button type="button" className={styles.primaryBtn} onClick={onReinvestigate} disabled={reinvestigating}>
// //             <RefreshIcon width={14} height={14} /> {reinvestigating ? 'Re-investigating…' : 'Re-investigate'}
// //           </button>
// //           <button type="button" className={styles.secondaryBtn} onClick={onMarkComplete}>
// //             <CheckIcon width={14} height={14} /> Mark Case Complete
// //           </button>
// //         </div>
// //       )}
// //     </div>
// //   )
// // }

// // // =========================================================
// // // 1b. CASE RESOLUTION (shown once the case is marked complete)
// // // =========================================================

// // const OUTCOME_LABEL = {
// //   culprit_identified: 'Culprit Identified',
// //   culprit_arrested: 'Culprit Arrested',
// //   money_recovered: 'Money Recovered',
// //   false_complaint: 'False Complaint',
// //   withdrawn_by_complainant: 'Withdrawn by Complainant',
// //   unable_to_resolve: 'Unable to Resolve',
// //   other: 'Other',
// // }

// // function ResolutionPanel({ resolution }) {
// //   return (
// //     <section className={styles.section} style={{ borderColor: 'var(--success)' }}>
// //       <h3 className={styles.sectionTitle}><CheckIcon width={15} height={15} color="var(--success)" /> Case Resolution</h3>

// //       <div className={styles.intelGrid}>
// //         <div className={styles.intelStat}>
// //           <p className={styles.intelLabel}>Outcome</p>
// //           <p className={styles.intelValue}>{OUTCOME_LABEL[resolution.outcome] || resolution.outcome}</p>
// //         </div>
// //         {resolution.amountRecovered != null && (
// //           <div className={styles.intelStat}>
// //             <p className={styles.intelLabel}>Amount recovered</p>
// //             <p className={styles.intelValue}>₹{Number(resolution.amountRecovered).toLocaleString('en-IN')}</p>
// //           </div>
// //         )}
// //         <div className={styles.intelStat}>
// //           <p className={styles.intelLabel}>Closed by</p>
// //           <p className={styles.intelValue}>{resolution.closedBy}</p>
// //         </div>
// //         <div className={styles.intelStat}>
// //           <p className={styles.intelLabel}>Closed on</p>
// //           <p className={styles.intelValue}>{fmtDate(resolution.closedAt)}</p>
// //         </div>
// //       </div>

// //       <div className={styles.assessmentBox}>
// //         <p className={styles.assessmentLabel}>How the case concluded</p>
// //         <p className={styles.assessmentText}>{resolution.summary}</p>
// //       </div>

// //       {resolution.keyEvidence && (
// //         <div className={styles.assessmentBox}>
// //           <p className={styles.assessmentLabel}>Key evidence</p>
// //           <p className={styles.assessmentText}>{resolution.keyEvidence}</p>
// //         </div>
// //       )}

// //       {resolution.victimOutcome && (
// //         <div className={styles.assessmentBox}>
// //           <p className={styles.assessmentLabel}>What happened to the victim</p>
// //           <p className={styles.assessmentText}>{resolution.victimOutcome}</p>
// //         </div>
// //       )}

// //       {resolution.actionsTaken && (
// //         <div className={styles.assessmentBox}>
// //           <p className={styles.assessmentLabel}>Actions taken</p>
// //           <p className={styles.assessmentText}>{resolution.actionsTaken}</p>
// //         </div>
// //       )}
// //     </section>
// //   )
// // }

// // // =========================================================
// // // 1c. MARK CASE COMPLETE MODAL
// // // =========================================================

// // function CompleteCaseModal({ caseId, onClose, onCompleted }) {
// //   const [form, setForm] = useState({
// //     outcome: 'culprit_identified',
// //     summary: '',
// //     keyEvidence: '',
// //     victimOutcome: '',
// //     amountRecovered: '',
// //     actionsTaken: '',
// //   })
// //   const [busy, setBusy] = useState(false)
// //   const [err, setErr] = useState(null)

// //   const set = (field) => (e) => setForm({ ...form, [field]: e.target.value })

// //   const submit = async () => {
// //     if (!form.summary.trim()) {
// //       setErr('Please describe how the case concluded.')
// //       return
// //     }
// //     setBusy(true)
// //     setErr(null)
// //     try {
// //       await apiBackend.post(`/cases/${caseId}/complete`, form)
// //       await onCompleted()
// //     } catch (e) {
// //       setErr(e.response?.data?.message || 'Failed to mark the case complete.')
// //     } finally {
// //       setBusy(false)
// //     }
// //   }

// //   return (
// //     <div className={styles.modalOverlay} onClick={onClose}>
// //       <div className={styles.modalCard} onClick={(e) => e.stopPropagation()}>
// //         <h3 className={styles.sectionTitle}>Mark Case Complete</h3>
// //         <p className={styles.metaText} style={{ marginBottom: 12 }}>
// //           This closes the case for every investigator and adds it to the Cases Archive, visible to all investigators.
// //         </p>

// //         {err && <p className={styles.actionError}>{err}</p>}

// //         <label className={styles.subHead}>Outcome</label>
// //         <select className={styles.input} value={form.outcome} onChange={set('outcome')}>
// //           {Object.entries(OUTCOME_LABEL).map(([value, label]) => (
// //             <option key={value} value={value}>{label}</option>
// //           ))}
// //         </select>

// //         <label className={styles.subHead}>How did it conclude?</label>
// //         <textarea
// //           className={styles.input}
// //           rows={3}
// //           placeholder="Summarize how the investigation concluded…"
// //           value={form.summary}
// //           onChange={set('summary')}
// //         />

// //         <label className={styles.subHead}>Key evidence</label>
// //         <textarea
// //           className={styles.input}
// //           rows={2}
// //           placeholder="What evidence supported this outcome?"
// //           value={form.keyEvidence}
// //           onChange={set('keyEvidence')}
// //         />

// //         <label className={styles.subHead}>What happened to the victim?</label>
// //         <textarea
// //           className={styles.input}
// //           rows={2}
// //           placeholder="Compensation, recovery, welfare follow-up, etc."
// //           value={form.victimOutcome}
// //           onChange={set('victimOutcome')}
// //         />

// //         <label className={styles.subHead}>Amount recovered (optional)</label>
// //         <input
// //           className={styles.input}
// //           type="number"
// //           placeholder="₹"
// //           value={form.amountRecovered}
// //           onChange={set('amountRecovered')}
// //         />

// //         <label className={styles.subHead}>Actions taken (optional)</label>
// //         <textarea
// //           className={styles.input}
// //           rows={2}
// //           placeholder="Arrests made, sections invoked, follow-up steps…"
// //           value={form.actionsTaken}
// //           onChange={set('actionsTaken')}
// //         />

// //         <div className={styles.recActions} style={{ marginTop: 8 }}>
// //           <button type="button" className={styles.secondaryBtn} onClick={onClose} disabled={busy}>
// //             Cancel
// //           </button>
// //           <button type="button" className={styles.primaryBtn} onClick={submit} disabled={busy}>
// //             {busy ? 'Saving…' : 'Mark Complete'}
// //           </button>
// //         </div>
// //       </div>
// //     </div>
// //   )
// // }

// // // =========================================================
// // // 2. CASE INTELLIGENCE
// // // =========================================================

// // function CaseIntelligencePanel({ caseDoc, latest, previous }) {
// //   if (!latest) {
// //     return (
// //       <section className={styles.section}>
// //         <h3 className={styles.sectionTitle}>Case Intelligence</h3>
// //         <p className={styles.empty}>No AI investigation has run yet for this case. Click "Re-investigate" above to run one.</p>
// //       </section>
// //     )
// //   }

// //   const risk = RISK_META[latest.risk] || null
// //   const order = ['low', 'medium', 'high', 'critical']
// //   const riskTrend = previous && previous.risk !== latest.risk
// //     ? (order.indexOf(latest.risk) > order.indexOf(previous.risk) ? 'up' : 'down')
// //     : null

// //   return (
// //     <section className={styles.section}>
// //       <h3 className={styles.sectionTitle}>Case Intelligence</h3>

// //       <div className={styles.intelGrid}>
// //         <div className={styles.intelStat}>
// //           <p className={styles.intelLabel}>Risk level</p>
// //           <p className={styles.intelValueRow}>
// //             {risk ? (
// //               <span className={styles.riskBadge} style={{ color: risk.color, background: risk.bg }}>{risk.label}</span>
// //             ) : <span className={styles.notAvailable}>Not available</span>}
// //             {riskTrend === 'up' && <TrendUpIcon width={14} height={14} color="var(--danger)" />}
// //             {riskTrend === 'down' && <TrendDownIcon width={14} height={14} color="var(--success)" />}
// //           </p>
// //         </div>

// //         <div className={styles.intelStat}>
// //           <p className={styles.intelLabel}>AI confidence</p>
// //           <p className={styles.intelValue}>{fmtPct(latest.confidence) || <span className={styles.notAvailable}>Not available</span>}</p>
// //         </div>

// //         <div className={styles.intelStat}>
// //           <p className={styles.intelLabel}>Evidence on file</p>
// //           <p className={styles.intelValue}>{(caseDoc.evidence?.length || 0) + (caseDoc.evidenceFiles?.length || 0)}</p>
// //         </div>

// //         <div className={styles.intelStat}>
// //           <p className={styles.intelLabel}>Critical gaps</p>
// //           <p className={styles.intelValue}>{latest.missing?.length ?? 0}</p>
// //         </div>

// //         <div className={styles.intelStat}>
// //           <p className={styles.intelLabel}>Recommended actions</p>
// //           <p className={styles.intelValue}>{latest.recommendations?.filter((r) => r.status === 'pending').length ?? 0}</p>
// //         </div>

// //         <div className={styles.intelStat}>
// //           <p className={styles.intelLabel}>Investigation version</p>
// //           <p className={styles.intelValue}>v{latest.version}</p>
// //         </div>
// //       </div>

// //       <div className={styles.assessmentBox}>
// //         <p className={styles.assessmentLabel}>Current AI Assessment</p>
// //         <p className={styles.assessmentText}>{latest.assessment}</p>
// //         {latest.riskReasoning && <p className={styles.riskReasoning}>{latest.riskReasoning}</p>}
// //       </div>

// //       {latest.escalation?.required && (
// //         <div className={styles.escalation}>
// //           <AlertTriangleIcon width={15} height={15} />
// //           <span>Escalation recommended — {latest.escalation.reason}</span>
// //         </div>
// //       )}
// //     </section>
// //   )
// // }

// // // =========================================================
// // // 3. WHAT CHANGED
// // // =========================================================

// // function WhatChangedPanel({ latest, versions }) {
// //   const [expanded, setExpanded] = useState(false)
// //   const delta = latest?.delta

// //   if (!latest) return null

// //   if (!delta) {
// //     return (
// //       <section className={styles.section}>
// //         <h3 className={styles.sectionTitle}>⭐ What Changed</h3>
// //         <p className={styles.empty}>No previous investigation to compare — this is the first investigation version.</p>
// //       </section>
// //     )
// //   }

// //   const hasChanges =
// //     delta.newFindings.length || delta.newEntities.length || delta.newRelationships.length ||
// //     delta.riskChange || delta.confidenceChange || delta.newKnown.length ||
// //     delta.resolvedMissing.length || delta.newMissing.length || delta.newRecommendations.length

// //   return (
// //     <section className={styles.section}>
// //       <div className={styles.evidenceHead}>
// //         <h3 className={styles.sectionTitle} style={{ margin: 0 }}>
// //           ⭐ What Changed <span className={styles.metaText}>v{delta.fromVersion} → v{delta.toVersion}</span>
// //         </h3>
// //       </div>

// //       {!hasChanges ? (
// //         <p className={styles.empty}>No new changes detected in this re-investigation.</p>
// //       ) : (
// //         <div className={styles.changeList}>
// //           {delta.newFindings.map((f, i) => (
// //             <div key={`nf-${i}`} className={styles.changeItem}>
// //               <span className={styles.changeTagAdd}>+ NEW FINDING</span>
// //               <p>{f.text}</p>
// //             </div>
// //           ))}
// //           {delta.newEntities.map((e, i) => (
// //             <div key={`ne-${i}`} className={styles.changeItem}>
// //               <span className={styles.changeTagAdd}>+ NEW ENTITY</span>
// //               <p>{e.type.replace(/_/g, ' ')}: {e.value}</p>
// //             </div>
// //           ))}
// //           {delta.newRelationships.map((r, i) => (
// //             <div key={`nr-${i}`} className={styles.changeItem}>
// //               <span className={styles.changeTagAdd}>+ NEW RELATIONSHIP</span>
// //               <p>{r.from} → {r.type.replace(/-/g, ' ')} → {r.to}</p>
// //             </div>
// //           ))}
// //           {delta.riskChange && (
// //             <div className={styles.changeItem}>
// //               <span className={styles.changeTagRisk}>↑ RISK CHANGE</span>
// //               <p>{delta.riskChange.from || 'unknown'} → {delta.riskChange.to}</p>
// //             </div>
// //           )}
// //           {delta.confidenceChange && (
// //             <div className={styles.changeItem}>
// //               <span className={styles.changeTagRisk}>CONFIDENCE CHANGE</span>
// //               <p>{fmtPct(delta.confidenceChange.from)} → {fmtPct(delta.confidenceChange.to)}</p>
// //             </div>
// //           )}
// //           {delta.resolvedMissing.map((m, i) => (
// //             <div key={`rm-${i}`} className={styles.changeItem}>
// //               <span className={styles.changeTagResolve}>✓ RESOLVED</span>
// //               <p>{m.label}</p>
// //             </div>
// //           ))}
// //           {delta.newMissing.map((m, i) => (
// //             <div key={`nm-${i}`} className={styles.changeItem}>
// //               <span className={styles.changeTagGap}>? NEW GAP</span>
// //               <p>{m.label}</p>
// //             </div>
// //           ))}
// //         </div>
// //       )}

// //       {versions.length > 1 && (
// //         <button type="button" className={styles.linkBtn} onClick={() => setExpanded((v) => !v)}>
// //           {expanded ? 'Hide full comparison' : 'View Full Comparison'}
// //         </button>
// //       )}

// //       {expanded && <FullComparison versions={versions} />}
// //     </section>
// //   )
// // }

// // function FullComparison({ versions }) {
// //   const curr = versions[versions.length - 1]
// //   const prev = versions[versions.length - 2]
// //   if (!prev) return null
// //   return (
// //     <div className={styles.comparisonGrid}>
// //       <div>
// //         <p className={styles.comparisonHead}>Previous State — v{prev.version}</p>
// //         <p className={styles.rawText}>{prev.assessment}</p>
// //         <p className={styles.metaText}>Known: {prev.known.length} · Missing: {prev.missing.length} · Findings: {prev.findings.length}</p>
// //       </div>
// //       <div>
// //         <p className={styles.comparisonHead}>Current State — v{curr.version}</p>
// //         <p className={styles.rawText}>{curr.assessment}</p>
// //         <p className={styles.metaText}>Known: {curr.known.length} · Missing: {curr.missing.length} · Findings: {curr.findings.length}</p>
// //       </div>
// //     </div>
// //   )
// // }

// // // =========================================================
// // // 4. INVESTIGATION GAPS (Known vs Missing)
// // // =========================================================

// // function GapsPanel({ latest }) {
// //   if (!latest) return null
// //   return (
// //     <section className={styles.section}>
// //       <h3 className={styles.sectionTitle}>Investigation Gaps</h3>
// //       <div className={styles.gapsGrid}>
// //         <div>
// //           <p className={styles.gapsHead}><CheckIcon width={14} height={14} color="var(--success)" /> Known</p>
// //           {latest.known.length ? (
// //             <ul className={styles.gapsList}>
// //               {latest.known.map((k, i) => (
// //                 <li key={i}><strong>{k.label}:</strong> {k.detail}</li>
// //               ))}
// //             </ul>
// //           ) : <p className={styles.empty}>Nothing confirmed yet.</p>}
// //         </div>
// //         <div>
// //           <p className={styles.gapsHead}><HelpCircleIcon width={14} height={14} color="var(--warning)" /> Missing</p>
// //           {latest.missing.length ? (
// //             <div className={styles.missingList}>
// //               {latest.missing.map((m) => (
// //                 <div key={m.id} className={styles.missingCard}>
// //                   <p className={styles.missingLabel}>{m.label}</p>
// //                   <p className={styles.missingWhy}><strong>Why it matters:</strong> {m.whyItMatters}</p>
// //                   <p className={styles.missingMethod}><strong>Suggested method:</strong> {m.suggestedMethod}</p>
// //                   {m.supportingEvidence?.length > 0 && (
// //                     <p className={styles.missingEvidence}><strong>Supporting evidence:</strong> {m.supportingEvidence.join(', ')}</p>
// //                   )}
// //                 </div>
// //               ))}
// //             </div>
// //           ) : <p className={styles.empty}>No open information gaps identified.</p>}
// //         </div>
// //       </div>
// //     </section>
// //   )
// // }

// // // =========================================================
// // // 5. NEXT BEST ACTION
// // // =========================================================

// // function NextBestActionPanel({ caseId, latest, onChanged, readOnly }) {
// //   const [busyId, setBusyId] = useState(null)
// //   const [decidedBy, setDecidedBy] = useState('')
// //   const [err, setErr] = useState(null)

// //   const pending = (latest?.recommendations || []).filter((r) => r.status === 'pending')

// //   const decide = async (rec, status) => {
// //     setErr(null)
// //     if (!decidedBy.trim()) {
// //       setErr('Enter officer name / badge ID before approving or rejecting.')
// //       return
// //     }
// //     setBusyId(rec.id)
// //     try {
// //       await apiBrain.post(`/api/case/${caseId}/recommendation/${rec.id}/status`, { status, decidedBy })
// //       if (status === 'approved' && rec.requestType) {
// //         await apiBackend.post(`/cases/${caseId}/request/generate`, { requestType: rec.requestType })
// //       }
// //       await onChanged()
// //     } catch (e) {
// //       setErr(e.response?.data?.message || e.response?.data?.error || 'Failed to update recommendation.')
// //     } finally {
// //       setBusyId(null)
// //     }
// //   }

// //   if (!latest) return null

// //   if (readOnly) {
// //     return (
// //       <section className={styles.section}>
// //         <h3 className={styles.sectionTitle}>⭐ Next Best Action</h3>
// //         <p className={styles.empty}>This case is closed — recommendations are no longer actionable.</p>
// //       </section>
// //     )
// //   }

// //   return (
// //     <section className={styles.section}>
// //       <h3 className={styles.sectionTitle}>⭐ Next Best Action</h3>

// //       <input
// //         type="text"
// //         className={styles.input}
// //         placeholder="Officer name / badge ID (required to approve/reject)"
// //         value={decidedBy}
// //         onChange={(e) => setDecidedBy(e.target.value)}
// //         style={{ marginBottom: 12 }}
// //       />
// //       {err && <p className={styles.actionError}>{err}</p>}

// //       {pending.length ? (
// //         <div className={styles.recList}>
// //           {pending.map((rec) => {
// //             const urgency = URGENCY_META[rec.urgency] || URGENCY_META.low
// //             return (
// //               <div key={`${rec.id}-${rec.action}-${rec.urgency}`} className={styles.recCard}>
// //                 <div className={styles.recHead}>
// //                   <p className={styles.recAction}>{rec.action.toUpperCase()}</p>
// //                   <span className={styles.urgencyBadge} style={{ color: urgency.color }}>{urgency.label}</span>
// //                 </div>
// //                 <p className={styles.recWhy}><strong>Why:</strong> {rec.why}</p>
// //                 {rec.supportingEvidence?.length > 0 && (
// //                   <p className={styles.recEvidence}><strong>Supporting evidence:</strong> {rec.supportingEvidence.join(', ')}</p>
// //                 )}
// //                 <div className={styles.recActions}>
// //                   <button type="button" className={styles.secondaryBtn} disabled={busyId === rec.id} onClick={() => decide(rec, 'rejected')}>
// //                     <XCircleIcon width={14} height={14} /> Reject
// //                   </button>
// //                   <button type="button" className={styles.primaryBtn} disabled={busyId === rec.id} onClick={() => decide(rec, 'approved')}>
// //                     <CheckIcon width={14} height={14} /> {busyId === rec.id ? 'Saving…' : 'Approve'}
// //                   </button>
// //                 </div>
// //                 {rec.requestType && (
// //                   <p className={styles.metaText}>Approving generates a draft {rec.requestType} legal request — it still needs separate approval &amp; dispatch below.</p>
// //                 )}
// //               </div>
// //             )
// //           })}
// //         </div>
// //       ) : (
// //         <p className={styles.empty}>No pending recommendations — every AI-suggested action has been reviewed.</p>
// //       )}
// //     </section>
// //   )
// // }

// // // =========================================================
// // // 9. GEOGRAPHIC INTELLIGENCE
// // // =========================================================

// // function GeoIntelligencePanel({ latest }) {
// //   const located = (latest?.entities || []).filter((e) => e.lat != null && e.lng != null)

// //   const markers = located.map((e, i) => ({
// //     id: `${e.type}-${i}`,
// //     label: e.type.replace(/_/g, ' '),
// //     lat: e.lat,
// //     lng: e.lng,
// //     type: e.type,
// //     detail: e.geocodedDisplayName || e.value,
// //   }))

// //   return (
// //     <section className={styles.section}>
// //       <h3 className={styles.sectionTitle}><MapPinIcon width={15} height={15} /> Geographic Intelligence</h3>
// //       {located.length ? (
// //         <div className={styles.geoLayout}>
// //           <LocationMap markers={markers} />
// //           <ul className={styles.geoList}>
// //             {located.map((e, i) => (
// //               <li key={i} className={styles.geoItem}>
// //                 <span className={styles.geoDot} />
// //                 <div>
// //                   <p className={styles.geoLabel}>{e.type.replace(/_/g, ' ')} <span className={styles.metaText}>· {e.value}</span></p>
// //                   <p className={styles.metaText}>{e.geocodedDisplayName || `${e.lat.toFixed(4)}, ${e.lng.toFixed(4)}`}</p>
// //                 </div>
// //               </li>
// //             ))}
// //           </ul>
// //         </div>
// //       ) : (
// //         <p className={styles.empty}>No geographic intelligence available for this case yet. Addresses mentioned in the complaint, or recorded from bank/telecom legal responses (KYC address, tower location), are geocoded automatically once the AI (re-)investigates the case.</p>
// //       )}
// //     </section>
// //   )
// // }

// // // =========================================================
// // // 7. EVIDENCE INTELLIGENCE
// // // =========================================================

// // function EvidenceIntelligencePanel({ caseDoc, latest }) {
// //   return (
// //     <section className={styles.section}>
// //       <h3 className={styles.sectionTitle}>Evidence Intelligence</h3>

// //       {latest?.findings?.length > 0 && (
// //         <div className={styles.findingsList}>
// //           {latest.findings.map((f, i) => (
// //             <div key={i} className={styles.findingCard}>
// //               <p className={styles.findingText}>{f.text}</p>
// //               {f.supportingEvidence?.length > 0 && (
// //                 <p className={styles.findingSupport}>
// //                   Supported by: {f.supportingEvidence.map((s, i) => <span key={`${s}-${i}`} className={styles.entityChip} style={{ marginRight: 6 }}>{s}</span>)}
// //                 </p>
// //               )}
// //             </div>
// //           ))}
// //         </div>
// //       )}

// //       <p className={styles.subHead}>Uploaded Evidence ({(caseDoc.evidence || []).length + (caseDoc.evidenceFiles || []).length})</p>
// //       <div className={styles.evidenceList}>
// //         {(caseDoc.evidence || []).map((ev) => {
// //           const Icon = EVIDENCE_ICON[ev.source_type] || FileTextIcon
// //           return (
// //             <div key={ev.complaint_id} className={styles.evidenceCard}>
// //               <div className={styles.evidenceHead}>
// //                 <span className={styles.evidenceType}><Icon width={14} height={14} /> {ev.source_type}</span>
// //                 <span className={styles.complaintId}>{ev.complaint_id}</span>
// //               </div>
// //               <p className={styles.rawText}>{ev.raw_text}</p>
// //             </div>
// //           )
// //         })}
// //         {(caseDoc.evidenceFiles || []).map((ef) => (
// //           <div key={ef._id} className={styles.evidenceCard}>
// //             <div className={styles.evidenceHead}>
// //               <span className={styles.evidenceType}><FileTextIcon width={14} height={14} /> file</span>
// //               <span className={styles.complaintId}>{ef.path?.split('/').pop()}</span>
// //             </div>
// //             <p className={styles.rawText}>SHA-256: {ef.hash}</p>
// //           </div>
// //         ))}
// //         {!(caseDoc.evidence || []).length && !(caseDoc.evidenceFiles || []).length && (
// //           <p className={styles.empty}>No evidence uploaded yet.</p>
// //         )}
// //       </div>
// //     </section>
// //   )
// // }

// // // =========================================================
// // // 10. LEGAL INTELLIGENCE
// // // =========================================================

// // function LegalIntelligencePanel({ caseId, caseDoc, onChanged, readOnly }) {
// //   const requests = caseDoc.requests || []
// //   const latest = (caseDoc.investigationVersions || []).slice(-1)[0]

// //   return (
// //     <section className={styles.section}>
// //       <h3 className={styles.sectionTitle}><ScaleIcon width={15} height={15} /> Legal Intelligence</h3>

// //       {latest?.legalSections?.length > 0 ? (
// //         <div className={styles.legalSections}>
// //           <p className={styles.subHead}>Relevant legal sections (AI-matched)</p>
// //           {latest.legalSections.map((s) => (
// //             <div key={s.id} className={styles.legalSectionCard}>
// //               <p className={styles.legalCitation}>{s.citation}</p>
// //               <p className={styles.legalSummary}>{s.summary}</p>
// //             </div>
// //           ))}
// //         </div>
// //       ) : (
// //         <p className={styles.empty}>No legal sections matched by analysis yet.</p>
// //       )}

// //       <p className={styles.subHead}>Legal Requests ({requests.length})</p>
// //       {requests.length ? (
// //         <div className={styles.requestList}>
// //           {requests.map((req) => (
// //             <LegalRequestCard key={req.requestId} caseId={caseId} req={req} onChanged={onChanged} readOnly={readOnly} />
// //           ))}
// //         </div>
// //       ) : (
// //         <p className={styles.empty}>No legal requests generated yet. Approve a Next Best Action above to generate one.</p>
// //       )}
// //     </section>
// //   )
// // }

// // function LegalRequestCard({ caseId, req, onChanged, readOnly }) {
// //   const [expanded, setExpanded] = useState(false)
// //   const [busy, setBusy] = useState(false)
// //   const [err, setErr] = useState(null)
// //   const [actor, setActor] = useState('')
// //   const [providerEmail, setProviderEmail] = useState('')
// //   const [responseData, setResponseData] = useState({ accountHolder: '', kycPhone: '', kycAddress: '', deviceId: '', ipAddress: '' })

// //   const STATUS_COLOR = {
// //     draft: 'var(--text-tertiary)', approved: 'var(--accent)', sent: 'var(--warning)',
// //     overdue: 'var(--danger)', completed: 'var(--success)', rejected: 'var(--danger)',
// //   }

// //   const run = async (fn) => {
// //     setBusy(true); setErr(null)
// //     try { await fn(); await onChanged() }
// //     catch (e) { setErr(e.response?.data?.message || 'Action failed.') }
// //     finally { setBusy(false) }
// //   }

// //   return (
// //     <div className={styles.requestCard}>
// //       <div className={styles.requestHead} onClick={() => setExpanded((v) => !v)}>
// //         <div>
// //           <p className={styles.requestType}>{req.requestType} — {req.requestId}</p>
// //           {req.deadline && <p className={styles.metaText}>SLA deadline: {fmtDate(req.deadline)}</p>}
// //         </div>
// //         <span className={styles.requestStatus} style={{ color: STATUS_COLOR[req.status] }}>{req.status.toUpperCase()}</span>
// //       </div>

// //       {expanded && (
// //         <div className={styles.requestBody}>
// //           {err && <p className={styles.actionError}>{err}</p>}

// //           {req.previewUrl && (
// //             <a href={req.previewUrl} target="_blank" rel="noreferrer" style={{ color: '#5b9df9' }}>
// //               View mock email preview
// //             </a>
// //           )}
// //           {req.delivered && !req.previewUrl && (
// //             <span style={{ color: '#39d98a', fontWeight: 600 }}>✓ Delivered to inbox</span>
// //           )}

// //           <input className={styles.input} placeholder="Officer name / badge ID" value={actor} onChange={(e) => setActor(e.target.value)} />

// //           {readOnly && (
// //             <p className={styles.metaText}>This case is closed — legal request actions are no longer available.</p>
// //           )}

// //           {!readOnly && req.status === 'draft' && (
// //             <button type="button" className={styles.primaryBtn} disabled={busy || !actor.trim()}
// //               onClick={() => run(() => apiBackend.post(`/cases/${caseId}/request/${req.requestId}/approve`, { approvedBy: actor }))}>
// //               Approve Request
// //             </button>
// //           )}

// //           {!readOnly && req.status === 'approved' && (
// //             <>
// //               <input className={styles.input} placeholder="Provider email" value={providerEmail} onChange={(e) => setProviderEmail(e.target.value)} />
// //               <button type="button" className={styles.primaryBtn} disabled={busy || !providerEmail.trim()}
// //                 onClick={() => run(() => apiBackend.post(`/cases/${caseId}/request/${req.requestId}/dispatch`, { providerEmail }))}>
// //                 Dispatch Request
// //               </button>
// //             </>
// //           )}

// //           {!readOnly && (req.status === 'sent' || req.status === 'overdue') && (
// //             <div className={styles.responseForm}>
// //               <p className={styles.subHead}>Record provider response</p>
// //               {req.requestType === 'bank' ? (
// //                 <>
// //                   <input className={styles.input} placeholder="Account holder name" value={responseData.accountHolder} onChange={(e) => setResponseData({ ...responseData, accountHolder: e.target.value })} />
// //                   <input className={styles.input} placeholder="KYC phone" value={responseData.kycPhone} onChange={(e) => setResponseData({ ...responseData, kycPhone: e.target.value })} />
// //                   <input className={styles.input} placeholder="KYC address" value={responseData.kycAddress} onChange={(e) => setResponseData({ ...responseData, kycAddress: e.target.value })} />
// //                 </>
// //               ) : (
// //                 <>
// //                   <input className={styles.input} placeholder="Device ID" value={responseData.deviceId} onChange={(e) => setResponseData({ ...responseData, deviceId: e.target.value })} />
// //                   <input className={styles.input} placeholder="IP address" value={responseData.ipAddress} onChange={(e) => setResponseData({ ...responseData, ipAddress: e.target.value })} />
// //                 </>
// //               )}
// //               <button type="button" className={styles.primaryBtn} disabled={busy || !actor.trim()}
// //                 onClick={() => run(() => apiBackend.post(`/cases/${caseId}/request/${req.requestId}/response`, { recordedBy: actor, data: responseData }))}>
// //                 {busy ? 'Saving…' : 'Record Response & Re-investigate'}
// //               </button>
// //             </div>
// //           )}

// //           {req.status === 'completed' && req.response && (
// //             <div className={styles.rawText}>
// //               Recorded by {req.response.recordedBy} on {fmtDate(req.response.receivedAt)}.
// //             </div>
// //           )}
// //         </div>
// //       )}
// //     </div>
// //   )
// // }

// // // =========================================================
// // // 11. INVESTIGATION TIMELINE
// // // =========================================================

// // const AI_ACTIONS = new Set(['AI_INVESTIGATION_COMPLETED', 'RECOMMENDATION_APPROVED', 'RECOMMENDATION_REJECTED'])
// // const TIMELINE_STEP_WIDTH = 148 // keep in sync with .timelineStep flex-basis in the CSS
// // const TIMELINE_VISIBLE_STEPS = 8 // how many steps to show at once, per the target design
// // const TIMELINE_DOT_CENTER_OFFSET = TIMELINE_STEP_WIDTH / 2 // horizontal center of a step, for the connecting line

// // function titleCaseAction(action) {
// //   return action
// //     .toLowerCase()
// //     .split('_')
// //     .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
// //     .join(' ')
// // }

// // // Colors each step by what actually happened, not just its position in the list.
// // function timelineStepColor(action) {
// //   const a = (action || '').toUpperCase()
// //   if (a.includes('REJECTED') || a.includes('OVERDUE') || a.includes('FAILED')) return 'var(--danger)'
// //   if (a.includes('PENDING') || a.includes('IN_PROGRESS') || a.includes('FOR_REVIEW') || a.includes('AWAITING') || a.includes('APPROVAL')) return 'var(--warning)'
// //   return 'var(--success)' // completed / approved / received / generated / extracted / identified etc.
// // }

// // function TimelinePanel({ timeline }) {
// //   const trackRef = useRef(null)
// //   const [dragging, setDragging] = useState(false)
// //   const drag = useRef({ startX: 0, startScroll: 0, moved: false })

// //   // Only the latest TIMELINE_VISIBLE_STEPS steps are shown, oldest first,
// //   // newest on the right -- matching the reference design.
// //   const visible = timeline.slice(-TIMELINE_VISIBLE_STEPS)

// //   // Land on the latest (rightmost) step whenever the timeline loads or grows.
// //   useEffect(() => {
// //     const el = trackRef.current
// //     if (!el) return
// //     el.scrollTo({ left: el.scrollWidth, behavior: 'auto' })
// //   }, [visible.length])

// //   const scrollByStep = (dir) => {
// //     trackRef.current?.scrollBy({ left: dir * TIMELINE_STEP_WIDTH * 3, behavior: 'smooth' })
// //   }
// //   const scrollToLatest = () => {
// //     const el = trackRef.current
// //     if (!el) return
// //     el.scrollTo({ left: el.scrollWidth, behavior: 'smooth' })
// //   }

// //   // Click-drag to scroll on desktop/trackpad; touch already swipes natively.
// //   const onMouseDown = (e) => {
// //     const el = trackRef.current
// //     if (!el) return
// //     drag.current = { startX: e.pageX, startScroll: el.scrollLeft, moved: false }
// //     setDragging(true)
// //   }
// //   const onMouseMove = (e) => {
// //     if (!dragging) return
// //     const el = trackRef.current
// //     if (!el) return
// //     drag.current.moved = true
// //     el.scrollLeft = drag.current.startScroll - (e.pageX - drag.current.startX)
// //   }
// //   const endDrag = () => setDragging(false)

// //   return (
// //     <section className={styles.section}>
// //       <div className={styles.timelineHeadRow}>
// //         <span className={styles.timelineHeadIcon}>
// //           <HistoryIcon width={17} height={17} />
// //         </span>
// //         <div style={{ flex: 1 }}>
// //           <h3 className={styles.sectionTitle} style={{ margin: 0 }}>Investigation Timeline</h3>
// //           {timeline.length > 0 && (
// //             <p className={styles.metaText}>
// //               Latest {Math.min(timeline.length, TIMELINE_VISIBLE_STEPS)} updates from your investigation
// //             </p>
// //           )}
// //         </div>
// //         {timeline.length > 0 && (
// //           <div style={{ display: 'flex', gap: 8 }}>
// //             <button
// //               type="button"
// //               className={styles.secondaryBtn}
// //               style={{ width: 32, height: 32, padding: 0, borderRadius: '50%', justifyContent: 'center' }}
// //               onClick={() => scrollByStep(-1)}
// //               aria-label="Scroll to earlier updates"
// //             >
// //               <ChevronRightIcon width={13} height={13} style={{ transform: 'rotate(180deg)' }} />
// //             </button>
// //             <button
// //               type="button"
// //               className={styles.secondaryBtn}
// //               style={{ width: 32, height: 32, padding: 0, borderRadius: '50%', justifyContent: 'center' }}
// //               onClick={() => scrollByStep(1)}
// //               aria-label="Scroll to later updates"
// //             >
// //               <ChevronRightIcon width={13} height={13} />
// //             </button>
// //             <button
// //               type="button"
// //               className={styles.secondaryBtn}
// //               style={{ borderColor: 'var(--accent)', color: 'var(--accent)' }}
// //               onClick={scrollToLatest}
// //             >
// //               <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--accent)', display: 'inline-block' }} />
// //               Latest
// //             </button>
// //           </div>
// //         )}
// //       </div>

// //       {visible.length ? (
// //         <>
// //           <div
// //             ref={trackRef}
// //             className={`${styles.timelineTrackWrap} ${dragging ? styles.dragging : ''}`}
// //             onMouseDown={onMouseDown}
// //             onMouseMove={onMouseMove}
// //             onMouseUp={endDrag}
// //             onMouseLeave={endDrag}
// //             tabIndex={0}
// //           >
// //             <div className={styles.timelineTrack}>
// //               {visible.length > 1 && (
// //                 <div
// //                   className={styles.timelineLine}
// //                   style={{
// //                     left: TIMELINE_DOT_CENTER_OFFSET,
// //                     width: (visible.length - 1) * TIMELINE_STEP_WIDTH,
// //                     right: 'auto',
// //                   }}
// //                 />
// //               )}
// //               {visible.map((t, i) => {
// //                 const isCurrent = i === visible.length - 1
// //                 const color = timelineStepColor(t.action)
// //                 return (
// //                   <div key={t.sequence ?? i} className={styles.timelineStep}>
// //                     {isCurrent && <span className={styles.timelineLatestTag}>LATEST</span>}
// //                     {isCurrent ? (
// //                       <span className={styles.timelineNodeCurrent} style={{ borderColor: color }}>
// //                         <span className={styles.timelineNodeCurrentInner} style={{ background: color }} />
// //                       </span>
// //                     ) : (
// //                       <span className={styles.timelineNodeDone} style={{ background: color, boxShadow: `0 0 0 1px ${color}` }}>
// //                         <CheckIcon width={10} height={10} color="var(--card)" />
// //                       </span>
// //                     )}
// //                     <p className={`${styles.timelineStepLabel} ${isCurrent ? styles.timelineStepLabelCurrent : ''}`} style={isCurrent ? { color } : undefined}>
// //                       {AI_ACTIONS.has(t.action) && <SparklesIcon width={10} height={10} />}
// //                       {titleCaseAction(t.action)}
// //                     </p>
// //                     <p className={styles.timelineStepTime}>{fmtDate(t.timestamp)}</p>
// //                   </div>
// //                 )
// //               })}
// //             </div>
// //           </div>
// //           <p className={styles.timelineFooterNote}>
// //             Showing latest {visible.length} update{visible.length === 1 ? '' : 's'}. New updates appear on the right — swipe or use the arrows to see earlier ones.
// //           </p>
// //         </>
// //       ) : (
// //         <p className={styles.empty}>No timeline events recorded yet.</p>
// //       )}
// //     </section>
// //   )
// // }

// // // =========================================================
// // // 12. SIMILAR CASES
// // // =========================================================

// // function SimilarCasesPanel({ similarCases }) {
// //   return (
// //     <section className={styles.section}>
// //       <h3 className={styles.sectionTitle}><LinkIcon width={15} height={15} /> Similar Cases</h3>
// //       {similarCases.status === 'loading' && <p className={styles.empty}>Looking for similar cases…</p>}
// //       {similarCases.status === 'error' && <p className={styles.empty}>Similar-case analysis is unavailable right now.</p>}
// //       {similarCases.status === 'ok' && (
// //         similarCases.data.length ? (
// //           <div className={styles.similarList}>
// //             {similarCases.data.map((c) => (
// //               <Link key={c.caseId} to={`/cases/${c.caseId}`} className={styles.similarCard}>
// //                 <p className={styles.similarTitle}>{c.caseId} — {c.title || 'Untitled Case'}</p>
// //                 <p className={styles.metaText}>{fmtPct(c.similarity)} similarity{c.sharedEntityTypes?.length ? ` · shared: ${c.sharedEntityTypes.join(', ').toLowerCase()}` : ''}</p>
// //               </Link>
// //             ))}
// //           </div>
// //         ) : <p className={styles.empty}>No similar cases found.</p>
// //       )}
// //     </section>
// //   )
// // }

// // // =========================================================
// // // 13. AI INVESTIGATION HISTORY
// // // =========================================================

// // function HistoryPanel({ versions }) {
// //   if (!versions.length) {
// //     return (
// //       <section className={styles.section}>
// //         <h3 className={styles.sectionTitle}><HistoryIcon width={15} height={15} /> AI Investigation History</h3>
// //         <p className={styles.empty}>No previous investigation.</p>
// //       </section>
// //     )
// //   }

// //   return (
// //     <section className={styles.section}>
// //       <h3 className={styles.sectionTitle}><HistoryIcon width={15} height={15} /> AI Investigation History</h3>
// //       <div className={styles.historyList}>
// //         {[...versions].reverse().map((v, i) => (
// //           <div key={`${v.version}-${i}`} className={styles.historyItem}>
// //             <div className={styles.historyDot} />
// //             <div>
// //               <p className={styles.historyTitle}>
// //                 v{v.version} — {TRIGGER_LABEL[v.trigger] || v.trigger}
// //                 {i === 0 && <span className={styles.currentBadge}>CURRENT</span>}
// //               </p>
// //               <p className={styles.metaText}>{fmtDate(v.createdAt)}</p>
// //               <p className={styles.metaText}>
// //                 Risk: {v.risk || 'n/a'} · Confidence: {fmtPct(v.confidence) || 'n/a'} · {v.findings.length} finding(s) · {v.recommendations.length} recommendation(s)
// //               </p>
// //             </div>
// //           </div>
// //         ))}
// //       </div>
// //     </section>
// //   )
// // }

// import { useAuth } from '../context/AuthContext'
// import { useCallback, useEffect, useRef, useState } from 'react'
// import { motion } from 'framer-motion'
// import { useParams, useNavigate, Link } from 'react-router-dom'
// import { apiBackend, apiBrain } from '../api/api'
// import {
//   FileTextIcon, ImageIcon, AudioIcon, SparklesIcon, ChevronRightIcon,
//   AlertTriangleIcon, TrendUpIcon, TrendDownIcon,
//   HelpCircleIcon, MapPinIcon, ScaleIcon, HistoryIcon, RefreshIcon,
//   CheckIcon, XCircleIcon, LinkIcon, UploadCloudIcon, LockIcon,
// } from '../components/Icons/Icons'
// import EntityGraph from '../components/CaseIntelligence/EntityGraph'
// import LocationMap from '../components/CaseIntelligence/LocationMap'
// import EyeLoader from '../components/EyeLoader/EyeLoader'
// import styles from './CaseDetails.module.css'

// const EVIDENCE_ICON = { pdf: FileTextIcon, image: ImageIcon, audio: AudioIcon, text: FileTextIcon }

// const STATUS_LABEL = {
//   pending_analysis: 'Pending',
//   pending_action: 'Pending',
//   under_investigation: 'Under Investigation',
//   investigation_approved: 'Investigation Approved',
//   open: 'Under Investigation',
//   resolved: 'Resolved',
//   closed: 'Resolved',
// }

// const RISK_META = {
//   low: { label: 'Low', color: 'var(--success)', bg: 'var(--success-soft)' },
//   medium: { label: 'Medium', color: 'var(--warning)', bg: 'var(--warning-soft)' },
//   high: { label: 'High', color: 'var(--danger)', bg: 'var(--danger-soft)' },
//   critical: { label: 'Critical', color: 'var(--danger)', bg: 'var(--danger-soft)' },
// }

// const URGENCY_META = {
//   high: { label: 'HIGH', color: 'var(--danger)' },
//   medium: { label: 'MEDIUM', color: 'var(--warning)' },
//   low: { label: 'LOW', color: 'var(--text-tertiary)' },
// }

// const TRIGGER_LABEL = {
//   initial_complaint: 'Initial complaint',
//   evidence_added: 'Evidence added',
//   legal_response_received: 'Legal response received',
//   entity_added: 'Entity added',
//   manual_reinvestigation: 'Manual re-investigation',
// }

// function getCurrentOfficerName() {
//   try {
//     const raw = localStorage.getItem('profile')
//     if (!raw) {
//       console.warn('[officer-autofill] no "profile" key in localStorage')
//       return ''
//     }
//     const parsed = JSON.parse(raw)
//     console.log('[officer-autofill] parsed profile:', parsed)
//     if (!parsed?.name) {
//       console.warn('[officer-autofill] profile has no .name field:', parsed)
//     }
//     return parsed?.name || ''
//   } catch (e) {
//     console.error('[officer-autofill] failed to read/parse profile from localStorage', e)
//     return ''
//   }
// }

// function fmtPct(n) {
//   return n == null ? null : `${Math.round(n * 100)}%`
// }

// function fmtDate(d) {
//   if (!d) return ''
//   return new Date(d).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })
// }

// export default function CaseDetails() {
//   const { caseId } = useParams()
//   const navigate = useNavigate()

//   const [caseDoc, setCaseDoc] = useState(null)
//   const [isInvestigator, setIsInvestigator] = useState(true)
//   const [isArchivedView, setIsArchivedView] = useState(false)
//   const [requestStatus, setRequestStatus] = useState(null)
//   const [timeline, setTimeline] = useState([])
//   const [similarCases, setSimilarCases] = useState({ status: 'loading', data: [] })
//   const [error, setError] = useState(null)
//   const [loading, setLoading] = useState(true)
//   const [loadingStartedAt] = useState(() => Date.now())
//   const [reinvestigating, setReinvestigating] = useState(false)
//   const [actionError, setActionError] = useState(null)
//   const [compareVersion, setCompareVersion] = useState(null)
//   const [requesting, setRequesting] = useState(false)
//   const [showCompleteModal, setShowCompleteModal] = useState(false)

//   const loadCase = useCallback(() => {
//     return apiBackend.get(`/cases/${caseId}`).then((res) => {
//       setCaseDoc(res.data.case)
//       setIsInvestigator(res.data.isInvestigator !== false)
//       setIsArchivedView(!!res.data.isArchivedView)
//       setRequestStatus(res.data.myAccessRequestStatus ?? null)
//     })
//   }, [caseId])

//   useEffect(() => {
//     setLoading(true)
//     setError(null)
//     loadCase()
//       .catch((err) => setError(err.response?.data?.message || 'Failed to load this case.'))
//       .finally(() => {
//         const elapsed = Date.now() - loadingStartedAt
//         const remaining = Math.max(0, 1200 - elapsed)
//         window.setTimeout(() => setLoading(false), remaining)
//       })
//   }, [caseId, loadCase])

//   const canViewFullCase = isInvestigator || isArchivedView

//   useEffect(() => {
//     if (!canViewFullCase) return
//     apiBackend.get(`/cases/${caseId}/timeline`).then((res) => setTimeline(res.data.timeline || [])).catch(() => setTimeline([]))
//   }, [caseId, canViewFullCase])

//   useEffect(() => {
//     if (!canViewFullCase) return
//     setSimilarCases({ status: 'loading', data: [] })
//     apiBrain
//       .get(`/api/case/${caseId}/similar`)
//       .then((res) => setSimilarCases({ status: 'ok', data: res.data.similarCases || [] }))
//       .catch(() => setSimilarCases({ status: 'error', data: [] }))
//   }, [caseId, canViewFullCase])

//   const handleRequestAccess = async () => {
//     setRequesting(true)
//     try {
//       await apiBackend.post(`/cases/${caseId}/access-request`)
//       setRequestStatus('pending')
//     } catch (err) {
//       setActionError(err.response?.data?.message || 'Could not send the access request.')
//     } finally {
//       setRequesting(false)
//     }
//   }

//   const versions = caseDoc?.investigationVersions || []
//   const latest = versions.length ? versions[versions.length - 1] : null
//   const previous = versions.length > 1 ? versions[versions.length - 2] : null

//   const handleReinvestigate = async () => {
//     setReinvestigating(true)
//     setActionError(null)
//     try {
//       await apiBackend.post(`/cases/${caseId}/reinvestigate`)
//       await loadCase()
//     } catch (err) {
//       setActionError(err.response?.data?.message || err.response?.data?.error || 'Re-investigation failed.')
//     } finally {
//       setReinvestigating(false)
//     }
//   }

//   if (loading) return <EyeLoader label="Loading investigation…" />
//   if (error) return <p className={styles.stateError}>{error}</p>
//   if (!caseDoc) return null

//   if (!isInvestigator && !isArchivedView) {
//     const risk = caseDoc.severity ? RISK_META[caseDoc.severity] : null
//     return (
//       <motion.div
//         className={styles.wrap}
//         initial={{ opacity: 0, y: 8 }}
//         animate={{ opacity: 1, y: 0 }}
//         transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
//       >
//         <div className={styles.header}>
//           <div>
//             <p className={styles.caseId}>{caseDoc.case_id}</p>
//             <h2 className={styles.title}>{caseDoc.title || 'Untitled Case'}</h2>
//             <div className={styles.headerMeta}>
//               <span className={styles.statusBadge}>{STATUS_LABEL[caseDoc.status] || caseDoc.status}</span>
//               {risk && (
//                 <span className={styles.riskBadge} style={{ color: risk.color, background: risk.bg }}>
//                   {risk.label} risk
//                 </span>
//               )}
//             </div>
//           </div>
//         </div>

//         <section className={styles.section} style={{ textAlign: 'center', padding: '48px 20px' }}>
//           <LockIcon width={28} height={28} style={{ opacity: 0.6, marginBottom: 12 }} />
//           <p className={styles.title} style={{ fontSize: 16 }}>You don't have access to this case</p>
//           <p className={styles.empty} style={{ marginBottom: 18 }}>
//             Request access from the lead investigator to view evidence, findings, and the full case record.
//           </p>
//           {actionError && <p className={styles.actionError} style={{ marginBottom: 12 }}>{actionError}</p>}
//           {requestStatus === 'pending' ? (
//             <span className={styles.statusBadge}>Access Requested</span>
//           ) : requestStatus === 'rejected' ? (
//             <span className={styles.statusBadge} style={{ color: 'var(--danger)', background: 'var(--danger-soft)' }}>
//               Access Rejected
//             </span>
//           ) : (
//             <button type="button" className={styles.secondaryBtn} disabled={requesting} onClick={handleRequestAccess}>
//               {requesting ? 'Requesting…' : 'Request Access'}
//             </button>
//           )}
//         </section>

//         <button type="button" className={styles.backBtn} onClick={() => navigate('/')}>
//           ← Back to Dashboard
//         </button>
//       </motion.div>
//     )
//   }

//   return (
//     <motion.div
//       className={styles.wrap}
//       initial={{ opacity: 0, y: 8 }}
//       animate={{ opacity: 1, y: 0 }}
//       transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
//     >
//       <CaseHeader
//         caseDoc={caseDoc}
//         latest={latest}
//         isInvestigator={isInvestigator}
//         isArchivedView={isArchivedView}
//         onAddEvidence={() => navigate(`/new-case?case_id=${caseDoc.case_id}`)}
//         onReinvestigate={handleReinvestigate}
//         reinvestigating={reinvestigating}
//         onMarkComplete={() => setShowCompleteModal(true)}
//       />

//       {actionError && <p className={styles.actionError}>{actionError}</p>}

//       {caseDoc.isCompleted && caseDoc.resolution && (
//         <ResolutionPanel resolution={caseDoc.resolution} />
//       )}

//       {showCompleteModal && (
//         <CompleteCaseModal
//           caseId={caseId}
//           onClose={() => setShowCompleteModal(false)}
//           onCompleted={async () => {
//             setShowCompleteModal(false)
//             await loadCase()
//           }}
//         />
//       )}

//       <CaseIntelligencePanel caseDoc={caseDoc} latest={latest} previous={previous} />

//       <WhatChangedPanel latest={latest} versions={versions} />

//       <GapsPanel latest={latest} />

//       <NextBestActionPanel
//         caseId={caseId}
//         latest={latest}
//         requests={caseDoc.requests || []}
//         onChanged={loadCase}
//         readOnly={caseDoc.isCompleted}
//       />

//       <section className={styles.section}>
//         <h3 className={styles.sectionTitle}>Entity &amp; Relationship Graph</h3>
//         <EntityGraph entities={latest?.entities || []} relationships={latest?.relationships || []} />
//       </section>

//       <GeoIntelligencePanel latest={latest} />

//       <EvidenceIntelligencePanel caseDoc={caseDoc} latest={latest} />

//       <LegalIntelligencePanel caseId={caseId} caseDoc={caseDoc} onChanged={loadCase} readOnly={caseDoc.isCompleted} />

//       <TimelinePanel timeline={timeline} />

//       <SimilarCasesPanel similarCases={similarCases} />

//       <HistoryPanel versions={versions} compareVersion={compareVersion} setCompareVersion={setCompareVersion} />

//       <Link to={`/cases/${caseId}/investigation`} className={styles.aiLink}>
//         <SparklesIcon width={16} height={16} />
//         <span>Open detailed step / legal-section approval view</span>
//         <ChevronRightIcon width={16} height={16} />
//       </Link>

//       <button type="button" className={styles.backBtn} onClick={() => navigate('/')}>
//         ← Back to Dashboard
//       </button>
//     </motion.div>
//   )
// }

// // =========================================================
// // 1. CASE HEADER
// // =========================================================

// function CaseHeader({ caseDoc, latest, isInvestigator, isArchivedView, onAddEvidence, onReinvestigate, reinvestigating, onMarkComplete }) {
//   const risk = latest?.risk ? RISK_META[latest.risk] : null
//   const isCompleted = !!caseDoc.isCompleted
//   // Archived viewers, and any case that's already been marked complete,
//   // are read-only -- no evidence uploads, re-investigation, or closing
//   // it a second time.
//   const canEdit = isInvestigator && !isArchivedView && !isCompleted

//   return (
//     <div className={styles.header}>
//       <div>
//         <p className={styles.caseId}>{caseDoc.case_id}</p>
//         <h2 className={styles.title}>{caseDoc.title || 'Untitled Case'}</h2>
//         <div className={styles.headerMeta}>
//           <span className={styles.statusBadge}>
//             {isCompleted ? 'Case Completed' : STATUS_LABEL[caseDoc.status] || caseDoc.status}
//           </span>
//           {risk && (
//             <span className={styles.riskBadge} style={{ color: risk.color, background: risk.bg }}>
//               {risk.label} risk
//             </span>
//           )}
//           <span className={styles.metaText}>Updated {fmtDate(caseDoc.updatedAt)}</span>
//           {isArchivedView && <span className={styles.metaText}>· Viewing from Cases Archive (read-only)</span>}
//         </div>
//       </div>
//       {canEdit && (
//         <div className={styles.headerActions}>
//           <button type="button" className={styles.secondaryBtn} onClick={onAddEvidence}>
//             <UploadCloudIcon width={14} height={14} /> Add Evidence
//           </button>
//           <button type="button" className={styles.primaryBtn} onClick={onReinvestigate} disabled={reinvestigating}>
//             <RefreshIcon width={14} height={14} /> {reinvestigating ? 'Re-investigating…' : 'Re-investigate'}
//           </button>
//           <button type="button" className={styles.secondaryBtn} onClick={onMarkComplete}>
//             <CheckIcon width={14} height={14} /> Mark Case Complete
//           </button>
//         </div>
//       )}
//     </div>
//   )
// }

// // =========================================================
// // 1b. CASE RESOLUTION (shown once the case is marked complete)
// // =========================================================

// const OUTCOME_LABEL = {
//   culprit_identified: 'Culprit Identified',
//   culprit_arrested: 'Culprit Arrested',
//   money_recovered: 'Money Recovered',
//   false_complaint: 'False Complaint',
//   withdrawn_by_complainant: 'Withdrawn by Complainant',
//   unable_to_resolve: 'Unable to Resolve',
//   other: 'Other',
// }

// function ResolutionPanel({ resolution }) {
//   return (
//     <section className={styles.section} style={{ borderColor: 'var(--success)' }}>
//       <h3 className={styles.sectionTitle}><CheckIcon width={15} height={15} color="var(--success)" /> Case Resolution</h3>

//       <div className={styles.intelGrid}>
//         <div className={styles.intelStat}>
//           <p className={styles.intelLabel}>Outcome</p>
//           <p className={styles.intelValue}>{OUTCOME_LABEL[resolution.outcome] || resolution.outcome}</p>
//         </div>
//         {resolution.amountRecovered != null && (
//           <div className={styles.intelStat}>
//             <p className={styles.intelLabel}>Amount recovered</p>
//             <p className={styles.intelValue}>₹{Number(resolution.amountRecovered).toLocaleString('en-IN')}</p>
//           </div>
//         )}
//         <div className={styles.intelStat}>
//           <p className={styles.intelLabel}>Closed by</p>
//           <p className={styles.intelValue}>{resolution.closedBy}</p>
//         </div>
//         <div className={styles.intelStat}>
//           <p className={styles.intelLabel}>Closed on</p>
//           <p className={styles.intelValue}>{fmtDate(resolution.closedAt)}</p>
//         </div>
//       </div>

//       <div className={styles.assessmentBox}>
//         <p className={styles.assessmentLabel}>How the case concluded</p>
//         <p className={styles.assessmentText}>{resolution.summary}</p>
//       </div>

//       {resolution.keyEvidence && (
//         <div className={styles.assessmentBox}>
//           <p className={styles.assessmentLabel}>Key evidence</p>
//           <p className={styles.assessmentText}>{resolution.keyEvidence}</p>
//         </div>
//       )}

//       {resolution.victimOutcome && (
//         <div className={styles.assessmentBox}>
//           <p className={styles.assessmentLabel}>What happened to the victim</p>
//           <p className={styles.assessmentText}>{resolution.victimOutcome}</p>
//         </div>
//       )}

//       {resolution.actionsTaken && (
//         <div className={styles.assessmentBox}>
//           <p className={styles.assessmentLabel}>Actions taken</p>
//           <p className={styles.assessmentText}>{resolution.actionsTaken}</p>
//         </div>
//       )}
//     </section>
//   )
// }

// // =========================================================
// // 1c. MARK CASE COMPLETE MODAL
// // =========================================================

// function CompleteCaseModal({ caseId, onClose, onCompleted }) {
//   const [form, setForm] = useState({
//     outcome: 'culprit_identified',
//     summary: '',
//     keyEvidence: '',
//     victimOutcome: '',
//     amountRecovered: '',
//     actionsTaken: '',
//   })
//   const [busy, setBusy] = useState(false)
//   const [err, setErr] = useState(null)

//   const set = (field) => (e) => setForm({ ...form, [field]: e.target.value })

//   const submit = async () => {
//     if (!form.summary.trim()) {
//       setErr('Please describe how the case concluded.')
//       return
//     }
//     setBusy(true)
//     setErr(null)
//     try {
//       await apiBackend.post(`/cases/${caseId}/complete`, form)
//       await onCompleted()
//     } catch (e) {
//       setErr(e.response?.data?.message || 'Failed to mark the case complete.')
//     } finally {
//       setBusy(false)
//     }
//   }

//   return (
//     <div className={styles.modalOverlay} onClick={onClose}>
//       <div className={styles.modalCard} onClick={(e) => e.stopPropagation()}>
//         <h3 className={styles.sectionTitle}>Mark Case Complete</h3>
//         <p className={styles.metaText} style={{ marginBottom: 12 }}>
//           This closes the case for every investigator and adds it to the Cases Archive, visible to all investigators.
//         </p>

//         {err && <p className={styles.actionError}>{err}</p>}

//         <label className={styles.subHead}>Outcome</label>
//         <select className={styles.input} value={form.outcome} onChange={set('outcome')}>
//           {Object.entries(OUTCOME_LABEL).map(([value, label]) => (
//             <option key={value} value={value}>{label}</option>
//           ))}
//         </select>

//         <label className={styles.subHead}>How did it conclude?</label>
//         <textarea
//           className={styles.input}
//           rows={3}
//           placeholder="Summarize how the investigation concluded…"
//           value={form.summary}
//           onChange={set('summary')}
//         />

//         <label className={styles.subHead}>Key evidence</label>
//         <textarea
//           className={styles.input}
//           rows={2}
//           placeholder="What evidence supported this outcome?"
//           value={form.keyEvidence}
//           onChange={set('keyEvidence')}
//         />

//         <label className={styles.subHead}>What happened to the victim?</label>
//         <textarea
//           className={styles.input}
//           rows={2}
//           placeholder="Compensation, recovery, welfare follow-up, etc."
//           value={form.victimOutcome}
//           onChange={set('victimOutcome')}
//         />

//         <label className={styles.subHead}>Amount recovered (optional)</label>
//         <input
//           className={styles.input}
//           type="number"
//           placeholder="₹"
//           value={form.amountRecovered}
//           onChange={set('amountRecovered')}
//         />

//         <label className={styles.subHead}>Actions taken (optional)</label>
//         <textarea
//           className={styles.input}
//           rows={2}
//           placeholder="Arrests made, sections invoked, follow-up steps…"
//           value={form.actionsTaken}
//           onChange={set('actionsTaken')}
//         />

//         <div className={styles.recActions} style={{ marginTop: 8 }}>
//           <button type="button" className={styles.secondaryBtn} onClick={onClose} disabled={busy}>
//             Cancel
//           </button>
//           <button type="button" className={styles.primaryBtn} onClick={submit} disabled={busy}>
//             {busy ? 'Saving…' : 'Mark Complete'}
//           </button>
//         </div>
//       </div>
//     </div>
//   )
// }

// // =========================================================
// // 2. CASE INTELLIGENCE
// // =========================================================

// function CaseIntelligencePanel({ caseDoc, latest, previous }) {
//   if (!latest) {
//     return (
//       <section className={styles.section}>
//         <h3 className={styles.sectionTitle}>Case Intelligence</h3>
//         <p className={styles.empty}>No AI investigation has run yet for this case. Click "Re-investigate" above to run one.</p>
//       </section>
//     )
//   }

//   const risk = RISK_META[latest.risk] || null
//   const order = ['low', 'medium', 'high', 'critical']
//   const riskTrend = previous && previous.risk !== latest.risk
//     ? (order.indexOf(latest.risk) > order.indexOf(previous.risk) ? 'up' : 'down')
//     : null

//   return (
//     <section className={styles.section}>
//       <h3 className={styles.sectionTitle}>Case Intelligence</h3>

//       <div className={styles.intelGrid}>
//         <div className={styles.intelStat}>
//           <p className={styles.intelLabel}>Risk level</p>
//           <p className={styles.intelValueRow}>
//             {risk ? (
//               <span className={styles.riskBadge} style={{ color: risk.color, background: risk.bg }}>{risk.label}</span>
//             ) : <span className={styles.notAvailable}>Not available</span>}
//             {riskTrend === 'up' && <TrendUpIcon width={14} height={14} color="var(--danger)" />}
//             {riskTrend === 'down' && <TrendDownIcon width={14} height={14} color="var(--success)" />}
//           </p>
//         </div>

//         <div className={styles.intelStat}>
//           <p className={styles.intelLabel}>AI confidence</p>
//           <p className={styles.intelValue}>{fmtPct(latest.confidence) || <span className={styles.notAvailable}>Not available</span>}</p>
//         </div>

//         <div className={styles.intelStat}>
//           <p className={styles.intelLabel}>Evidence on file</p>
//           <p className={styles.intelValue}>{(caseDoc.evidence?.length || 0) + (caseDoc.evidenceFiles?.length || 0)}</p>
//         </div>

//         <div className={styles.intelStat}>
//           <p className={styles.intelLabel}>Critical gaps</p>
//           <p className={styles.intelValue}>{latest.missing?.length ?? 0}</p>
//         </div>

//         <div className={styles.intelStat}>
//           <p className={styles.intelLabel}>Recommended actions</p>
//           <p className={styles.intelValue}>{latest.recommendations?.filter((r) => r.status === 'pending').length ?? 0}</p>
//         </div>

//         <div className={styles.intelStat}>
//           <p className={styles.intelLabel}>Investigation version</p>
//           <p className={styles.intelValue}>v{latest.version}</p>
//         </div>
//       </div>

//       <div className={styles.assessmentBox}>
//         <p className={styles.assessmentLabel}>Current AI Assessment</p>
//         <p className={styles.assessmentText}>{latest.assessment}</p>
//         {latest.riskReasoning && <p className={styles.riskReasoning}>{latest.riskReasoning}</p>}
//       </div>

//       {latest.escalation?.required && (
//         <div className={styles.escalation}>
//           <AlertTriangleIcon width={15} height={15} />
//           <span>Escalation recommended — {latest.escalation.reason}</span>
//         </div>
//       )}
//     </section>
//   )
// }

// // =========================================================
// // 3. WHAT CHANGED
// // =========================================================

// function WhatChangedPanel({ latest, versions }) {
//   const [expanded, setExpanded] = useState(false)
//   const delta = latest?.delta

//   if (!latest) return null

//   if (!delta) {
//     return (
//       <section className={styles.section}>
//         <h3 className={styles.sectionTitle}>⭐ What Changed</h3>
//         <p className={styles.empty}>No previous investigation to compare — this is the first investigation version.</p>
//       </section>
//     )
//   }

//   const hasChanges =
//     delta.newFindings.length || delta.newEntities.length || delta.newRelationships.length ||
//     delta.riskChange || delta.confidenceChange || delta.newKnown.length ||
//     delta.resolvedMissing.length || delta.newMissing.length || delta.newRecommendations.length

//   return (
//     <section className={styles.section}>
//       <div className={styles.evidenceHead}>
//         <h3 className={styles.sectionTitle} style={{ margin: 0 }}>
//           ⭐ What Changed <span className={styles.metaText}>v{delta.fromVersion} → v{delta.toVersion}</span>
//         </h3>
//       </div>

//       {!hasChanges ? (
//         <p className={styles.empty}>No new changes detected in this re-investigation.</p>
//       ) : (
//         <div className={styles.changeList}>
//           {delta.newFindings.map((f, i) => (
//             <div key={`nf-${i}`} className={styles.changeItem}>
//               <span className={styles.changeTagAdd}>+ NEW FINDING</span>
//               <p>{f.text}</p>
//             </div>
//           ))}
//           {delta.newEntities.map((e, i) => (
//             <div key={`ne-${i}`} className={styles.changeItem}>
//               <span className={styles.changeTagAdd}>+ NEW ENTITY</span>
//               <p>{e.type.replace(/_/g, ' ')}: {e.value}</p>
//             </div>
//           ))}
//           {delta.newRelationships.map((r, i) => (
//             <div key={`nr-${i}`} className={styles.changeItem}>
//               <span className={styles.changeTagAdd}>+ NEW RELATIONSHIP</span>
//               <p>{r.from} → {r.type.replace(/-/g, ' ')} → {r.to}</p>
//             </div>
//           ))}
//           {delta.riskChange && (
//             <div className={styles.changeItem}>
//               <span className={styles.changeTagRisk}>↑ RISK CHANGE</span>
//               <p>{delta.riskChange.from || 'unknown'} → {delta.riskChange.to}</p>
//             </div>
//           )}
//           {delta.confidenceChange && (
//             <div className={styles.changeItem}>
//               <span className={styles.changeTagRisk}>CONFIDENCE CHANGE</span>
//               <p>{fmtPct(delta.confidenceChange.from)} → {fmtPct(delta.confidenceChange.to)}</p>
//             </div>
//           )}
//           {delta.resolvedMissing.map((m, i) => (
//             <div key={`rm-${i}`} className={styles.changeItem}>
//               <span className={styles.changeTagResolve}>✓ RESOLVED</span>
//               <p>{m.label}</p>
//             </div>
//           ))}
//           {delta.newMissing.map((m, i) => (
//             <div key={`nm-${i}`} className={styles.changeItem}>
//               <span className={styles.changeTagGap}>? NEW GAP</span>
//               <p>{m.label}</p>
//             </div>
//           ))}
//         </div>
//       )}

//       {versions.length > 1 && (
//         <button type="button" className={styles.linkBtn} onClick={() => setExpanded((v) => !v)}>
//           {expanded ? 'Hide full comparison' : 'View Full Comparison'}
//         </button>
//       )}

//       {expanded && <FullComparison versions={versions} />}
//     </section>
//   )
// }

// function FullComparison({ versions }) {
//   const curr = versions[versions.length - 1]
//   const prev = versions[versions.length - 2]
//   if (!prev) return null
//   return (
//     <div className={styles.comparisonGrid}>
//       <div>
//         <p className={styles.comparisonHead}>Previous State — v{prev.version}</p>
//         <p className={styles.rawText}>{prev.assessment}</p>
//         <p className={styles.metaText}>Known: {prev.known.length} · Missing: {prev.missing.length} · Findings: {prev.findings.length}</p>
//       </div>
//       <div>
//         <p className={styles.comparisonHead}>Current State — v{curr.version}</p>
//         <p className={styles.rawText}>{curr.assessment}</p>
//         <p className={styles.metaText}>Known: {curr.known.length} · Missing: {curr.missing.length} · Findings: {curr.findings.length}</p>
//       </div>
//     </div>
//   )
// }

// // =========================================================
// // 4. INVESTIGATION GAPS (Known vs Missing)
// // =========================================================

// function GapsPanel({ latest }) {
//   if (!latest) return null
//   return (
//     <section className={styles.section}>
//       <h3 className={styles.sectionTitle}>Investigation Gaps</h3>
//       <div className={styles.gapsGrid}>
//         <div>
//           <p className={styles.gapsHead}><CheckIcon width={14} height={14} color="var(--success)" /> Known</p>
//           {latest.known.length ? (
//             <ul className={styles.gapsList}>
//               {latest.known.map((k, i) => (
//                 <li key={i}><strong>{k.label}:</strong> {k.detail}</li>
//               ))}
//             </ul>
//           ) : <p className={styles.empty}>Nothing confirmed yet.</p>}
//         </div>
//         <div>
//           <p className={styles.gapsHead}><HelpCircleIcon width={14} height={14} color="var(--warning)" /> Missing</p>
//           {latest.missing.length ? (
//             <div className={styles.missingList}>
//               {latest.missing.map((m) => (
//                 <div key={m.id} className={styles.missingCard}>
//                   <p className={styles.missingLabel}>{m.label}</p>
//                   <p className={styles.missingWhy}><strong>Why it matters:</strong> {m.whyItMatters}</p>
//                   <p className={styles.missingMethod}><strong>Suggested method:</strong> {m.suggestedMethod}</p>
//                   {m.supportingEvidence?.length > 0 && (
//                     <p className={styles.missingEvidence}><strong>Supporting evidence:</strong> {m.supportingEvidence.join(', ')}</p>
//                   )}
//                 </div>
//               ))}
//             </div>
//           ) : <p className={styles.empty}>No open information gaps identified.</p>}
//         </div>
//       </div>
//     </section>
//   )
// }

// // =========================================================
// // 5. NEXT BEST ACTION
// // =========================================================

// function NextBestActionPanel({ caseId, latest, onChanged, readOnly, requests }) {
//   const { user } = useAuth()
//   const [busyId, setBusyId] = useState(null)
//   const [decidedBy, setDecidedBy] = useState(() => getCurrentOfficerName())
//   const [err, setErr] = useState(null)

//   const allRecs = latest?.recommendations || []
//   const pending = allRecs.filter((r) => r.status === 'pending')
//   // Recommendations already approved/rejected -- kept visible (not hidden)
//   // so the officer can see what happened to them and track the status of
//   // any legal request they spawned, without hunting through Legal Intelligence.
//   const decided = allRecs.filter((r) => r.status !== 'pending')

//   // Legal requests generated from an approved recommendation that still need
//   // officer action (approve / dispatch) -- surfaced here so the officer
//   // doesn't have to scroll down to Legal Intelligence right after approving.
//   // Once a request is 'sent' or 'overdue' it's no longer awaiting *this*
//   // action -- it's waiting on the provider -- so it drops out of this list
//   // and its live status is shown instead on the recommendation card below.
//   const actionableRequests = (requests || []).filter((r) =>
//     ['draft', 'approved'].includes(r.status)
//   )

//   // Best-effort link from a recommendation back to the request it spawned,
//   // so we can show its live status (DRAFT / APPROVED / SENT / OVERDUE / COMPLETED).
//   // Matches by requestType and picks the most recently created matching request.
//   // NOTE: if the backend ever stores the originating recommendation id on the
//   // request record (e.g. `sourceRecommendationId`), prefer matching on that
//   // instead -- it removes the ambiguity when multiple same-type requests exist.
//   const requestFor = (rec) => {
//     if (!rec.requestType) return null
//     if (rec.requestId) {
//       const direct = (requests || []).find((r) => r.requestId === rec.requestId)
//       if (direct) return direct
//     }
//     const matches = (requests || []).filter((r) => r.requestType === rec.requestType)
//     if (!matches.length) return null
//     return matches.reduce((a, b) => (new Date(b.createdAt || 0) > new Date(a.createdAt || 0) ? b : a))
//   }

//   const REQUEST_STATUS_LABEL = {
//     draft: 'REQUEST DRAFTED', approved: 'REQUEST APPROVED', sent: 'REQUEST SENT',
//     overdue: 'REQUEST OVERDUE', completed: 'REQUEST FULFILLED', rejected: 'REQUEST REJECTED',
//   }
//   const REQUEST_STATUS_COLOR = {
//     draft: 'var(--text-tertiary)', approved: 'var(--accent)', sent: 'var(--warning)',
//     overdue: 'var(--danger)', completed: 'var(--success)', rejected: 'var(--danger)',
//   }

//   const decide = async (rec, status) => {
//     setErr(null)
//     if (!decidedBy.trim()) {
//       setErr('Enter officer name / badge ID before approving or rejecting.')
//       return
//     }
//     setBusyId(rec.id)
//     try {
//       await apiBrain.post(`/api/case/${caseId}/recommendation/${rec.id}/status`, { status, decidedBy })
//       if (status === 'approved' && rec.requestType) {
//         await apiBackend.post(`/cases/${caseId}/request/generate`, { requestType: rec.requestType })
//       }
//       await onChanged()
//     } catch (e) {
//       setErr(e.response?.data?.message || e.response?.data?.error || 'Failed to update recommendation.')
//     } finally {
//       setBusyId(null)
//     }
//   }

//   if (!latest) return null

//   if (readOnly) {
//     return (
//       <section className={styles.section}>
//         <h3 className={styles.sectionTitle}>⭐ Next Best Action</h3>
//         <p className={styles.empty}>This case is closed — recommendations are no longer actionable.</p>
//       </section>
//     )
//   }

//   return (
//     <section className={styles.section}>
//       <h3 className={styles.sectionTitle}>⭐ Next Best Action</h3>

//       <input
//         type="text"
//         className={styles.input}
//         placeholder="Officer name / badge ID (required to approve/reject)"
//         value={decidedBy}
//         onChange={(e) => setDecidedBy(e.target.value)}
//         style={{ marginBottom: 12 }}
//       />
//       {err && <p className={styles.actionError}>{err}</p>}

//       {pending.length || decided.length ? (
//         <div className={styles.recList}>
//           {pending.map((rec) => {
//             const urgency = URGENCY_META[rec.urgency] || URGENCY_META.low
//             return (
//               <div key={`${rec.id}-${rec.action}-${rec.urgency}`} className={styles.recCard}>
//                 <div className={styles.recHead}>
//                   <p className={styles.recAction}>{rec.action.toUpperCase()}</p>
//                   <span className={styles.urgencyBadge} style={{ color: urgency.color }}>{urgency.label}</span>
//                 </div>
//                 <p className={styles.recWhy}><strong>Why:</strong> {rec.why}</p>
//                 {rec.supportingEvidence?.length > 0 && (
//                   <p className={styles.recEvidence}><strong>Supporting evidence:</strong> {rec.supportingEvidence.join(', ')}</p>
//                 )}
//                 <div className={styles.recActions}>
//                   <button type="button" className={styles.secondaryBtn} disabled={busyId === rec.id} onClick={() => decide(rec, 'rejected')}>
//                     <XCircleIcon width={14} height={14} /> Reject
//                   </button>
//                   <button type="button" className={styles.primaryBtn} disabled={busyId === rec.id} onClick={() => decide(rec, 'approved')}>
//                     <CheckIcon width={14} height={14} /> {busyId === rec.id ? 'Saving…' : 'Approve'}
//                   </button>
//                 </div>
//                 {rec.requestType && (
//                   <p className={styles.metaText}>Approving generates a draft {rec.requestType} legal request — it still needs separate approval &amp; dispatch below.</p>
//                 )}
//               </div>
//             )
//           })}

//           {decided.map((rec) => {
//             const urgency = URGENCY_META[rec.urgency] || URGENCY_META.low
//             const linkedReq = requestFor(rec)
//             return (
//               <div
//                 key={`${rec.id}-${rec.action}-decided`}
//                 className={styles.recCard}
//                 style={{ opacity: rec.status === 'rejected' ? 0.6 : 1 }}
//               >
//                 <div className={styles.recHead}>
//                   <p className={styles.recAction}>{rec.action.toUpperCase()}</p>
//                   <span className={styles.urgencyBadge} style={{ color: urgency.color }}>{urgency.label}</span>
//                 </div>
//                 <p className={styles.recWhy}><strong>Why:</strong> {rec.why}</p>
//                 {rec.supportingEvidence?.length > 0 && (
//                   <p className={styles.recEvidence}><strong>Supporting evidence:</strong> {rec.supportingEvidence.join(', ')}</p>
//                 )}
//                 <div className={styles.recActions}>
//                   {rec.status === 'rejected' ? (
//                     <span className={styles.requestStatus} style={{ color: 'var(--danger)' }}>REJECTED</span>
//                   ) : linkedReq ? (
//                     <span className={styles.requestStatus} style={{ color: REQUEST_STATUS_COLOR[linkedReq.status] }}>
//                       {REQUEST_STATUS_LABEL[linkedReq.status] || linkedReq.status.toUpperCase()}
//                     </span>
//                   ) : (
//                     <span className={styles.requestStatus} style={{ color: 'var(--success)' }}>APPROVED</span>
//                   )}
//                 </div>
//               </div>
//             )
//           })}
//         </div>
//       ) : (
//         <p className={styles.empty}>No recommendations yet.</p>
//       )}

//       {actionableRequests.length > 0 && (
//         <div style={{ marginTop: 20, paddingTop: 16, borderTop: '1px solid var(--border-soft)' }}>
//           <p className={styles.subHead}>Legal Requests Awaiting Action ({actionableRequests.length})</p>
//           <div className={styles.requestList}>
//             {actionableRequests.map((req) => (
//               <LegalRequestCard
//                 key={req.requestId}
//                 caseId={caseId}
//                 req={req}
//                 onChanged={onChanged}
//                 readOnly={readOnly}
//                 defaultExpanded
//               />
//             ))}
//           </div>
//         </div>
//       )}
//     </section>
//   )
// }

// // =========================================================
// // 9. GEOGRAPHIC INTELLIGENCE
// // =========================================================

// function GeoIntelligencePanel({ latest }) {
//   const located = (latest?.entities || []).filter((e) => e.lat != null && e.lng != null)

//   const markers = located.map((e, i) => ({
//     id: `${e.type}-${i}`,
//     label: e.type.replace(/_/g, ' '),
//     lat: e.lat,
//     lng: e.lng,
//     type: e.type,
//     detail: e.geocodedDisplayName || e.value,
//   }))

//   return (
//     <section className={styles.section}>
//       <h3 className={styles.sectionTitle}><MapPinIcon width={15} height={15} /> Geographic Intelligence</h3>
//       {located.length ? (
//         <div className={styles.geoLayout}>
//           <LocationMap markers={markers} />
//           <ul className={styles.geoList}>
//             {located.map((e, i) => (
//               <li key={i} className={styles.geoItem}>
//                 <span className={styles.geoDot} />
//                 <div>
//                   <p className={styles.geoLabel}>{e.type.replace(/_/g, ' ')} <span className={styles.metaText}>· {e.value}</span></p>
//                   <p className={styles.metaText}>{e.geocodedDisplayName || `${e.lat.toFixed(4)}, ${e.lng.toFixed(4)}`}</p>
//                 </div>
//               </li>
//             ))}
//           </ul>
//         </div>
//       ) : (
//         <p className={styles.empty}>No geographic intelligence available for this case yet. Addresses mentioned in the complaint, or recorded from bank/telecom legal responses (KYC address, tower location), are geocoded automatically once the AI (re-)investigates the case.</p>
//       )}
//     </section>
//   )
// }

// // =========================================================
// // 7. EVIDENCE INTELLIGENCE
// // =========================================================

// function EvidenceIntelligencePanel({ caseDoc, latest }) {
//   const [expanded, setExpanded] = useState(false)
//   const evidenceCount = (caseDoc.evidence || []).length + (caseDoc.evidenceFiles || []).length

//   return (
//     <section className={styles.section}>
//       <h3 className={styles.sectionTitle}>Evidence Intelligence</h3>

//       {latest?.findings?.length > 0 && (
//         <div className={styles.findingsList}>
//           {latest.findings.map((f, i) => (
//             <div key={i} className={styles.findingCard}>
//               <p className={styles.findingText}>{f.text}</p>
//               {f.supportingEvidence?.length > 0 && (
//                 <p className={styles.findingSupport}>
//                   Supported by: {[...new Set(f.supportingEvidence)].map((s, i) => (
//                     <span key={`${s}-${i}`} className={styles.entityChip} style={{ marginRight: 6 }}>{s}</span>
//                   ))}
//                 </p>
//               )}
//             </div>
//           ))}
//         </div>
//       )}

//       <button
//         type="button"
//         className={styles.evidenceHead}
//         onClick={() => setExpanded((v) => !v)}
//         aria-expanded={expanded}
//         style={{ cursor: 'pointer', width: '100%', background: 'none', border: 'none', textAlign: 'left', padding: 0 }}
//       >
//         <p className={styles.subHead} style={{ margin: 0 }}>Uploaded Evidence ({evidenceCount})</p>
//         <ChevronRightIcon
//           width={14}
//           height={14}
//           style={{ transform: expanded ? 'rotate(90deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }}
//         />
//       </button>

//       {expanded && (
//         <div className={styles.evidenceList}>
//           {(caseDoc.evidence || []).map((ev) => {
//             const Icon = EVIDENCE_ICON[ev.source_type] || FileTextIcon
//             return (
//               <div key={ev.complaint_id} className={styles.evidenceCard}>
//                 <div className={styles.evidenceHead}>
//                   <span className={styles.evidenceType}><Icon width={14} height={14} /> {ev.source_type}</span>
//                   <span className={styles.complaintId}>{ev.complaint_id}</span>
//                 </div>
//                 <p className={styles.rawText}>{ev.raw_text}</p>
//               </div>
//             )
//           })}
//           {(caseDoc.evidenceFiles || []).map((ef) => (
//             <div key={ef._id} className={styles.evidenceCard}>
//               <div className={styles.evidenceHead}>
//                 <span className={styles.evidenceType}><FileTextIcon width={14} height={14} /> file</span>
//                 <span className={styles.complaintId}>{ef.path?.split('/').pop()}</span>
//               </div>
//               <p className={styles.rawText}>SHA-256: {ef.hash}</p>
//             </div>
//           ))}
//           {!(caseDoc.evidence || []).length && !(caseDoc.evidenceFiles || []).length && (
//             <p className={styles.empty}>No evidence uploaded yet.</p>
//           )}
//         </div>
//       )}
//     </section>
//   )
// }

// // =========================================================
// // 10. LEGAL INTELLIGENCE
// // =========================================================

// function LegalIntelligencePanel({ caseId, caseDoc, onChanged, readOnly }) {
//   const requests = caseDoc.requests || []
//   const latest = (caseDoc.investigationVersions || []).slice(-1)[0]

//   return (
//     <section className={styles.section}>
//       <h3 className={styles.sectionTitle}><ScaleIcon width={15} height={15} /> Legal Intelligence</h3>

//       {latest?.legalSections?.length > 0 ? (
//         <div className={styles.legalSections}>
//           <p className={styles.subHead}>Relevant legal sections (AI-matched)</p>
//           {latest.legalSections.map((s) => (
//             <div key={s.id} className={styles.legalSectionCard}>
//               <p className={styles.legalCitation}>{s.citation}</p>
//               <p className={styles.legalSummary}>{s.summary}</p>
//             </div>
//           ))}
//         </div>
//       ) : (
//         <p className={styles.empty}>No legal sections matched by analysis yet.</p>
//       )}

//       <p className={styles.subHead}>Legal Requests ({requests.length})</p>
//       {requests.length ? (
//         <div className={styles.requestList}>
//           {requests.map((req) => (
//             <LegalRequestCard key={req.requestId} caseId={caseId} req={req} onChanged={onChanged} readOnly={readOnly} />
//           ))}
//         </div>
//       ) : (
//         <p className={styles.empty}>No legal requests generated yet. Approve a Next Best Action above to generate one.</p>
//       )}
//     </section>
//   )
// }

// function LegalRequestCard({ caseId, req, onChanged, readOnly, defaultExpanded = false }) {
//    const { user } = useAuth()
//   const [expanded, setExpanded] = useState(defaultExpanded)
//   const [busy, setBusy] = useState(false)
//   const [err, setErr] = useState(null)
//   const [actor, setActor] = useState(() => getCurrentOfficerName())
//   const [providerEmail, setProviderEmail] = useState('')
//   const [responseData, setResponseData] = useState({ accountHolder: '', kycPhone: '', kycAddress: '', deviceId: '', ipAddress: '' })

//   const STATUS_COLOR = {
//     draft: 'var(--text-tertiary)', approved: 'var(--accent)', sent: 'var(--warning)',
//     overdue: 'var(--danger)', completed: 'var(--success)', rejected: 'var(--danger)',
//   }

//   const run = async (fn) => {
//     setBusy(true); setErr(null)
//     try { await fn(); await onChanged() }
//     catch (e) { setErr(e.response?.data?.message || 'Action failed.') }
//     finally { setBusy(false) }
//   }

//   return (
//     <div className={styles.requestCard}>
//       <div className={styles.requestHead} onClick={() => setExpanded((v) => !v)}>
//         <div>
//           <p className={styles.requestType}>{req.requestType} — {req.requestId}</p>
//           {req.deadline && <p className={styles.metaText}>SLA deadline: {fmtDate(req.deadline)}</p>}
//         </div>
//         <span className={styles.requestStatus} style={{ color: STATUS_COLOR[req.status] }}>{req.status.toUpperCase()}</span>
//       </div>

//       {expanded && (
//         <div className={styles.requestBody}>
//           {err && <p className={styles.actionError}>{err}</p>}

//           {req.previewUrl && (
//             <a href={req.previewUrl} target="_blank" rel="noreferrer" style={{ color: '#5b9df9' }}>
//               View mock email preview
//             </a>
//           )}
//           {req.delivered && !req.previewUrl && (
//             <span style={{ color: '#39d98a', fontWeight: 600 }}>✓ Delivered to inbox</span>
//           )}

//           <input className={styles.input} placeholder="Officer name / badge ID" value={actor} onChange={(e) => setActor(e.target.value)} />

//           {readOnly && (
//             <p className={styles.metaText}>This case is closed — legal request actions are no longer available.</p>
//           )}

//           {!readOnly && req.status === 'draft' && (
//             <button type="button" className={styles.primaryBtn} disabled={busy || !actor.trim()}
//               onClick={() => run(() => apiBackend.post(`/cases/${caseId}/request/${req.requestId}/approve`, { approvedBy: actor }))}>
//               Approve Request
//             </button>
//           )}

//           {!readOnly && req.status === 'approved' && (
//             <>
//               <input className={styles.input} placeholder="Provider email" value={providerEmail} onChange={(e) => setProviderEmail(e.target.value)} />
//               <button type="button" className={styles.primaryBtn} disabled={busy || !providerEmail.trim()}
//                 onClick={() => run(() => apiBackend.post(`/cases/${caseId}/request/${req.requestId}/dispatch`, { providerEmail }))}>
//                 Dispatch Request
//               </button>
//             </>
//           )}

//           {!readOnly && (req.status === 'sent' || req.status === 'overdue') && (
//             <div className={styles.responseForm}>
//               <p className={styles.subHead}>Record provider response</p>
//               {req.requestType === 'bank' ? (
//                 <>
//                   <input className={styles.input} placeholder="Account holder name" value={responseData.accountHolder} onChange={(e) => setResponseData({ ...responseData, accountHolder: e.target.value })} />
//                   <input className={styles.input} placeholder="KYC phone" value={responseData.kycPhone} onChange={(e) => setResponseData({ ...responseData, kycPhone: e.target.value })} />
//                   <input className={styles.input} placeholder="KYC address" value={responseData.kycAddress} onChange={(e) => setResponseData({ ...responseData, kycAddress: e.target.value })} />
//                 </>
//               ) : (
//                 <>
//                   <input className={styles.input} placeholder="Device ID" value={responseData.deviceId} onChange={(e) => setResponseData({ ...responseData, deviceId: e.target.value })} />
//                   <input className={styles.input} placeholder="IP address" value={responseData.ipAddress} onChange={(e) => setResponseData({ ...responseData, ipAddress: e.target.value })} />
//                 </>
//               )}
//               <button type="button" className={styles.primaryBtn} disabled={busy || !actor.trim()}
//                 onClick={() => run(() => apiBackend.post(`/cases/${caseId}/request/${req.requestId}/response`, { recordedBy: actor, data: responseData }))}>
//                 {busy ? 'Saving…' : 'Record Response & Re-investigate'}
//               </button>
//             </div>
//           )}

//           {req.status === 'completed' && req.response && (
//             <div className={styles.rawText}>
//               Recorded by {req.response.recordedBy} on {fmtDate(req.response.receivedAt)}.
//             </div>
//           )}
//         </div>
//       )}
//     </div>
//   )
// }

// // =========================================================
// // 11. INVESTIGATION TIMELINE
// // =========================================================

// const AI_ACTIONS = new Set(['AI_INVESTIGATION_COMPLETED', 'RECOMMENDATION_APPROVED', 'RECOMMENDATION_REJECTED'])
// const TIMELINE_STEP_WIDTH = 148 // keep in sync with .timelineStep flex-basis in the CSS
// const TIMELINE_VISIBLE_STEPS = 8 // how many steps to show at once, per the target design
// const TIMELINE_DOT_CENTER_OFFSET = TIMELINE_STEP_WIDTH / 2 // horizontal center of a step, for the connecting line

// function titleCaseAction(action) {
//   return action
//     .toLowerCase()
//     .split('_')
//     .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
//     .join(' ')
// }

// // Colors each step by what actually happened, not just its position in the list.
// function timelineStepColor(action) {
//   const a = (action || '').toUpperCase()
//   if (a.includes('REJECTED') || a.includes('OVERDUE') || a.includes('FAILED')) return 'var(--danger)'
//   if (a.includes('PENDING') || a.includes('IN_PROGRESS') || a.includes('FOR_REVIEW') || a.includes('AWAITING') || a.includes('APPROVAL')) return 'var(--warning)'
//   return 'var(--success)' // completed / approved / received / generated / extracted / identified etc.
// }

// function TimelinePanel({ timeline }) {
//   const trackRef = useRef(null)
//   const [dragging, setDragging] = useState(false)
//   const drag = useRef({ startX: 0, startScroll: 0, moved: false })

//   // Only the latest TIMELINE_VISIBLE_STEPS steps are shown, oldest first,
//   // newest on the right -- matching the reference design.
//   const visible = timeline.slice(-TIMELINE_VISIBLE_STEPS)

//   // Land on the latest (rightmost) step whenever the timeline loads or grows.
//   useEffect(() => {
//     const el = trackRef.current
//     if (!el) return
//     el.scrollTo({ left: el.scrollWidth, behavior: 'auto' })
//   }, [visible.length])

//   const scrollByStep = (dir) => {
//     trackRef.current?.scrollBy({ left: dir * TIMELINE_STEP_WIDTH * 3, behavior: 'smooth' })
//   }
//   const scrollToLatest = () => {
//     const el = trackRef.current
//     if (!el) return
//     el.scrollTo({ left: el.scrollWidth, behavior: 'smooth' })
//   }

//   // Click-drag to scroll on desktop/trackpad; touch already swipes natively.
//   const onMouseDown = (e) => {
//     const el = trackRef.current
//     if (!el) return
//     drag.current = { startX: e.pageX, startScroll: el.scrollLeft, moved: false }
//     setDragging(true)
//   }
//   const onMouseMove = (e) => {
//     if (!dragging) return
//     const el = trackRef.current
//     if (!el) return
//     drag.current.moved = true
//     el.scrollLeft = drag.current.startScroll - (e.pageX - drag.current.startX)
//   }
//   const endDrag = () => setDragging(false)

//   return (
//     <section className={styles.section}>
//       <div className={styles.timelineHeadRow}>
//         <span className={styles.timelineHeadIcon}>
//           <HistoryIcon width={17} height={17} />
//         </span>
//         <div style={{ flex: 1 }}>
//           <h3 className={styles.sectionTitle} style={{ margin: 0 }}>Investigation Timeline</h3>
//           {timeline.length > 0 && (
//             <p className={styles.metaText}>
//               Latest {Math.min(timeline.length, TIMELINE_VISIBLE_STEPS)} updates from your investigation
//             </p>
//           )}
//         </div>
//         {timeline.length > 0 && (
//           <div style={{ display: 'flex', gap: 8 }}>
//             <button
//               type="button"
//               className={styles.secondaryBtn}
//               style={{ width: 32, height: 32, padding: 0, borderRadius: '50%', justifyContent: 'center' }}
//               onClick={() => scrollByStep(-1)}
//               aria-label="Scroll to earlier updates"
//             >
//               <ChevronRightIcon width={13} height={13} style={{ transform: 'rotate(180deg)' }} />
//             </button>
//             <button
//               type="button"
//               className={styles.secondaryBtn}
//               style={{ width: 32, height: 32, padding: 0, borderRadius: '50%', justifyContent: 'center' }}
//               onClick={() => scrollByStep(1)}
//               aria-label="Scroll to later updates"
//             >
//               <ChevronRightIcon width={13} height={13} />
//             </button>
//             <button
//               type="button"
//               className={styles.secondaryBtn}
//               style={{ borderColor: 'var(--accent)', color: 'var(--accent)' }}
//               onClick={scrollToLatest}
//             >
//               <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--accent)', display: 'inline-block' }} />
//               Latest
//             </button>
//           </div>
//         )}
//       </div>

//       {visible.length ? (
//         <>
//           <div
//             ref={trackRef}
//             className={`${styles.timelineTrackWrap} ${dragging ? styles.dragging : ''}`}
//             onMouseDown={onMouseDown}
//             onMouseMove={onMouseMove}
//             onMouseUp={endDrag}
//             onMouseLeave={endDrag}
//             tabIndex={0}
//           >
//             <div className={styles.timelineTrack}>
//               {visible.length > 1 && (
//                 <div
//                   className={styles.timelineLine}
//                   style={{
//                     left: TIMELINE_DOT_CENTER_OFFSET,
//                     width: (visible.length - 1) * TIMELINE_STEP_WIDTH,
//                     right: 'auto',
//                   }}
//                 />
//               )}
//               {visible.map((t, i) => {
//                 const isCurrent = i === visible.length - 1
//                 const color = timelineStepColor(t.action)
//                 return (
//                   <div key={t.sequence ?? i} className={styles.timelineStep}>
//                     {isCurrent && <span className={styles.timelineLatestTag}>LATEST</span>}
//                     {isCurrent ? (
//                       <span className={styles.timelineNodeCurrent} style={{ borderColor: color }}>
//                         <span className={styles.timelineNodeCurrentInner} style={{ background: color }} />
//                       </span>
//                     ) : (
//                       <span className={styles.timelineNodeDone} style={{ background: color, boxShadow: `0 0 0 1px ${color}` }}>
//                         <CheckIcon width={10} height={10} color="var(--card)" />
//                       </span>
//                     )}
//                     <p className={`${styles.timelineStepLabel} ${isCurrent ? styles.timelineStepLabelCurrent : ''}`} style={isCurrent ? { color } : undefined}>
//                       {AI_ACTIONS.has(t.action) && <SparklesIcon width={10} height={10} />}
//                       {titleCaseAction(t.action)}
//                     </p>
//                     <p className={styles.timelineStepTime}>{fmtDate(t.timestamp)}</p>
//                   </div>
//                 )
//               })}
//             </div>
//           </div>
//           <p className={styles.timelineFooterNote}>
//             Showing latest {visible.length} update{visible.length === 1 ? '' : 's'}. New updates appear on the right — swipe or use the arrows to see earlier ones.
//           </p>
//         </>
//       ) : (
//         <p className={styles.empty}>No timeline events recorded yet.</p>
//       )}
//     </section>
//   )
// }

// // =========================================================
// // 12. SIMILAR CASES
// // =========================================================

// function SimilarCasesPanel({ similarCases }) {
//   return (
//     <section className={styles.section}>
//       <h3 className={styles.sectionTitle}><LinkIcon width={15} height={15} /> Similar Cases</h3>
//       {similarCases.status === 'loading' && <p className={styles.empty}>Looking for similar cases…</p>}
//       {similarCases.status === 'error' && <p className={styles.empty}>Similar-case analysis is unavailable right now.</p>}
//       {similarCases.status === 'ok' && (
//         similarCases.data.length ? (
//           <div className={styles.similarList}>
//             {similarCases.data.map((c) => (
//               <Link key={c.caseId} to={`/cases/${c.caseId}`} className={styles.similarCard}>
//                 <p className={styles.similarTitle}>{c.caseId} — {c.title || 'Untitled Case'}</p>
//                 <p className={styles.metaText}>{fmtPct(c.similarity)} similarity{c.sharedEntityTypes?.length ? ` · shared: ${c.sharedEntityTypes.join(', ').toLowerCase()}` : ''}</p>
//               </Link>
//             ))}
//           </div>
//         ) : <p className={styles.empty}>No similar cases found.</p>
//       )}
//     </section>
//   )
// }

// // =========================================================
// // 13. AI INVESTIGATION HISTORY
// // =========================================================

// function HistoryPanel({ versions }) {
//   if (!versions.length) {
//     return (
//       <section className={styles.section}>
//         <h3 className={styles.sectionTitle}><HistoryIcon width={15} height={15} /> AI Investigation History</h3>
//         <p className={styles.empty}>No previous investigation.</p>
//       </section>
//     )
//   }

//   return (
//     <section className={styles.section}>
//       <h3 className={styles.sectionTitle}><HistoryIcon width={15} height={15} /> AI Investigation History</h3>
//       <div className={styles.historyList}>
//         {[...versions].reverse().map((v, i) => (
//           <div key={`${v.version}-${i}`} className={styles.historyItem}>
//             <div className={styles.historyDot} />
//             <div>
//               <p className={styles.historyTitle}>
//                 v{v.version} — {TRIGGER_LABEL[v.trigger] || v.trigger}
//                 {i === 0 && <span className={styles.currentBadge}>CURRENT</span>}
//               </p>
//               <p className={styles.metaText}>{fmtDate(v.createdAt)}</p>
//               <p className={styles.metaText}>
//                 Risk: {v.risk || 'n/a'} · Confidence: {fmtPct(v.confidence) || 'n/a'} · {v.findings.length} finding(s) · {v.recommendations.length} recommendation(s)
//               </p>
//             </div>
//           </div>
//         ))}
//       </div>
//     </section>
//   )
// }


import { useCallback, useEffect, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { apiBackend, apiBrain } from '../api/api'
import { useAuth } from '../context/AuthContext'
import {
  FileTextIcon, ImageIcon, AudioIcon, SparklesIcon, ChevronRightIcon,
  AlertTriangleIcon, TrendUpIcon, TrendDownIcon,
  HelpCircleIcon, MapPinIcon, ScaleIcon, HistoryIcon, RefreshIcon,
  CheckIcon, XCircleIcon, LinkIcon, UploadCloudIcon, LockIcon,
} from '../components/Icons/Icons'
import EntityGraph from '../components/CaseIntelligence/EntityGraph'
import LocationMap from '../components/CaseIntelligence/LocationMap'
import EyeLoader from '../components/EyeLoader/EyeLoader'
import styles from './CaseDetails.module.css'
import useDocumentTitle from '../hooks/useDocumentTitle'
import CopyButton from '../components/CopyButton/CopyButton'
import AuditTrail from '../components/AuditTrail/AuditTrail'

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

// Pulls a human-readable name off the auth user object, trying the most
// likely field names in order. Adjust this list if your /api/auth/me
// response uses a different field -- e.g. add 'badgeId' at the end if you
// want a badge ID fallback instead of the raw username.
function officerDisplayName(user) {
  if (!user) return ''
  return user.name || user.fullName || user.displayName || user.username || ''
}

function fmtPct(n) {
  return n == null ? null : `${Math.round(n * 100)}%`
}

function fmtDate(d) {
  if (!d) return ''
  return new Date(d).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })
}

export default function CaseDetails() {
  useDocumentTitle('Case Details')
  const { caseId } = useParams()
  const navigate = useNavigate()

  const [caseDoc, setCaseDoc] = useState(null)
  const [isInvestigator, setIsInvestigator] = useState(true)
  const [isArchivedView, setIsArchivedView] = useState(false)
  const [requestStatus, setRequestStatus] = useState(null)
  const [timeline, setTimeline] = useState([])
  const [similarCases, setSimilarCases] = useState({ status: 'loading', data: [] })
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(true)
  const [loadingStartedAt] = useState(() => Date.now())
  const [reinvestigating, setReinvestigating] = useState(false)
  const [actionError, setActionError] = useState(null)
  const [compareVersion, setCompareVersion] = useState(null)
  const [requesting, setRequesting] = useState(false)
  const [showCompleteModal, setShowCompleteModal] = useState(false)

  const loadCase = useCallback(() => {
    return apiBackend.get(`/cases/${caseId}`).then((res) => {
      setCaseDoc(res.data.case)
      setIsInvestigator(res.data.isInvestigator !== false)
      setIsArchivedView(!!res.data.isArchivedView)
      setRequestStatus(res.data.myAccessRequestStatus ?? null)
    })
  }, [caseId])

  useEffect(() => {
    setLoading(true)
    setError(null)
    loadCase()
      .catch((err) => setError(err.response?.data?.message || 'Failed to load this case.'))
      .finally(() => {
        const elapsed = Date.now() - loadingStartedAt
        const remaining = Math.max(0, 1200 - elapsed)
        window.setTimeout(() => setLoading(false), remaining)
      })
  }, [caseId, loadCase])

  const canViewFullCase = isInvestigator || isArchivedView

  useEffect(() => {
    if (!canViewFullCase) return
    apiBackend.get(`/cases/${caseId}/timeline`).then((res) => setTimeline(res.data.timeline || [])).catch(() => setTimeline([]))
  }, [caseId, canViewFullCase])

  // Poll for updates that land from another persona/tab (e.g. a bank
  // officer submitting a response via /mock-bank). We only poll the
  // lightweight /timeline endpoint -- if its length grows, something new
  // landed (new audit entry = new response/evidence/reinvestigation), so
  // we surface a toast instead of silently refetching the whole case
  // (which would yank the officer's scroll position / open panels).
  const [newActivity, setNewActivity] = useState(false)
  const timelineLenRef = useRef(0)

  useEffect(() => {
    timelineLenRef.current = timeline.length
  }, [timeline])

  useEffect(() => {
    if (!canViewFullCase) return
    const poll = () => {
      if (document.hidden) return
      apiBackend
        .get(`/cases/${caseId}/timeline`)
        .then((res) => {
          const len = (res.data.timeline || []).length
          if (len > timelineLenRef.current) setNewActivity(true)
        })
        .catch(() => {})
    }
    const id = window.setInterval(poll, 8000)
    return () => window.clearInterval(id)
  }, [caseId, canViewFullCase])

  const handleRefreshActivity = async () => {
    setNewActivity(false)
    await Promise.all([
      loadCase(),
      apiBackend.get(`/cases/${caseId}/timeline`).then((res) => setTimeline(res.data.timeline || [])),
    ])
  }

  useEffect(() => {
    if (!canViewFullCase) return
    setSimilarCases({ status: 'loading', data: [] })
    apiBrain
      .get(`/api/case/${caseId}/similar`)
      .then((res) => setSimilarCases({ status: 'ok', data: res.data.similarCases || [] }))
      .catch(() => setSimilarCases({ status: 'error', data: [] }))
  }, [caseId, canViewFullCase])

  const handleRequestAccess = async () => {
    setRequesting(true)
    try {
      await apiBackend.post(`/cases/${caseId}/access-request`)
      setRequestStatus('pending')
    } catch (err) {
      setActionError(err.response?.data?.message || 'Could not send the access request.')
    } finally {
      setRequesting(false)
    }
  }

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

  if (loading) return <EyeLoader label="Loading investigation…" />
  if (error) return <p className={styles.stateError}>{error}</p>
  if (!caseDoc) return null

  if (!isInvestigator && !isArchivedView) {
    const risk = caseDoc.severity ? RISK_META[caseDoc.severity] : null
    return (
      <motion.div
        className={styles.wrap}
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
      >
        <div className={styles.header}>
          <div>
            <p className={styles.caseId}>
              {caseDoc.case_id}
              <CopyButton value={caseDoc.case_id} label="Copy case ID" />
            </p>
            <h2 className={styles.title}>{caseDoc.title || 'Untitled Case'}</h2>
            <div className={styles.headerMeta}>
              <span className={styles.statusBadge}>{STATUS_LABEL[caseDoc.status] || caseDoc.status}</span>
              {risk && (
                <span className={styles.riskBadge} style={{ color: risk.color, background: risk.bg }}>
                  {risk.label} risk
                </span>
              )}
            </div>
          </div>
        </div>

        <section className={styles.section} style={{ textAlign: 'center', padding: '48px 20px' }}>
          <LockIcon width={28} height={28} style={{ opacity: 0.6, marginBottom: 12 }} />
          <p className={styles.title} style={{ fontSize: 16 }}>You don't have access to this case</p>
          <p className={styles.empty} style={{ marginBottom: 18 }}>
            Request access from the lead investigator to view evidence, findings, and the full case record.
          </p>
          {actionError && <p className={styles.actionError} style={{ marginBottom: 12 }}>{actionError}</p>}
          {requestStatus === 'pending' ? (
            <span className={styles.statusBadge}>Access Requested</span>
          ) : requestStatus === 'rejected' ? (
            <span className={styles.statusBadge} style={{ color: 'var(--danger)', background: 'var(--danger-soft)' }}>
              Access Rejected
            </span>
          ) : (
            <button type="button" className={styles.secondaryBtn} disabled={requesting} onClick={handleRequestAccess}>
              {requesting ? 'Requesting…' : 'Request Access'}
            </button>
          )}
        </section>

        <button type="button" className={styles.backBtn} onClick={() => navigate('/')}>
          ← Back to Dashboard
        </button>
      </motion.div>
    )
  }

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
        isInvestigator={isInvestigator}
        isArchivedView={isArchivedView}
        onAddEvidence={() => navigate(`/new-case?case_id=${caseDoc.case_id}`)}
        onReinvestigate={handleReinvestigate}
        reinvestigating={reinvestigating}
        onMarkComplete={() => setShowCompleteModal(true)}
      />

      {actionError && <p className={styles.actionError}>{actionError}</p>}

      {newActivity && (
        <button type="button" className={styles.newActivityBanner} onClick={handleRefreshActivity}>
          New activity on this case — click to refresh
        </button>
      )}

      {caseDoc.isCompleted && caseDoc.resolution && (
        <ResolutionPanel resolution={caseDoc.resolution} />
      )}

      {showCompleteModal && (
        <CompleteCaseModal
          caseId={caseId}
          onClose={() => setShowCompleteModal(false)}
          onCompleted={async () => {
            setShowCompleteModal(false)
            await loadCase()
          }}
        />
      )}

      <CaseIntelligencePanel caseDoc={caseDoc} latest={latest} previous={previous} />

      {/* <WhatChangedPanel latest={latest} versions={versions} /> */}

      <GapsPanel latest={latest} />

      <NextBestActionPanel
        caseId={caseId}
        latest={latest}
        requests={caseDoc.requests || []}
        onChanged={loadCase}
        readOnly={caseDoc.isCompleted}
      />

      <section className={styles.section}>
        <h3 className={styles.sectionTitle}>Entity &amp; Relationship Graph</h3>
        <EntityGraph entities={latest?.entities || []} relationships={latest?.relationships || []} />
      </section>

      <GeoIntelligencePanel latest={latest} />

      <EvidenceIntelligencePanel caseDoc={caseDoc} latest={latest} />

      <LegalIntelligencePanel caseId={caseId} caseDoc={caseDoc} onChanged={loadCase} readOnly={caseDoc.isCompleted} />

      <TimelinePanel timeline={timeline} />

      <AuditTrail caseId={caseId} timeline={timeline} />

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

function CaseHeader({ caseDoc, latest, isInvestigator, isArchivedView, onAddEvidence, onReinvestigate, reinvestigating, onMarkComplete }) {
  const risk = latest?.risk ? RISK_META[latest.risk] : null
  const isCompleted = !!caseDoc.isCompleted
  // Archived viewers, and any case that's already been marked complete,
  // are read-only -- no evidence uploads, re-investigation, or closing
  // it a second time.
  const canEdit = isInvestigator && !isArchivedView && !isCompleted

  return (
    <div className={styles.header}>
      <div>
        <p className={styles.caseId}>
          {caseDoc.case_id}
          <CopyButton value={caseDoc.case_id} label="Copy case ID" />
        </p>
        <h2 className={styles.title}>{caseDoc.title || 'Untitled Case'}</h2>
        <div className={styles.headerMeta}>
          <span className={styles.statusBadge}>
            {isCompleted ? 'Case Completed' : STATUS_LABEL[caseDoc.status] || caseDoc.status}
          </span>
          {risk && (
            <span className={styles.riskBadge} style={{ color: risk.color, background: risk.bg }}>
              {risk.label} risk
            </span>
          )}
          <span className={styles.metaText}>Updated {fmtDate(caseDoc.updatedAt)}</span>
          {isArchivedView && <span className={styles.metaText}>· Viewing from Cases Archive (read-only)</span>}
        </div>
      </div>
      {canEdit && (
        <div className={styles.headerActions}>
          <button type="button" className={styles.secondaryBtn} onClick={onAddEvidence}>
            <UploadCloudIcon width={14} height={14} /> Add Evidence
          </button>
          <button type="button" className={styles.primaryBtn} onClick={onReinvestigate} disabled={reinvestigating}>
            <RefreshIcon width={14} height={14} /> {reinvestigating ? 'Re-investigating…' : 'Re-investigate'}
          </button>
          <button type="button" className={styles.secondaryBtn} onClick={onMarkComplete}>
            <CheckIcon width={14} height={14} /> Mark Case Complete
          </button>
        </div>
      )}
    </div>
  )
}

// =========================================================
// 1b. CASE RESOLUTION (shown once the case is marked complete)
// =========================================================

const OUTCOME_LABEL = {
  culprit_identified: 'Culprit Identified',
  culprit_arrested: 'Culprit Arrested',
  money_recovered: 'Money Recovered',
  false_complaint: 'False Complaint',
  withdrawn_by_complainant: 'Withdrawn by Complainant',
  unable_to_resolve: 'Unable to Resolve',
  other: 'Other',
}

function ResolutionPanel({ resolution }) {
  return (
    <section className={styles.section} style={{ borderColor: 'var(--success)' }}>
      <h3 className={styles.sectionTitle}><CheckIcon width={15} height={15} color="var(--success)" /> Case Resolution</h3>

      <div className={styles.intelGrid}>
        <div className={styles.intelStat}>
          <p className={styles.intelLabel}>Outcome</p>
          <p className={styles.intelValue}>{OUTCOME_LABEL[resolution.outcome] || resolution.outcome}</p>
        </div>
        {resolution.amountRecovered != null && (
          <div className={styles.intelStat}>
            <p className={styles.intelLabel}>Amount recovered</p>
            <p className={styles.intelValue}>₹{Number(resolution.amountRecovered).toLocaleString('en-IN')}</p>
          </div>
        )}
        <div className={styles.intelStat}>
          <p className={styles.intelLabel}>Closed by</p>
          <p className={styles.intelValue}>{resolution.closedBy}</p>
        </div>
        <div className={styles.intelStat}>
          <p className={styles.intelLabel}>Closed on</p>
          <p className={styles.intelValue}>{fmtDate(resolution.closedAt)}</p>
        </div>
      </div>

      <div className={styles.assessmentBox}>
        <p className={styles.assessmentLabel}>How the case concluded</p>
        <p className={styles.assessmentText}>{resolution.summary}</p>
      </div>

      {resolution.keyEvidence && (
        <div className={styles.assessmentBox}>
          <p className={styles.assessmentLabel}>Key evidence</p>
          <p className={styles.assessmentText}>{resolution.keyEvidence}</p>
        </div>
      )}

      {resolution.victimOutcome && (
        <div className={styles.assessmentBox}>
          <p className={styles.assessmentLabel}>What happened to the victim</p>
          <p className={styles.assessmentText}>{resolution.victimOutcome}</p>
        </div>
      )}

      {resolution.actionsTaken && (
        <div className={styles.assessmentBox}>
          <p className={styles.assessmentLabel}>Actions taken</p>
          <p className={styles.assessmentText}>{resolution.actionsTaken}</p>
        </div>
      )}
    </section>
  )
}

// =========================================================
// 1c. MARK CASE COMPLETE MODAL
// =========================================================

function CompleteCaseModal({ caseId, onClose, onCompleted }) {
  const [form, setForm] = useState({
    outcome: 'culprit_identified',
    summary: '',
    keyEvidence: '',
    victimOutcome: '',
    amountRecovered: '',
    actionsTaken: '',
  })
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState(null)

  const set = (field) => (e) => setForm({ ...form, [field]: e.target.value })

  const submit = async () => {
    if (!form.summary.trim()) {
      setErr('Please describe how the case concluded.')
      return
    }
    setBusy(true)
    setErr(null)
    try {
      await apiBackend.post(`/cases/${caseId}/complete`, form)
      await onCompleted()
    } catch (e) {
      setErr(e.response?.data?.message || 'Failed to mark the case complete.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={styles.modalCard} onClick={(e) => e.stopPropagation()}>
        <h3 className={styles.sectionTitle}>Mark Case Complete</h3>
        <p className={styles.metaText} style={{ marginBottom: 12 }}>
          This closes the case for every investigator and adds it to the Cases Archive, visible to all investigators.
        </p>

        {err && <p className={styles.actionError}>{err}</p>}

        <label className={styles.subHead}>Outcome</label>
        <select className={styles.input} value={form.outcome} onChange={set('outcome')}>
          {Object.entries(OUTCOME_LABEL).map(([value, label]) => (
            <option key={value} value={value}>{label}</option>
          ))}
        </select>

        <label className={styles.subHead}>How did it conclude?</label>
        <textarea
          className={styles.input}
          rows={3}
          placeholder="Summarize how the investigation concluded…"
          value={form.summary}
          onChange={set('summary')}
        />

        <label className={styles.subHead}>Key evidence</label>
        <textarea
          className={styles.input}
          rows={2}
          placeholder="What evidence supported this outcome?"
          value={form.keyEvidence}
          onChange={set('keyEvidence')}
        />

        <label className={styles.subHead}>What happened to the victim?</label>
        <textarea
          className={styles.input}
          rows={2}
          placeholder="Compensation, recovery, welfare follow-up, etc."
          value={form.victimOutcome}
          onChange={set('victimOutcome')}
        />

        <label className={styles.subHead}>Amount recovered (optional)</label>
        <input
          className={styles.input}
          type="number"
          placeholder="₹"
          value={form.amountRecovered}
          onChange={set('amountRecovered')}
        />

        <label className={styles.subHead}>Actions taken (optional)</label>
        <textarea
          className={styles.input}
          rows={2}
          placeholder="Arrests made, sections invoked, follow-up steps…"
          value={form.actionsTaken}
          onChange={set('actionsTaken')}
        />

        <div className={styles.recActions} style={{ marginTop: 8 }}>
          <button type="button" className={styles.secondaryBtn} onClick={onClose} disabled={busy}>
            Cancel
          </button>
          <button type="button" className={styles.primaryBtn} onClick={submit} disabled={busy}>
            {busy ? 'Saving…' : 'Mark Complete'}
          </button>
        </div>
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

// function WhatChangedPanel({ latest, versions }) {
//   const [expanded, setExpanded] = useState(false)
//   const delta = latest?.delta

//   if (!latest) return null

//   if (!delta) {
//     return (
//       <section className={styles.section}>
//         <h3 className={styles.sectionTitle}>⭐ What Changed</h3>
//         <p className={styles.empty}>No previous investigation to compare — this is the first investigation version.</p>
//       </section>
//     )
//   }

//   const hasChanges =
//     delta.newFindings.length || delta.newEntities.length || delta.newRelationships.length ||
//     delta.riskChange || delta.confidenceChange || delta.newKnown.length ||
//     delta.resolvedMissing.length || delta.newMissing.length || delta.newRecommendations.length

//   return (
//     <section className={styles.section}>
//       <div className={styles.evidenceHead}>
//         <h3 className={styles.sectionTitle} style={{ margin: 0 }}>
//           ⭐ What Changed <span className={styles.metaText}>v{delta.fromVersion} → v{delta.toVersion}</span>
//         </h3>
//       </div>

//       {!hasChanges ? (
//         <p className={styles.empty}>No new changes detected in this re-investigation.</p>
//       ) : (
//         <div className={styles.changeList}>
//           {delta.newFindings.map((f, i) => (
//             <div key={`nf-${i}`} className={styles.changeItem}>
//               <span className={styles.changeTagAdd}>+ NEW FINDING</span>
//               <p>{f.text}</p>
//             </div>
//           ))}
//           {delta.newEntities.map((e, i) => (
//             <div key={`ne-${i}`} className={styles.changeItem}>
//               <span className={styles.changeTagAdd}>+ NEW ENTITY</span>
//               <p>{e.type.replace(/_/g, ' ')}: {e.value}</p>
//             </div>
//           ))}
//           {delta.newRelationships.map((r, i) => (
//             <div key={`nr-${i}`} className={styles.changeItem}>
//               <span className={styles.changeTagAdd}>+ NEW RELATIONSHIP</span>
//               <p>{r.from} → {r.type.replace(/-/g, ' ')} → {r.to}</p>
//             </div>
//           ))}
//           {delta.riskChange && (
//             <div className={styles.changeItem}>
//               <span className={styles.changeTagRisk}>↑ RISK CHANGE</span>
//               <p>{delta.riskChange.from || 'unknown'} → {delta.riskChange.to}</p>
//             </div>
//           )}
//           {delta.confidenceChange && (
//             <div className={styles.changeItem}>
//               <span className={styles.changeTagRisk}>CONFIDENCE CHANGE</span>
//               <p>{fmtPct(delta.confidenceChange.from)} → {fmtPct(delta.confidenceChange.to)}</p>
//             </div>
//           )}
//           {delta.resolvedMissing.map((m, i) => (
//             <div key={`rm-${i}`} className={styles.changeItem}>
//               <span className={styles.changeTagResolve}>✓ RESOLVED</span>
//               <p>{m.label}</p>
//             </div>
//           ))}
//           {delta.newMissing.map((m, i) => (
//             <div key={`nm-${i}`} className={styles.changeItem}>
//               <span className={styles.changeTagGap}>? NEW GAP</span>
//               <p>{m.label}</p>
//             </div>
//           ))}
//         </div>
//       )}

//       {versions.length > 1 && (
//         <button type="button" className={styles.linkBtn} onClick={() => setExpanded((v) => !v)}>
//           {expanded ? 'Hide full comparison' : 'View Full Comparison'}
//         </button>
//       )}

//       {expanded && <FullComparison versions={versions} />}
//     </section>
//   )
// }

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

function NextBestActionPanel({ caseId, latest, onChanged, readOnly, requests }) {
  const { user } = useAuth()
  const [busyId, setBusyId] = useState(null)
  const [decidedBy, setDecidedBy] = useState('')
  const [err, setErr] = useState(null)

  // Seed the officer field from the logged-in user once /api/auth/me
  // resolves. This is a useEffect (not a useState initializer) because
  // AuthProvider fetches the user asynchronously -- on first render `user`
  // is still null, so a lazy initializer would run too early and miss it.
  useEffect(() => {
    const name = officerDisplayName(user)
    if (name) setDecidedBy(name)
  }, [user])

  const allRecs = latest?.recommendations || []
  const pending = allRecs.filter((r) => r.status === 'pending')
  // Recommendations already approved/rejected -- kept visible (not hidden)
  // so the officer can see what happened to them and track the status of
  // any legal request they spawned, without hunting through Legal Intelligence.
  const decided = allRecs.filter((r) => r.status !== 'pending')

  // Legal requests generated from an approved recommendation that still need
  // officer action (approve / dispatch) -- surfaced here so the officer
  // doesn't have to scroll down to Legal Intelligence right after approving.
  // Once a request is 'sent' or 'overdue' it's no longer awaiting *this*
  // action -- it's waiting on the provider -- so it drops out of this list
  // and its live status is shown instead on the recommendation card below.
  const actionableRequests = (requests || []).filter((r) =>
    ['draft', 'approved'].includes(r.status)
  )

  // Best-effort link from a recommendation back to the request it spawned,
  // so we can show its live status (DRAFT / APPROVED / SENT / OVERDUE / COMPLETED).
  // Matches by requestType and picks the most recently created matching request.
  // NOTE: if the backend ever stores the originating recommendation id on the
  // request record (e.g. `sourceRecommendationId`), prefer matching on that
  // instead -- it removes the ambiguity when multiple same-type requests exist.
  const requestFor = (rec) => {
    if (!rec.requestType) return null
    if (rec.requestId) {
      const direct = (requests || []).find((r) => r.requestId === rec.requestId)
      if (direct) return direct
    }
    const matches = (requests || []).filter((r) => r.requestType === rec.requestType)
    if (!matches.length) return null
    return matches.reduce((a, b) => (new Date(b.createdAt || 0) > new Date(a.createdAt || 0) ? b : a))
  }

  const REQUEST_STATUS_LABEL = {
    draft: 'REQUEST DRAFTED', approved: 'REQUEST APPROVED', sent: 'REQUEST SENT',
    overdue: 'REQUEST OVERDUE', completed: 'REQUEST FULFILLED', rejected: 'REQUEST REJECTED',
  }
  const REQUEST_STATUS_COLOR = {
    draft: 'var(--text-tertiary)', approved: 'var(--accent)', sent: 'var(--warning)',
    overdue: 'var(--danger)', completed: 'var(--success)', rejected: 'var(--danger)',
  }

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

  if (readOnly) {
    return (
      <section className={styles.section}>
        <h3 className={styles.sectionTitle}>⭐ Next Best Action</h3>
        <p className={styles.empty}>This case is closed — recommendations are no longer actionable.</p>
      </section>
    )
  }

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

      {pending.length || decided.length ? (
        <div className={styles.recList}>
          {pending.map((rec) => {
            const urgency = URGENCY_META[rec.urgency] || URGENCY_META.low
            return (
              <div key={`${rec.id}-${rec.action}-${rec.urgency}`} className={styles.recCard}>
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

          {decided.map((rec) => {
            const urgency = URGENCY_META[rec.urgency] || URGENCY_META.low
            const linkedReq = requestFor(rec)
            return (
              <div
                key={`${rec.id}-${rec.action}-decided`}
                className={styles.recCard}
                style={{ opacity: rec.status === 'rejected' ? 0.6 : 1 }}
              >
                <div className={styles.recHead}>
                  <p className={styles.recAction}>{rec.action.toUpperCase()}</p>
                  <span className={styles.urgencyBadge} style={{ color: urgency.color }}>{urgency.label}</span>
                </div>
                <p className={styles.recWhy}><strong>Why:</strong> {rec.why}</p>
                {rec.supportingEvidence?.length > 0 && (
                  <p className={styles.recEvidence}><strong>Supporting evidence:</strong> {rec.supportingEvidence.join(', ')}</p>
                )}
                <div className={styles.recActions}>
                  {rec.status === 'rejected' ? (
                    <span className={styles.requestStatus} style={{ color: 'var(--danger)' }}>REJECTED</span>
                  ) : linkedReq ? (
                    <span className={styles.requestStatus} style={{ color: REQUEST_STATUS_COLOR[linkedReq.status] }}>
                      {REQUEST_STATUS_LABEL[linkedReq.status] || linkedReq.status.toUpperCase()}
                    </span>
                  ) : (
                    <span className={styles.requestStatus} style={{ color: 'var(--success)' }}>APPROVED</span>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      ) : (
        <p className={styles.empty}>No recommendations yet.</p>
      )}

      {actionableRequests.length > 0 && (
        <div style={{ marginTop: 20, paddingTop: 16, borderTop: '1px solid var(--border-soft)' }}>
          <p className={styles.subHead}>Legal Requests Awaiting Action ({actionableRequests.length})</p>
          <div className={styles.requestList}>
            {actionableRequests.map((req) => (
              <LegalRequestCard
                key={req.requestId}
                caseId={caseId}
                req={req}
                onChanged={onChanged}
                readOnly={readOnly}
                defaultExpanded
              />
            ))}
          </div>
        </div>
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
  const [expanded, setExpanded] = useState(false)
  const evidenceCount = (caseDoc.evidence || []).length + (caseDoc.evidenceFiles || []).length

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
                  Supported by: {[...new Set(f.supportingEvidence)].map((s, i) => (
                    <span key={`${s}-${i}`} className={styles.entityChip} style={{ marginRight: 6 }}>{s}</span>
                  ))}
                </p>
              )}
            </div>
          ))}
        </div>
      )}

      <button
        type="button"
        className={styles.evidenceHead}
        onClick={() => setExpanded((v) => !v)}
        aria-expanded={expanded}
        style={{ cursor: 'pointer', width: '100%', background: 'none', border: 'none', textAlign: 'left', padding: 0 }}
      >
        <p className={styles.subHead} style={{ margin: 0 }}>Uploaded Evidence ({evidenceCount})</p>
        <ChevronRightIcon
          width={14}
          height={14}
          style={{ transform: expanded ? 'rotate(90deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }}
        />
      </button>

      {expanded && (
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
      )}
    </section>
  )
}

// =========================================================
// 10. LEGAL INTELLIGENCE
// =========================================================

function LegalIntelligencePanel({ caseId, caseDoc, onChanged, readOnly }) {
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
            <LegalRequestCard key={req.requestId} caseId={caseId} req={req} onChanged={onChanged} readOnly={readOnly} />
          ))}
        </div>
      ) : (
        <p className={styles.empty}>No legal requests generated yet. Approve a Next Best Action above to generate one.</p>
      )}
    </section>
  )
}

function LegalRequestCard({ caseId, req, onChanged, readOnly, defaultExpanded = false }) {
  const { user } = useAuth()
  const [expanded, setExpanded] = useState(defaultExpanded)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState(null)
  const [actor, setActor] = useState('')
  const [providerEmail, setProviderEmail] = useState('')
  const [responseData, setResponseData] = useState({ accountHolder: '', kycPhone: '', kycAddress: '', deviceId: '', ipAddress: '' })

  // See NextBestActionPanel above for why this is a useEffect and not a
  // useState lazy initializer -- `user` resolves after the first render.
  useEffect(() => {
    const name = officerDisplayName(user)
    if (name) setActor(name)
  }, [user])

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

          {req.previewUrl && (
            <a href={req.previewUrl} target="_blank" rel="noreferrer" style={{ color: '#5b9df9' }}>
              View mock email preview
            </a>
          )}
          {req.delivered && !req.previewUrl && (
            <span style={{ color: '#39d98a', fontWeight: 600 }}>✓ Delivered to inbox</span>
          )}

          <input className={styles.input} placeholder="Officer name / badge ID" value={actor} onChange={(e) => setActor(e.target.value)} />

          {readOnly && (
            <p className={styles.metaText}>This case is closed — legal request actions are no longer available.</p>
          )}

          {!readOnly && req.status === 'draft' && (
            <button type="button" className={styles.primaryBtn} disabled={busy || !actor.trim()}
              onClick={() => run(() => apiBackend.post(`/cases/${caseId}/request/${req.requestId}/approve`, { approvedBy: actor }))}>
              Approve Request
            </button>
          )}

          {!readOnly && req.status === 'approved' && (
            <>
              <input className={styles.input} placeholder="Provider email" value={providerEmail} onChange={(e) => setProviderEmail(e.target.value)} />
              <button type="button" className={styles.primaryBtn} disabled={busy || !providerEmail.trim()}
                onClick={() => run(() => apiBackend.post(`/cases/${caseId}/request/${req.requestId}/dispatch`, { providerEmail }))}>
                Dispatch Request
              </button>
            </>
          )}

          {!readOnly && (req.status === 'sent' || req.status === 'overdue') && (
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
const TIMELINE_STEP_WIDTH = 148 // keep in sync with .timelineStep flex-basis in the CSS
const TIMELINE_VISIBLE_STEPS = 8 // how many steps to show at once, per the target design
const TIMELINE_DOT_CENTER_OFFSET = TIMELINE_STEP_WIDTH / 2 // horizontal center of a step, for the connecting line

function titleCaseAction(action) {
  return action
    .toLowerCase()
    .split('_')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ')
}

// Colors each step by what actually happened, not just its position in the list.
function timelineStepColor(action) {
  const a = (action || '').toUpperCase()
  if (a.includes('REJECTED') || a.includes('OVERDUE') || a.includes('FAILED')) return 'var(--danger)'
  if (a.includes('PENDING') || a.includes('IN_PROGRESS') || a.includes('FOR_REVIEW') || a.includes('AWAITING') || a.includes('APPROVAL')) return 'var(--warning)'
  return 'var(--success)' // completed / approved / received / generated / extracted / identified etc.
}

function TimelinePanel({ timeline }) {
  const trackRef = useRef(null)
  const [dragging, setDragging] = useState(false)
  const drag = useRef({ startX: 0, startScroll: 0, moved: false })

  // Only the latest TIMELINE_VISIBLE_STEPS steps are shown, oldest first,
  // newest on the right -- matching the reference design.
  const visible = timeline.slice(-TIMELINE_VISIBLE_STEPS)

  // Land on the latest (rightmost) step whenever the timeline loads or grows.
  useEffect(() => {
    const el = trackRef.current
    if (!el) return
    el.scrollTo({ left: el.scrollWidth, behavior: 'auto' })
  }, [visible.length])

  const scrollByStep = (dir) => {
    trackRef.current?.scrollBy({ left: dir * TIMELINE_STEP_WIDTH * 3, behavior: 'smooth' })
  }
  const scrollToLatest = () => {
    const el = trackRef.current
    if (!el) return
    el.scrollTo({ left: el.scrollWidth, behavior: 'smooth' })
  }

  // Click-drag to scroll on desktop/trackpad; touch already swipes natively.
  const onMouseDown = (e) => {
    const el = trackRef.current
    if (!el) return
    drag.current = { startX: e.pageX, startScroll: el.scrollLeft, moved: false }
    setDragging(true)
  }
  const onMouseMove = (e) => {
    if (!dragging) return
    const el = trackRef.current
    if (!el) return
    drag.current.moved = true
    el.scrollLeft = drag.current.startScroll - (e.pageX - drag.current.startX)
  }
  const endDrag = () => setDragging(false)

  return (
    <section className={styles.section}>
      <div className={styles.timelineHeadRow}>
        <span className={styles.timelineHeadIcon}>
          <HistoryIcon width={17} height={17} />
        </span>
        <div style={{ flex: 1 }}>
          <h3 className={styles.sectionTitle} style={{ margin: 0 }}>Investigation Timeline</h3>
          {timeline.length > 0 && (
            <p className={styles.metaText}>
              Latest {Math.min(timeline.length, TIMELINE_VISIBLE_STEPS)} updates from your investigation
            </p>
          )}
        </div>
        {timeline.length > 0 && (
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              type="button"
              className={styles.secondaryBtn}
              style={{ width: 32, height: 32, padding: 0, borderRadius: '50%', justifyContent: 'center' }}
              onClick={() => scrollByStep(-1)}
              aria-label="Scroll to earlier updates"
            >
              <ChevronRightIcon width={13} height={13} style={{ transform: 'rotate(180deg)' }} />
            </button>
            <button
              type="button"
              className={styles.secondaryBtn}
              style={{ width: 32, height: 32, padding: 0, borderRadius: '50%', justifyContent: 'center' }}
              onClick={() => scrollByStep(1)}
              aria-label="Scroll to later updates"
            >
              <ChevronRightIcon width={13} height={13} />
            </button>
            <button
              type="button"
              className={styles.secondaryBtn}
              style={{ borderColor: 'var(--accent)', color: 'var(--accent)' }}
              onClick={scrollToLatest}
            >
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--accent)', display: 'inline-block' }} />
              Latest
            </button>
          </div>
        )}
      </div>

      {visible.length ? (
        <>
          <div
            ref={trackRef}
            className={`${styles.timelineTrackWrap} ${dragging ? styles.dragging : ''}`}
            onMouseDown={onMouseDown}
            onMouseMove={onMouseMove}
            onMouseUp={endDrag}
            onMouseLeave={endDrag}
            tabIndex={0}
          >
            <div className={styles.timelineTrack}>
              {visible.length > 1 && (
                <div
                  className={styles.timelineLine}
                  style={{
                    left: TIMELINE_DOT_CENTER_OFFSET,
                    width: (visible.length - 1) * TIMELINE_STEP_WIDTH,
                    right: 'auto',
                  }}
                />
              )}
              {visible.map((t, i) => {
                const isCurrent = i === visible.length - 1
                const color = timelineStepColor(t.action)
                return (
                  <div key={t.sequence ?? i} className={styles.timelineStep}>
                    {isCurrent && <span className={styles.timelineLatestTag}>LATEST</span>}
                    {isCurrent ? (
                      <span className={styles.timelineNodeCurrent} style={{ borderColor: color }}>
                        <span className={styles.timelineNodeCurrentInner} style={{ background: color }} />
                      </span>
                    ) : (
                      <span className={styles.timelineNodeDone} style={{ background: color, boxShadow: `0 0 0 1px ${color}` }}>
                        <CheckIcon width={10} height={10} color="var(--card)" />
                      </span>
                    )}
                    <p className={`${styles.timelineStepLabel} ${isCurrent ? styles.timelineStepLabelCurrent : ''}`} style={isCurrent ? { color } : undefined}>
                      {AI_ACTIONS.has(t.action) && <SparklesIcon width={10} height={10} />}
                      {titleCaseAction(t.action)}
                    </p>
                    <p className={styles.timelineStepTime}>{fmtDate(t.timestamp)}</p>
                  </div>
                )
              })}
            </div>
          </div>
          <p className={styles.timelineFooterNote}>
            Showing latest {visible.length} update{visible.length === 1 ? '' : 's'}. New updates appear on the right — swipe or use the arrows to see earlier ones.
          </p>
        </>
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
          <div key={`${v.version}-${i}`} className={styles.historyItem}>
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