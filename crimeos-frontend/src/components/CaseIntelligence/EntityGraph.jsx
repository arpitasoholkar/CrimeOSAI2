// import { useEffect, useMemo, useRef, useState } from 'react'
// import { forceSimulation, forceLink, forceManyBody, forceCenter, forceCollide } from 'd3-force'
// import styles from './EntityGraph.module.css'

// // Category -> color token + short label, purely for grouping/legend.
// // Falls back to a neutral color for any entity type not listed here.
// const TYPE_META = {
//   PERSON_MENTIONED: { label: 'Person', color: 'var(--accent)' },
//   ACCOUNT_HOLDER: { label: 'Person', color: 'var(--accent)' },
//   SIM_OWNER: { label: 'Person', color: 'var(--accent)' },
//   PHONE: { label: 'Phone', color: 'var(--warning)' },
//   KYC_PHONE: { label: 'Phone', color: 'var(--warning)' },
//   EMAIL: { label: 'Email', color: 'var(--warning)' },
//   UPI_ID: { label: 'UPI ID', color: 'var(--violet)' },
//   BANK_ACCOUNT: { label: 'Account', color: 'var(--violet)' },
//   ACCOUNT_NUMBER: { label: 'Account', color: 'var(--violet)' },
//   IFSC_CODE: { label: 'Account', color: 'var(--violet)' },
//   KYC_ADDRESS: { label: 'Address', color: 'var(--success)' },
//   TOWER_LOCATION: { label: 'Address', color: 'var(--success)' },
//   ADDRESS: { label: 'Address', color: 'var(--success)' },
//   DEVICE_ID: { label: 'Device', color: 'var(--danger)' },
//   IP_ADDRESS: { label: 'Device', color: 'var(--danger)' },
//   VEHICLE: { label: 'Vehicle', color: 'var(--danger)' },
//   TRANSACTION_AMOUNT: { label: 'Transaction', color: 'var(--text-tertiary)' },
//   PLATFORM: { label: 'Platform', color: 'var(--text-tertiary)' },
// }

// const fallbackMeta = { label: 'Other', color: 'var(--text-tertiary)' }

// function metaFor(type) {
//   return TYPE_META[type] || (type === 'COMPLAINANT' ? { label: 'Complainant', color: 'var(--accent)' } : fallbackMeta)
// }

// // Builds the node set from entities + relationship endpoints (some
// // relationship endpoints, like "Complainant", aren't in the entities
// // list at all -- they're still real, just not a typed extracted entity).
// function buildNodesAndLinks(entities, relationships) {
//   const nodes = new Map()

//   for (const e of entities) {
//     nodes.set(e.value, { id: e.value, type: e.type, source: e.source })
//   }
//   for (const r of relationships) {
//     if (!nodes.has(r.from)) nodes.set(r.from, { id: r.from, type: r.from === 'Complainant' ? 'COMPLAINANT' : null, source: r.evidenceRef })
//     if (!nodes.has(r.to)) nodes.set(r.to, { id: r.to, type: null, source: r.evidenceRef })
//   }

//   const degree = new Map()
//   for (const r of relationships) {
//     degree.set(r.from, (degree.get(r.from) || 0) + 1)
//     degree.set(r.to, (degree.get(r.to) || 0) + 1)
//   }

//   const nodeList = [...nodes.values()].map((n) => ({ ...n, degree: degree.get(n.id) || 0 }))
//   const linkList = relationships.map((r, i) => ({ id: i, source: r.from, target: r.to, type: r.type }))

//   return { nodeList, linkList }
// }

// const WIDTH = 480
// const HEIGHT = 420
// // Keep every node's center (and therefore its label, which hangs below
// // the circle) inside the visible viewBox. Without this, forceCenter only
// // pins the *average* position of all nodes to the middle -- with two or
// // three nodes and a strong repulsion force, individual nodes routinely
// // drifted past the edge of the canvas entirely (see the "nodes stuck in
// // the bottom-right corner, labels overlapping" bug this replaces).
// const PADDING = 42
// const GOLDEN_ANGLE = 2.399963229728653 // radians; even spiral distribution

// function clamp(value, min, max) {
//   return Math.max(min, Math.min(max, value))
// }

// // Monospace label width is predictable enough to estimate without a DOM
// // measurement pass -- used to size the pill background behind labels and
// // to keep the collision force from letting labels overlap each other.
// function estimateTextWidth(text, fontSize) {
//   return text.length * fontSize * 0.62
// }

