import { useEffect } from 'react'
import styles from './TrinetraLoader.module.css'

// Full-viewport transitional screen shown right after a successful sign-in,
// before the authenticated app mounts. Purely presentational — all timing
// is driven by CSS animation-delay so this component only needs one timer
// to signal "the sequence is done, proceed."
//
// Usage: <TrinetraLoader onComplete={() => navigate('/')} />
export default function TrinetraLoader({ onComplete, duration = 3200 }) {
  useEffect(() => {
    const timer = setTimeout(() => {
      onComplete?.()
    }, duration)
    return () => clearTimeout(timer)
  }, [onComplete, duration])

  return (
    <div className={styles.screen} role="status" aria-live="polite" aria-label="Signing in to TRINETRA">
      <div className={styles.grid} aria-hidden="true" />

      {/* Thin corner brackets — the only HUD framing element */}
      <span className={`${styles.bracket} ${styles.bracketTL}`} aria-hidden="true" />
      <span className={`${styles.bracket} ${styles.bracketTR}`} aria-hidden="true" />
      <span className={`${styles.bracket} ${styles.bracketBL}`} aria-hidden="true" />
      <span className={`${styles.bracket} ${styles.bracketBR}`} aria-hidden="true" />

      <div className={styles.statusLeft} aria-hidden="true">
        <span>SYSTEM STATUS</span>
        <span className={styles.statusOk}>ONLINE</span>
      </div>
      <div className={styles.statusRight} aria-hidden="true">
        <span>OPTICAL ANALYSIS</span>
        <span>SIGNAL LOCK</span>
      </div>

      <div className={styles.center}>
        <EyeScanner />

        <div className={styles.wordmark}>
          TRINETRA<span className={styles.cursor}>_</span>
        </div>
        <div className={styles.tagline}>Decoding the unknown&hellip;</div>
      </div>
    </div>
  )
}

// The forensic "biometric scanner" eye — outer contour, wireframe radials,
// two iris rings, a precise pupil, and a horizontal scan beam that sweeps
// through it once. Built entirely from SVG strokes, animated with CSS
// (stroke-dasharray / opacity / transform) — no canvas, no video.
function EyeScanner() {
  return (
    <svg
      className={styles.eye}
      viewBox="0 0 400 220"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      {/* faint radial wireframe, builds outward from center */}
      <g className={styles.wireframe} stroke="#4D8DFF" strokeWidth="0.6">
        <ellipse cx="200" cy="110" rx="150" ry="70" opacity="0.35" />
        <ellipse cx="200" cy="110" rx="110" ry="95" opacity="0.22" />
        <line x1="200" y1="15" x2="200" y2="205" opacity="0.25" />
        <line x1="55" y1="110" x2="345" y2="110" opacity="0.18" />
      </g>

      {/* outer eye contour — draws itself via stroke-dashoffset */}
      <path
        className={styles.contour}
        d="M20,110 C90,45 150,20 200,20 C250,20 310,45 380,110 C310,175 250,200 200,200 C150,200 90,175 20,110 Z"
        stroke="#78AFFF"
        strokeWidth="1.6"
        strokeLinecap="round"
      />

      {/* iris rings — appear progressively, staggered */}
      <circle className={styles.ringOuter} cx="200" cy="110" r="46" stroke="#4D8DFF" strokeWidth="1.1" />
      <circle className={styles.ringInner} cx="200" cy="110" r="30" stroke="#4D8DFF" strokeWidth="0.8" />

      {/* fine tick marks around the iris, like a lens calibration ring */}
      <g className={styles.ticks} stroke="#4D8DFF" strokeWidth="1">
        {Array.from({ length: 24 }).map((_, i) => {
          const angle = (i * 360) / 24
          return (
            <line
              key={i}
              x1="200"
              y1="66"
              x2="200"
              y2="72"
              transform={`rotate(${angle} 200 110)`}
              opacity={i % 2 === 0 ? 0.5 : 0.22}
            />
          )
        })}
      </g>

      {/* pupil */}
      <circle className={styles.pupil} cx="200" cy="110" r="7" fill="#E8EDF5" />

      {/* horizontal scan beam sweeping down through the eye */}
      <rect className={styles.scanBeam} x="10" y="18" width="380" height="1.4" fill="url(#scanGradient)" />

      <defs>
        <linearGradient id="scanGradient" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#4D8DFF" stopOpacity="0" />
          <stop offset="50%" stopColor="#78AFFF" stopOpacity="0.9" />
          <stop offset="100%" stopColor="#4D8DFF" stopOpacity="0" />
        </linearGradient>
      </defs>
    </svg>
  )
}