import { useCallback, useEffect, useState } from 'react'
import { extractErrorMessage } from '../api/axios'
import type { Paginated } from '../types'

/**
 * Wraps the common "paginated list with search + extra filters" pattern
 * used by Customers/Products/Suppliers (and every future list page).
 * `fetcher` should call the real backend endpoint — this hook has no
 * knowledge of any specific API, it only manages page/search/loading state.
 */
export function usePaginatedList<T, Extra extends Record<string, unknown> = Record<string, never>>(
  fetcher: (params: { page: number; search?: string } & Extra) => Promise<Paginated<T>>,
  extraParams: Extra = {} as Extra,
) {
  const [data, setData] = useState<Paginated<T> | null>(null)
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const extraKey = JSON.stringify(extraParams)

  const load = useCallback(() => {
    setIsLoading(true)
    setError(null)
    fetcher({ page, search: search || undefined, ...extraParams })
      .then(setData)
      .catch((err) => setError(extractErrorMessage(err)))
      .finally(() => setIsLoading(false))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, search, extraKey])

  useEffect(() => {
    load()
  }, [load])

  // Reset to page 1 whenever the search term changes.
  const handleSearch = useCallback((query: string) => {
    setPage(1)
    setSearch(query)
  }, [])

  return {
    items: data?.results ?? [],
    count: data?.count ?? 0,
    totalPages: data?.total_pages ?? 1,
    currentPage: data?.current_page ?? page,
    pageSize: data?.page_size ?? 20,
    isLoading,
    error,
    page,
    setPage,
    handleSearch,
    reload: load,
  }
}
