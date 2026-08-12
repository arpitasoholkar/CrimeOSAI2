import { UploadCloudIcon, ReportIcon, SearchIcon } from '../Icons/Icons'
import styles from './QuickActions.module.css'

const ICONS = {
  upload: UploadCloudIcon,
  report: ReportIcon,
  search: SearchIcon,
}

export default function QuickActions({ actions, onAction }) {
  return (
    <div className={styles.panel}>
      <h2 className={styles.heading}>Quick Actions</h2>
      <div className={styles.grid}>
        {actions.map((action) => {
          const Icon = ICONS[action.icon] ?? UploadCloudIcon
          return (
            <button
              key={action.id}
              type="button"
              className={styles.tile}
              onClick={() => onAction?.(action.id)}
            >
              <span className={styles.iconWrap}>
                <Icon width={18} height={18} />
              </span>
              <span className={styles.label}>{action.label}</span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
