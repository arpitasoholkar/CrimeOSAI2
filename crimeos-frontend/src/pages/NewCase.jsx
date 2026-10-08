import { useState } from 'react'
import { motion } from 'framer-motion'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { apiBackend } from '../api/api'
import { useAuth } from '../context/AuthContext'
import {
  UploadCloudIcon,
  FileTextIcon,
  CheckCircleIcon,
  UserIcon,
  TrashIcon,
  ImageIcon,
  AudioIcon,
} from '../components/Icons/Icons'
import styles from './NewCase.module.css'
import useDocumentTitle from '../hooks/useDocumentTitle'
import { useToast } from '../context/ToastContext'

export default function NewCase() {
  useDocumentTitle('New Case')

  const navigate = useNavigate()
  const { user } = useAuth()
  const toast = useToast()
  const [searchParams] = useSearchParams()

  const [mode, setMode] = useState('text')
  const [text, setText] = useState('')
  const [files, setFiles] = useState([])
  const [caseName, setCaseName] = useState('')
  const [caseId, setCaseId] = useState(
    searchParams.get('case_id') || ''
  )
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(null)

  const addFiles = (incoming) => {
    const incomingList = Array.from(incoming || [])

    if (incomingList.length === 0) return

    setFiles((prev) => {
      const existingKeys = new Set(
        prev.map(
          (f) =>
            `${f.name}-${f.size}-${f.lastModified}`
        )
      )

      const deduped = incomingList.filter(
        (f) =>
          !existingKeys.has(
            `${f.name}-${f.size}-${f.lastModified}`
          )
      )

      return [...prev, ...deduped]
    })
  }

  const removeFile = (indexToRemove) => {
    setFiles((prev) =>
      prev.filter((_, i) => i !== indexToRemove)
    )
  }

  const handleDrop = (e) => {
    e.preventDefault()
    addFiles(e.dataTransfer.files)
  }

  const fileIcon = (f) => {
    if (f.type.startsWith('image/')) {
      return <ImageIcon width={15} height={15} />
    }

    if (f.type.startsWith('audio/')) {
      return <AudioIcon width={15} height={15} />
    }

    return <FileTextIcon width={15} height={15} />
  }

  /*
   * Determine the investigation status without assuming that
   * "triggered !== true" means failure.
   *
   * Backend implementations may return:
   *   triggered: true
   *   status: "completed"
   *   status: "success"
   *   status: "processing"
   *   or no explicit status while the backend has already
   *   accepted the investigation request.
   */
  const getInvestigationMessage = (investigation) => {
    if (!investigation) {
      return 'AI investigation request accepted.'
    }

    const status = String(
      investigation.status || ''
    ).toLowerCase()

    if (
      investigation.triggered === true ||
      status === 'completed' ||
      status === 'complete' ||
      status === 'success' ||
      status === 'succeeded'
    ) {
      return 'AI investigation completed.'
    }

    if (
      status === 'processing' ||
      status === 'pending' ||
      status === 'queued' ||
      status === 'running'
    ) {
      return 'AI investigation is processing.'
    }

    /*
     * Only show a failure message when an actual error
     * exists. Do NOT turn an absent "triggered" field into
     * "did not run".
     */
    if (investigation.error) {
      return `AI investigation could not be completed: ${investigation.error}`
    }

    /*
     * This is the important fallback for your current API
     * response. The backend has accepted the request, but
     * the response doesn't explicitly expose a status.
     */
    return 'AI investigation request accepted.'
  }

  const handleSubmit = async (e) => {
    e.preventDefault()

    setError(null)
    setSuccess(null)

    if (!caseName.trim()) {
      setError('Enter a case name.')
      return
    }

    if (mode === 'text' && !text.trim()) {
      setError(
        'Enter the complaint text, or switch to file upload.'
      )
      return
    }

    if (mode === 'file' && files.length === 0) {
      setError('Choose at least one file to upload.')
      return
    }

    setSubmitting(true)

    try {
      let res

      if (mode === 'file') {
        const formData = new FormData()

        files.forEach((f) => {
          formData.append('files', f)
        })

        formData.append(
          'caseName',
          caseName.trim()
        )

        if (caseId.trim()) {
          formData.append(
            'case_id',
            caseId.trim()
          )
        }

        res = await apiBackend.post(
          '/ingest',
          formData
        )
      } else {
        res = await apiBackend.post(
          '/ingest',
          {
            text: text.trim(),
            caseName: caseName.trim(),
            case_id:
              caseId.trim() || undefined,
          }
        )
      }

      /*
       * Keep the complete backend response so the UI
       * can accurately display the investigation state.
       */
      setSuccess(res.data)

      setText('')
      setFiles([])
      setCaseName('')

      toast.success(
        'Case submitted successfully.'
      )
    } catch (err) {
      const msg =
        err.response?.data?.error ||
        'Something went wrong submitting this evidence.'

      setError(msg)
      toast.error(msg)
    } finally {
      setSubmitting(false)
    }
  }

  const investigationMessage =
    success
      ? getInvestigationMessage(
          success.investigation
        )
      : ''

  return (
    <motion.div
      className={styles.wrap}
      initial={{
        opacity: 0,
        y: 8,
      }}
      animate={{
        opacity: 1,
        y: 0,
      }}
      transition={{
        duration: 0.28,
        ease: [0.16, 1, 0.3, 1],
      }}
    >
      <div className={styles.header}>
        <h2 className={styles.title}>
          New Case
        </h2>

        <p className={styles.subtitle}>
          Submit a complaint as text or a file.
          Leave Case ID blank to start a new
          case, or fill it in to attach this
          evidence to an existing one.
        </p>
      </div>

      <form
        className={styles.form}
        onSubmit={handleSubmit}
      >
        <div className={styles.field}>
          <label
            className={styles.label}
            htmlFor="caseName"
          >
            Case Name
          </label>

          <input
            id="caseName"
            type="text"
            className={styles.input}
            placeholder="e.g. Phishing complaint — HDFC customer"
            value={caseName}
            onChange={(e) =>
              setCaseName(e.target.value)
            }
            required
          />
        </div>

        <div className={styles.field}>
          <label className={styles.label}>
            Investigator
          </label>

          <div className={styles.readonlyField}>
            <UserIcon
              width={16}
              height={16}
            />

            <span>
              {user?.name ||
                'Unknown investigator'}
            </span>
          </div>
        </div>

        <div className={styles.tabs}>
          <button
            type="button"
            className={`${styles.tab} ${
              mode === 'text'
                ? styles.tabActive
                : ''
            }`}
            onClick={() =>
              setMode('text')
            }
          >
            <FileTextIcon
              width={15}
              height={15}
            />

            Paste Text
          </button>

          <button
            type="button"
            className={`${styles.tab} ${
              mode === 'file'
                ? styles.tabActive
                : ''
            }`}
            onClick={() =>
              setMode('file')
            }
          >
            <UploadCloudIcon
              width={15}
              height={15}
            />

            Upload File
          </button>
        </div>

        {mode === 'text' ? (
          <textarea
            className={styles.textarea}
            placeholder="Paste the complaint text here…"
            value={text}
            onChange={(e) =>
              setText(e.target.value)
            }
            rows={8}
          />
        ) : (
          <>
            <label
              className={styles.dropzone}
              onDragOver={(e) =>
                e.preventDefault()
              }
              onDrop={handleDrop}
            >
              <UploadCloudIcon
                width={22}
                height={22}
              />

              <span>
                {files.length > 0
                  ? `${files.length} file${
                      files.length > 1
                        ? 's'
                        : ''
                    } selected — click or drop to add more`
                  : 'Click or drop PDF, image, and audio files — mix as many as you need'}
              </span>

              <input
                type="file"
                accept=".pdf,image/*,audio/*"
                multiple
                onChange={(e) => {
                  addFiles(
                    e.target.files
                  )

                  e.target.value = ''
                }}
                hidden
              />
            </label>

            {files.length > 0 && (
              <ul
                className={
                  styles.fileList
                }
              >
                {files.map((f, i) => (
                  <li
                    key={`${f.name}-${f.size}-${f.lastModified}`}
                    className={
                      styles.fileListItem
                    }
                  >
                    {fileIcon(f)}

                    <span
                      className={
                        styles.fileListName
                      }
                    >
                      {f.name}
                    </span>

                    <span
                      className={
                        styles.fileListSize
                      }
                    >
                      {(f.size / 1024).toFixed(
                        0
                      )}{' '}
                      KB
                    </span>

                    <button
                      type="button"
                      className={
                        styles.fileListRemove
                      }
                      onClick={() =>
                        removeFile(i)
                      }
                      aria-label={`Remove ${f.name}`}
                    >
                      <TrashIcon
                        width={14}
                        height={14}
                      />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </>
        )}

        <div className={styles.field}>
          <label
            className={styles.label}
            htmlFor="caseId"
          >
            Case ID{' '}
            <span
              className={
                styles.optional
              }
            >
              (optional — leave blank for a
              new case)
            </span>
          </label>

          <input
            id="caseId"
            type="text"
            className={styles.input}
            placeholder="CASE-000021"
            value={caseId}
            onChange={(e) =>
              setCaseId(e.target.value)
            }
          />
        </div>

        {error && (
          <p className={styles.error}>
            {error}
          </p>
        )}

        {success && (
          <div
            className={
              styles.success
            }
          >
            <CheckCircleIcon
              width={16}
              height={16}
            />

            <span>
              Saved to{' '}
              <strong>
                {success.case_id}
              </strong>
              .{' '}
              {investigationMessage}
            </span>

            <button
              type="button"
              className={
                styles.successLink
              }
              onClick={() =>
                navigate(
                  `/cases/${success.case_id}`
                )
              }
            >
              View Case
            </button>
          </div>
        )}

        <button
          type="submit"
          className={
            styles.submitBtn
          }
          disabled={submitting}
        >
          {submitting
            ? 'Submitting & running AI investigation…'
            : 'Submit Evidence'}
        </button>
      </form>
    </motion.div>
  )
}