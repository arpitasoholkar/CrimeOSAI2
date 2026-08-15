import { useState } from 'react'
import { useNavigate, useLocation, Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useAuth } from '../context/AuthContext'
import { ShieldIcon, LockIcon, UserIcon } from '../components/Icons/Icons'
import styles from './Login.module.css'

export default function Login() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [identifier, setIdentifier] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const redirectTo = location.state?.from || '/'

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await login(identifier, password)
      navigate(redirectTo, { replace: true })
    } catch (err) {
      setError(err.response?.data?.error || 'Unable to sign in. Check your credentials.')
    } finally {
      setLoading(false)
    }
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
          <span className={styles.brandMark}>
            <ShieldIcon width={24} height={24} />
          </span>
          <div>
            <p className={styles.brandName}>
              CRIME<span>OS</span>
            </p>
            <p className={styles.brandSub}>Cyber Investigation OS</p>
          </div>
        </div>

        <h1 className={styles.title}>Sign in to your workspace</h1>
        <p className={styles.subtitle}>Access restricted to authorized personnel.</p>

        <form className={styles.form} onSubmit={handleSubmit}>
          <label className={styles.field}>
            <span className={styles.fieldLabel}>Username or email</span>
            <div className={styles.inputWrap}>
              <UserIcon width={16} height={16} className={styles.inputIcon} />
              <input
                type="text"
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                placeholder="investigator.name"
                autoComplete="username"
                required
              />
            </div>
          </label>

          <label className={styles.field}>
            <span className={styles.fieldLabel}>Password</span>
            <div className={styles.inputWrap}>
              <LockIcon width={16} height={16} className={styles.inputIcon} />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                autoComplete="current-password"
                required
              />
            </div>
          </label>

          {error && <p className={styles.error}>{error}</p>}

          <button type="submit" className={styles.submitBtn} disabled={loading}>
            {loading ? 'Signing in…' : 'Sign In'}
          </button>
        </form>

        <p className={styles.footerText}>
          New to this unit?{' '}
          <Link to="/register" className={styles.link}>
            Create an account
          </Link>
        </p>
      </motion.div>
    </div>
  )
}
