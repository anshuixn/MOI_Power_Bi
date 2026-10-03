// ============================================================
// ReviewBand Top Bar — Reference-faithful purple glassmorphism
// Search pill, filter pills, bell, avatar row
// ============================================================

import { useState } from 'react'
import { Search, Bell, ChevronDown, Package, Globe } from 'lucide-react'
import { useApp } from '@/hooks/useApp'
import type { ReviewSource } from '@/types'
import { PRODUCTS } from '@/data/mockData'
import { NotificationPanel } from '../controls/NotificationPanel'
import { DatePicker } from '../controls/DatePicker'

const SOURCE_OPTIONS: { label: string; value: ReviewSource | null }[] = [
  { label: 'All Sources',   value: null },
  { label: 'Web Store',     value: 'web_store' },
  { label: 'Mobile App',    value: 'mobile_app' },
  { label: 'Marketplace',   value: 'marketplace' },
  { label: 'Survey',        value: 'survey' },
  { label: 'Social',        value: 'social' },
]

/* ── Reusable glass pill dropdown ──────────────────────────── */
interface PillDropdownProps {
  icon: any
  label: string
  options: { label: string; value: string | null }[]
  value: string | null
  onSelect: (v: string | null) => void
}

function PillDropdown({ icon: Icon, label: _label, options, value, onSelect }: PillDropdownProps) {
  const [open, setOpen] = useState(false)
  const selected = options.find(o => o.value === value)

  return (
    <div style={{ position: 'relative' }}>
      <button
        className="glass-strong"
        onClick={() => setOpen(o => !o)}
        aria-haspopup="listbox"
        aria-expanded={open}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          padding: '6px 14px',
          cursor: 'pointer',
          fontSize: 13,
          fontWeight: 500,
          color: '#1C1033',
          whiteSpace: 'nowrap',
          transition: 'all 0.15s ease',
          fontFamily: 'inherit',
        }}
      >
        <Icon size={13} strokeWidth={1.75} style={{ color: '#8B83A3' }} />
        {selected?.label}
        <ChevronDown size={12} strokeWidth={2} style={{ color: '#8B83A3' }} />
      </button>

      {open && (
        <>
          <div
            style={{ position: 'fixed', inset: 0, zIndex: 39 }}
            onClick={() => setOpen(false)}
            aria-hidden="true"
          />
          <div
            className="glass-strong"
            role="listbox"
            style={{
              position: 'absolute',
              top: 'calc(100% + 6px)',
              left: 0,
              minWidth: 180,
              zIndex: 40,
              padding: 4,
            }}
          >
            {options.map(opt => (
              <button
                key={opt.value ?? 'null'}
                role="option"
                aria-selected={value === opt.value}
                onClick={() => { onSelect(opt.value); setOpen(false) }}
                style={{
                  width: '100%',
                  display: 'block',
                  padding: '8px 12px',
                  borderRadius: 10,
                  border: 'none',
                  background: value === opt.value ? 'rgba(124,58,237,0.08)' : 'transparent',
                  color: value === opt.value ? '#7C3AED' : '#1C1033',
                  fontSize: 13,
                  fontWeight: value === opt.value ? 600 : 400,
                  textAlign: 'left',
                  cursor: 'pointer',
                  transition: 'background 0.1s ease',
                  fontFamily: 'inherit',
                }}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  )
}

/* ── Main TopBar component ─────────────────────────────────── */
export function TopBar() {
  const { filters, updateFilter } = useApp()
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false)

  return (
    <header
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        height: 64,
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        padding: '0 24px 0 48px', // Extra left padding to clear the sidebar edge trigger
        background: 'transparent',
        zIndex: 30,
      }}
      role="banner"
    >
      {/* Search pill — matches reference exactly */}
      <button
        type="button"
        className="glass-strong"
        onClick={() => window.dispatchEvent(new Event('open-command-palette'))}
        aria-label="Open command palette"
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          flex: 1,
          maxWidth: 340,
          padding: '8px 16px',
          borderRadius: 999, /* Override the 16px radius of glass-strong */
          cursor: 'pointer',
          border: 'none',
          color: 'inherit',
          fontFamily: 'inherit',
          textAlign: 'left',
        }}
      >
        <Search size={14} strokeWidth={1.75} style={{ color: '#8B83A3', flexShrink: 0 }} />
        <span
          style={{
            flex: 1,
            border: 'none',
            background: 'transparent',
            fontSize: 13,
            color: '#8B83A3',
            outline: 'none',
            fontFamily: 'inherit',
          }}
        >
          Search reviews, products, topics...
        </span>
        <kbd
          style={{
            fontSize: 10,
            color: '#8B83A3',
            background: 'rgba(196,181,253,0.20)',
            padding: '2px 6px',
            borderRadius: 6,
            fontFamily: 'inherit',
            flexShrink: 0,
            border: '1px solid rgba(196,181,253,0.30)',
          }}
        >
          ⌘ K
        </kbd>
      </button>

      {/* Spacer */}
      <div style={{ flex: 1 }} />

      {/* Filter pills — date, products, sources */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <DatePicker />

        <PillDropdown
          label="Products"
          icon={Package}
          options={[
            { label: 'All Products', value: null },
            ...PRODUCTS.map(p => ({ label: p.name, value: p.id })),
          ]}
          value={filters.productId}
          onSelect={v => updateFilter('productId', v)}
        />

        <PillDropdown
          label="Sources"
          icon={Globe}
          options={SOURCE_OPTIONS.map(o => ({ label: o.label, value: o.value }))}
          value={filters.source}
          onSelect={v => updateFilter('source', v as ReviewSource | null)}
        />
      </div>

      {/* Right: Bell + Profile */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>

        {/* Bell */}
        <button
          className="glass-strong"
          onClick={() => setIsNotificationsOpen(true)}
          aria-label="Notifications (2 unread)"
          style={{
            position: 'relative',
            width: 38,
            height: 38,
            borderRadius: '50%',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#4B4466',
          }}
        >
          <Bell size={16} strokeWidth={1.75} />
          {/* Notification dot — purple, matching reference */}
          <span
            aria-hidden="true"
            style={{
              position: 'absolute',
              top: 7,
              right: 7,
              width: 7,
              height: 7,
              borderRadius: '50%',
              background: '#A855F7',
              border: '1.5px solid white',
            }}
          />
        </button>
        <NotificationPanel isOpen={isNotificationsOpen} onClose={() => setIsNotificationsOpen(false)} />

        {/* Profile pill with avatar photo */}
        <div
          className="glass-strong"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            padding: '4px 12px 4px 4px',
            borderRadius: 999,
            cursor: 'pointer',
          }}
          role="button"
          tabIndex={0}
          aria-label="User profile menu"
        >
          {/* Avatar circle — gradient background with initial */}
          <div
            aria-hidden="true"
            style={{
              width: 30,
              height: 30,
              borderRadius: '50%',
              background: 'linear-gradient(135deg, #C084FC, #7C3AED)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 13,
              fontWeight: 700,
              color: '#fff',
              flexShrink: 0,
              boxShadow: '0 2px 6px rgba(124,58,237,0.30)',
            }}
          >
            A
          </div>
          <div>
            <div style={{ fontSize: 13, fontWeight: 600, color: '#1C1033', lineHeight: 1.2 }}>
              Anshu Raj
            </div>
            <div style={{ fontSize: 11, color: '#8B83A3', lineHeight: 1.2 }}>
              Administrator
            </div>
          </div>
          <ChevronDown size={13} strokeWidth={2} style={{ color: '#8B83A3' }} />
        </div>
      </div>
    </header>
  )
}
