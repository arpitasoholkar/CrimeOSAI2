import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { SearchIcon, BellIcon, MenuIcon, PlusCircleIcon, LockIcon, HourglassIcon } from '../Icons/Icons'
import { apiBackend } from '../../api/api'
import styles from './TopNav.module.css'

function getGreeting() {
  const hour = new Date().getHours()
  if (hour < 12) return 'Good Morning'
  if (hour < 17) return 'Good Afternoon'
  return 'Good Evening'
}

function fmtDate(d) {
  if (!d) return ''
  return new Date(d).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })
}

export default function TopNav({ onMenuClick, onNewCase }) {
  const navigate = useNavigate()
  const [query, setQuery] = useState('')
  const inputRef = useRef(null)

  // Notifications = incoming access requests waiting on this investigator's
  // approval. Previously this bell had a static count and did nothing when
  // clicked -- now it fetches the real list (same endpoint the Access
  // Requests page uses) and opens a dropdown to act on it.
  const [requests, setRequests] = useState([])
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(true)
  const popoverRef = useRef(null)

  useEffect(() => {
    let cancelled = false

    const loadRequests = () => {
      apiBackend
        .get('/cases/access-requests/incoming')
        .then((res) => {
          if (cancelled) return
          setRequests(res.data.requests || [])
        })
        .catch(() => {})
        .finally(() => {
          if (!cancelled) setLoading(false)
        })
    }

    loadRequests()
    const interval = setInterval(loadRequests, 30000)
    return () => {
      cancelled = true
      clearInterval(interval)
    }
  }, [])

  // Close the dropdown on outside click.
  useEffect(() => {
    if (!open) return
    const handleClick = (e) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [open])

  // ⌘K / Ctrl+K focuses the search box from anywhere, matching the kbd
  // hint shown inside it.
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        inputRef.current?.focus()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  // Reuses the Cases page's existing working search (GET /api/cases?q=...
  // matches case ID and title) instead of duplicating that logic here --
  // same destination the "Search Entities" quick action already points to.
  const runSearch = () => {
    const q = query.trim()
    if (!q) return
    navigate(`/cases?q=${encodeURIComponent(q)}`)
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      runSearch()
    }
  }

  const goToRequests = () => {
    setOpen(false)
    navigate('/access-requests')
  }

  const notificationCount = requests.length

  return (
    <header className={styles.topnav}>
      <div className={styles.left}>
        <button type="button" className={styles.menuBtn} onClick={onMenuClick} aria-label="Open menu">
          <MenuIcon width={20} height={20} />
        </button>
        <div>
          <h1 className={styles.greeting}>{getGreeting()}, Investigator 👋</h1>
          <p className={styles.subtitle}>Track, analyze and solve cases with intelligent tools.</p>
        </div>
      </div>

      <div className={styles.right}>
        <label className={styles.search}>
          <button
            type="button"
            className={styles.searchIconBtn}
            onClick={runSearch}
            aria-label="Search"
          >
            <SearchIcon width={16} height={16} className={styles.searchIcon} />
          </button>
          <input
            ref={inputRef}
            type="text"
            placeholder="Search cases"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
          />
          <kbd className={styles.kbd}>⌘K</kbd>
        </label>

        <div className={styles.notifWrap} ref={popoverRef}>
          <button
            type="button"
            className={styles.iconBtn}
            aria-label="Notifications"
            onClick={() => setOpen((o) => !o)}
          >
            <BellIcon width={19} height={19} />
            {notificationCount > 0 && (
              <span className={styles.badge}>{notificationCount > 9 ? '9+' : notificationCount}</span>
            )}
          </button>

          <AnimatePresence>
            {open && (
              <motion.div
                className={styles.notifPanel}
                initial={{ opacity: 0, y: -6, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -6, scale: 0.98 }}
                transition={{ duration: 0.16, ease: [0.16, 1, 0.3, 1] }}
              >
                <div className={styles.notifHeader}>
                  <span>Notifications</span>
                  {notificationCount > 0 && <span className={styles.notifCount}>{notificationCount} pending</span>}
                </div>

                {loading ? (
                  <p className={styles.notifEmpty}>Loading…</p>
                ) : requests.length === 0 ? (
                  <div className={styles.notifEmpty}>
                    <HourglassIcon width={18} height={18} />
                    <span>You&apos;re all caught up — no pending requests.</span>
                  </div>
                ) : (
                  <div className={styles.notifList}>
                    {requests.slice(0, 6).map((r) => (
                      <button
                        type="button"
                        key={r.requestId}
                        className={styles.notifItem}
                        onClick={goToRequests}
                      >
                        <span className={styles.notifIcon}>
                          <LockIcon width={14} height={14} />
                        </span>
                        <span className={styles.notifBody}>
                          <span className={styles.notifText}>
                            <strong>{r.requesterName}</strong> requested access to {r.case_id}
                          </span>
                          <span className={styles.notifTime}>{fmtDate(r.requestedAt)}</span>
                        </span>
                      </button>
                    ))}
                  </div>
                )}

                <button type="button" className={styles.notifFooter} onClick={goToRequests}>
                  View all access requests
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <button type="button" className={styles.newCaseBtn} onClick={onNewCase}>
          <PlusCircleIcon width={16} height={16} />
          <span>New Case</span>
        </button>
      </div>
    </header>
  )
}
