import { NavLink } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { useTheme } from '../../context/ThemeContext'
import {
  ShieldIcon,
  GridIcon,
  FolderIcon,
  PlusCircleIcon,
  AnalysisIcon,
  ReportIcon,
  SettingsIcon,
  SunIcon,
  MoonIcon,
  XIcon,
} from '../Icons/Icons'
import styles from './Sidebar.module.css'

const NAV_ITEMS = [
  { to: '/', label: 'Dashboard', icon: GridIcon, end: true },
  { to: '/cases', label: 'Cases', icon: FolderIcon },
  { to: '/new-case', label: 'New Case', icon: PlusCircleIcon },
  { to: '/analysis', label: 'Analysis', icon: AnalysisIcon },
  { to: '/reports', label: 'Reports', icon: ReportIcon },
  { to: '/settings', label: 'Settings', icon: SettingsIcon },
]

function SidebarContent({ onNavigate }) {
  const { theme, toggleTheme } = useTheme()

  return (
    <>
      <div className={styles.brand}>
        <span className={styles.brandMark}>
          <ShieldIcon width={22} height={22} />
        </span>
        <div>
          <p className={styles.brandName}>
            CRIME<span>OS</span>
          </p>
          <p className={styles.brandSub}>Cyber Investigation OS</p>
        </div>
      </div>

      <nav className={styles.nav} aria-label="Primary">
        {NAV_ITEMS.map(({ to, label, icon: Icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            onClick={onNavigate}
            className={({ isActive }) => `${styles.navItem} ${isActive ? styles.navItemActive : ''}`}
          >
            <Icon width={18} height={18} />
            <span>{label}</span>
          </NavLink>
        ))}
      </nav>

      <div className={styles.footer}>
        <button
          type="button"
          className={styles.themeToggle}
          onClick={toggleTheme}
          aria-pressed={theme === 'light'}
        >
          <span className={styles.themeLabel}>
            {theme === 'dark' ? <MoonIcon width={16} height={16} /> : <SunIcon width={16} height={16} />}
            {theme === 'dark' ? 'Dark Mode' : 'Light Mode'}
          </span>
          <span className={`${styles.switch} ${theme === 'light' ? styles.switchOn : ''}`}>
            <span className={styles.switchKnob} />
          </span>
        </button>

        <button type="button" className={styles.profile}>
          <span className={styles.avatar}>IN</span>
          <span className={styles.profileText}>
            <span className={styles.profileName}>Investigator</span>
            <span className={styles.profileRole}>Cyber Crime Unit</span>
          </span>
          <span className={styles.profileChevron}>›</span>
        </button>
      </div>
    </>
  )
}

export default function Sidebar({ isOpen, onClose }) {
  return (
    <>
      {/* Desktop / tablet: static column */}
      <aside className={styles.sidebar}>
        <SidebarContent />
      </aside>

      {/* Mobile: slide-in drawer */}
      <AnimatePresence>
        {isOpen && (
          <>
            <motion.div
              className={styles.scrim}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.18 }}
              onClick={onClose}
            />
            <motion.aside
              className={styles.drawer}
              initial={{ x: -280 }}
              animate={{ x: 0 }}
              exit={{ x: -280 }}
              transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
            >
              <button type="button" className={styles.closeBtn} onClick={onClose} aria-label="Close menu">
                <XIcon width={18} height={18} />
              </button>
              <SidebarContent onNavigate={onClose} />
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </>
  )
}
