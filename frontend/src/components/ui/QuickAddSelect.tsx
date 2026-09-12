import { useState } from 'react'
import { Plus, Check, X } from 'lucide-react'
import { inputClasses } from '../../utils/inputStyles'

interface Option {
  id: number
  label: string
}

export function QuickAddSelect({
  id,
  value,
  options,
  onChange,
  onCreate,
  placeholder,
  hasError,
}: {
  id: string
  value: number | ''
  options: Option[]
  onChange: (id: number) => void
  onCreate: (name: string) => Promise<Option>
  placeholder: string
  hasError?: boolean
}) {
  const [adding, setAdding] = useState(false)
  const [newName, setNewName] = useState('')
  const [isSaving, setIsSaving] = useState(false)

  async function handleCreate() {
    if (!newName.trim()) return
    setIsSaving(true)
    try {
      const created = await onCreate(newName.trim())
      onChange(created.id)
      setNewName('')
      setAdding(false)
    } finally {
      setIsSaving(false)
    }
  }

  if (adding) {
    return (
      <div className="flex gap-1.5">
        <input
          autoFocus
          className={inputClasses()}
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          placeholder={`New ${placeholder.toLowerCase()}`}
          onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleCreate())}
        />
        <button
          type="button"
          onClick={handleCreate}
          disabled={isSaving}
          className="flex shrink-0 items-center justify-center rounded-xl bg-brand-700 px-3 text-white hover:bg-brand-800 disabled:opacity-60"
        >
          <Check className="h-4 w-4" />
        </button>
        <button
          type="button"
          onClick={() => { setAdding(false); setNewName('') }}
          className="flex shrink-0 items-center justify-center rounded-xl border border-line px-3 text-ink-500 hover:bg-surface-muted"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    )
  }

  return (
    <div className="flex gap-1.5">
      <select
        id={id}
        className={inputClasses(hasError)}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
      >
        <option value="" disabled>Select {placeholder.toLowerCase()}…</option>
        {options.map((o) => (
          <option key={o.id} value={o.id}>{o.label}</option>
        ))}
      </select>
      <button
        type="button"
        onClick={() => setAdding(true)}
        title={`Add new ${placeholder.toLowerCase()}`}
        className="flex shrink-0 items-center justify-center rounded-xl border border-line px-3 text-ink-500 hover:bg-surface-muted"
      >
        <Plus className="h-4 w-4" />
      </button>
    </div>
  )
}
