// Trinetra-branded loading indicator: a scanning eye that blinks and
// sweeps, echoing the splash-screen mark. Used anywhere we're waiting on
// something slow (AI investigation, case load, etc) instead of a plain
// spinner or "Running…" text.
import styles from './EyeLoader.module.css'

export default function EyeLoader({ label = 'Loading…', size = 64 }) {
  return (
    <div className={styles.wrap}>
      <svg
        className={styles.eye}
        width={size}
        height={size * 0.6}
        viewBox="0 0 120 72"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* Outer eye shape */}
        <path
          className={styles.eyeOutline}
          d="M4 36C18 10 42 2 60 2C78 2 102 10 116 36C102 62 78 70 60 70C42 70 18 62 4 36Z"
        />
        {/* Blinking lid — animates closed/open over the outline */}
        <path
          className={styles.eyeLid}
          d="M4 36C18 10 42 2 60 2C78 2 102 10 116 36C102 10 78 2 60 2C42 2 18 10 4 36Z"
        />
        {/* Iris rings */}
        <circle className={styles.ring} cx="60" cy="36" r="18" />
        <circle className={styles.ring} cx="60" cy="36" r="11" />
        <circle className={styles.pupil} cx="60" cy="36" r="4" />
        {/* Scan sweep */}
        <line className={styles.sweep} x1="60" y1="36" x2="60" y2="18" />
      </svg>
      {label && <p className={styles.label}>{label}</p>}
    </div>
  )
}
