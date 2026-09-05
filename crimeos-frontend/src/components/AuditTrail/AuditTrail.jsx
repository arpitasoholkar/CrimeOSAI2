import { useState } from 'react'
import { apiBackend } from '../../api/api'
import CopyButton from '../CopyButton/CopyButton'
import { useToast } from '../../context/ToastContext'
import styles from './AuditTrail.module.css'

function fmtDate(d) {
  if (!d) return ''
  return new Date(d).toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function shortHash(hash) {
  if (!hash) return '—'
  return `${hash.slice(0, 8)}…${hash.slice(-6)}`
}

/**
 * Shows the case's hash-chained audit log (each entry's action/actor/time
 * plus its SHA-256 hash and the previous entry's hash) and lets an
 * investigator run a one-click integrity check against
 * GET /cases/:id/audit/verify, which recomputes the chain server-side and
 * reports whether any entry has been tampered with.
 */
export default function AuditTrail({ caseId, timeline }) {
  const [expanded, setExpanded] = useState(false)
  const [verifying, setVerifying] = useState(false)
  const [verification, setVerification] = useState(null)
  const toast = useToast()

  const handleVerify = async () => {
    setVerifying(true)
    setVerification(null)
    try {
      const res = await apiBackend.get(`/cases/${caseId}/audit/verify`)
      setVerification(res.data)
      if (res.data.integrityStatus === 'VALID') {
        toast.success('Audit chain verified — no tampering detected.')
      } else {
        toast.error('Audit chain integrity check failed — tampering detected.')
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not verify the audit chain.')
    } finally {
      setVerifying(false)
    }
  }

  const entries = timeline || []

  return (
    <div className={styles.panel}>
      <button
        type="button"
        className={styles.header}
        onClick={() => setExpanded((v) => !v)}
        aria-expanded={expanded}
      >
        <div className={styles.headerLeft}>
          <span className={styles.title}>Audit Trail</span>
          <span className={styles.subtitle}>{entries.length} chained entr{entries.length === 1 ? 'y' : 'ies'}</span>
        </div>
        <span className={`${styles.chevron} ${expanded ? styles.chevronOpen : ''}`}>▾</span>
      </button>

      {expanded && (
        <div className={styles.body}>
          <div className={styles.verifyRow}>
            <button
              type="button"
              className={styles.verifyBtn}
              onClick={handleVerify}
              disabled={verifying || entries.length === 0}
            >
              {verifying ? 'Verifying…' : 'Verify Chain Integrity'}
            </button>

            {verification && (
              <span
                className={`${styles.statusBadge} ${
                  verification.integrityStatus === 'VALID' ? styles.statusValid : styles.statusInvalid
                }`}
              >
                {verification.integrityStatus === 'VALID' ? '✓ Chain Valid' : '⚠ Tampering Detected'}
              </span>
            )}
          </div>

          {entries.length === 0 ? (
            <p className={styles.empty}>No audit entries recorded yet.</p>
          ) : (
            <ol className={styles.list}>
              {entries.map((entry, i) => (
                <li key={entry.sequence ?? i} className={styles.entry}>
                  <div className={styles.entryTop}>
                    <span className={styles.seq}>#{entry.sequence ?? i + 1}</span>
                    <span className={styles.action}>{entry.action}</span>
                    <span className={styles.time}>{fmtDate(entry.timestamp)}</span>
                  </div>
                  <p className={styles.actor}>{entry.actor}</p>
                  <div className={styles.hashRow}>
                    <span className={styles.hashLabel}>hash</span>
                    <span className={styles.hashValue}>{shortHash(entry.integrity?.hash)}</span>
                    <CopyButton value={entry.integrity?.hash} label="Copy full hash" size={11} />
                  </div>
                  {entry.integrity?.previousHash && (
                    <div className={styles.hashRow}>
                      <span className={styles.hashLabel}>prev</span>
                      <span className={styles.hashValue}>{shortHash(entry.integrity.previousHash)}</span>
                      <CopyButton value={entry.integrity.previousHash} label="Copy previous hash" size={11} />
                    </div>
                  )}
                </li>
              ))}
            </ol>
          )}
        </div>
      )}
    </div>
  )
}
