import { createContext, useCallback, useContext, useRef, useState } from 'react'

const ToastContext = createContext(null)

let idCounter = 0

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([])
  const timers = useRef(new Map())

  const dismiss = useCallback((id) => {
    setToasts((t) => t.filter((toast) => toast.id !== id))
    const timer = timers.current.get(id)
    if (timer) {
      clearTimeout(timer)
      timers.current.delete(id)
    }
  }, [])

  const showToast = useCallback((message, opts = {}) => {
    const { type = 'info', duration = 4000 } = opts
    const id = ++idCounter
    setToasts((t) => [...t, { id, message, type }])
    if (duration > 0) {
      const timer = setTimeout(() => dismiss(id), duration)
      timers.current.set(id, timer)
    }
    return id
  }, [dismiss])

  const toast = {
    show: showToast,
    success: (message, opts) => showToast(message, { ...opts, type: 'success' }),
    error: (message, opts) => showToast(message, { ...opts, type: 'error' }),
    info: (message, opts) => showToast(message, { ...opts, type: 'info' }),
    dismiss,
  }

  return (
    <ToastContext.Provider value={toast}>
      {children}
      <ToastViewport toasts={toasts} onDismiss={dismiss} />
    </ToastContext.Provider>
  )
}

function ToastViewport({ toasts, onDismiss }) {
  if (toasts.length === 0) return null

  return (
    <div
      style={{
        position: 'fixed',
        top: 16,
        right: 16,
        zIndex: 9999,
        display: 'flex',
        flexDirection: 'column',
        gap: 8,
        maxWidth: 360,
      }}
      role="region"
      aria-live="polite"
      aria-label="Notifications"
    >
      {toasts.map((t) => (
        <ToastItem key={t.id} toast={t} onDismiss={() => onDismiss(t.id)} />
      ))}
    </div>
  )
}

const TONE = {
  success: { bg: 'var(--success-soft, #103a2a)', border: 'var(--success, #2fbf71)', fg: 'var(--success, #2fbf71)' },
  error: { bg: 'var(--danger-soft, #3a1414)', border: 'var(--danger, #ef4444)', fg: 'var(--danger, #ef4444)' },
  info: { bg: 'var(--accent-soft, #142238)', border: 'var(--accent, #4f8cff)', fg: 'var(--accent, #4f8cff)' },
}

function ToastItem({ toast, onDismiss }) {
  const tone = TONE[toast.type] || TONE.info
  return (
    <div
      role="status"
      style={{
        display: 'flex',
        alignItems: 'flex-start',
        gap: 10,
        padding: '12px 14px',
        borderRadius: 12,
        background: 'var(--card, #171c28)',
        border: `1px solid ${tone.border}`,
        boxShadow: 'var(--shadow-md, 0 4px 16px rgba(0,0,0,0.16))',
        fontSize: 13,
        color: 'var(--text-primary, #fff)',
        animation: 'trinetra-toast-in 180ms ease-out',
      }}
    >
      <span style={{ width: 8, height: 8, borderRadius: '50%', background: tone.fg, marginTop: 4, flexShrink: 0 }} />
      <span style={{ flex: 1, lineHeight: 1.4 }}>{toast.message}</span>
      <button
        type="button"
        onClick={onDismiss}
        aria-label="Dismiss notification"
        style={{
          background: 'none',
          border: 'none',
          color: 'var(--text-tertiary, #8a93a6)',
          cursor: 'pointer',
          fontSize: 14,
          lineHeight: 1,
          padding: 0,
        }}
      >
        ×
      </button>
    </div>
  )
}

export function useToast() {
  const ctx = useContext(ToastContext)
  if (!ctx) {
    throw new Error('useToast must be used within a ToastProvider')
  }
  return ctx
}
