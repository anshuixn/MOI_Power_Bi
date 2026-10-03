// ============================================================
// Command Palette — Global Search
// ============================================================

import React, { useState, useEffect, useRef } from 'react'
import { Search, FileText, BarChart2, MessageSquare, AlertTriangle, Lightbulb, Box } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

// Mock Search Data - In a real app, this would come from a service
const SEARCH_DATA = [
  { id: 'p-dashboard', type: 'page', title: 'Dashboard', url: '/dashboard', icon: BarChart2 },
  { id: 'p-reviews', type: 'page', title: 'Reviews Explorer', url: '/reviews', icon: MessageSquare },
  { id: 'p-topics', type: 'page', title: 'Topic Intelligence', url: '/topics', icon: FileText },
  { id: 'p-complaints', type: 'page', title: 'Complaints', url: '/complaints', icon: AlertTriangle },
  { id: 'p-insights', type: 'page', title: 'AI Insights', url: '/ai-insights', icon: Lightbulb },
  { id: 'pr-1', type: 'product', title: 'Aero Blender', url: '/reviews?product=aero-blender', icon: Box },
  { id: 'pr-2', type: 'product', title: 'Lumen Desk Lamp', url: '/reviews?product=lumen-desk-lamp', icon: Box },
  { id: 't-1', type: 'topic', title: 'Product Quality', url: '/topics?id=product-quality', icon: FileText },
  { id: 't-2', type: 'topic', title: 'Delivery Issues', url: '/topics?id=delivery', icon: FileText },
]

export function CommandPalette() {
  const [isOpen, setIsOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [selectedIndex, setSelectedIndex] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const navigate = useNavigate()
  
  // Filter results based on query
  const results = query 
    ? SEARCH_DATA.filter(item => item.title.toLowerCase().includes(query.toLowerCase()))
    : SEARCH_DATA.slice(0, 5) // Show top 5 as default/recent

  // Keyboard shortcut & custom event listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        setIsOpen(true)
      }
      if (e.key === 'Escape' && isOpen) {
        setIsOpen(false)
      }
    }
    
    const handleCustomOpen = () => setIsOpen(true)
    
    window.addEventListener('keydown', handleKeyDown)
    window.addEventListener('open-command-palette', handleCustomOpen)
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      window.removeEventListener('open-command-palette', handleCustomOpen)
    }
  }, [isOpen])

  // Focus trap and navigation
  // oxlint-disable-next-line react/set-state-in-effect -- intentional: resetting selection index when palette state changes
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 10)
      setSelectedIndex(0)
    }
  }, [isOpen, query])

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setSelectedIndex(prev => (prev < results.length - 1 ? prev + 1 : prev))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setSelectedIndex(prev => (prev > 0 ? prev - 1 : prev))
    } else if (e.key === 'Enter' && results[selectedIndex]) {
      e.preventDefault()
      navigate(results[selectedIndex].url)
      setIsOpen(false)
    }
  }

  if (!isOpen) return null

  return (
    <div 
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'center',
        paddingTop: '15vh',
        background: 'rgba(27, 31, 42, 0.4)',
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)'
      }}
      onClick={() => setIsOpen(false)}
    >
      <div 
        style={{
          width: '100%',
          maxWidth: 600,
          background: 'rgba(255, 255, 255, 0.75)',
          backdropFilter: 'blur(30px) saturate(140%)',
          WebkitBackdropFilter: 'blur(30px) saturate(140%)',
          border: '1px solid rgba(255, 255, 255, 0.85)',
          borderRadius: 16,
          boxShadow: '0 24px 48px rgba(27, 31, 42, 0.1), 0 0 0 1px rgba(109, 61, 245, 0.05)',
          overflow: 'hidden',
          animation: 'modal-in 0.2s cubic-bezier(0.16, 1, 0.3, 1)'
        }}
        onClick={e => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label="Search pages, products, and topics"
      >
        <div style={{ display: 'flex', alignItems: 'center', padding: '16px 20px', borderBottom: '1px solid rgba(0,0,0,0.05)' }}>
          <Search size={20} color="#6B7280" />
          <input
            ref={inputRef}
            type="text"
            placeholder="Search reviews, topics, insights..."
            aria-label="Search pages, products, and topics"
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            style={{
              flex: 1,
              border: 'none',
              background: 'transparent',
              outline: 'none',
              fontSize: 16,
              color: '#1B1F2A',
              marginLeft: 12,
              padding: 0
            }}
          />
          <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
            <span style={{ fontSize: 12, color: '#6B7280', background: 'rgba(0,0,0,0.05)', padding: '2px 6px', borderRadius: 4 }}>⌘</span>
            <span style={{ fontSize: 12, color: '#6B7280', background: 'rgba(0,0,0,0.05)', padding: '2px 6px', borderRadius: 4 }}>K</span>
          </div>
        </div>

        <div role="listbox" aria-label="Search results" style={{ maxHeight: 340, overflowY: 'auto', padding: 8 }}>
          {results.length > 0 ? (
            results.map((item, index) => {
              const Icon = item.icon
              const isSelected = index === selectedIndex
              return (
                <div
                  key={item.id}
                  role="option"
                  aria-selected={isSelected}
                  tabIndex={0}
                  onClick={() => {
                    navigate(item.url)
                    setIsOpen(false)
                  }}
                  onKeyDown={e => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault()
                      navigate(item.url)
                      setIsOpen(false)
                    }
                  }}
                  onMouseEnter={() => setSelectedIndex(index)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    padding: '12px 16px',
                    cursor: 'pointer',
                    borderRadius: 8,
                    background: isSelected ? 'rgba(109, 61, 245, 0.08)' : 'transparent',
                    transition: 'all 0.15s ease'
                  }}
                >
                  <Icon size={18} color={isSelected ? '#6D3DF5' : '#6B7280'} />
                  <span style={{ 
                    marginLeft: 12, 
                    fontSize: 14, 
                    color: isSelected ? '#1B1F2A' : '#4A5160',
                    fontWeight: isSelected ? 500 : 400
                  }}>
                    {item.title}
                  </span>
                  <span style={{ 
                    marginLeft: 'auto', 
                    fontSize: 12, 
                    color: '#9CA3AF',
                    textTransform: 'capitalize'
                  }}>
                    {item.type}
                  </span>
                </div>
              )
            })
          ) : (
            <div style={{ padding: '32px 20px', textAlign: 'center', color: '#6B7280', fontSize: 14 }}>
              No results found for "{query}"
            </div>
          )}
        </div>
        
        <div style={{ padding: '8px 16px', background: 'rgba(0,0,0,0.02)', borderTop: '1px solid rgba(0,0,0,0.05)', display: 'flex', gap: 16 }}>
           <div style={{ fontSize: 11, color: '#6B7280', display: 'flex', alignItems: 'center', gap: 4 }}>
             <span style={{ background: 'rgba(0,0,0,0.05)', padding: '2px 4px', borderRadius: 4 }}>↵</span> to select
           </div>
           <div style={{ fontSize: 11, color: '#6B7280', display: 'flex', alignItems: 'center', gap: 4 }}>
             <span style={{ background: 'rgba(0,0,0,0.05)', padding: '2px 4px', borderRadius: 4 }}>↑↓</span> to navigate
           </div>
           <div style={{ fontSize: 11, color: '#6B7280', display: 'flex', alignItems: 'center', gap: 4 }}>
             <span style={{ background: 'rgba(0,0,0,0.05)', padding: '2px 4px', borderRadius: 4 }}>esc</span> to close
           </div>
        </div>
      </div>
    </div>
  )
}
