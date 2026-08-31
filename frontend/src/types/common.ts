// Matches core/pagination.py::StandardResultsPagination.get_paginated_response exactly.
export interface Paginated<T> {
  count: number
  total_pages: number
  current_page: number
  page_size: number
  next: string | null
  previous: string | null
  results: T[]
}

// Matches core/exceptions.py::custom_exception_handler exactly.
export interface ApiErrorShape {
  error: true
  detail: string | Record<string, string[]> | string[]
  status_code: number
}
