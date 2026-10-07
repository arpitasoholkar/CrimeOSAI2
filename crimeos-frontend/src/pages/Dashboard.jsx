import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import StatCard from '../components/StatCard/StatCard'
import CaseCard from '../components/CaseCard/CaseCard'
import ActivityFeed from '../components/ActivityFeed/ActivityFeed'
import QuickActions from '../components/QuickActions/QuickActions'
import { FolderIcon } from '../components/Icons/Icons'
import { apiBackend } from '../api/api'
import { quickActions } from '../data/mockData'
import styles from './Dashboard.module.css'
import useDocumentTitle from '../hooks/useDocumentTitle'
import { SkeletonRows } from '../components/Skeleton/Skeleton'

// Presentation-only metadata for each stat -- the backend only knows counts,
// not which icon/color a count should render with.
const STAT_CONFIG = [
  { key: 'total', label: 'Total Cases', icon: 'folder', tone: 'accent' },
  { key: 'pending', label: 'Pending', icon: 'hourglass', tone: 'warning' },
  { key: 'underInvestigation', label: 'Under Investigation', icon: 'search', tone: 'violet' },
  { key: 'resolved', label: 'Resolved', icon: 'check', tone: 'success' },
]

export default function Dashboard() {
  useDocumentTitle('Dashboard')

  const navigate = useNavigate()
  const [stats, setStats] = useState(null)
  const [recentCases, setRecentCases] = useState([])
  const [activityFeed, setActivityFeed] = useState([])
  const [loadingCases, setLoadingCases] = useState(true)

  useEffect(() => {
    apiBackend.get('/api/stats').then((res) => setStats(res.data)).catch(console.error)
    apiBackend.get('/api/cases?limit=4')
      .then((res) => setRecentCases(res.data))
      .catch(console.error)
      .finally(() => setLoadingCases(false))
    apiBackend.get('/api/activity?limit=4').then((res) => setActivityFeed(res.data)).catch(console.error)
  }, [])

  const heroStats = STAT_CONFIG.map((cfg) => ({
    id: cfg.key,
    label: cfg.label,
    icon: cfg.icon,
    tone: cfg.tone,
    value: stats ? stats[cfg.key] : '—',
    trend: 'Live data', // no historical snapshot to compute a real % change against yet
  }))

  const handleQuickAction = (id) => {
    if (id === 'upload') navigate('/new-case')
    if (id === 'mycases') navigate('/my-cases')
    if (id === 'search') navigate('/cases')
  }

  return (
    <div className={styles.layout}>
      <div className={styles.mainCol}>
        <section className={styles.statsGrid}>
          {heroStats.map((stat, i) => (
            <StatCard key={stat.id} {...stat} index={i} />
          ))}
        </section>

        <motion.section
          className={styles.casesPanel}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.32, delay: 0.15, ease: [0.16, 1, 0.3, 1] }}
        >
          <div className={styles.panelHeader}>
            <h2 className={styles.panelTitle}>Recent Investigations</h2>
            <button type="button" className={styles.viewAll} onClick={() => navigate('/cases')}>
              View All
            </button>
          </div>

          <div className={styles.caseList}>
            {loadingCases ? (
              <SkeletonRows count={4} />
            ) : recentCases.length === 0 ? (
              <div className={styles.emptyState}>
                <FolderIcon width={28} height={28} />
                <p>No investigations yet. Create a case to get started.</p>
              </div>
            ) : (
              recentCases.map((c, i) => (
                <CaseCard key={c.id} caseItem={c} index={i} onOpen={(id) => navigate(`/cases/${id}`)} />
              ))
            )}
          </div>
        </motion.section>
      </div>

      <aside className={styles.rightCol}>
        <ActivityFeed items={activityFeed} />
        <QuickActions actions={quickActions} onAction={handleQuickAction} />
      </aside>
    </div>
  )
}