import { motion } from 'framer-motion'
import { FolderIcon, HourglassIcon, AnalysisIcon, CheckCircleIcon } from '../Icons/Icons'
import styles from './StatCard.module.css'

const ICONS = {
  folder: FolderIcon,
  hourglass: HourglassIcon,
  search: AnalysisIcon,
  check: CheckCircleIcon,
}

// Deterministic per-tone squiggle so each card reads as "its own" trend line
// without wiring real time-series data yet.
const SPARK_PATHS = {
  accent: 'M2 20 C 14 18, 20 8, 30 12 S 46 4, 58 6',
  warning: 'M2 10 C 14 6, 20 18, 30 14 S 46 20, 58 16',
  violet: 'M2 18 C 14 14, 20 4, 30 10 S 46 2, 58 4',
  success: 'M2 16 C 14 20, 20 6, 30 8 S 46 2, 58 3',
}

export default function StatCard({ label, value, trend, icon, tone = 'accent', index = 0 }) {
  const Icon = ICONS[icon] ?? FolderIcon

  return (
    <motion.div
      className={styles.card}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.32, delay: index * 0.05, ease: [0.16, 1, 0.3, 1] }}
      whileHover={{ y: -2 }}
    >
      <div className={styles.top}>
        <div className={`${styles.iconWrap} ${styles[tone]}`}>
          <Icon width={19} height={19} />
        </div>
        <svg className={styles.spark} viewBox="0 0 60 24" preserveAspectRatio="none" aria-hidden="true">
          <path d={SPARK_PATHS[tone]} className={`${styles.sparkLine} ${styles[tone]}`} />
        </svg>
      </div>
      <div className={styles.body}>
        <p className={styles.label}>{label}</p>
        <p className={styles.value}>{value}</p>
        <p className={styles.trend}>
          <span className={styles.trendUp}>↑</span> {trend}
        </p>
      </div>
    </motion.div>
  )
}
