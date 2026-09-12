import { useEffect, useState } from 'react'
import { getPresetRange, DATE_PRESET_LABELS, type DatePreset } from '../../utils/dateRanges'
import { inputClasses } from '../../utils/inputStyles'

const PRESETS: DatePreset[] = ['today', 'yesterday', 'last7', 'last30', 'this_month', 'last_month', 'custom']

export function DateRangePresetPicker({
  onChange,
  defaultPreset = 'this_month',
}: {
  onChange: (range: { start: string; end: string }) => void
  defaultPreset?: DatePreset
}) {
  const [preset, setPreset] = useState<DatePreset>(defaultPreset)
  const [customStart, setCustomStart] = useState('')
  const [customEnd, setCustomEnd] = useState('')

  // Fire the initial range once on mount so the parent doesn't have to
  // duplicate the preset->range logic just to get a starting value.
  useEffect(() => {
    if (defaultPreset !== 'custom') onChange(getPresetRange(defaultPreset))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function selectPreset(p: DatePreset) {
    setPreset(p)
    if (p !== 'custom') {
      onChange(getPresetRange(p))
    } else if (customStart && customEnd) {
      onChange(getPresetRange('custom', customStart, customEnd))
    }
  }

  function updateCustom(start: string, end: string) {
    setCustomStart(start)
    setCustomEnd(end)
    if (start && end) onChange(getPresetRange('custom', start, end))
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap gap-1.5">
        {PRESETS.map((p) => (
          <button
            key={p}
            onClick={() => selectPreset(p)}
            className={`rounded-lg px-3 py-1.5 text-xs font-medium transition ${
              preset === p ? 'bg-brand-700 text-white' : 'border border-line bg-surface text-ink-700 hover:bg-surface-muted'
            }`}
          >
            {DATE_PRESET_LABELS[p]}
          </button>
        ))}
      </div>
      {preset === 'custom' && (
        <div className="flex items-center gap-2">
          <input type="date" value={customStart} onChange={(e) => updateCustom(e.target.value, customEnd)} className={`${inputClasses()} w-40`} />
          <span className="text-xs text-ink-300">to</span>
          <input type="date" value={customEnd} onChange={(e) => updateCustom(customStart, e.target.value)} className={`${inputClasses()} w-40`} />
        </div>
      )}
    </div>
  )
}