// export default function EntityGraph({ entities = [], relationships = [] }) {
//   const [selected, setSelected] = useState(null)
//   const [hovered, setHovered] = useState(null)
//   const [positions, setPositions] = useState({}) // id -> { x, y }
//   const [transform, setTransform] = useState({ x: 0, y: 0, k: 1 })
//   const [settled, setSettled] = useState(false)

//   const simRef = useRef(null)
//   const svgRef = useRef(null)
//   const dragRef = useRef(null) // { id, moved }
//   const panRef = useRef(null) // { startX, startY, startTx, startTy }
//   const userAdjustedViewRef = useRef(false)

//   const { nodeList, linkList } = useMemo(() => buildNodesAndLinks(entities, relationships), [entities, relationships])

//   // Run a real force simulation (d3-force) so the graph organizes itself
//   // by connectivity instead of a fixed circle -- clusters of tightly
//   // linked entities pull together, loosely-connected ones drift apart.
//   useEffect(() => {
//     if (!nodeList.length) {
//       setPositions({})
//       return
//     }

//     const simNodes = nodeList.map((n) => ({ ...n }))
//     const simLinks = linkList.map((l) => ({ ...l }))

//     // Seed a symmetric starting layout (evenly spaced around the center)
//     // instead of letting d3 default to its phyllotaxis pattern near the
//     // origin -- that default cluster sits away from forceCenter's target
//     // and, combined with strong repulsion, is what pushed small graphs
//     // (2-3 nodes) off toward one corner instead of settling in view.
//     const cx = WIDTH / 2
//     const cy = HEIGHT / 2
//     const seedRadius = Math.min(WIDTH, HEIGHT) / 2 - PADDING
//     simNodes.forEach((n, i) => {
//       const angle = i * GOLDEN_ANGLE
//       const r = seedRadius * Math.sqrt((i + 0.5) / simNodes.length)
//       n.x = cx + r * Math.cos(angle)
//       n.y = cy + r * Math.sin(angle)
//     })

//     const sim = forceSimulation(simNodes)
//       .force('link', forceLink(simLinks).id((d) => d.id).distance(95).strength(0.5))
//       .force('charge', forceManyBody().strength(-260))
//       .force('center', forceCenter(cx, cy))
//       // Collision radius includes room for the label hanging below each
//       // node, not just the circle itself, so two nodes settling near
//       // each other don't print overlapping text.
//       .force('collide', forceCollide((d) => 15 + d.degree * 2 + estimateTextWidth(String(d.id), 9.5) / 2))
//       .alpha(1)
//       .alphaDecay(0.045)

//     setSettled(false)
//     userAdjustedViewRef.current = false

//     sim.on('tick', () => {
//       const next = {}
//       for (const n of simNodes) {
//         // Hard-clamp every node inside the canvas each tick -- keeps
//         // circles and their labels fully visible regardless of node
//         // count or how hard the charge force pushes them apart.
//         n.x = clamp(n.x, PADDING, WIDTH - PADDING)
//         n.y = clamp(n.y, PADDING, HEIGHT - PADDING)
//         next[n.id] = { x: n.x, y: n.y }
//       }
//       setPositions(next)
//     })

//     sim.on('end', () => setSettled(true))

//     simRef.current = { sim, simNodes }

//     return () => sim.stop()
//     // eslint-disable-next-line react-hooks/exhaustive-deps
//   }, [nodeList.length, linkList.length])

//   // Frame the current node positions nicely -- for a sparse 2-3 node
//   // graph this avoids the layout floating tiny/off-center in a mostly
//   // empty canvas, and for a dense graph it makes sure nothing spills
//   // past the visible edge.
//   const fitToNodes = (pts) => {
//     if (pts.length < 2) {
//       setTransform({ x: 0, y: 0, k: 1 })
//       return
//     }
//     const xs = pts.map((p) => p.x)
//     const ys = pts.map((p) => p.y)
//     const margin = 46
//     const minX = Math.min(...xs) - margin
//     const maxX = Math.max(...xs) + margin
//     const minY = Math.min(...ys) - margin
//     const maxY = Math.max(...ys) + margin
//     const boxW = Math.max(maxX - minX, 1)
//     const boxH = Math.max(maxY - minY, 1)

