import { useState } from 'react'
import { motion } from 'framer-motion'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { apiBackend } from '../api/api'
import { UploadCloudIcon, FileTextIcon, CheckCircleIcon } from '../components/Icons/Icons'
import styles from './NewCase.module.css'

export default function NewCase() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const [mode, setMode] = useState('text') // 'text' | 'file'
  const [text, setText] = useState('')
  const [file, setFile] = useState(null)
  const [caseId, setCaseId] = useState(searchParams.get('case_id') || '')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(null)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError(null)
    setSuccess(null)

    if (mode === 'text' && !text.trim()) {
      setError('Enter the complaint text, or switch to file upload.')
      return
    }
    if (mode === 'file' && !file) {
      setError('Choose a file to upload.')
      return
    }

    setSubmitting(true)
    try {
      let res
      if (mode === 'file') {
        const formData = new FormData()
        formData.append('file', file)
        if (caseId.trim()) formData.append('case_id', caseId.trim())
        res = await apiBackend.post('/ingest', formData)
      } else {
        res = await apiBackend.post('/ingest', {
          text: text.trim(),
          case_id: caseId.trim() || undefined,
        })
      }
      setSuccess(res.data)
      setText('')
      setFile(null)
    } catch (err) {
      setError(err.response?.data?.error || 'Something went wrong submitting this evidence.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <motion.div
      className={styles.wrap}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
    >
      <div className={styles.header}>
        <h2 className={styles.title}>New Case</h2>
        <p className={styles.subtitle}>
          Submit a complaint as text or a file. Leave Case ID blank to start a new case, or fill
          it in to attach this evidence to an existing one.
        </p>
      </div>

      <form className={styles.form} onSubmit={handleSubmit}>
        <div className={styles.tabs}>
          <button
            type="button"
            className={`${styles.tab} ${mode === 'text' ? styles.tabActive : ''}`}
            onClick={() => setMode('text')}
          >
            <FileTextIcon width={15} height={15} /> Paste Text
          </button>
          <button
            type="button"
            className={`${styles.tab} ${mode === 'file' ? styles.tabActive : ''}`}
            onClick={() => setMode('file')}
          >
            <UploadCloudIcon width={15} height={15} /> Upload File
          </button>
        </div>

        {mode === 'text' ? (
          <textarea
            className={styles.textarea}
            placeholder="Paste the complaint text here…"
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={8}
          />
        ) : (
          <label className={styles.dropzone}>
            <UploadCloudIcon width={22} height={22} />
            <span>{file ? file.name : 'Click to choose a PDF, image, or audio file'}</span>
            <input
              type="file"
              accept=".pdf,image/*,audio/*"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              hidden
            />
          </label>
        )}

        <div className={styles.field}>
          <label className={styles.label} htmlFor="caseId">
            Case ID <span className={styles.optional}>(optional — leave blank for a new case)</span>
          </label>
          <input
            id="caseId"
            type="text"
            className={styles.input}
            placeholder="CASE-000021"
            value={caseId}
            onChange={(e) => setCaseId(e.target.value)}
          />
        </div>

        {error && <p className={styles.error}>{error}</p>}

        {success && (
          <div className={styles.success}>
            <CheckCircleIcon width={16} height={16} />
            <span>
              Saved to <strong>{success.case_id}</strong>. AI investigation has been triggered.
            </span>
            <button type="button" className={styles.successLink} onClick={() => navigate(`/cases/${success.case_id}`)}>
              View Case
            </button>
          </div>
        )}

        <button type="submit" className={styles.submitBtn} disabled={submitting}>
          {submitting ? 'Submitting…' : 'Submit Evidence'}
        </button>
      </form>
    </motion.div>
  )
}