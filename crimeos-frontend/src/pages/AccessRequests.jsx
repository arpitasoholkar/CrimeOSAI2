import { useCallback, useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { Link } from 'react-router-dom'
import { apiBackend } from '../api/api'
import { CheckIcon, XCircleIcon, HourglassIcon } from '../components/Icons/Icons'
import styles from './AccessRequests.module.css'
import useDocumentTitle from '../hooks/useDocumentTitle'

const STATUS_STYLE = {
  pending: 'statusPending',
  approved: 'statusApproved',
  rejected: 'statusRejected',
}

function fmtDate(d) {
  if (!d) return ''
  return new Date(d).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })
}

export default function AccessRequests() {
  useDocumentTitle('Access Requests')

  const [mine, setMine] = useState([])
  const [incoming, setIncoming] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [busyId, setBusyId] = useState(null)
  const [actionError, setActionError] = useState(null)

  const load = useCallback(() => {
    setLoading(true)
    setError(null)
    return Promise.all([
      apiBackend.get('/cases/access-requests/mine').then((res) => setMine(res.data.requests || [])),
      apiBackend.get('/cases/access-requests/incoming').then((res) => setIncoming(res.data.requests || [])),
    ])
      .catch((err) => {
        console.error(err)
        setError('Could not load access requests. Is the backend running?')
      })
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const respond = async (caseId, requestId, action) => {
    setBusyId(requestId)
    setActionError(null)
    try {
      await apiBackend.post(`/cases/${caseId}/access-request/${requestId}/${action}`)
      await load()
    } catch (err) {
      setActionError(err.response?.data?.message || `Could not ${action} this request.`)
    } finally {
      setBusyId(null)
    }
  }

  return (
    <motion.div
      className={styles.wrap}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
    >
      {error && <div className={styles.stateMsg}>{error}</div>}
      {actionError && <p className={styles.actionError}>{actionError}</p>}

      {!error && incoming.length > 0 && (
        <section className={styles.panel}>
          <h3 className={styles.panelTitle}>Requests awaiting your approval</h3>
          <div className={styles.list}>
            {incoming.map((r) => (
              <div key={r.requestId} className={styles.item}>
                <div className={styles.itemInfo}>
                  <p className={styles.itemTitle}>
                    <strong>{r.requesterName}</strong> requested access to{' '}
                    <Link to={`/cases/${r.case_id}`}>{r.case_id}</Link> — {r.caseTitle}
                  </p>
                  {r.message && <p className={styles.itemMessage}>&ldquo;{r.message}&rdquo;</p>}
                  <p className={styles.itemMeta}>Requested {fmtDate(r.requestedAt)}</p>
                </div>
                <div className={styles.itemActions}>
                  <button
                    type="button"
                    className={styles.approveBtn}
                    disabled={busyId === r.requestId}
                    onClick={() => respond(r.case_id, r.requestId, 'approve')}
                  >
                    <CheckIcon width={14} height={14} /> Approve
                  </button>
                  <button
                    type="button"
                    className={styles.rejectBtn}
                    disabled={busyId === r.requestId}
                    onClick={() => respond(r.case_id, r.requestId, 'reject')}
                  >
                    <XCircleIcon width={14} height={14} /> Reject
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {!error && (
        <section className={styles.panel}>
          <h3 className={styles.panelTitle}>Your requests</h3>
          {loading ? (
            <p className={styles.stateMsg}>Loading…</p>
          ) : mine.length === 0 ? (
            <div className={styles.emptyState}>
              <HourglassIcon width={24} height={24} />
              <p>You haven't requested access to any cases.</p>
            </div>
          ) : (
            <div className={styles.list}>
              {mine.map((r) => (
                <div key={r.requestId} className={styles.item}>
                  <div className={styles.itemInfo}>
                    <p className={styles.itemTitle}>
                      <Link to={`/cases/${r.case_id}`}>{r.case_id}</Link> — {r.caseTitle}
                    </p>
                    <p className={styles.itemMeta}>Requested {fmtDate(r.requestedAt)}</p>
                  </div>
                  <span className={`${styles.statusBadge} ${styles[STATUS_STYLE[r.status] ?? 'statusPending']}`}>
                    {r.status}
                  </span>
                </div>
              ))}
            </div>
          )}
        </section>
      )}
    </motion.div>
  )
}