//     const k = clamp(Math.min(WIDTH / boxW, HEIGHT / boxH), 0.65, 1.8)
//     const cx = (minX + maxX) / 2
//     const cy = (minY + maxY) / 2

//     setTransform({ x: WIDTH / 2 - cx * k, y: HEIGHT / 2 - cy * k, k })
//   }

//   // Auto-frame once the layout has settled. Skipped once the person has
//   // manually panned or zoomed so it never fights their input.
//   useEffect(() => {
//     if (!settled || userAdjustedViewRef.current) return
//     fitToNodes(Object.values(positions))
//     // eslint-disable-next-line react-hooks/exhaustive-deps
//   }, [settled])

//   // ---- drag: pin a node under the cursor and reheat the simulation ----
//   const toSvgPoint = (clientX, clientY) => {
//     const rect = svgRef.current.getBoundingClientRect()
//     const x = ((clientX - rect.left) / rect.width) * WIDTH
//     const y = ((clientY - rect.top) / rect.height) * HEIGHT
//     return { x: (x - transform.x) / transform.k, y: (y - transform.y) / transform.k }
//   }

//   const handleNodePointerDown = (id) => (e) => {
//     e.stopPropagation()
//     dragRef.current = { id, moved: false }
//     const sim = simRef.current?.sim
//     if (sim) sim.alphaTarget(0.25).restart()
//   }

//   useEffect(() => {
//     const handleMove = (e) => {
//       if (dragRef.current) {
//         const { id } = dragRef.current
//         const node = simRef.current?.simNodes.find((n) => n.id === id)
//         if (node) {
//           const p = toSvgPoint(e.clientX, e.clientY)
//           node.fx = p.x
//           node.fy = p.y
//           dragRef.current.moved = true
//         }
//         return
//       }
//       if (panRef.current) {
//   const { startX, startY, startTx, startTy } = panRef.current
//   const dx = e.clientX - startX
//   const dy = e.clientY - startY
//   setTransform((t) => ({ ...t, x: startTx + dx, y: startTy + dy }))
// }
//     }

//     const handleUp = () => {
//       if (dragRef.current) {
//         const { id, moved } = dragRef.current
//         const node = simRef.current?.simNodes.find((n) => n.id === id)
//         if (node) {
//           node.fx = null
//           node.fy = null
//         }
//         const sim = simRef.current?.sim
//         if (sim) sim.alphaTarget(0)
//         if (!moved) {
//           const full = nodeList.find((n) => n.id === id)
//           setSelected((prev) => (prev?.id === id ? null : full))
//         }
//         dragRef.current = null
//       }
//       panRef.current = null
//     }

//     window.addEventListener('pointermove', handleMove)
//     window.addEventListener('pointerup', handleUp)
//     return () => {
//       window.removeEventListener('pointermove', handleMove)
//       window.removeEventListener('pointerup', handleUp)
//     }
//     // eslint-disable-next-line react-hooks/exhaustive-deps
//   }, [transform, nodeList])

//   const handleBackgroundPointerDown = (e) => {
//     userAdjustedViewRef.current = true
//     panRef.current = { startX: e.clientX, startY: e.clientY, startTx: transform.x, startTy: transform.y }
//   }

//   // React's onWheel prop is attached as a passive listener, so
//   // preventDefault() inside it is silently ignored by the browser and
//   // logs "Unable to preventDefault inside passive event listener
//   // invocation" on every tick. Attaching the listener manually with
//   // { passive: false } is the only way to actually stop page scroll
//   // while zooming the graph.
//   useEffect(() => {
//     const el = svgRef.current
//     if (!el) return

//     const onWheel = (e) => {
//       e.preventDefault()
//       userAdjustedViewRef.current = true
//       const factor = e.deltaY > 0 ? 0.9 : 1.1
//       setTransform((t) => ({ ...t, k: clamp(t.k * factor, 0.4, 2.5) }))
//     }

//     el.addEventListener('wheel', onWheel, { passive: false })
//     return () => el.removeEventListener('wheel', onWheel)
//   }, [])

//   const resetView = () => {
//     userAdjustedViewRef.current = false
//     fitToNodes(Object.values(positions))
//   }

//   if (!nodeList.length) {
//     return <p className={styles.empty}>No entity graph available yet — entities and relationships appear here once evidence is extracted.</p>
//   }

