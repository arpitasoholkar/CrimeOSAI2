import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import CaseCard from '../components/CaseCard/CaseCard'
import { FolderIcon } from '../components/Icons/Icons'
import { apiBackend } from '../api/api'
import styles from './Cases.module.css'
import useDocumentTitle from '../hooks/useDocumentTitle'

// The backend only sends case_id/title/status/severity/updatedAt for
// /cases/my (no evidence breakdown), so map into the shape CaseCard
// expects with sensible fallbacks.
function toCaseItem(c) {
  return {
    id: c.case_id,
    title: c.title || 'Untitled Case',
    status: STATUS_LABEL[c.status] || c.status,
    risk: RISK_LABEL[c.severity] || null,
    evidence: [],
    extraEvidence: 0,
    updated: c.updatedAt ? new Date(c.updatedAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }) : '',
    isInvestigator: true,
  }
}

const STATUS_LABEL = {
  pending_analysis: 'Pending',
  pending_action: 'Pending',
  under_investigation: 'Under Investigation',
  investigation_approved: 'Investigation Approved',
  open: 'Under Investigation',
  resolved: 'Resolved',
  closed: 'Resolved',
}

const RISK_LABEL = {
  low: 'Low',
  medium: 'Medium',
  high: 'High',
  critical: 'High',
}

export default function MyCases() {
  useDocumentTitle('My Cases')

  const navigate = useNavigate()
  const [cases, setCases] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)
    apiBackend
      .get('/cases/my')
      .then((res) => {
        if (cancelled) return
        setCases(res.data.cases || [])
      })
      .catch((err) => {
        if (cancelled) return
        console.error(err)
        setError('Could not load your cases. Is the backend running?')
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
            {loading ? 'Loading…' : `${cases.length} case${cases.length === 1 ? '' : 's'} you're on`}
          </span>
          <button type="button" className={styles.newCaseBtn} onClick={() => navigate('/new-case')}>
            New Case
          </button>
        </div>

        {error && <div className={styles.stateMsg}>{error}</div>}

        {!error && !loading && cases.length === 0 && (
          <div className={styles.emptyState}>
            <FolderIcon width={28} height={28} />
            <p>You're not an investigator on any cases yet.</p>
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
