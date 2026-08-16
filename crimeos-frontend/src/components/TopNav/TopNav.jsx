import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { SearchIcon, BellIcon, MenuIcon, PlusCircleIcon } from '../Icons/Icons'
import styles from './TopNav.module.css'

function getGreeting() {
  const hour = new Date().getHours()
  if (hour < 12) return 'Good Morning'
  if (hour < 17) return 'Good Afternoon'
  return 'Good Evening'
}

export default function TopNav({ onMenuClick, notificationCount = 0, onNewCase }) {
  const navigate = useNavigate()
  const [query, setQuery] = useState('')
  const inputRef = useRef(null)

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
            placeholder="Search cases, persons, phone, UPI, email…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
          />
          <kbd className={styles.kbd}>⌘K</kbd>
        </label>

        <button type="button" className={styles.iconBtn} aria-label="Notifications">
          <BellIcon width={19} height={19} />
          {notificationCount > 0 && <span className={styles.badge}>{notificationCount}</span>}
        </button>

        <button type="button" className={styles.newCaseBtn} onClick={onNewCase}>
          <PlusCircleIcon width={16} height={16} />
          <span>New Case</span>
        </button>
      </div>
    </header>
  )
}