import { motion } from 'framer-motion'
import { UploadCloudIcon, SparklesIcon, ReportIcon, PlusCircleIcon, FolderIcon } from '../Icons/Icons'
import styles from './ActivityFeed.module.css'

const TYPE_META = {
  evidence_uploaded: { icon: UploadCloudIcon, tone: 'success' },
  analysis_completed: { icon: SparklesIcon, tone: 'accent' },
  report_generated: { icon: ReportIcon, tone: 'warning' },
  case_created: { icon: PlusCircleIcon, tone: 'accent' },
  status_updated: { icon: FolderIcon, tone: 'violet' },
}

export default function ActivityFeed({ items }) {
  return (
    <div className={styles.panel}>
      <div className={styles.header}>
        <h2 className={styles.heading}>Today's Activity</h2>
        <span className={styles.liveDot} aria-hidden="true" />
      </div>

      <ol className={styles.timeline}>
        {items.length === 0 && (
          <li className={styles.emptyState}>No activity yet today.</li>
        )}
        {items.map((item, i) => {
          const meta = TYPE_META[item.type] ?? TYPE_META.case_created
          const Icon = meta.icon
          return (
            <motion.li
              key={item.id}
              className={styles.entry}
              initial={{ opacity: 0, x: 8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.28, delay: i * 0.05, ease: [0.16, 1, 0.3, 1] }}
            >
              <span className={`${styles.iconDot} ${styles[meta.tone]}`}>
                <Icon width={13} height={13} />
              </span>
              <div className={styles.entryBody}>
                <p className={styles.caseId}>{item.caseId}</p>
                <p className={styles.entryLabel}>{item.label}</p>
              </div>
              <span className={styles.time}>{item.time}</span>
            </motion.li>
          )
        })}
      </ol>
    </div>
  )
}
