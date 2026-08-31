import { useState } from 'react'
import { PageHeader } from '../components/ui/StatusBadge'
import { DateRangePresetPicker } from '../components/reports/DateRangePresetPicker'
import {
  SalesReportTab, PaymentReportTab, OutstandingReportTab, InventoryReportTab,
  PurchaseReportTab, ExpenseReportTab, BusinessSummaryTab, ActivityTab,
} from '../components/reports/ReportTabs'

type Tab = 'sales' | 'payments' | 'outstanding' | 'inventory' | 'purchases' | 'expenses' | 'summary' | 'activity'

const TABS: { key: Tab; label: string; needsDateRange: boolean }[] = [
  { key: 'sales', label: 'Sales', needsDateRange: true },
  { key: 'payments', label: 'Payments', needsDateRange: true },
  { key: 'outstanding', label: 'Outstanding', needsDateRange: false },
  { key: 'inventory', label: 'Inventory', needsDateRange: false },
  { key: 'purchases', label: 'Purchases', needsDateRange: true },
  { key: 'expenses', label: 'Expenses', needsDateRange: true },
  { key: 'summary', label: 'Business Summary', needsDateRange: true },
  { key: 'activity', label: 'Activity', needsDateRange: true },
]

export function ReportsPage() {
  const [tab, setTab] = useState<Tab>('sales')
  const [range, setRange] = useState<{ start: string; end: string } | null>(null)

  const activeTab = TABS.find((t) => t.key === tab)!

  return (
    <div>
      <PageHeader title="Reports" />

      <div className="mb-4 flex flex-wrap gap-1.5 border-b border-line pb-3">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`rounded-lg px-3 py-1.5 text-sm font-medium transition ${
              tab === t.key ? 'bg-brand-700 text-white' : 'text-ink-700 hover:bg-surface-muted'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {activeTab.needsDateRange && (
        <div className="mb-5">
          <DateRangePresetPicker onChange={setRange} />
        </div>
      )}

      {(!activeTab.needsDateRange || range) && (
        <>
          {tab === 'sales' && range && <SalesReportTab start={range.start} end={range.end} />}
          {tab === 'payments' && range && <PaymentReportTab start={range.start} end={range.end} />}
          {tab === 'outstanding' && <OutstandingReportTab />}
          {tab === 'inventory' && <InventoryReportTab />}
          {tab === 'purchases' && range && <PurchaseReportTab start={range.start} end={range.end} />}
          {tab === 'expenses' && range && <ExpenseReportTab start={range.start} end={range.end} />}
          {tab === 'summary' && range && <BusinessSummaryTab start={range.start} end={range.end} />}
          {tab === 'activity' && range && <ActivityTab start={range.start} end={range.end} />}
        </>
      )}
    </div>
  )
}
