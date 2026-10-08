import { useEffect, useRef, useState } from 'react'
import 'leaflet/dist/leaflet.css'
import styles from './LocationMap.module.css'

const TYPE_COLOR = {
  KYC_ADDRESS: '#34d399',
  TOWER_LOCATION: '#34d399',
  ADDRESS: '#34d399',
}

const DEFAULT_COLOR = '#4f8cff'

// CARTO started returning "API KEY REQUIRED" watermark tiles, so we use
// Esri World Street Map (free, no key) as primary and fall back to the
// OSM tile server if Esri tiles start failing.
const PRIMARY_TILES = {
  url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}',
  attribution: 'Tiles &copy; Esri &mdash; Source: Esri, HERE, Garmin, OpenStreetMap contributors',
  label: 'Esri / OpenStreetMap',
}

const FALLBACK_TILES = {
  url: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
  attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
  label: 'OpenStreetMap',
}

export default function LocationMap({ markers = [] }) {
  return <LeafletMapView markers={markers} />
}

function LeafletMapView({ markers }) {
  const containerRef = useRef(null)
  const mapRef = useRef(null)
  const layerRef = useRef(null)
  const [error, setError] = useState(null)
  const [ready, setReady] = useState(false)
  const [tileLabel, setTileLabel] = useState(PRIMARY_TILES.label)

  useEffect(() => {
    let cancelled = false

    import('leaflet')
      .then((L) => {
        if (cancelled || !containerRef.current) return

        delete L.Icon.Default.prototype._getIconUrl
        L.Icon.Default.mergeOptions({
          iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
          iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
          shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
        })

        if (!mapRef.current) {
          const map = L.map(containerRef.current, {
            scrollWheelZoom: false,
          }).setView([20.5937, 78.9629], 4.5)
          mapRef.current = map

          let errorCount = 0
          let usingFallback = false

          const primary = L.tileLayer(PRIMARY_TILES.url, {
            attribution: PRIMARY_TILES.attribution,
            maxZoom: 19,
          }).addTo(map)

          primary.on('tileerror', () => {
            errorCount += 1
            if (errorCount >= 3 && !usingFallback) {
              usingFallback = true
              map.removeLayer(primary)
              L.tileLayer(FALLBACK_TILES.url, {
                attribution: FALLBACK_TILES.attribution,
                maxZoom: 19,
              }).addTo(map)
              setTileLabel(FALLBACK_TILES.label)
            }
          })

          layerRef.current = L.layerGroup().addTo(map)
        }

        layerRef.current.clearLayers()

        if (markers.length) {
          const bounds = []

          for (const m of markers) {
            const color = TYPE_COLOR[m.type] || DEFAULT_COLOR

            const icon = L.divIcon({
              className: styles.pin,
              html: `<span style="background:${color}"></span>`,
              iconSize: [18, 18],
              iconAnchor: [9, 9],
            })

            L.marker([m.lat, m.lng], { icon })
              .addTo(layerRef.current)
              .bindPopup(
                `<strong>${escapeHtml(m.label)}</strong><br/>${escapeHtml(m.detail || '')}`
              )

            bounds.push([m.lat, m.lng])
          }

          mapRef.current.fitBounds(bounds, {
            padding: [32, 32],
            maxZoom: 14,
          })
        }

        setReady(true)

        requestAnimationFrame(() => {
          mapRef.current?.invalidateSize()
        })
      })
      .catch((err) => {
        console.error('[LocationMap] Failed to load Leaflet:', err)
        if (!cancelled) {
          setError('Map library failed to load. Run "npm install leaflet" in crimeos-frontend.')
        }
      })

    return () => {
      cancelled = true
    }
  }, [markers])

  useEffect(() => {
    return () => {
      mapRef.current?.remove()
      mapRef.current = null
    }
  }, [])

  if (error) {
    return <p className={styles.error}>{error}</p>
  }

  return (
    <div className={styles.mapShell}>
      {!ready && <div className={styles.mapLoading}>Loading map…</div>}

      <div ref={containerRef} className={styles.mapEl} />

      <span className={styles.attribution}>{tileLabel}</span>

      <span className={styles.pinCount}>
        {markers.length} location{markers.length === 1 ? '' : 's'}
      </span>
    </div>
  )
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}