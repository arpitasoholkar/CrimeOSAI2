import { useState } from 'react'
import { GoogleLogin } from '@react-oauth/google'
import { apiBackend } from '../../api/api'
import { useAuth } from '../../context/AuthContext'
import styles from './PasswordCard.module.css'

// Lets a user add (Google accounts) or change (accounts that have one) a
// password, so they can log in with email/username + password too.
// Google accounts must re-confirm with Google first, so a stolen session
// token alone can't plant a backdoor password.
export default function PasswordCard() {
  const { user, updateUser } = useAuth()
  const hasPassword = Boolean(user?.hasPassword)

  const [current, setCurrent] = useState('')
  const [next, setNext] = useState('')
  const [confirm, setConfirm] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [done, setDone] = useState('')

  const localError = () => {
    if (next.length < 8) return 'Password must be at least 8 characters.'
    if (next !== confirm) return "Passwords don't match."
    if (hasPassword && !current) return 'Enter your current password.'
    return ''
  }

  const submit = async (credential) => {
    setError(''); setDone('')
    const problem = localError()
    if (problem) return setError(problem)
    setBusy(true)
    try {
      const body = hasPassword
        ? { newPassword: next, currentPassword: current }
        : { newPassword: next, credential }
      const res = await apiBackend.post('/api/auth/set-password', body)
      updateUser({ hasPassword: res.data.user.hasPassword })
      setDone(hasPassword ? 'Password changed.' : 'Password added. You can now sign in with your email and password too.')
      setCurrent(''); setNext(''); setConfirm('')
    } catch (err) {
      setError(err.response?.data?.error || 'Could not update password.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <section className={styles.card}>
      <h2 className={styles.title}>{hasPassword ? 'Change password' : 'Add a password'}</h2>
      <p className={styles.sub}>
        {hasPassword
          ? 'Use your current password to set a new one.'
          : `You signed in with Google. Add a password to also sign in with ${user?.email || 'your email'} or your username.`}
      </p>

      <div className={styles.grid}>
        {hasPassword && (
          <label className={styles.field}>
            <span>Current password</span>
            <input type="password" autoComplete="current-password" value={current} onChange={(e) => setCurrent(e.target.value)} />
          </label>
        )}
        <label className={styles.field}>
          <span>New password</span>
          <input type="password" autoComplete="new-password" value={next} onChange={(e) => setNext(e.target.value)} placeholder="At least 8 characters" />
        </label>
        <label className={styles.field}>
          <span>Confirm new password</span>
          <input type="password" autoComplete="new-password" value={confirm} onChange={(e) => setConfirm(e.target.value)} />
        </label>
      </div>

      {error && <p className={styles.error} role="alert">{error}</p>}
      {done && <p className={styles.ok} role="status">{done}</p>}

      <div className={styles.actions}>
        {hasPassword ? (
          <button type="button" className={styles.btn} disabled={busy} onClick={() => submit()}>
            {busy ? 'Saving…' : 'Change password'}
          </button>
        ) : (
          <>
            <p className={styles.hint}>Confirm it's you with Google to save:</p>
            <GoogleLogin
              onSuccess={(r) => submit(r?.credential)}
              onError={() => setError('Google confirmation was cancelled or failed.')}
              theme="filled_white"
              shape="pill"
              text="continue_with"
            />
          </>
        )}
      </div>
    </section>
  )
}
