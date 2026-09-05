import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { useTheme } from '../context/ThemeContext'
import { useAuth } from '../context/AuthContext'
import {
  SunIcon,
  MoonIcon,
  BellIcon,
  UserIcon,
  ShieldLockIcon,
  MailIcon,
  BadgeIcon,
  BuildingIcon,
  EditIcon,
  LogOutIcon,
} from '../components/Icons/Icons'
import styles from './Settings.module.css'
import useDocumentTitle from '../hooks/useDocumentTitle'

const PREFS_KEY = 'trinetra-notification-prefs'

const DEFAULT_PREFS = {
  accessRequests: true,
  caseUpdates: true,
  weeklyDigest: false,
}

function loadPrefs() {
  try {
    const stored = JSON.parse(localStorage.getItem(PREFS_KEY))
    if (stored && typeof stored === 'object') return { ...DEFAULT_PREFS, ...stored }
  } catch {
    /* ignore malformed storage */
  }
  return DEFAULT_PREFS
}

function Toggle({ checked, onChange, label }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      className={`${styles.switch} ${checked ? styles.switchOn : ''}`}
      onClick={() => onChange(!checked)}
    >
      <span className={styles.switchKnob} />
    </button>
  )
}

export default function Settings() {
  useDocumentTitle('Settings')

  const { theme, setTheme } = useTheme()
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  const [prefs, setPrefs] = useState(loadPrefs)

  useEffect(() => {
    localStorage.setItem(PREFS_KEY, JSON.stringify(prefs))
  }, [prefs])

  const updatePref = (key) => (value) => setPrefs((p) => ({ ...p, [key]: value }))

  const handleLogout = () => {
    logout()
    navigate('/login', { replace: true })
  }

  return (
    <motion.div
      className={styles.wrap}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
    >
      {/* Appearance */}
      <section className={styles.panel}>
        <div className={styles.panelHeader}>
          {theme === 'dark' ? <MoonIcon width={16} height={16} /> : <SunIcon width={16} height={16} />}
          <h3 className={styles.panelTitle}>Appearance</h3>
        </div>
        <p className={styles.panelDesc}>Choose how Trinetra looks on this device.</p>

        <div className={styles.themeOptions}>
          <button
            type="button"
            className={`${styles.themeOption} ${theme === 'dark' ? styles.themeOptionActive : ''}`}
            onClick={() => setTheme('dark')}
          >
            <MoonIcon width={16} height={16} />
            Dark
          </button>
          <button
            type="button"
            className={`${styles.themeOption} ${theme === 'light' ? styles.themeOptionActive : ''}`}
            onClick={() => setTheme('light')}
          >
            <SunIcon width={16} height={16} />
            Light
          </button>
        </div>
      </section>

      {/* Notifications */}
      <section className={styles.panel}>
        <div className={styles.panelHeader}>
          <BellIcon width={16} height={16} />
          <h3 className={styles.panelTitle}>Notifications</h3>
        </div>
        <p className={styles.panelDesc}>Control what shows up in the notification bell and inbox.</p>

        <div className={styles.list}>
          <div className={styles.row}>
            <div>
              <p className={styles.rowTitle}>Access request alerts</p>
              <p className={styles.rowSub}>Notify me when someone requests access to a case I own.</p>
            </div>
            <Toggle
              checked={prefs.accessRequests}
              onChange={updatePref('accessRequests')}
              label="Access request alerts"
            />
          </div>

          <div className={styles.row}>
            <div>
              <p className={styles.rowTitle}>Case status updates</p>
              <p className={styles.rowSub}>Notify me when a case I'm assigned to changes status.</p>
            </div>
            <Toggle checked={prefs.caseUpdates} onChange={updatePref('caseUpdates')} label="Case status updates" />
          </div>

          <div className={styles.row}>
            <div>
              <p className={styles.rowTitle}>Weekly digest</p>
              <p className={styles.rowSub}>A weekly summary of activity across your cases.</p>
            </div>
            <Toggle checked={prefs.weeklyDigest} onChange={updatePref('weeklyDigest')} label="Weekly digest" />
          </div>
        </div>
      </section>

      {/* Account */}
      <section className={styles.panel}>
        <div className={styles.panelHeader}>
          <UserIcon width={16} height={16} />
          <h3 className={styles.panelTitle}>Account</h3>
        </div>
        <p className={styles.panelDesc}>Your identity across Trinetra.</p>

        <div className={styles.accountGrid}>
          <div className={styles.accountRow}>
            <MailIcon width={14} height={14} />
            <span>
              {user?.email ? (
                <a href={`mailto:${user.email}`} className={styles.accountLink}>{user.email}</a>
              ) : '—'}
            </span>
          </div>
          <div className={styles.accountRow}>
            <BadgeIcon width={14} height={14} />
            <span>{user?.role || '—'}</span>
          </div>
          <div className={styles.accountRow}>
            <BuildingIcon width={14} height={14} />
            <span>{user?.organisation || '—'}</span>
          </div>
        </div>

        <button type="button" className={styles.linkBtn} onClick={() => navigate('/profile')}>
          <EditIcon width={14} height={14} />
          Edit profile details
        </button>
      </section>

      {/* Security */}
      <section className={styles.panel}>
        <div className={styles.panelHeader}>
          <ShieldLockIcon width={16} height={16} />
          <h3 className={styles.panelTitle}>Security</h3>
        </div>
        <p className={styles.panelDesc}>Session and access management.</p>

        <button type="button" className={styles.logoutBtn} onClick={handleLogout}>
          <LogOutIcon width={14} height={14} />
          Log out of this device
        </button>
      </section>
    </motion.div>
  )
}
