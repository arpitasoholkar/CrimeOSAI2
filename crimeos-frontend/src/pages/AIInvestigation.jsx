import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { useParams, useNavigate } from 'react-router-dom'
import { apiBrain } from '../api/api'
import { SparklesIcon, CheckCircleIcon } from '../components/Icons/Icons'
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
      const steps = (analysis?.investigationPath || []).filter((s) => selectedSteps.has(s.id))
      const legalSections = (analysis?.legalSections || []).filter((s) => selectedLegal.has(s.id))
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

  if (loading) return <p className={styles.state}>Loading investigation…</p>
  if (!caseDoc) return <p className={styles.stateError}>{error || 'Case not found.'}</p>

  const analysis = caseDoc.analysis
  // Schema default for `analysis` is {} (not null/undefined), so a plain
  // truthiness check here was rendering the "has analysis" branch on an
  // empty object -- e.g. when investigation genuinely hasn't succeeded
  // yet -- and crashing on .map() over undefined arrays. Check for the
  // one field that actually means "an investigation ran" instead.
  const hasAnalysis = !!analysis?.investigationPath?.length

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
        {analysis?.confidence != null && (
          <span className={styles.confidence}>{Math.round(analysis.confidence * 100)}% confidence</span>
        )}
      </div>

      {error && <p className={styles.error}>{error}</p>}

      {!hasAnalysis ? (
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
              {(analysis.investigationPath || []).map((step) => (
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