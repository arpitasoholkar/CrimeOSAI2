import { useState } from 'react'
import { useNavigate, useLocation, Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { GoogleLogin } from '@react-oauth/google'
import { useAuth } from '../context/AuthContext'
import { EyeIcon, ShieldLockIcon, MailIcon, LockIcon } from '../components/Icons/Icons'
import styles from './Login.module.css'
import useDocumentTitle from '../hooks/useDocumentTitle'

export default function Login() {
  useDocumentTitle('Login')

  const { loginWithGoogle, login } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [identifier, setIdentifier] = useState('')
  const [password, setPassword] = useState('')

  const redirectTo = location.state?.from || '/'

  const handleGoogleSuccess = async (credentialResponse) => {
    setError('')
    setLoading(true)
    try {
      const idToken = credentialResponse?.credential
      if (!idToken) {
        throw new Error('Google did not return a credential. Please try again.')
      }
      await loginWithGoogle(idToken)
      navigate(redirectTo, { replace: true })
    } catch (err) {
      setError(
        err.response?.data?.error ||
          err.message ||
          'Unable to sign in with Google. Please try again.'
      )
    } finally {
      setLoading(false)
    }
  }

  const handleEmailLogin = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await login(identifier.trim(), password)
      navigate(redirectTo, { replace: true })
    } catch (err) {
      const data = err.response?.data
      setError(data?.error || 'Unable to sign in. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleGoogleError = () => {
    setError('Google sign-in was cancelled or failed. Please try again.')
    setLoading(false)
  }

  return (
    <div className={styles.page}>
      <div className={styles.backdrop} aria-hidden="true" />

      <motion.div
        className={styles.card}
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.32, ease: [0.16, 1, 0.3, 1] }}
      >
        <div className={styles.brand}>
          <span className={styles.eyeMark}>
            <EyeIcon width={30} height={30} />
          </span>
          <p className={styles.brandName}>TRINETRA</p>
          <p className={styles.brandSub}>Intelligence-Led Investigations</p>
          <span className={styles.brandDivider} aria-hidden="true" />
        </div>

        <h1 className={styles.title}>Access your investigation workspace</h1>
        <p className={styles.subtitle}>Authorized personnel only.</p>

        <form className={styles.form} onSubmit={handleEmailLogin}>
          <label className={styles.field}>
            <span className={styles.fieldLabel}>Email or username</span>
            <div className={styles.inputWrap}>
              <MailIcon width={16} height={16} className={styles.inputIcon} />
              <input type="text" value={identifier} onChange={(e) => setIdentifier(e.target.value)}
                autoComplete="username" placeholder="you@unit.gov" required />
            </div>
          </label>
          <label className={styles.field}>
            <span className={styles.fieldLabel}>Password</span>
            <div className={styles.inputWrap}>
              <LockIcon width={16} height={16} className={styles.inputIcon} />
              <input type="password" value={password} onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password" placeholder="Your password" required />
            </div>
          </label>
          <button type="submit" className={styles.submitBtn} disabled={loading}>
            {loading ? 'Signing in…' : 'Sign in'}
          </button>
        </form>

        {error && (
          <p className={styles.error} role="alert">
            {error}
          </p>
        )}

        <div className={styles.orDivider} aria-hidden="true"><span />or<span /></div>

        <div className={styles.googleWrap}>
          {loading ? (
            <div className={styles.googleLoading} role="status" aria-live="polite">
              <span className={styles.spinner} aria-hidden="true" />
              Signing in…
            </div>
          ) : (
            <GoogleLogin
              onSuccess={handleGoogleSuccess}
              onError={handleGoogleError}
              theme="filled_white"
              shape="pill"
              size="large"
              text="continue_with"
              width="320"
            />
          )}
        </div>


        <div className={styles.footerDivider} aria-hidden="true">
          <span />
          <ShieldLockIcon width={16} height={16} />
          <span />
        </div>
        <p className={styles.footerText}>
          New here? <Link to="/register" className={styles.link}>Create an account</Link>
        </p>
      </motion.div>
    </div>
  )
}