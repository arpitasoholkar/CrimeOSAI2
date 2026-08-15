import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useAuth } from '../context/AuthContext'
import { ShieldIcon, UserIcon, MailIcon, LockIcon, BadgeIcon } from '../components/Icons/Icons'
import styles from './Login.module.css'

export default function Register() {
  const { register } = useAuth()
  const navigate = useNavigate()
  const [form, setForm] = useState({ name: '', username: '', email: '', password: '', badgeNumber: '' })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const update = (field) => (e) => setForm((f) => ({ ...f, [field]: e.target.value }))

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await register(form)
      navigate('/profile', { replace: true })
    } catch (err) {
      setError(err.response?.data?.error || 'Unable to create account.')
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

        <h1 className={styles.title}>Create your account</h1>
        <p className={styles.subtitle}>Set up your investigator profile.</p>

        <form className={styles.form} onSubmit={handleSubmit}>
          <label className={styles.field}>
            <span className={styles.fieldLabel}>Full name</span>
            <div className={styles.inputWrap}>
              <UserIcon width={16} height={16} className={styles.inputIcon} />
              <input type="text" value={form.name} onChange={update('name')} placeholder="Asha Verma" required />
            </div>
          </label>

          <label className={styles.field}>
            <span className={styles.fieldLabel}>Username</span>
            <div className={styles.inputWrap}>
              <UserIcon width={16} height={16} className={styles.inputIcon} />
              <input type="text" value={form.username} onChange={update('username')} placeholder="asha.verma" required />
            </div>
          </label>

          <label className={styles.field}>
            <span className={styles.fieldLabel}>Email</span>
            <div className={styles.inputWrap}>
              <MailIcon width={16} height={16} className={styles.inputIcon} />
              <input type="email" value={form.email} onChange={update('email')} placeholder="you@unit.gov" required />
            </div>
          </label>

          <label className={styles.field}>
            <span className={styles.fieldLabel}>Badge number (optional)</span>
            <div className={styles.inputWrap}>
              <BadgeIcon width={16} height={16} className={styles.inputIcon} />
              <input type="text" value={form.badgeNumber} onChange={update('badgeNumber')} placeholder="CCU-2291" />
            </div>
          </label>

          <label className={styles.field}>
            <span className={styles.fieldLabel}>Password</span>
            <div className={styles.inputWrap}>
              <LockIcon width={16} height={16} className={styles.inputIcon} />
              <input
                type="password"
                value={form.password}
                onChange={update('password')}
                placeholder="At least 8 characters"
                required
              />
            </div>
          </label>

          {error && <p className={styles.error}>{error}</p>}

          <button type="submit" className={styles.submitBtn} disabled={loading}>
            {loading ? 'Creating account…' : 'Create Account'}
          </button>
        </form>

        <p className={styles.footerText}>
          Already have an account?{' '}
          <Link to="/login" className={styles.link}>
            Sign in
          </Link>
        </p>
      </motion.div>
    </div>
  )
}
