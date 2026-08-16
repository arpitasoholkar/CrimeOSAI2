import { useState } from 'react'
import { motion } from 'framer-motion'
import { FileTextIcon, ImageIcon, AudioIcon, ChevronRightIcon, LockIcon, CheckCircleIcon } from '../Icons/Icons'
import { apiBackend } from '../../api/api'
import styles from './CaseCard.module.css'

const STATUS_STYLE = {
  'Under Investigation': 'statusInvestigation',
  Pending: 'statusPending',
  Resolved: 'statusResolved',
}

const RISK_STYLE = {
  High: 'riskHigh',
  Medium: 'riskMedium',
  Low: 'riskLow',
}

const EVIDENCE_ICON = {
  pdf: FileTextIcon,
  image: ImageIcon,
  audio: AudioIcon,
}

export default function CaseCard({ caseItem, index = 0, onOpen }) {
  const { id, title, status, evidence, extraEvidence, risk, updated, isInvestigator, hasPendingRequest } = caseItem
  const [pending, setPending] = useState(hasPendingRequest)
  const [requesting, setRequesting] = useState(false)
  const [justRequested, setJustRequested] = useState(false)

  const handleRequestAccess = async (e) => {
    e.stopPropagation()
    setRequesting(true)
    try {
      await apiBackend.post(`/cases/${id}/access-request`)
      setPending(true)
      setJustRequested(true)
    } catch (err) {
      console.error(err)
    } finally {
      setRequesting(false)
    }
  }

  return (
    <motion.div
      className={styles.row}
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.28, delay: index * 0.04, ease: [0.16, 1, 0.3, 1] }}
    >
      <div className={styles.identity}>
        <p className={styles.id}>{id}</p>
        <p className={styles.title}>{title}</p>
      </div>

      <div className={styles.statusCol}>
        <span className={`${styles.statusBadge} ${styles[STATUS_STYLE[status] ?? 'statusPending']}`}>
          {status}
        </span>
        {risk && (
          <span className={`${styles.riskBadge} ${styles[RISK_STYLE[risk] ?? 'riskMedium']}`}>{risk} risk</span>
        )}
      </div>

      <div className={styles.evidenceCol}>
        <span className={styles.evidenceLabel}>Evidence</span>
        <div className={styles.evidenceIcons}>
          {evidence.map((item, i) => {
            const Icon = EVIDENCE_ICON[item.type] ?? FileTextIcon
            return (
              <span key={i} className={`${styles.evidenceChip} ${styles[item.type]}`}>
                <Icon width={13} height={13} />
              </span>
            )
          })}
          {extraEvidence > 0 && <span className={styles.evidenceMore}>+{extraEvidence}</span>}
        </div>
      </div>

      <div className={styles.updatedCol}>
        <span className={styles.updatedLabel}>Updated</span>
        <span className={styles.updatedValue}>{updated}</span>
      </div>

      {isInvestigator === false ? (
        pending ? (
          <span className={styles.pendingLabel}>
            {justRequested ? <CheckCircleIcon width={13} height={13} /> : <LockIcon width={13} height={13} />}
            {justRequested ? 'Requested' : 'Request Pending'}
          </span>
        ) : (
          <button
            type="button"
            className={styles.requestBtn}
            onClick={handleRequestAccess}
            disabled={requesting}
          >
            <LockIcon width={13} height={13} />
            {requesting ? 'Requesting…' : 'Request Access'}
          </button>
        )
      ) : (
        <button type="button" className={styles.openBtn} onClick={() => onOpen?.(id)} aria-label={`Open ${id}`}>
          <ChevronRightIcon width={17} height={17} />
        </button>
      )}
    </motion.div>
  )
}
