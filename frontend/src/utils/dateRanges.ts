/**
 * The business operates in Asia/Kolkata. A staff member's device could
 * theoretically be set to any timezone, so "today" must be computed in
 * IST specifically — never `new Date()` interpreted in the browser's
 * local zone. Uses Intl with an explicit timeZone rather than any date
 * math that assumes the runtime's local offset.
 */
const IST_TIMEZONE = 'Asia/Kolkata'

function formatISTDateString(date: Date): string {
  // en-CA locale formats as YYYY-MM-DD, which is exactly what the backend
  // date filters expect.
  return new Intl.DateTimeFormat('en-CA', { timeZone: IST_TIMEZONE }).format(date)
}

/** Returns today's calendar date in IST, as YYYY-MM-DD. */
export function getISTToday(): string {
  return formatISTDateString(new Date())
}

/** Returns an IST calendar date `offsetDays` away from today (negative = past). */
function getISTDateOffset(offsetDays: number): string {
  const now = new Date()
  // Offsetting by whole days in UTC millis is safe here since we only
  // ever need calendar-day granularity, and the IST formatter below
  // re-derives the correct calendar date regardless of DST-less India.
  const shifted = new Date(now.getTime() + offsetDays * 24 * 60 * 60 * 1000)
  return formatISTDateString(shifted)
}

export type DatePreset = 'today' | 'yesterday' | 'last7' | 'last30' | 'this_month' | 'last_month' | 'custom'

export interface DateRange {
  start: string
  end: string
}

export function getPresetRange(preset: DatePreset, customStart?: string, customEnd?: string): DateRange {
  const today = getISTToday()

  switch (preset) {
    case 'today':
      return { start: today, end: today }
    case 'yesterday': {
      const y = getISTDateOffset(-1)
      return { start: y, end: y }
    }
    case 'last7':
      return { start: getISTDateOffset(-6), end: today }
    case 'last30':
      return { start: getISTDateOffset(-29), end: today }
    case 'this_month': {
      const [y, m] = today.split('-')
      return { start: `${y}-${m}-01`, end: today }
    }
    case 'last_month': {
      const [y, m] = today.split('-').map(Number)
      const lastMonthDate = new Date(Date.UTC(y, m - 2, 1)) // month is 1-indexed in our string
      const lastMonthYear = lastMonthDate.getUTCFullYear()
      const lastMonthMonth = lastMonthDate.getUTCMonth() + 1
      const daysInLastMonth = new Date(Date.UTC(lastMonthYear, lastMonthMonth, 0)).getUTCDate()
      const mm = String(lastMonthMonth).padStart(2, '0')
      return {
        start: `${lastMonthYear}-${mm}-01`,
        end: `${lastMonthYear}-${mm}-${String(daysInLastMonth).padStart(2, '0')}`,
      }
    }
    case 'custom':
      return { start: customStart || today, end: customEnd || today }
  }
}

export const DATE_PRESET_LABELS: Record<DatePreset, string> = {
  today: 'Today',
  yesterday: 'Yesterday',
  last7: 'Last 7 Days',
  last30: 'Last 30 Days',
  this_month: 'This Month',
  last_month: 'Last Month',
  custom: 'Custom Range',
}
