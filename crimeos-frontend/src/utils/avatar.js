// Resolves a stored avatarUrl to something an <img> can load.
// avatarUrl is normally a relative "/uploads/avatars/..." path served by
// our backend; older Google accounts may have an absolute external URL.
// The backend origin comes from VITE_BACKEND_URL (same as api.js) so it
// works in dev and production without code changes.
const BACKEND_ORIGIN = (import.meta.env.VITE_BACKEND_URL || '').replace(/\/+$/, '')

export function resolveAvatarSrc(avatarUrl) {
  if (!avatarUrl) return null
  if (/^https?:\/\//i.test(avatarUrl)) return avatarUrl
  return `${BACKEND_ORIGIN}${avatarUrl}`
}

export function getInitials(name, fallback = '?') {
  if (!name) return fallback
  const parts = name.trim().split(/\s+/)
  const initials = parts.length === 1 ? parts[0].slice(0, 2) : parts[0][0] + parts[parts.length - 1][0]
  return initials.toUpperCase()
}
