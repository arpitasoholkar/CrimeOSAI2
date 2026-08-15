import { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { apiBackend } from '../api/api'

const AuthContext = createContext(null)
const TOKEN_KEY = 'crimeos_token'

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [status, setStatus] = useState('loading') // 'loading' | 'authed' | 'guest'

  const loadSession = useCallback(async () => {
    const token = localStorage.getItem(TOKEN_KEY)
    if (!token) {
      setStatus('guest')
      return
    }
    try {
      const res = await apiBackend.get('/api/auth/me')
      setUser(res.data.user)
      setStatus('authed')
    } catch {
      localStorage.removeItem(TOKEN_KEY)
      setUser(null)
      setStatus('guest')
    }
  }, [])

  useEffect(() => {
    loadSession()
  }, [loadSession])

  const login = useCallback(async (identifier, password) => {
    const res = await apiBackend.post('/api/auth/login', { identifier, password })
    localStorage.setItem(TOKEN_KEY, res.data.token)
    setUser(res.data.user)
    setStatus('authed')
    return res.data.user
  }, [])

  // idToken is the Google ID token (JWT) handed back by Google Identity
  // Services on the frontend. The backend verifies it, finds-or-creates
  // the matching user, and returns the same { token, user } shape login()
  // does — so everything downstream (storage, state) is identical.
  const loginWithGoogle = useCallback(async (idToken) => {
    const res = await apiBackend.post('/api/auth/google', { credential: idToken })
    localStorage.setItem(TOKEN_KEY, res.data.token)
    setUser(res.data.user)
    setStatus('authed')
    return res.data.user
  }, [])

  const register = useCallback(async (payload) => {
    const res = await apiBackend.post('/api/auth/register', payload)
    localStorage.setItem(TOKEN_KEY, res.data.token)
    setUser(res.data.user)
    setStatus('authed')
    return res.data.user
  }, [])

  const logout = useCallback(() => {
    localStorage.removeItem(TOKEN_KEY)
    setUser(null)
    setStatus('guest')
  }, [])

  const updateUser = useCallback((patch) => {
    setUser((prev) => (prev ? { ...prev, ...patch } : prev))
  }, [])

  return (
    <AuthContext.Provider
      value={{ user, status, login, loginWithGoogle, register, logout, updateUser, refreshUser: loadSession }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider')
  return ctx
}