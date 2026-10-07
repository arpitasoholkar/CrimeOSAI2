import { useEffect, useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { useNavigate, useSearchParams } from 'react-router-dom'
import CaseCard from '../components/CaseCard/CaseCard'
import { SearchIcon, ChevronRightIcon, FolderIcon } from '../components/Icons/Icons'
import { apiBackend } from '../api/api'
import styles from './Cases.module.css'
import useDocumentTitle from '../hooks/useDocumentTitle'
import { SkeletonRows } from '../components/Skeleton/Skeleton'

const FILTERS = [
  { key: 'all', label: 'All Cases' },
  { key: 'pending', label: 'Pending' },
  { key: 'underInvestigation', label: 'Under Investigation' },
  { key: 'resolved', label: 'Resolved' },
]

const PAGE_SIZE = 12

export default function Cases() {
  useDocumentTitle('Cases')

  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()

  const status = searchParams.get('status') || 'all'
  const page = Math.max(parseInt(searchParams.get('page'), 10) || 1, 1)
  const [searchInput, setSearchInput] = useState(searchParams.get('q') || '')
  const query = searchParams.get('q') || ''

  const [result, setResult] = useState({ cases: [], total: 0, pageCount: 1 })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  // Debounce the search box into the URL (and back to page 1) so we're not
  // firing a request on every keystroke.
  useEffect(() => {
    const handle = setTimeout(() => {
      if (searchInput === query) return
      updateParams({ q: searchInput || undefined, page: undefined })
    }, 350)
    return () => clearTimeout(handle)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchInput])

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)

    const params = { page, limit: PAGE_SIZE }
    if (status !== 'all') params.status = status
    if (query) params.q = query

    apiBackend
      .get('/api/cases', { params })
      .then((res) => {
        if (cancelled) return
        setResult(res.data)
      })
      .catch((err) => {
        if (cancelled) return
        console.error(err)
        setError('Could not load cases. Is the backend running?')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [page, status, query])

  const updateParams = (patch) => {
    const next = new URLSearchParams(searchParams)
    Object.entries(patch).forEach(([key, value]) => {
      if (value === undefined || value === null || value === '') next.delete(key)
      else next.set(key, value)
    })
    setSearchParams(next)
  }

  const cases = result.cases || []
  const total = result.total || 0
  const pageCount = result.pageCount || 1

  const rangeLabel = useMemo(() => {
    if (total === 0) return 'No cases'
    const start = (page - 1) * PAGE_SIZE + 1
    const end = Math.min(page * PAGE_SIZE, total)
    return `Showing ${start}\u2013${end} of ${total}`
  }, [page, total])

  return (
    <motion.div
      className={styles.wrap}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
    >
      <div className={styles.toolbar}>
        <div className={styles.search}>
          <SearchIcon width={16} height={16} />
          <input
            type="text"
            placeholder="Search by case ID or title..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
          />
        </div>

        <div className={styles.filters}>
          {FILTERS.map((f) => (
            <button
              key={f.key}
              type="button"
              className={`${styles.filterBtn} ${status === f.key ? styles.filterActive : ''}`}
              onClick={() => updateParams({ status: f.key === 'all' ? undefined : f.key, page: undefined })}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      <div className={styles.panel}>
        <div className={styles.panelHeader}>
          <span className={styles.rangeLabel}>{loading ? 'Loading\u2026' : rangeLabel}</span>
          <button type="button" className={styles.newCaseBtn} onClick={() => navigate('/new-case')}>
            New Case
          </button>
        </div>

        {error && <div className={styles.stateMsg}>{error}</div>}

        {!error && loading && <SkeletonRows count={5} />}

        {!error && !loading && cases.length === 0 && (
          <div className={styles.emptyState}>
            <FolderIcon width={28} height={28} />
            <p>No cases match your filters.</p>
          </div>
        )}

        {!error && !loading && cases.length > 0 && (
          <div className={styles.caseList}>
            {cases.map((c, i) => (
              <CaseCard key={c.id} caseItem={c} index={i} onOpen={(id) => navigate(`/cases/${id}`)} />
            ))}
          </div>
        )}

        {!error && pageCount > 1 && (
          <div className={styles.pagination}>
            <button
              type="button"
              className={styles.pageBtn}
              disabled={page <= 1}
              onClick={() => updateParams({ page: page - 1 === 1 ? undefined : page - 1 })}
            >
              <ChevronRightIcon width={15} height={15} style={{ transform: 'rotate(180deg)' }} />
              Prev
            </button>
            <span className={styles.pageInfo}>
              Page {page} of {pageCount}
            </span>
            <button
              type="button"
              className={styles.pageBtn}
              disabled={page >= pageCount}
              onClick={() => updateParams({ page: page + 1 })}
            >
              Next
              <ChevronRightIcon width={15} height={15} />
            </button>
          </div>
        )}
      </div>
    </motion.div>
  )
}
