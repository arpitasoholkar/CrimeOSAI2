import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import styles from './ProtectedRoute.module.css'

export default function ProtectedRoute({ children }) {
  const { status } = useAuth()
  const location = useLocation()

  if (status === 'loading') {
    return (
      <div className={styles.loading}>
        <div className={styles.spinner} />
        <p>Verifying session…</p>
      </div>
    )
  }

  if (status === 'guest') {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />
  }

  return children
}
