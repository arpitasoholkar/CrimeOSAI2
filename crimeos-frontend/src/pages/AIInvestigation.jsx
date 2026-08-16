import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { useParams, useNavigate } from 'react-router-dom'
import { apiBrain } from '../api/api'
import { SparklesIcon, CheckCircleIcon, HourglassIcon, ChevronRightIcon } from '../components/Icons/Icons'
import styles from './AIInvestigation.module.css'

export default function AIInvestigation() {
  const { caseId } = useParams()
  const navigate = useNavigate()

  const [caseDoc, setCaseDoc] = useState(null)
  const [loading, setLoading] = useState(true)
  const [running, setRunning] = useState(false)
  const [error, setError] = useState(null)

  const [selectedSteps, setSelectedSteps] = useState(new Set())
  const [selectedLegal, setSelectedLegal] = useState(new Set())
  const [officerNotes, setOfficerNotes] = useState('')
  const [decidedBy, setDecidedBy] = useState('')
  const [approving, setApproving] = useState(false)
  const [approved, setApproved] = useState(null)

  // "What Changed?" — investigation version history
  const [showHistory, setShowHistory] = useState(false)
  const [activeVersionNum, setActiveVersionNum] = useState(null)

  const loadCase = () => {
    setLoading(true)
    setError(null)
    return apiBrain
      .get(`/api/case/${caseId}`)
      .then((res) => {
        setCaseDoc(res.data)
        const analysis = res.data.analysis
        if (analysis?.investigationPath) setSelectedSteps(new Set(analysis.investigationPath.map((s) => s.id)))
        if (analysis?.legalSections) setSelectedLegal(new Set(analysis.legalSections.map((s) => s.id)))
      })
      .catch((err) => setError(err.response?.data?.error || 'Failed to load this case.'))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    loadCase()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [caseId])

  const runInvestigation = async () => {
    setRunning(true)
    setError(null)
    try {
      await apiBrain.post('/api/investigate', { case_id: caseId })
      await loadCase()
    } catch (err) {
      setError(err.response?.data?.error || 'Investigation failed.')
    } finally {
      setRunning(false)
    }
  }

  const toggle = (set, setSet, id) => {
    const next = new Set(set)
    next.has(id) ? next.delete(id) : next.add(id)
    setSet(next)
  }

  const handleApprove = async (e) => {
    e.preventDefault()
    setApproving(true)
    setError(null)
    try {
      const analysis = caseDoc.analysis
      const steps = analysis.investigationPath.filter((s) => selectedSteps.has(s.id))
      const legalSections = analysis.legalSections.filter((s) => selectedLegal.has(s.id))
      const res = await apiBrain.post(`/api/case/${caseId}/approve`, {
        steps,
        legalSections,
        officerNotes,
        decidedBy: decidedBy || 'unspecified',
      })
      setApproved(res.data.report)
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to save approval.')
    } finally {
      setApproving(false)
    }
  }

  // Renders a knownInfo/missingInfo/findings/recommendations diff entry,
  // which may be a plain string or an object shaped differently depending
  // on which list it came from (see investigationDiffService.js getItemKey).
  const changeItemLabel = (item) => {
    if (typeof item === 'string') return item
    if (!item || typeof item !== 'object') return String(item)
    return item.item || item.finding || item.recommendation || item.action || item.id || JSON.stringify(item)
  }

  const formatConfidencePct = (value) => (typeof value === 'number' ? `${Math.round(value * 100)}%` : '—')

  if (loading) return <p className={styles.state}>Loading investigation…</p>
  if (!caseDoc) return <p className={styles.stateError}>{error || 'Case not found.'}</p>

  const analysis = caseDoc.analysis
  const versions = Array.isArray(caseDoc.investigationVersions) ? caseDoc.investigationVersions : []
  const sortedVersions = [...versions].sort((a, b) => b.version - a.version)
  const activeVersion =
    sortedVersions.find((v) => v.version === activeVersionNum) || sortedVersions[0] || null
  const activeChanges = activeVersion?.changes || null

  return (
    <motion.div
      className={styles.wrap}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
    >
      <div className={styles.header}>
        <div>
          <p className={styles.caseId}>{caseDoc.case_id}</p>
          <h2 className={styles.title}>AI Investigation</h2>
        </div>
        <div className={styles.headerRight}>
          {analysis?.confidence != null && (
            <span className={styles.confidence}>{Math.round(analysis.confidence * 100)}% confidence</span>
          )}
          {versions.length > 0 && (
            <button
              type="button"
              className={styles.historyToggle}
              onClick={() => setShowHistory((v) => !v)}
              aria-expanded={showHistory}
            >
              <HourglassIcon width={14} height={14} />
              What Changed?
              <ChevronRightIcon
                width={12}
                height={12}
                style={{ transform: showHistory ? 'rotate(90deg)' : 'none' }}
              />
            </button>
          )}
        </div>
      </div>

      {error && <p className={styles.error}>{error}</p>}

      {showHistory && versions.length > 0 && (
        <div className={styles.historyPanel}>
          <h3 className={styles.sectionTitle}>Investigation History</h3>
          <div className={styles.versionList}>
            {sortedVersions.map((v) => (
              <button
                key={v.version}
                type="button"
                className={`${styles.versionChip} ${v.version === activeVersion?.version ? styles.versionChipActive : ''}`}
                onClick={() => setActiveVersionNum(v.version)}
              >
                <span className={styles.versionNum}>v{v.version}</span>
                <span className={styles.versionMeta}>
                  {v.trigger?.replace(/_/g, ' ') || 'reinvestigation'}
                  {v.createdAt ? ` · ${new Date(v.createdAt).toLocaleString()}` : ''}
                </span>
              </button>
            ))}
          </div>

          {activeChanges && (
            <div className={styles.diffDetail}>
              <p className={styles.diffSummary}>{activeChanges.summary}</p>

              {!activeChanges.hasPreviousVersion ? null : (
                <>
                  {activeChanges.confidenceChange?.changed && (
                    <div className={styles.diffRow}>
                      <span className={styles.diffLabel}>AI Confidence</span>
                      <span className={styles.diffValue}>
                        {formatConfidencePct(activeChanges.confidenceChange.previous)} →{' '}
                        {formatConfidencePct(activeChanges.confidenceChange.current)}
                      </span>
                    </div>
                  )}

                  {activeChanges.riskChange?.changed && (
                    <div className={styles.diffRow}>
                      <span className={styles.diffLabel}>Risk Assessment</span>
                      <span className={styles.diffValue}>Updated — see current analysis for details</span>
                    </div>
                  )}

                  {activeChanges.newInformation?.length > 0 && (
                    <div className={styles.diffGroup}>
                      <h4 className={styles.diffGroupTitle}>New Information</h4>
                      <ul className={styles.plainList}>
                        {activeChanges.newInformation.map((item, i) => (
                          <li key={i}>{changeItemLabel(item)}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {activeChanges.resolvedGaps?.length > 0 && (
                    <div className={styles.diffGroup}>
                      <h4 className={styles.diffGroupTitle}>Resolved Gaps</h4>
                      <ul className={styles.plainList}>
                        {activeChanges.resolvedGaps.map((item, i) => (
                          <li key={i}>{changeItemLabel(item)}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {activeChanges.newGaps?.length > 0 && (
                    <div className={styles.diffGroup}>
                      <h4 className={styles.diffGroupTitle}>New Gaps</h4>
                      <ul className={styles.plainList}>
                        {activeChanges.newGaps.map((item, i) => (
                          <li key={i}>{changeItemLabel(item)}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {(activeChanges.newFindings?.length > 0 || activeChanges.changedFindings?.length > 0) && (
                    <div className={styles.diffGroup}>
                      <h4 className={styles.diffGroupTitle}>Findings Changed</h4>
                      <ul className={styles.plainList}>
                        {(activeChanges.newFindings || []).map((item, i) => (
                          <li key={`new-${i}`}>{changeItemLabel(item)}</li>
                        ))}
                        {(activeChanges.changedFindings || []).map((c, i) => (
                          <li key={`chg-${i}`}>{changeItemLabel(c.current)}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {(activeChanges.newRecommendations?.length > 0 ||
                    activeChanges.changedRecommendations?.length > 0) && (
                    <div className={styles.diffGroup}>
                      <h4 className={styles.diffGroupTitle}>Recommendations Changed</h4>
                      <ul className={styles.plainList}>
                        {(activeChanges.newRecommendations || []).map((item, i) => (
                          <li key={`new-${i}`}>{changeItemLabel(item)}</li>
                        ))}
                        {(activeChanges.changedRecommendations || []).map((c, i) => (
                          <li key={`chg-${i}`}>{changeItemLabel(c.current)}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </>
              )}
            </div>
          )}
        </div>
      )}

      {!Array.isArray(analysis?.investigationPath) || analysis.investigationPath.length === 0 ? (
        <div className={styles.emptyState}>
          <SparklesIcon width={22} height={22} />
          <p>No AI analysis yet for this case.</p>
          <button type="button" className={styles.runBtn} onClick={runInvestigation} disabled={running}>
            {running ? 'Running…' : 'Run AI Investigation'}
          </button>
        </div>
      ) : (
        <>
          {analysis.escalation?.required && (
            <div className={styles.escalation}>⚠ Escalation recommended — {analysis.escalation.reason}</div>
          )}

          <form className={styles.form} onSubmit={handleApprove}>
            <section className={styles.section}>
              <h3 className={styles.sectionTitle}>Investigation Steps</h3>
              {analysis.investigationPath.map((step) => (
                <label key={step.id} className={styles.item}>
                  <input
                    type="checkbox"
                    checked={selectedSteps.has(step.id)}
                    onChange={() => toggle(selectedSteps, setSelectedSteps, step.id)}
                  />
                  <span>
                    <strong>{step.step}. {step.action}</strong>
                    <em>{step.grounded_in}</em>
                  </span>
                </label>
              ))}
            </section>

            <section className={styles.section}>
              <h3 className={styles.sectionTitle}>Suggested Legal Sections</h3>
              {(analysis.legalSections || []).map((sec) => (
                <label key={sec.id} className={styles.item}>
                  <input
                    type="checkbox"
                    checked={selectedLegal.has(sec.id)}
                    onChange={() => toggle(selectedLegal, setSelectedLegal, sec.id)}
                  />
                  <span>
                    <strong>{sec.citation}</strong>
                    <em>{sec.summary}</em>
                  </span>
                </label>
              ))}
            </section>

            {analysis.immediateActions?.length > 0 && (
              <section className={styles.section}>
                <h3 className={styles.sectionTitle}>Immediate Actions</h3>
                <ul className={styles.plainList}>
                  {analysis.immediateActions.map((a, i) => (
                    <li key={i}>{a}</li>
                  ))}
                </ul>
              </section>
            )}

            {analysis.gaps?.length > 0 && (
              <section className={styles.section}>
                <h3 className={styles.sectionTitle}>Gaps to Ask About</h3>
                <ul className={styles.plainList}>
                  {analysis.gaps.map((g, i) => (
                    <li key={i}>{g}</li>
                  ))}
                </ul>
              </section>
            )}

            <section className={styles.section}>
              <h3 className={styles.sectionTitle}>Officer Decision</h3>
              <input
                type="text"
                className={styles.input}
                placeholder="Officer name / badge ID"
                value={decidedBy}
                onChange={(e) => setDecidedBy(e.target.value)}
              />
              <textarea
                className={styles.textarea}
                placeholder="Notes (optional)"
                rows={3}
                value={officerNotes}
                onChange={(e) => setOfficerNotes(e.target.value)}
              />
            </section>

            {approved && (
              <div className={styles.success}>
                <CheckCircleIcon width={16} height={16} />
                <span>Approved and saved to case reports.</span>
                <button type="button" className={styles.successLink} onClick={() => navigate(`/cases/${caseId}`)}>
                  Back to Case
                </button>
              </div>
            )}

            <button type="submit" className={styles.approveBtn} disabled={approving}>
              {approving ? 'Saving…' : 'Approve Selected Steps & Sections'}
            </button>
          </form>
        </>
      )}
    </motion.div>
  )
}