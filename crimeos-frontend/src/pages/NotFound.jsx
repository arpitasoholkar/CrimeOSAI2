import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { SearchIcon, GridIcon, FolderIcon, ShieldLockIcon } from '../components/Icons/Icons'
import styles from './NotFound.module.css'
import useDocumentTitle from '../hooks/useDocumentTitle'

// Shown for any route that doesn't match inside the authenticated shell.
// Styled to match the rest of the product (HUD corner brackets, scan
// grid, monospace "case stamp") instead of a generic error screen.
export default function NotFound() {
  useDocumentTitle('Page Not Found')

  const navigate = useNavigate()

  return (
    <motion.div
      className={styles.wrap}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
    >
      <div className={styles.panel}>
        <span className={`${styles.bracket} ${styles.bracketTL}`} aria-hidden="true" />
        <span className={`${styles.bracket} ${styles.bracketTR}`} aria-hidden="true" />
        <span className={`${styles.bracket} ${styles.bracketBL}`} aria-hidden="true" />
        <span className={`${styles.bracket} ${styles.bracketBR}`} aria-hidden="true" />
        <div className={styles.scanGrid} aria-hidden="true" />

        <div className={styles.stamp}>
          <ShieldLockIcon width={12} height={12} />
          <span>CASE-000404 · NO MATCH</span>
        </div>

        <div className={styles.radarWrap} aria-hidden="true">
          <div className={styles.radarGlow} />
          <RadarScan />
        </div>

        <h1 className={styles.code}>404</h1>
        <h2 className={styles.title}>This trail goes cold.</h2>
        <p className={styles.description}>
          The page you're looking for isn't in our records — it may have been moved,
          renamed, or never filed.
        </p>

        <div className={styles.actions}>
          <button type="button" className={styles.primaryBtn} onClick={() => navigate('/')}>
            <GridIcon width={15} height={15} />
            <span>Return to Dashboard</span>
          </button>
          <button type="button" className={styles.secondaryBtn} onClick={() => navigate('/cases')}>
            <FolderIcon width={15} height={15} />
            <span>Browse Cases</span>
          </button>
        </div>

        <div className={styles.hint}>
          <SearchIcon width={13} height={13} />
          <span>Or search for it from the dashboard — every filed case is indexed there.</span>
        </div>
      </div>
    </motion.div>
  )
}

// Small radar/scanner motif echoing the boot-sequence "eye" without
// duplicating it — a sweeping line over concentric rings, landing on
// nothing, reinforcing "no match found" instead of a generic 404 glyph.
function RadarScan() {
  return (
    <svg viewBox="0 0 160 160" className={styles.radarSvg} fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="80" cy="80" r="70" className={styles.radarRing} />
      <circle cx="80" cy="80" r="48" className={styles.radarRing} />
      <circle cx="80" cy="80" r="26" className={styles.radarRing} />
      <line x1="80" y1="6" x2="80" y2="154" className={styles.radarCross} />
      <line x1="6" y1="80" x2="154" y2="80" className={styles.radarCross} />
      <g className={styles.radarSweep}>
        <path d="M80 80 L80 10 A70 70 0 0 1 138 46 Z" className={styles.radarSweepFill} />
      </g>
      <circle cx="80" cy="80" r="3.5" className={styles.radarDot} />
    </svg>
  )
}