import { useMemo, useState } from 'react'
import styles from './EntityGraph.module.css'

// Category -> color token + short label, purely for grouping/legend.
// Falls back to a neutral color for any entity type not listed here.
const TYPE_META = {
  PERSON_MENTIONED: { label: 'Person', color: 'var(--accent)' },
  ACCOUNT_HOLDER: { label: 'Person', color: 'var(--accent)' },
  SIM_OWNER: { label: 'Person', color: 'var(--accent)' },
  PHONE: { label: 'Phone', color: 'var(--warning)' },
  KYC_PHONE: { label: 'Phone', color: 'var(--warning)' },
  EMAIL: { label: 'Email', color: 'var(--warning)' },
  UPI_ID: { label: 'UPI ID', color: 'var(--violet)' },
  BANK_ACCOUNT: { label: 'Account', color: 'var(--violet)' },
  ACCOUNT_NUMBER: { label: 'Account', color: 'var(--violet)' },
  IFSC_CODE: { label: 'Account', color: 'var(--violet)' },
  KYC_ADDRESS: { label: 'Address', color: 'var(--success)' },
  TOWER_LOCATION: { label: 'Address', color: 'var(--success)' },
  DEVICE_ID: { label: 'Device', color: 'var(--danger)' },
  IP_ADDRESS: { label: 'Device', color: 'var(--danger)' },
  VEHICLE: { label: 'Vehicle', color: 'var(--danger)' },
  TRANSACTION_AMOUNT: { label: 'Transaction', color: 'var(--text-tertiary)' },
  PLATFORM: { label: 'Platform', color: 'var(--text-tertiary)' },
}

const fallbackMeta = { label: 'Other', color: 'var(--text-tertiary)' }

// Builds the node set from entities + relationship endpoints (some
// relationship endpoints, like "Complainant", aren't in the entities
// list at all -- they're still real, just not a typed extracted entity).
function buildNodes(entities, relationships) {
  const nodes = new Map()

  for (const e of entities) {
    nodes.set(e.value, { id: e.value, type: e.type, source: e.source })
  }
  for (const r of relationships) {
    if (!nodes.has(r.from)) nodes.set(r.from, { id: r.from, type: r.from === 'Complainant' ? 'COMPLAINANT' : null, source: r.evidenceRef })
    if (!nodes.has(r.to)) nodes.set(r.to, { id: r.to, type: null, source: r.evidenceRef })
  }

  return [...nodes.values()]
}

export default function EntityGraph({ entities = [], relationships = [] }) {
  const [selected, setSelected] = useState(null)

  const nodes = useMemo(() => buildNodes(entities, relationships), [entities, relationships])

  const size = 440
  const center = size / 2
  const radius = size / 2 - 64

  const positioned = useMemo(() => {
    return nodes.map((n, i) => {
      const angle = (i / Math.max(nodes.length, 1)) * 2 * Math.PI - Math.PI / 2
      return {
        ...n,
        x: center + radius * Math.cos(angle),
        y: center + radius * Math.sin(angle),
      }
    })
  }, [nodes, center, radius])

  const posById = useMemo(() => {
    const map = {}
    for (const n of positioned) map[n.id] = n
    return map
  }, [positioned])

  if (!nodes.length) {
    return <p className={styles.empty}>No entity graph available yet — entities and relationships appear here once evidence is extracted.</p>
  }

  return (
    <div className={styles.wrap}>
      <svg viewBox={`0 0 ${size} ${size}`} className={styles.svg}>
        {relationships.map((r, i) => {
          const from = posById[r.from]
          const to = posById[r.to]
          if (!from || !to) return null
          const midX = (from.x + to.x) / 2
          const midY = (from.y + to.y) / 2
          return (
            <g key={i}>
              <line
                x1={from.x} y1={from.y} x2={to.x} y2={to.y}
                stroke="var(--border)" strokeWidth="1.5"
              />
              <text x={midX} y={midY} className={styles.edgeLabel} textAnchor="middle">
                {r.type.replace(/-/g, ' ')}
              </text>
            </g>
          )
        })}
        {positioned.map((n) => {
          const meta = TYPE_META[n.type] || (n.type === 'COMPLAINANT' ? { label: 'Complainant', color: 'var(--accent)' } : fallbackMeta)
          const isSelected = selected?.id === n.id
          return (
            <g
              key={n.id}
              transform={`translate(${n.x}, ${n.y})`}
              className={styles.node}
              onClick={() => setSelected(isSelected ? null : n)}
            >
              <circle r={isSelected ? 9 : 7} fill={meta.color} stroke="var(--card)" strokeWidth="2" />
              <text y={20} textAnchor="middle" className={styles.nodeLabel}>
                {n.id.length > 16 ? `${n.id.slice(0, 15)}…` : n.id}
              </text>
            </g>
          )
        })}
      </svg>

      <div className={styles.side}>
        <div className={styles.legend}>
          {[...new Set(positioned.map((n) => (TYPE_META[n.type] || (n.type === 'COMPLAINANT' ? { label: 'Complainant', color: 'var(--accent)' } : fallbackMeta)).label))].map((label) => {
            const meta = Object.values(TYPE_META).find((m) => m.label === label) || fallbackMeta
            return (
              <div key={label} className={styles.legendItem}>
                <span className={styles.dot} style={{ background: meta.color }} />
                {label}
              </div>
            )
          })}
        </div>

        {selected ? (
          <div className={styles.detail}>
            <p className={styles.detailType}>{(TYPE_META[selected.type] || fallbackMeta).label}</p>
            <p className={styles.detailValue}>{selected.id}</p>
            {selected.source && <p className={styles.detailSource}>Source: {selected.source}</p>}
          </div>
        ) : (
          <p className={styles.hint}>Click a node to see its details and source.</p>
        )}
      </div>
    </div>
  )
}