//   // Which node ids are "in focus" (selected/hovered + their direct neighbors),
//   // so we can dim everything else and make the connections you care about
//   // easy to trace at a glance.
//   const focusId = selected?.id ?? hovered
//   const focusedNeighbors = new Set()
//   if (focusId) {
//     focusedNeighbors.add(focusId)
//     for (const l of linkList) {
//       if (l.source === focusId) focusedNeighbors.add(l.target)
//       if (l.target === focusId) focusedNeighbors.add(l.source)
//     }
//   }
//   const dimNonFocused = focusId != null

//   return (
//     <div className={styles.wrap}>
//       <div className={styles.graphCol}>
//         <div className={styles.toolbar}>
//           <span className={styles.hintSmall}>Drag nodes to rearrange · scroll to zoom · drag background to pan</span>
//           <div className={styles.toolbarRight}>
//             <span className={styles.zoomTag}>{Math.round(transform.k * 100)}%</span>
//             <button type="button" className={styles.resetBtn} onClick={resetView}>Reset view</button>
//           </div>
//         </div>

//         <svg
//           ref={svgRef}
//           viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
//           className={styles.svg}
//           onPointerDown={handleBackgroundPointerDown}
//         >
//           <defs>
//             <marker id="arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
//               <path d="M0,0 L10,5 L0,10 z" fill="var(--border)" />
//             </marker>
//           </defs>

//           <g transform={`translate(${transform.x}, ${transform.y}) scale(${transform.k})`}>
//             {linkList.map((l) => {
//               const from = positions[l.source]
//               const to = positions[l.target]
//               if (!from || !to) return null
//               const isFocused = !dimNonFocused || (focusedNeighbors.has(l.source) && focusedNeighbors.has(l.target))
//               const dx = to.x - from.x
//               const dy = to.y - from.y
//               const len = Math.hypot(dx, dy) || 1
//               const midX = (from.x + to.x) / 2
//               const midY = (from.y + to.y) / 2
//               // Nudge the label off the line itself (perpendicular offset)
//               // so it doesn't sit directly on top of a node's own label
//               // when two connected nodes end up close together -- this is
//               // what caused edge and node labels to print on top of each
//               // other. Short links (nodes right next to each other) skip
//               // the label entirely since there's no room to place it
//               // without overlapping one of the nodes.
//               const label = l.type.replace(/-/g, ' ')
//               const showLabel = len > 46
//               const nx = -dy / len
//               const ny = dx / len
//               const labelX = midX + nx * 9
//               const labelY = midY + ny * 9
//               const labelW = estimateTextWidth(label, 8.5) + 8

//               return (
//                 // Prefixed so this key can never collide with a nodeList
//                 // key below -- both maps render as siblings under the
//                 // same <g>, and l.id (a numeric link index) could
//                 // otherwise coincide with a node id that happens to
//                 // stringify to the same value (e.g. an entity whose
//                 // value is literally "1"). That collision is what
//                 // produced the "two children with the same key, `1`"
//                 // warning.
//                 <g key={`link-${l.id}`} opacity={isFocused ? 1 : 0.12}>
//                   <line
//                     x1={from.x} y1={from.y} x2={to.x} y2={to.y}
//                     stroke={isFocused && dimNonFocused ? 'var(--accent)' : 'var(--border)'}
//                     strokeWidth={isFocused && dimNonFocused ? 2 : 1.4}
//                     markerEnd="url(#arrow)"
//                   />
//                   {showLabel && (
//                     <g transform={`translate(${labelX}, ${labelY})`}>
//                       <rect
//                         x={-labelW / 2} y={-7.5} width={labelW} height={11}
//                         rx={5} className={styles.edgeLabelBg}
//                       />
//                       <text textAnchor="middle" y={1.5} className={styles.edgeLabel}>
//                         {label}
//                       </text>
//                     </g>
//                   )}
//                 </g>
//               )
//             })}

//             {nodeList.map((n) => {
//               const pos = positions[n.id]
//               if (!pos) return null
//               const meta = metaFor(n.type)
//               const isSelected = selected?.id === n.id
//               const isFocused = !dimNonFocused || focusedNeighbors.has(n.id)
//               const radius = 7 + Math.min(n.degree, 5) * 1.6
//               const label = n.id.length > 16 ? `${n.id.slice(0, 15)}…` : n.id
//               const labelW = estimateTextWidth(label, 9.5) + 10

