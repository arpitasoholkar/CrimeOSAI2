import { useEffect } from 'react'

const SUFFIX = 'Trinetra'

/**
 * Sets document.title while the owning component is mounted, and restores
 * the previous title on unmount so nested/short-lived views don't leak
 * their title onto whatever renders next.
 *
 * @param {string} title - page-specific title, e.g. "Cases"
 */
export default function useDocumentTitle(title) {
  useEffect(() => {
    const previous = document.title
    document.title = title ? `${title} | ${SUFFIX}` : SUFFIX
    return () => {
      document.title = previous
    }
  }, [title])
}
