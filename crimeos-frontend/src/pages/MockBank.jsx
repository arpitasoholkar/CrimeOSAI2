import { useCallback, useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { apiBackend } from '../api/api'
import {
  BuildingIcon,
  HourglassIcon,
  AlertTriangleIcon,
  CheckCircleIcon,
  ArrowUpRightIcon,
  RefreshIcon,
  LockIcon,
} from '../components/Icons/Icons'
import styles from './MockBank.module.css'
import useDocumentTitle from '../hooks/useDocumentTitle'

// /mock-bank -- the "bank compliance officer" persona.
//
// Deliberately standalone: no Sidebar/TopNav, no ProtectedRoute, no
// investigator auth. This is meant to be opened in a second browser tab
// during a demo, simulating a bank employee looking at legal requests
// sent to their (fictional) bank. Talks to the unauthenticated /bank/*
// routes, which wrap the exact same recordLegalResponse logic the
// investigator UI uses -- see routes/bank/bankController.js.

const RESPONSE_FIELDS = [
  { key: 'accountHolder', label: 'Account holder name', placeholder: 'e.g. Rohit Sharma' },
  { key: 'accountNumber', label: 'Account number', placeholder: 'e.g. 04581230009176' },
  { key: 'kycPhone', label: 'KYC phone number', placeholder: 'e.g. +91 98765 43210' },
  { key: 'kycAddress', label: 'KYC address', placeholder: 'e.g. 12 MG Road, Pune, MH' },
  { key: 'ipAddress', label: 'Last login IP (if available)', placeholder: 'e.g. 103.27.8.44' },
  { key: 'deviceId', label: 'Registered device ID (if available)', placeholder: 'e.g. android-9f3a1c' },
]

function fmtDate(d) {
  if (!d) return '—'
  return new Date(d).toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}

function emptyFormData() {
  return RESPONSE_FIELDS.reduce((acc, f) => ({ ...acc, [f.key]: '' }), {})
}

export default function MockBank() {
  useDocumentTitle('Bank Compliance Portal')

  const [requests, setRequests] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const [selected, setSelected] = useState(null) // { case_id, case_title, request }
  const [detailLoading, setDetailLoading] = useState(false)

  const [officerName, setOfficerName] = useState('XYZ Bank — Compliance Officer')
  const [notes, setNotes] = useState('')
  const [formData, setFormData] = useState(emptyFormData())
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState(null)
  const [sent, setSent] = useState(false)

  const loadList = useCallback(() => {
    setLoading(true)
    setError(null)
    return apiBackend
      .get('/bank/requests')
      .then((res) => setRequests(res.data.requests || []))
      .catch((err) => {
        console.error(err)
        setError('Could not load pending requests. Is the backend running?')
      })
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    loadList()
  }, [loadList])

  const openRequest = async (r) => {
    setDetailLoading(true)
    setSubmitError(null)
    setSent(false)
    setFormData(emptyFormData())
    setNotes('')
    try {
      const res = await apiBackend.get(`/bank/requests/${r.case_id}/${r.requestId}`)
      setSelected({ case_id: res.data.case_id, case_title: res.data.case_title, request: res.data.request })
    } catch (err) {
      console.error(err)
      setError('Could not load that request.')
    } finally {
      setDetailLoading(false)
    }
  }

  const backToInbox = () => {
    setSelected(null)
    setSubmitError(null)
    setSent(false)
    loadList()
  }

  const handleFieldChange = (key, value) => {
    setFormData((prev) => ({ ...prev, [key]: value }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!selected) return
    setSubmitting(true)
    setSubmitError(null)
    try {
      const data = Object.fromEntries(
        Object.entries(formData).filter(([, v]) => v && v.trim())
      )
      await apiBackend.post(
        `/bank/requests/${selected.case_id}/${selected.request.requestId}/respond`,
        { officerName: officerName.trim() || undefined, notes: notes.trim() || undefined, data }
      )
      setSent(true)
    } catch (err) {
      setSubmitError(err.response?.data?.message || 'Could not send the response. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className={styles.page}>
      <div className={styles.backdrop} aria-hidden="true" />

      <header className={styles.header}>
        <div className={styles.brand}>
          <BuildingIcon width={22} height={22} />
          <div>
            <h1 className={styles.brandTitle}>XYZ Bank — Legal Compliance Portal</h1>
            <p className={styles.brandSub}>Law-enforcement request inbox</p>
          </div>
        </div>
        <div className={styles.demoTag}>
          <LockIcon width={13} height={13} />
          Demo simulation — no real bank data
        </div>
      </header>

      <main className={styles.content}>
        <AnimatePresence mode="wait">
          {!selected ? (
            <motion.div
              key="list"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
              className={styles.wrap}
            >
              <div className={styles.listHeader}>
                <h2 className={styles.panelTitle}>Pending requests</h2>
                <button type="button" className={styles.refreshBtn} onClick={loadList} disabled={loading}>
                  <RefreshIcon width={14} height={14} />
                  Refresh
                </button>
              </div>

              {error && <p className={styles.stateMsg}>{error}</p>}

              {!error && loading ? (
                <p className={styles.stateMsg}>Loading…</p>
              ) : !error && requests.length === 0 ? (
                <div className={styles.emptyState}>
                  <HourglassIcon width={24} height={24} />
                  <p>No requests are currently awaiting a response.</p>
                </div>
              ) : (
                !error && (
                  <div className={styles.list}>
                    {requests.map((r) => (
                      <button
                        type="button"
                        key={`${r.case_id}-${r.requestId}`}
                        className={styles.item}
                        onClick={() => openRequest(r)}
                      >
                        <div className={styles.itemInfo}>
                          <p className={styles.itemTitle}>
                            <span className={styles.mono}>{r.case_id}</span> — {r.case_title}
                          </p>
                          <p className={styles.itemMeta}>
                            Sent to {r.sentTo || r.provider || 'provider'} · {fmtDate(r.sentAt)}
                            {r.deadline && <> · Due {fmtDate(r.deadline)}</>}
                          </p>
                        </div>
                        <div className={styles.itemRight}>
                          <span className={`${styles.statusBadge} ${r.status === 'overdue' ? styles.statusOverdue : styles.statusSent}`}>
                            {r.status === 'overdue' && <AlertTriangleIcon width={12} height={12} />}
                            {r.status}
                          </span>
                          <ArrowUpRightIcon width={14} height={14} />
                        </div>
                      </button>
                    ))}
                  </div>
                )
              )}
            </motion.div>
          ) : (
            <motion.div
              key="detail"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
              className={styles.wrap}
            >
              <button type="button" className={styles.backBtn} onClick={backToInbox}>
                ← Back to inbox
              </button>

              {detailLoading ? (
                <p className={styles.stateMsg}>Loading…</p>
              ) : (
                <>
                  <div className={styles.panel}>
                    <div className={styles.detailHeaderRow}>
                      <div>
                        <p className={styles.itemMeta}>
                          <span className={styles.mono}>{selected.case_id}</span> — {selected.case_title}
                        </p>
                        <h2 className={styles.panelTitle}>Request {selected.request.requestId}</h2>
                      </div>
                      <span className={`${styles.statusBadge} ${selected.request.status === 'overdue' ? styles.statusOverdue : styles.statusSent}`}>
                        {selected.request.status}
                      </span>
                    </div>

                    {selected.request.htmlSnapshot && (
                      <div
                        className={styles.snapshot}
                        dangerouslySetInnerHTML={{ __html: selected.request.htmlSnapshot }}
                      />
                    )}
                  </div>

                  {sent ? (
                    <div className={styles.successPanel}>
                      <CheckCircleIcon width={28} height={28} />
                      <p className={styles.successTitle}>✓ RESPONSE SENT</p>
                      <p className={styles.successSub}>
                        The investigating officer has been notified and the case has been updated.
                      </p>
                      <button type="button" className={styles.primaryBtn} onClick={backToInbox}>
                        Back to inbox
                      </button>
                    </div>
                  ) : (
                    <form className={styles.panel} onSubmit={handleSubmit}>
                      <h3 className={styles.panelTitle}>Compliance response</h3>

                      <div className={styles.formGrid}>
                        {RESPONSE_FIELDS.map((f) => (
                          <label key={f.key} className={styles.field}>
                            <span className={styles.fieldLabel}>{f.label}</span>
                            <input
                              type="text"
                              className={styles.input}
                              placeholder={f.placeholder}
                              value={formData[f.key]}
                              onChange={(e) => handleFieldChange(f.key, e.target.value)}
                            />
                          </label>
                        ))}
                      </div>

                      <label className={styles.field}>
                        <span className={styles.fieldLabel}>Responding officer</span>
                        <input
                          type="text"
                          className={styles.input}
                          value={officerName}
                          onChange={(e) => setOfficerName(e.target.value)}
                        />
                      </label>

                      <label className={styles.field}>
                        <span className={styles.fieldLabel}>Notes (optional)</span>
                        <textarea
                          className={styles.textarea}
                          rows={3}
                          placeholder="Any additional context for the investigating officer…"
                          value={notes}
                          onChange={(e) => setNotes(e.target.value)}
                        />
                      </label>

                      {submitError && <p className={styles.actionError}>{submitError}</p>}

                      <button type="submit" className={styles.primaryBtn} disabled={submitting}>
                        {submitting ? 'Sending…' : 'Send response'}
                      </button>
                    </form>
                  )}
                </>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  )
}