//               return (
//                 <g
//                   key={`node-${n.id}`}
//                   transform={`translate(${pos.x}, ${pos.y})`}
//                   className={styles.node}
//                   opacity={isFocused ? 1 : 0.25}
//                   onPointerDown={handleNodePointerDown(n.id)}
//                   onPointerEnter={() => setHovered(n.id)}
//                   onPointerLeave={() => setHovered(null)}
//                 >
//                   <circle
//                     r={isSelected ? radius + 2 : radius}
//                     fill={meta.color}
//                     stroke="var(--card)"
//                     strokeWidth="2"
//                   />
//                   {isSelected && <circle r={radius + 6} className={styles.selectedRing} />}
//                   <rect
//                     x={-labelW / 2} y={radius + 6} width={labelW} height={13}
//                     rx={4} className={styles.nodeLabelBg}
//                   />
//                   <text y={radius + 15.5} textAnchor="middle" className={styles.nodeLabel}>
//                     {label}
//                   </text>
//                 </g>
//               )
//             })}
//           </g>
//         </svg>
//       </div>

//       <div className={styles.side}>
//         <div className={styles.legend}>
//           {[...new Set(nodeList.map((n) => metaFor(n.type).label))].map((label) => {
//             const meta = Object.values(TYPE_META).find((m) => m.label === label) || fallbackMeta
//             return (
//               <div key={label} className={styles.legendItem}>
//                 <span className={styles.dot} style={{ background: meta.color }} />
//                 {label}
//               </div>
//             )
//           })}
//         </div>

//         {selected ? (
//           <div className={styles.detail}>
//             <button type="button" className={styles.detailClose} onClick={() => setSelected(null)} aria-label="Close details">×</button>
//             <p className={styles.detailType}>{metaFor(selected.type).label}</p>
//             <p className={styles.detailValue}>{selected.id}</p>
//             {selected.source && <p className={styles.detailSource}>Source: {selected.source}</p>}
//             <p className={styles.detailSource}>{selected.degree} connection{selected.degree === 1 ? '' : 's'}</p>
//           </div>
//         ) : (
//           <p className={styles.hint}>Click a node to pin its details and highlight its connections. Bigger nodes have more links.</p>
//         )}
//       </div>
//     </div>
//   )
// }

import { useEffect, useMemo, useRef, useState } from 'react'
import { forceSimulation, forceLink, forceManyBody, forceCenter, forceCollide } from 'd3-force'
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
  ADDRESS: { label: 'Address', color: 'var(--success)' },
  DEVICE_ID: { label: 'Device', color: 'var(--danger)' },
  IP_ADDRESS: { label: 'Device', color: 'var(--danger)' },
  VEHICLE: { label: 'Vehicle', color: 'var(--danger)' },
  TRANSACTION_AMOUNT: { label: 'Transaction', color: 'var(--text-tertiary)' },
  PLATFORM: { label: 'Platform', color: 'var(--text-tertiary)' },
}

const fallbackMeta = { label: 'Other', color: 'var(--text-tertiary)' }

function metaFor(type) {
  return TYPE_META[type] || (type === 'COMPLAINANT' ? { label: 'Complainant', color: 'var(--accent)' } : fallbackMeta)
}

// Builds the node set from entities + relationship endpoints (some
// relationship endpoints, like "Complainant", aren't in the entities
// list at all -- they're still real, just not a typed extracted entity).
function buildNodesAndLinks(entities, relationships) {
  const nodes = new Map()

  for (const e of entities) {
    nodes.set(e.value, { id: e.value, type: e.type, source: e.source })
  }
  for (const r of relationships) {
    if (!nodes.has(r.from)) nodes.set(r.from, { id: r.from, type: r.from === 'Complainant' ? 'COMPLAINANT' : null, source: r.evidenceRef })
    if (!nodes.has(r.to)) nodes.set(r.to, { id: r.to, type: null, source: r.evidenceRef })
  }

  const degree = new Map()
  for (const r of relationships) {
    degree.set(r.from, (degree.get(r.from) || 0) + 1)
    degree.set(r.to, (degree.get(r.to) || 0) + 1)
  }

  const nodeList = [...nodes.values()].map((n) => ({ ...n, degree: degree.get(n.id) || 0 }))
  const linkList = relationships.map((r, i) => ({ id: i, source: r.from, target: r.to, type: r.type }))

  return { nodeList, linkList }
}

