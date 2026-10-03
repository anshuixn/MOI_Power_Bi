// ============================================================
// Date Picker
// ============================================================

import { useState, useRef, useEffect } from 'react'
import { Calendar, ChevronDown, Check } from 'lucide-react'
import { useApp } from '@/hooks/useApp'

type DateRangeType = 'last_7_days' | 'last_30_days' | 'last_90_days' | 'custom'

const OPTIONS: { id: DateRangeType, label: string }[] = [
  { id: 'last_7_days', label: 'Last 7 Days' },
  { id: 'last_30_days', label: 'Last 30 Days' },
  { id: 'last_90_days', label: 'Last 90 Days' },
  { id: 'custom', label: 'Custom Range' },
]

function formatDateInput(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function getDefaultCustomDates() {
  const end = new Date()
  const start = new Date(end)
  start.setDate(start.getDate() - 29)
  return { start: formatDateInput(start), end: formatDateInput(end) }
}

export function DatePicker() {
  const { filters, setFilters } = useApp()
  const [isOpen, setIsOpen] = useState(false)
  const [tempRange, setTempRange] = useState<DateRangeType>(filters.dateRange as DateRangeType || 'last_30_days')
  const initialCustomDates = getDefaultCustomDates()
  const [customStart, setCustomStart] = useState(filters.customDateStart ?? initialCustomDates.start)
  const [customEnd, setCustomEnd] = useState(filters.customDateEnd ?? initialCustomDates.end)
  const dropdownRef = useRef<HTMLDivElement>(null)

  // Click outside to close
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const toggleOpen = () => {
    if (!isOpen) {
      setTempRange(filters.dateRange)
      const defaults = getDefaultCustomDates()
      setCustomStart(filters.customDateStart ?? defaults.start)
      setCustomEnd(filters.customDateEnd ?? defaults.end)
    }
    setIsOpen(!isOpen)
  }

  const handleApply = () => {
    if (tempRange === 'custom' && (!customStart || !customEnd || customStart > customEnd)) return
    setFilters({
      ...filters,
      dateRange: tempRange,
      customDateStart: tempRange === 'custom' ? customStart : undefined,
      customDateEnd: tempRange === 'custom' ? customEnd : undefined,
    })
    setIsOpen(false)
  }

  const handleReset = () => {
    setTempRange('last_30_days')
    setFilters({
      ...filters,
      dateRange: 'last_30_days',
      customDateStart: undefined,
      customDateEnd: undefined,
    })
    setIsOpen(false)
  }

  const currentLabel = OPTIONS.find(o => o.id === filters.dateRange)?.label || 'Select Date'

  return (
    <div style={{ position: 'relative' }} ref={dropdownRef}>
      <button
        onClick={toggleOpen}
        aria-haspopup="dialog"
        aria-expanded={isOpen}
        aria-label={`Date range: ${currentLabel}`}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          background: 'rgba(255,255,255,0.6)',
          backdropFilter: 'blur(12px) saturate(120%)',
          WebkitBackdropFilter: 'blur(12px) saturate(120%)',
          border: '1px solid rgba(255,255,255,0.7)',
          padding: '8px 14px',
          borderRadius: 8,
          cursor: 'pointer',
          color: '#1B1F2A',
          fontSize: 14,
          fontWeight: 500,
          boxShadow: '0 2px 8px rgba(0,0,0,0.02)',
          transition: 'all 0.15s ease'
        }}
      >
        <Calendar size={16} color="#6B7280" />
        {currentLabel}
        <ChevronDown size={14} color="#6B7280" style={{ transform: isOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s ease' }} />
      </button>

      {isOpen && (
        <div
          role="dialog"
          aria-label="Choose date range"
          style={{
            position: 'absolute',
            top: 'calc(100% + 8px)',
            right: 0,
            width: 280,
            background: 'rgba(255, 255, 255, 0.85)',
            backdropFilter: 'blur(24px) saturate(140%)',
            WebkitBackdropFilter: 'blur(24px) saturate(140%)',
            border: '1px solid rgba(255, 255, 255, 0.9)',
            borderRadius: 12,
            boxShadow: '0 12px 32px rgba(27, 31, 42, 0.08), 0 0 0 1px rgba(109, 61, 245, 0.05)',
            zIndex: 100,
            overflow: 'hidden',
            animation: 'dropdown-in 0.2s cubic-bezier(0.16, 1, 0.3, 1)'
          }}
        >
          <div style={{ padding: 8 }}>
            {OPTIONS.map(opt => (
              <button
                key={opt.id}
                onClick={() => setTempRange(opt.id)}
                style={{
                  width: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '10px 12px',
                  background: tempRange === opt.id ? 'rgba(109, 61, 245, 0.08)' : 'transparent',
                  border: 'none',
                  borderRadius: 6,
                  cursor: 'pointer',
                  textAlign: 'left',
                  fontSize: 14,
                  fontWeight: tempRange === opt.id ? 500 : 400,
                  color: tempRange === opt.id ? '#6D3DF5' : '#4A5160',
                  transition: 'background 0.15s ease'
                }}
              >
                {opt.label}
                {tempRange === opt.id && <Check size={16} />}
              </button>
            ))}
          </div>
          
          {tempRange === 'custom' && (
            <div style={{ padding: '0 16px 16px', display: 'grid', gap: 10 }}>
              <label style={{ display: 'grid', gap: 4, color: '#4A5160', fontSize: 12 }}>
                Start date
                <input
                  aria-label="Start date"
                  type="date"
                  value={customStart}
                  max={customEnd || undefined}
                  onChange={event => setCustomStart(event.target.value)}
                  style={{ padding: '8px 10px', border: '1px solid rgba(0,0,0,0.12)', borderRadius: 6, font: 'inherit' }}
                />
              </label>
              <label style={{ display: 'grid', gap: 4, color: '#4A5160', fontSize: 12 }}>
                End date
                <input
                  aria-label="End date"
                  type="date"
                  value={customEnd}
                  min={customStart || undefined}
                  onChange={event => setCustomEnd(event.target.value)}
                  style={{ padding: '8px 10px', border: '1px solid rgba(0,0,0,0.12)', borderRadius: 6, font: 'inherit' }}
                />
              </label>
            </div>
          )}

          <div style={{ display: 'flex', padding: 12, gap: 8, borderTop: '1px solid rgba(0,0,0,0.05)', background: 'rgba(255,255,255,0.5)' }}>
            <button
              onClick={handleReset}
              style={{
                flex: 1,
                padding: '8px 0',
                background: 'transparent',
                border: '1px solid rgba(0,0,0,0.1)',
                borderRadius: 6,
                color: '#4A5160',
                fontSize: 13,
                fontWeight: 500,
                cursor: 'pointer'
              }}
            >
              Reset
            </button>
            <button
              onClick={handleApply}
              style={{
                flex: 1,
                padding: '8px 0',
                background: '#6D3DF5',
                border: 'none',
                borderRadius: 6,
                color: '#fff',
                fontSize: 13,
                fontWeight: 500,
                cursor: 'pointer',
                boxShadow: '0 2px 4px rgba(109, 61, 245, 0.2)'
              }}
            >
              Apply
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
