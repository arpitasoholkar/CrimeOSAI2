import { SearchIcon, BellIcon, MenuIcon, PlusCircleIcon } from '../Icons/Icons'
import styles from './TopNav.module.css'

function getGreeting() {
  const hour = new Date().getHours()
  if (hour < 12) return 'Good Morning'
  if (hour < 17) return 'Good Afternoon'
  return 'Good Evening'
}

export default function TopNav({ onMenuClick, notificationCount = 0, onNewCase }) {
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
          <SearchIcon width={16} height={16} className={styles.searchIcon} />
          <input type="text" placeholder="Search cases, persons, phone, UPI, email…" />
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