const WIDTH = 480
const HEIGHT = 420
// Keep every node's center (and therefore its label, which hangs below
// the circle) inside the visible viewBox. Without this, forceCenter only
// pins the *average* position of all nodes to the middle -- with two or
// three nodes and a strong repulsion force, individual nodes routinely
// drifted past the edge of the canvas entirely (see the "nodes stuck in
// the bottom-right corner, labels overlapping" bug this replaces).
const PADDING = 42
const GOLDEN_ANGLE = 2.399963229728653 // radians; even spiral distribution

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value))
}

// Monospace label width is predictable enough to estimate without a DOM
// measurement pass -- used to size the pill background behind labels and
// to keep the collision force from letting labels overlap each other.
function estimateTextWidth(text, fontSize) {
  return text.length * fontSize * 0.62
}

export default function EntityGraph({ entities = [], relationships = [] }) {
  const [selected, setSelected] = useState(null)
  const [hovered, setHovered] = useState(null)
  const [positions, setPositions] = useState({}) // id -> { x, y }
  const [transform, setTransform] = useState({ x: 0, y: 0, k: 1 })
  const [settled, setSettled] = useState(false)

  const simRef = useRef(null)
  const svgRef = useRef(null)
  const dragRef = useRef(null) // { id, moved }
  const userAdjustedViewRef = useRef(false)

  const { nodeList, linkList } = useMemo(() => buildNodesAndLinks(entities, relationships), [entities, relationships])

  // Run a real force simulation (d3-force) so the graph organizes itself
  // by connectivity instead of a fixed circle -- clusters of tightly
  // linked entities pull together, loosely-connected ones drift apart.
  useEffect(() => {
    if (!nodeList.length) {
      setPositions({})
      return
    }

    const simNodes = nodeList.map((n) => ({ ...n }))
    const simLinks = linkList.map((l) => ({ ...l }))

    // Seed a symmetric starting layout (evenly spaced around the center)
    // instead of letting d3 default to its phyllotaxis pattern near the
    // origin -- that default cluster sits away from forceCenter's target
    // and, combined with strong repulsion, is what pushed small graphs
    // (2-3 nodes) off toward one corner instead of settling in view.
    const cx = WIDTH / 2
    const cy = HEIGHT / 2
    const seedRadius = Math.min(WIDTH, HEIGHT) / 2 - PADDING
    simNodes.forEach((n, i) => {
      const angle = i * GOLDEN_ANGLE
      const r = seedRadius * Math.sqrt((i + 0.5) / simNodes.length)
      n.x = cx + r * Math.cos(angle)
      n.y = cy + r * Math.sin(angle)
    })

    const sim = forceSimulation(simNodes)
      .force('link', forceLink(simLinks).id((d) => d.id).distance(95).strength(0.5))
      .force('charge', forceManyBody().strength(-260))
      .force('center', forceCenter(cx, cy))
      // Collision radius includes room for the label hanging below each
      // node, not just the circle itself, so two nodes settling near
      // each other don't print overlapping text.
      .force('collide', forceCollide((d) => 15 + d.degree * 2 + estimateTextWidth(String(d.id), 9.5) / 2))
      .alpha(1)
      .alphaDecay(0.045)

    setSettled(false)
    userAdjustedViewRef.current = false

    sim.on('tick', () => {
      const next = {}
      for (const n of simNodes) {
        // Hard-clamp every node inside the canvas each tick -- keeps
        // circles and their labels fully visible regardless of node
        // count or how hard the charge force pushes them apart.
        n.x = clamp(n.x, PADDING, WIDTH - PADDING)
        n.y = clamp(n.y, PADDING, HEIGHT - PADDING)
        next[n.id] = { x: n.x, y: n.y }
      }
      setPositions(next)
    })

    sim.on('end', () => setSettled(true))

    simRef.current = { sim, simNodes }

    return () => sim.stop()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nodeList.length, linkList.length])

  // The simulation already clamps every node inside the canvas (see the
  // PADDING clamp in the tick handler), so there's no need to rescale
  // the view to fit content -- that was producing an initial zoom like
  // 91% or 98% instead of a clean 100%. Reset simply returns to the
  // identity transform; content is always fully visible at k=1.
  const resetToDefaultView = () => {
    setTransform({ x: 0, y: 0, k: 1 })
  }

  // Auto-frame once the layout has settled. Skipped once the person has
  // manually panned or zoomed so it never fights their input.
  useEffect(() => {
    if (!settled || userAdjustedViewRef.current) return
    resetToDefaultView()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [settled])

  // ---- drag: pin a node under the cursor and reheat the simulation ----
  const toSvgPoint = (clientX, clientY) => {
    const rect = svgRef.current.getBoundingClientRect()
    const x = ((clientX - rect.left) / rect.width) * WIDTH
    const y = ((clientY - rect.top) / rect.height) * HEIGHT
    return { x: (x - transform.x) / transform.k, y: (y - transform.y) / transform.k }
  }

  const handleNodePointerDown = (id) => (e) => {
    e.stopPropagation()
    dragRef.current = { id, moved: false }
    const sim = simRef.current?.sim
    if (sim) sim.alphaTarget(0.25).restart()
  }

  useEffect(() => {
    const handleMove = (e) => {
      if (dragRef.current) {
        const { id } = dragRef.current
        const node = simRef.current?.simNodes.find((n) => n.id === id)
        if (node) {
          const p = toSvgPoint(e.clientX, e.clientY)
          node.fx = p.x
          node.fy = p.y
          dragRef.current.moved = true
        }
      }
    }

    const handleUp = () => {
      if (dragRef.current) {
        const { id, moved } = dragRef.current
        const node = simRef.current?.simNodes.find((n) => n.id === id)
        if (node) {
          node.fx = null
          node.fy = null
        }
        const sim = simRef.current?.sim
        if (sim) sim.alphaTarget(0)
        if (!moved) {
          const full = nodeList.find((n) => n.id === id)
          setSelected((prev) => (prev?.id === id ? null : full))
        }
        dragRef.current = null
      }
    }

    window.addEventListener('pointermove', handleMove)
    window.addEventListener('pointerup', handleUp)
    return () => {
      window.removeEventListener('pointermove', handleMove)
      window.removeEventListener('pointerup', handleUp)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [transform, nodeList])

  // Shared zoom step used by the +/- buttons -- keeps the zoom level
  // clamped to the same [0.4, 2.5] range everywhere.
  const zoomBy = (factor) => {
    userAdjustedViewRef.current = true
    setTransform((t) => ({ ...t, k: clamp(t.k * factor, 0.4, 2.5) }))
  }

  const zoomIn = () => zoomBy(1.2)
  const zoomOut = () => zoomBy(1 / 1.2)

  const resetView = () => {
    userAdjustedViewRef.current = false
    resetToDefaultView()
  }

  if (!nodeList.length) {
    return <p className={styles.empty}>No entity graph available yet — entities and relationships appear here once evidence is extracted.</p>
  }

  // Which node ids are "in focus" (selected/hovered + their direct neighbors),
  // so we can dim everything else and make the connections you care about
  // easy to trace at a glance.
  const focusId = selected?.id ?? hovered
  const focusedNeighbors = new Set()
  if (focusId) {
    focusedNeighbors.add(focusId)
    for (const l of linkList) {
      if (l.source === focusId) focusedNeighbors.add(l.target)
      if (l.target === focusId) focusedNeighbors.add(l.source)
    }
  }
  const dimNonFocused = focusId != null

  return (
    <div className={styles.wrap}>
      <div className={styles.graphCol}>
        <div className={styles.toolbar}>
          <span className={styles.hintSmall}>Drag nodes to rearrange · use +/− to zoom</span>
          <div className={styles.toolbarRight}>
            <span className={styles.zoomTag}>{Math.round(transform.k * 100)}%</span>
            <div className={styles.zoomControls}>
              <button
                type="button"
                className={styles.zoomBtn}
                onClick={zoomOut}
                disabled={transform.k <= 0.4}
                aria-label="Zoom out"
              >
                −
              </button>
              <button
                type="button"
                className={styles.zoomBtn}
                onClick={zoomIn}
                disabled={transform.k >= 2.5}
                aria-label="Zoom in"
              >
                +
              </button>
            </div>
            <button type="button" className={styles.resetBtn} onClick={resetView}>Reset view</button>
          </div>
        </div>

        <svg
          ref={svgRef}
          viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
          className={styles.svg}
        >
          <defs>
            <marker id="arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
              <path d="M0,0 L10,5 L0,10 z" fill="var(--border)" />
            </marker>
          </defs>

          <g transform={`translate(${transform.x}, ${transform.y}) scale(${transform.k})`}>
            {linkList.map((l) => {
              const from = positions[l.source]
              const to = positions[l.target]
              if (!from || !to) return null
              const isFocused = !dimNonFocused || (focusedNeighbors.has(l.source) && focusedNeighbors.has(l.target))
              const dx = to.x - from.x
              const dy = to.y - from.y
              const len = Math.hypot(dx, dy) || 1
              const midX = (from.x + to.x) / 2
              const midY = (from.y + to.y) / 2
              // Nudge the label off the line itself (perpendicular offset)
              // so it doesn't sit directly on top of a node's own label
              // when two connected nodes end up close together -- this is
              // what caused edge and node labels to print on top of each
              // other. Short links (nodes right next to each other) skip
              // the label entirely since there's no room to place it
              // without overlapping one of the nodes.
              const label = l.type.replace(/-/g, ' ')
              const showLabel = len > 46
              const nx = -dy / len
              const ny = dx / len
              const labelX = midX + nx * 9
              const labelY = midY + ny * 9
              const labelW = estimateTextWidth(label, 8.5) + 8

              return (
                // Prefixed so this key can never collide with a nodeList
                // key below -- both maps render as siblings under the
                // same <g>, and l.id (a numeric link index) could
                // otherwise coincide with a node id that happens to
                // stringify to the same value (e.g. an entity whose
                // value is literally "1"). That collision is what
                // produced the "two children with the same key, `1`"
                // warning.
                <g key={`link-${l.id}`} opacity={isFocused ? 1 : 0.12}>
                  <line
                    x1={from.x} y1={from.y} x2={to.x} y2={to.y}
                    stroke={isFocused && dimNonFocused ? 'var(--accent)' : 'var(--border)'}
                    strokeWidth={isFocused && dimNonFocused ? 2 : 1.4}
                    markerEnd="url(#arrow)"
                  />
                  {showLabel && (
                    <g transform={`translate(${labelX}, ${labelY})`}>
                      <rect
                        x={-labelW / 2} y={-7.5} width={labelW} height={11}
                        rx={5} className={styles.edgeLabelBg}
                      />
                      <text textAnchor="middle" y={1.5} className={styles.edgeLabel}>
                        {label}
                      </text>
                    </g>
                  )}
                </g>
              )
            })}

            {nodeList.map((n) => {
              const pos = positions[n.id]
              if (!pos) return null
              const meta = metaFor(n.type)
              const isSelected = selected?.id === n.id
              const isFocused = !dimNonFocused || focusedNeighbors.has(n.id)
              const radius = 7 + Math.min(n.degree, 5) * 1.6
              const label = n.id.length > 16 ? `${n.id.slice(0, 15)}…` : n.id
              const labelW = estimateTextWidth(label, 9.5) + 10

              return (
                <g
                  key={`node-${n.id}`}
                  transform={`translate(${pos.x}, ${pos.y})`}
                  className={styles.node}
                  opacity={isFocused ? 1 : 0.25}
                  onPointerDown={handleNodePointerDown(n.id)}
                  onPointerEnter={() => setHovered(n.id)}
                  onPointerLeave={() => setHovered(null)}
                >
                  <circle
                    r={isSelected ? radius + 2 : radius}
                    fill={meta.color}
                    stroke="var(--card)"
                    strokeWidth="2"
                  />
                  {isSelected && <circle r={radius + 6} className={styles.selectedRing} />}
                  <rect
                    x={-labelW / 2} y={radius + 6} width={labelW} height={13}
                    rx={4} className={styles.nodeLabelBg}
                  />
                  <text y={radius + 15.5} textAnchor="middle" className={styles.nodeLabel}>
                    {label}
                  </text>
                </g>
              )
            })}
          </g>
        </svg>
      </div>

      <div className={styles.side}>
        <div className={styles.legend}>
          {[...new Set(nodeList.map((n) => metaFor(n.type).label))].map((label) => {
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
            <button type="button" className={styles.detailClose} onClick={() => setSelected(null)} aria-label="Close details">×</button>
            <p className={styles.detailType}>{metaFor(selected.type).label}</p>
            <p className={styles.detailValue}>{selected.id}</p>
            {selected.source && <p className={styles.detailSource}>Source: {selected.source}</p>}
            <p className={styles.detailSource}>{selected.degree} connection{selected.degree === 1 ? '' : 's'}</p>
          </div>
        ) : (
          <p className={styles.hint}>Click a node to pin its details and highlight its connections. Bigger nodes have more links.</p>
        )}
      </div>
    </div>
  )
}