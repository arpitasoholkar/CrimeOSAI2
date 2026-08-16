import { useEffect, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { apiBackend } from '../api/api'
import StatCard from '../components/StatCard/StatCard'
import {
  CameraIcon,
  LogOutIcon,
  MailIcon,
  PhoneIcon,
  EditIcon,
  BadgeIcon,
  BuildingIcon,
  MapPinSmallIcon,
  SaveIcon,
  TrashIcon,
  XCircleIcon,
} from '../components/Icons/Icons'
import styles from './Profile.module.css'

function getInitials(name) {
  if (!name) return '?'
  const parts = name.trim().split(/\s+/)
  const initials = parts.length === 1 ? parts[0].slice(0, 2) : parts[0][0] + parts[parts.length - 1][0]
  return initials.toUpperCase()
}

const BACKEND_ORIGIN = 'http://localhost:3000'

// See Sidebar.jsx -- avatarUrl can be a relative backend path or (for
// some older Google accounts) an absolute external URL; only the
// relative case needs our origin prefixed.
function resolveAvatarSrc(avatarUrl) {
  if (!avatarUrl) return null
  if (/^https?:\/\//i.test(avatarUrl)) return avatarUrl
  return `${BACKEND_ORIGIN}${avatarUrl}`
}

export default function Profile() {
  const { user, logout, updateUser } = useAuth()
  const navigate = useNavigate()
  const fileInputRef = useRef(null)

  const [stats, setStats] = useState(null)
  const [editing, setEditing] = useState(false)
  const [form, setForm] = useState(null)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  useEffect(() => {
    if (user) setForm({ ...user })
  }, [user?.id])

  useEffect(() => {
    apiBackend
      .get('/api/users/me/stats')
      .then((res) => setStats(res.data))
      .catch(() => setStats({ totalCases: 0, solved: 0, ongoing: 0 }))
  }, [])

  if (!user || !form) return null

  const heroStats = [
    { id: 'total', label: 'Total Cases', icon: 'folder', tone: 'accent', value: stats ? stats.totalCases : '—', trend: 'All time' },
    { id: 'solved', label: 'Cases Solved', icon: 'check', tone: 'success', value: stats ? stats.solved : '—', trend: 'Resolved / closed' },
    { id: 'ongoing', label: 'Ongoing Cases', icon: 'search', tone: 'violet', value: stats ? stats.ongoing : '—', trend: 'Active workload' },
  ]

  const handleFieldChange = (field) => (e) => setForm((f) => ({ ...f, [field]: e.target.value }))

  const handleCancelEdit = () => {
    setForm({ ...user })
    setEditing(false)
    setError('')
  }

  const handleSave = async () => {
    setSaving(true)
    setError('')
    setSuccess('')
    try {
      const res = await apiBackend.put('/api/users/me', {
        name: form.name,
        role: form.role,
        organisation: form.organisation,
        badgeNumber: form.badgeNumber,
        phone: form.phone,
        location: form.location,
        bio: form.bio,
      })
      updateUser(res.data.user)
      setEditing(false)
      setSuccess('Profile updated.')
      setTimeout(() => setSuccess(''), 3000)
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to save changes.')
    } finally {
      setSaving(false)
    }
  }

  const handlePhotoClick = () => fileInputRef.current?.click()

  const handlePhotoChange = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    setError('')
    try {
      const data = new FormData()
      data.append('avatar', file)
      const res = await apiBackend.post('/api/users/me/avatar', data, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      updateUser(res.data.user)
      setForm((f) => ({ ...f, avatarUrl: res.data.user.avatarUrl }))
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to upload photo.')
    } finally {
      setUploading(false)
      e.target.value = ''
    }
  }

  const handleRemovePhoto = async () => {
    setUploading(true)
    setError('')
    try {
      const res = await apiBackend.delete('/api/users/me/avatar')
      updateUser(res.data.user)
      setForm((f) => ({ ...f, avatarUrl: null }))
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to remove photo.')
    } finally {
      setUploading(false)
    }
  }

  const handleLogout = () => {
    logout()
    navigate('/login', { replace: true })
  }

  const avatarSrc = resolveAvatarSrc(form.avatarUrl)

  return (
    <div className={styles.layout}>
      <motion.section
        className={styles.header}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.32, ease: [0.16, 1, 0.3, 1] }}
      >
        <div className={styles.identity}>
          <div className={styles.avatarWrap}>
            {avatarSrc ? (
              <img src={avatarSrc} alt={user.name} className={styles.avatarImg} />
            ) : (
              <div className={styles.avatarFallback}>{getInitials(user.name)}</div>
            )}
            <button
              type="button"
              className={styles.avatarEditBtn}
              onClick={handlePhotoClick}
              disabled={uploading}
              aria-label="Change profile photo"
            >
              <CameraIcon width={15} height={15} />
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/png,image/jpeg,image/webp,image/gif"
              className={styles.hiddenInput}
              onChange={handlePhotoChange}
            />
          </div>

          <div>
            <h1 className={styles.name}>{user.name}</h1>
            <p className={styles.roleLine}>
              <BadgeIcon width={14} height={14} />
              {user.role}
              <span className={styles.dot} />
              <BuildingIcon width={14} height={14} />
              {user.organisation}
            </p>
            {avatarSrc && (
              <button type="button" className={styles.removePhotoBtn} onClick={handleRemovePhoto} disabled={uploading}>
                <TrashIcon width={12} height={12} />
                Remove photo
              </button>
            )}
          </div>
        </div>

        <button type="button" className={styles.logoutBtn} onClick={handleLogout}>
          <LogOutIcon width={16} height={16} />
          <span>Log Out</span>
        </button>
      </motion.section>

      <section className={styles.statsGrid}>
        {heroStats.map((stat, i) => (
          <StatCard key={stat.id} {...stat} index={i} />
        ))}
      </section>

      <motion.section
        className={styles.detailsPanel}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.32, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
      >
        <div className={styles.panelHeader}>
          <h2 className={styles.panelTitle}>Personal Information</h2>
          {!editing ? (
            <button type="button" className={styles.editBtn} onClick={() => setEditing(true)}>
              <EditIcon width={14} height={14} />
              Edit
            </button>
          ) : (
            <div className={styles.editActions}>
              <button type="button" className={styles.cancelBtn} onClick={handleCancelEdit} disabled={saving}>
                <XCircleIcon width={14} height={14} />
                Cancel
              </button>
              <button type="button" className={styles.saveBtn} onClick={handleSave} disabled={saving}>
                <SaveIcon width={14} height={14} />
                {saving ? 'Saving…' : 'Save Changes'}
              </button>
            </div>
          )}
        </div>

        {error && <p className={styles.errorMsg}>{error}</p>}
        {success && <p className={styles.successMsg}>{success}</p>}

        <div className={styles.formGrid}>
          <label className={styles.field}>
            <span className={styles.fieldLabel}>Full Name</span>
            {editing ? (
              <input value={form.name || ''} onChange={handleFieldChange('name')} />
            ) : (
              <p className={styles.fieldValue}>{user.name || '—'}</p>
            )}
          </label>

          <label className={styles.field}>
            <span className={styles.fieldLabel}>Role</span>
            {editing ? (
              <input value={form.role || ''} onChange={handleFieldChange('role')} />
            ) : (
              <p className={styles.fieldValue}>{user.role || '—'}</p>
            )}
          </label>

          <label className={styles.field}>
            <span className={styles.fieldLabel}>Organisation</span>
            {editing ? (
              <input value={form.organisation || ''} onChange={handleFieldChange('organisation')} />
            ) : (
              <p className={styles.fieldValue}>{user.organisation || '—'}</p>
            )}
          </label>

          <label className={styles.field}>
            <span className={styles.fieldLabel}>Badge Number</span>
            {editing ? (
              <input value={form.badgeNumber || ''} onChange={handleFieldChange('badgeNumber')} />
            ) : (
              <p className={styles.fieldValue}>{user.badgeNumber || '—'}</p>
            )}
          </label>

          <label className={styles.field}>
            <span className={styles.fieldLabel}>
              <MailIcon width={13} height={13} /> Email
            </span>
            <p className={styles.fieldValue}>{user.email}</p>
          </label>

          <label className={styles.field}>
            <span className={styles.fieldLabel}>
              <PhoneIcon width={13} height={13} /> Phone
            </span>
            {editing ? (
              <input value={form.phone || ''} onChange={handleFieldChange('phone')} placeholder="Add a phone number" />
            ) : (
              <p className={styles.fieldValue}>{user.phone || '—'}</p>
            )}
          </label>

          <label className={styles.field}>
            <span className={styles.fieldLabel}>
              <MapPinSmallIcon width={13} height={13} /> Location
            </span>
            {editing ? (
              <input value={form.location || ''} onChange={handleFieldChange('location')} placeholder="City, state" />
            ) : (
              <p className={styles.fieldValue}>{user.location || '—'}</p>
            )}
          </label>

          <label className={`${styles.field} ${styles.fieldWide}`}>
            <span className={styles.fieldLabel}>Bio</span>
            {editing ? (
              <textarea
                value={form.bio || ''}
                onChange={handleFieldChange('bio')}
                rows={3}
                maxLength={500}
                placeholder="A short note about your specialization, unit history, etc."
              />
            ) : (
              <p className={styles.fieldValue}>{user.bio || '—'}</p>
            )}
          </label>
        </div>
      </motion.section>
    </div>
  )
}
