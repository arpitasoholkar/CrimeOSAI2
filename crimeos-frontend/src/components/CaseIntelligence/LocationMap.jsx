import { useEffect, useRef, useState } from 'react'
// Leaflet's own stylesheet -- required for tiles/controls/popups to lay
// out correctly. Safe to import statically even though the `leaflet` JS
// module itself is loaded lazily below (keeps it out of the main bundle
// until a case with geocoded entities is actually viewed).
import 'leaflet/dist/leaflet.css'
import styles from './LocationMap.module.css'

// Same color grouping as EntityGraph, kept local/minimal here since this
// component only ever renders location-type entities.
const TYPE_COLOR = {
  KYC_ADDRESS: '#34d399', // --success
  TOWER_LOCATION: '#34d399',
  ADDRESS: '#34d399',
}
const DEFAULT_COLOR = '#4f8cff' // --accent

const GOOGLE_MAPS_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY

let googleMapsLoadPromise = null
function loadGoogleMapsScript(apiKey) {
  if (googleMapsLoadPromise) return googleMapsLoadPromise
  googleMapsLoadPromise = new Promise((resolve, reject) => {
    if (window.google?.maps) return resolve(window.google.maps)
    const script = document.createElement('script')
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}`
    script.async = true
    script.onload = () => resolve(window.google.maps)
    script.onerror = () => reject(new Error('Failed to load Google Maps script'))
    document.head.appendChild(script)
  })
  return googleMapsLoadPromise
}

/**
 * Renders geocoded case entities as pins on a real, interactive map.
 *
 * Uses the Google Maps JavaScript API when VITE_GOOGLE_MAPS_API_KEY is
 * configured (see .env.example), otherwise falls back to Leaflet +
 * CARTO basemap tiles -- a real, zero-setup interactive map so this
 * works out of the box with no API key or billing account required.
 *
 * @param {{ id: string, label: string, lat: number, lng: number, type?: string, detail?: string }[]} markers
 */
export default function LocationMap({ markers = [] }) {
  return GOOGLE_MAPS_KEY
    ? <GoogleMapView markers={markers} />
    : <LeafletMapView markers={markers} />
}

// ---------------------------------------------------------------------
// Leaflet / CARTO basemap tiles (default, no API key needed)
// ---------------------------------------------------------------------

function LeafletMapView({ markers }) {
  const containerRef = useRef(null)
  const mapRef = useRef(null)
  const layerRef = useRef(null)
  const [error, setError] = useState(null)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    let cancelled = false

    import('leaflet').then((L) => {
      if (cancelled || !containerRef.current) return

      // Leaflet's default marker icon references image assets by a
      // relative path that doesn't resolve correctly through Vite's
      // bundler -- point it at the CDN copies instead.
      delete L.Icon.Default.prototype._getIconUrl
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
        iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
        shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
      })

      if (!mapRef.current) {
        mapRef.current = L.map(containerRef.current, { scrollWheelZoom: false }).setView([20.5937, 78.9629], 4.5)
        // Switched from tile.openstreetmap.org's raw tile server to
        // CARTO's free basemap tiles. OSM's own Tile Usage Policy
        // (osm.wiki/Blocked, seen as the 403s this replaces) explicitly
        // asks apps doing anything beyond light/casual use to point at
        // a different provider instead of their volunteer-run servers --
        // CARTO's basemaps are free, need no API key, and are meant for
        // exactly this kind of app usage. Map data is still OpenStreetMap's;
        // CARTO just serves the rendered tiles.
        L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
          attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
          maxZoom: 19,
          subdomains: 'abcd',
        }).addTo(mapRef.current)
        layerRef.current = L.layerGroup().addTo(mapRef.current)
      }

      layerRef.current.clearLayers()

      if (markers.length) {
        const bounds = []
        for (const m of markers) {
          const color = TYPE_COLOR[m.type] || DEFAULT_COLOR
          const icon = L.divIcon({
            className: styles.pin,
            html: `<span style="background:${color}"></span>`,
            iconSize: [16, 16],
            iconAnchor: [8, 8],
          })
          L.marker([m.lat, m.lng], { icon })
            .addTo(layerRef.current)
            .bindPopup(
              `<strong>${escapeHtml(m.label)}</strong><br/>${escapeHtml(m.detail || '')}`
            )
          bounds.push([m.lat, m.lng])
        }
        mapRef.current.fitBounds(bounds, { padding: [32, 32], maxZoom: 14 })
      }

      setReady(true)
      // Leaflet computes tile layout from the container's size at the
      // moment it initializes; if that happened while this panel was
      // still animating/collapsed the tiles come out clipped or
      // misaligned until a manual resize. Nudge it once after mount.
      requestAnimationFrame(() => mapRef.current?.invalidateSize())
    }).catch((err) => {
      console.error('[LocationMap] Failed to load Leaflet:', err)
      if (!cancelled) setError('Map library failed to load. Run `npm install` in crimeos-frontend to pull in leaflet.')
    })

    return () => {
      cancelled = true
    }
  }, [markers])

  useEffect(() => () => {
    mapRef.current?.remove()
    mapRef.current = null
  }, [])

  if (error) return <p className={styles.error}>{error}</p>

  return (
    <div className={styles.mapShell}>
      {!ready && <div className={styles.mapLoading}>Loading map…</div>}
      <div ref={containerRef} className={styles.mapEl} />
      <span className={styles.attribution}>CARTO / OpenStreetMap</span>
      <span className={styles.pinCount}>{markers.length} location{markers.length === 1 ? '' : 's'}</span>
    </div>
  )
}

// ---------------------------------------------------------------------
// Google Maps JavaScript API (used automatically when a key is set)
// ---------------------------------------------------------------------

function GoogleMapView({ markers }) {
  const containerRef = useRef(null)
  const mapRef = useRef(null)
  const markersRef = useRef([])
  const [error, setError] = useState(null)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    let cancelled = false

    loadGoogleMapsScript(GOOGLE_MAPS_KEY).then((maps) => {
      if (cancelled || !containerRef.current) return

      if (!mapRef.current) {
        mapRef.current = new maps.Map(containerRef.current, {
          center: { lat: 20.5937, lng: 78.9629 },
          zoom: 4,
          mapId: 'CRIMEOS_CASE_MAP',
        })
      }

      markersRef.current.forEach((mk) => mk.setMap(null))
      markersRef.current = []

      if (markers.length) {
        const bounds = new maps.LatLngBounds()
        const infoWindow = new maps.InfoWindow()

        for (const m of markers) {
          const color = TYPE_COLOR[m.type] || DEFAULT_COLOR
          const marker = new maps.Marker({
            position: { lat: m.lat, lng: m.lng },
            map: mapRef.current,
            title: m.label,
            icon: {
              path: maps.SymbolPath.CIRCLE,
              scale: 8,
              fillColor: color,
              fillOpacity: 1,
              strokeColor: '#171c28',
              strokeWeight: 2,
            },
          })
          marker.addListener('click', () => {
            infoWindow.setContent(`<strong>${escapeHtml(m.label)}</strong><br/>${escapeHtml(m.detail || '')}`)
            infoWindow.open({ anchor: marker, map: mapRef.current })
          })
          markersRef.current.push(marker)
          bounds.extend(marker.getPosition())
        }
        mapRef.current.fitBounds(bounds, 48)
      }

      setReady(true)
    }).catch((err) => {
      console.error('[LocationMap] Failed to load Google Maps:', err)
      if (!cancelled) setError('Google Maps failed to load — check VITE_GOOGLE_MAPS_API_KEY.')
    })

    return () => {
      cancelled = true
    }
  }, [markers])

  if (error) return <p className={styles.error}>{error}</p>

  return (
    <div className={styles.mapShell}>
      {!ready && <div className={styles.mapLoading}>Loading map…</div>}
      <div ref={containerRef} className={styles.mapEl} />
      <span className={styles.attribution}>Google Maps</span>
      <span className={styles.pinCount}>{markers.length} location{markers.length === 1 ? '' : 's'}</span>
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