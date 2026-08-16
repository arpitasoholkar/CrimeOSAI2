import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import CaseCard from '../components/CaseCard/CaseCard'
import { ArchiveIcon } from '../components/Icons/Icons'
import { apiBackend } from '../api/api'
import styles from './Cases.module.css'

const OUTCOME_LABEL = {
  culprit_identified: 'Culprit Identified',
  culprit_arrested: 'Culprit Arrested',
  money_recovered: 'Money Recovered',
  false_complaint: 'False Complaint',
  withdrawn_by_complainant: 'Withdrawn',
  unable_to_resolve: 'Unable to Resolve',
  other: 'Other',
}

// Archive cases are always fully open to view (every investigator, not
// just the ones who worked the case -- see getArchivedCases on the
// backend), so CaseCard always gets isInvestigator: true here.
function toCaseItem(c) {
  return {
    id: c.case_id,
    title: c.title || 'Untitled Case',
    status: c.resolution ? OUTCOME_LABEL[c.resolution.outcome] || 'Resolved' : 'Resolved',
    risk: null,
    evidence: [],
    extraEvidence: 0,
    updated: c.resolution?.closedAt
      ? new Date(c.resolution.closedAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
      : '',
    isInvestigator: true,
  }
}

export default function CasesArchive() {
  const navigate = useNavigate()
  const [cases, setCases] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)
    apiBackend
      .get('/cases/archive/all')
      .then((res) => {
        if (cancelled) return
        setCases(res.data.cases || [])
      })
      .catch((err) => {
        if (cancelled) return
        console.error(err)
        setError('Could not load the cases archive. Is the backend running?')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [])

  return (
    <motion.div
      className={styles.wrap}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
    >
      <div className={styles.panel}>
        <div className={styles.panelHeader}>
          <span className={styles.rangeLabel}>
            {loading ? 'Loading…' : `${cases.length} completed case${cases.length === 1 ? '' : 's'}`}
          </span>
        </div>

        {error && <div className={styles.stateMsg}>{error}</div>}

        {!error && !loading && cases.length === 0 && (
          <div className={styles.emptyState}>
            <ArchiveIcon width={28} height={28} />
            <p>No cases have been marked complete yet.</p>
          </div>
        )}

        {!error && cases.length > 0 && (
          <div className={styles.caseList}>
            {cases.map((c, i) => (
              <CaseCard key={c.case_id} caseItem={toCaseItem(c)} index={i} onOpen={(id) => navigate(`/cases/${id}`)} />
            ))}
          </div>
        )}
      </div>
    </motion.div>
  )
}
