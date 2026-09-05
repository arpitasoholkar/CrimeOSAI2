import { useState } from 'react'
import { useToast } from '../../context/ToastContext'

/**
 * Small inline button that copies `value` to the clipboard and shows a
 * brief "Copied" state. Falls back to document.execCommand for browsers/
 * contexts where navigator.clipboard isn't available (e.g. non-HTTPS).
 */
export default function CopyButton({ value, label = 'Copy', className = '', size = 13 }) {
  const [copied, setCopied] = useState(false)
  const toast = useToast()

  const handleCopy = async (e) => {
    e.stopPropagation()
    if (!value) return
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(String(value))
      } else {
        const textarea = document.createElement('textarea')
        textarea.value = String(value)
        textarea.style.position = 'fixed'
        textarea.style.opacity = '0'
        document.body.appendChild(textarea)
        textarea.select()
        document.execCommand('copy')
        document.body.removeChild(textarea)
      }
      setCopied(true)
      toast.success('Copied to clipboard.', { duration: 1800 })
      setTimeout(() => setCopied(false), 1500)
    } catch {
      toast.error('Could not copy to clipboard.')
    }
  }

  return (
    <button
      type="button"
      onClick={handleCopy}
      className={className}
      aria-label={copied ? 'Copied' : label}
      title={copied ? 'Copied!' : label}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'none',
        border: 'none',
        cursor: 'pointer',
        padding: 2,
        color: copied ? 'var(--success, #2fbf71)' : 'var(--text-tertiary, #8a93a6)',
        lineHeight: 0,
      }}
    >
      {copied ? (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M20 6 9 17l-5-5" />
        </svg>
      ) : (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="9" y="9" width="13" height="13" rx="2" />
          <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
        </svg>
      )}
    </button>
  )
}
