import styles from './Skeleton.module.css'

/**
 * A single shimmering placeholder block. Use `width`/`height` for one-off
 * shapes (avatars, badges), or reach for `SkeletonLines`/`SkeletonRows`
 * below for common list/text patterns.
 */
export function Skeleton({ width = '100%', height = 14, radius = 6, className = '' }) {
  return (
    <span
      className={`${styles.block} ${className}`}
      style={{ width, height, borderRadius: radius }}
      aria-hidden="true"
    />
  )
}

/** A stack of skeleton text lines, e.g. for a title + subtitle. */
export function SkeletonLines({ lines = 2, gap = 8 }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap }} aria-hidden="true">
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton key={i} width={i === lines - 1 ? '60%' : '100%'} />
      ))}
    </div>
  )
}

/** Row placeholders shaped like CaseCard rows, for list pages. */
export function SkeletonRows({ count = 4 }) {
  return (
    <div className={styles.rows} aria-hidden="true">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className={styles.row}>
          <div className={styles.rowMain}>
            <Skeleton width={90} height={11} />
            <Skeleton width="45%" height={14} />
          </div>
          <Skeleton width={70} height={22} radius={11} />
          <Skeleton width={60} height={22} radius={11} />
        </div>
      ))}
    </div>
  )
}
