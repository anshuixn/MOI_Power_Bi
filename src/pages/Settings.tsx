import { Settings as SettingsIcon, Monitor, Database, Bell, CheckCircle } from 'lucide-react'
import { useApp } from '@/hooks/useApp'
import { useState } from 'react'

function SettingRow({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 0', borderBottom: '1px solid rgba(196,181,253,0.1)' }}>
      <div>
        <div style={{ fontSize: 14, fontWeight: 500, color: '#1C1033' }}>{label}</div>
        {hint && <div style={{ fontSize: 12, color: '#8B83A3', marginTop: 2 }}>{hint}</div>}
      </div>
      {children}
    </div>
  )
}

function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      style={{
        width: 44, height: 24, borderRadius: 12, border: 'none', cursor: 'pointer',
        background: checked ? 'linear-gradient(135deg, #7C3AED, #A855F7)' : 'rgba(0,0,0,0.12)',
        position: 'relative', transition: 'background 0.25s ease', flexShrink: 0
      }}
    >
      <div style={{
        position: 'absolute', top: 3, left: checked ? 23 : 3, width: 18, height: 18,
        borderRadius: '50%', background: '#fff', transition: 'left 0.25s cubic-bezier(0.34,1.56,0.64,1)',
        boxShadow: '0 1px 4px rgba(0,0,0,0.2)'
      }} />
    </button>
  )
}

export function Settings() {
  const { settings, updateSettings } = useApp()
  const [saved, setSaved] = useState(false)
  const [notifs, setNotifs] = useState({ alerts: true, insights: true, reports: false, system: true })

  const handleSave = () => {
    setSaved(true)
    setTimeout(() => setSaved(false), 2500)
  }

  return (
    <div className="page-section" style={{ paddingBottom: 80 }}>
      <header style={{ marginBottom: 28 }}>
        <h1 style={{ fontSize: 30, fontWeight: 700, color: '#1C1033', letterSpacing: '-0.03em', marginBottom: 6 }}>Settings</h1>
        <p style={{ fontSize: 15, color: '#4B4466' }}>Manage your application preferences and performance tiers.</p>
      </header>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 20, maxWidth: 640 }}>
        {/* Appearance */}
        <div className="glass-card" style={{ padding: '24px 28px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
            <Monitor size={18} style={{ color: '#A855F7' }} />
            <h2 style={{ fontSize: 17, fontWeight: 600, color: '#1C1033', margin: 0 }}>Appearance</h2>
          </div>
          <p style={{ fontSize: 13, color: '#8B83A3', marginBottom: 16 }}>Customize your visual experience.</p>

          <SettingRow label="Performance Tier" hint="Changes apply immediately to the 3D environment.">
            <select
              value={settings.performanceTier}
              onChange={e => updateSettings({ performanceTier: e.target.value as typeof settings.performanceTier })}
              style={{ padding: '8px 12px', borderRadius: 8, border: '1px solid rgba(196,181,253,0.3)', background: 'rgba(255,255,255,0.6)', fontSize: 13, color: '#1C1033', outline: 'none', fontFamily: 'inherit', cursor: 'pointer' }}
            >
              <option value="auto">Auto-detect</option>
              <option value="full">Full 3D</option>
              <option value="lite">Lite (Reduced)</option>
              <option value="static">Static (No 3D)</option>
            </select>
          </SettingRow>

          <SettingRow label="Reduce Motion" hint="Disables animations and cursor physics.">
            <Toggle checked={settings.reducedMotion} onChange={v => updateSettings({ reducedMotion: v })} />
          </SettingRow>
        </div>

        {/* Data */}
        <div className="glass-card" style={{ padding: '24px 28px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
            <Database size={18} style={{ color: '#3B82F6' }} />
            <h2 style={{ fontSize: 17, fontWeight: 600, color: '#1C1033', margin: 0 }}>Data</h2>
          </div>
          <p style={{ fontSize: 13, color: '#8B83A3', marginBottom: 16 }}>Control how ReviewBand refreshes and processes data.</p>

          <SettingRow label="Auto-refresh" hint="Automatically re-fetch data in the background.">
            <Toggle checked={settings.autoRefresh} onChange={v => updateSettings({ autoRefresh: v })} />
          </SettingRow>

          <SettingRow label="Refresh Interval" hint="How often data is refreshed automatically.">
            <select
              value={settings.refreshIntervalMs}
              onChange={e => updateSettings({ refreshIntervalMs: Number(e.target.value) })}
              disabled={!settings.autoRefresh}
              style={{ padding: '8px 12px', borderRadius: 8, border: '1px solid rgba(196,181,253,0.3)', background: 'rgba(255,255,255,0.6)', fontSize: 13, color: '#1C1033', outline: 'none', fontFamily: 'inherit', cursor: 'pointer', opacity: settings.autoRefresh ? 1 : 0.4 }}
            >
              <option value={30000}>Every 30 seconds</option>
              <option value={60000}>Every 1 minute</option>
              <option value={300000}>Every 5 minutes</option>
              <option value={900000}>Every 15 minutes</option>
            </select>
          </SettingRow>

          <div style={{ marginTop: 16, paddingTop: 8 }}>
            <button
              onClick={() => window.location.reload()}
              style={{ padding: '8px 16px', borderRadius: 8, background: 'rgba(244,63,94,0.08)', border: '1px solid rgba(244,63,94,0.2)', color: '#F43F5E', fontSize: 13, fontWeight: 500, cursor: 'pointer' }}
            >
              Reset Mock Data
            </button>
          </div>
        </div>

        {/* Notifications */}
        <div className="glass-card" style={{ padding: '24px 28px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
            <Bell size={18} style={{ color: '#10B981' }} />
            <h2 style={{ fontSize: 17, fontWeight: 600, color: '#1C1033', margin: 0 }}>Notifications</h2>
          </div>
          <p style={{ fontSize: 13, color: '#8B83A3', marginBottom: 16 }}>Choose which events trigger notifications.</p>

          {[
            { key: 'alerts', label: 'Alert Notifications', hint: 'Anomalies, critical complaints, model drift.' },
            { key: 'insights', label: 'AI Insight Feed', hint: 'When new insights are generated.' },
            { key: 'reports', label: 'Report Ready', hint: 'When a scheduled report finishes generating.' },
            { key: 'system', label: 'System Status', hint: 'Model health and maintenance windows.' },
          ].map(({ key, label, hint }) => (
            <SettingRow key={key} label={label} hint={hint}>
              <Toggle
                checked={notifs[key as keyof typeof notifs]}
                onChange={v => setNotifs(prev => ({ ...prev, [key]: v }))}
              />
            </SettingRow>
          ))}
        </div>

        {/* Save */}
        <button
          onClick={handleSave}
          style={{
            padding: '13px 24px', borderRadius: 12, border: 'none', cursor: 'pointer',
            background: saved ? 'linear-gradient(135deg, #10B981, #059669)' : 'linear-gradient(135deg, #7C3AED, #A855F7)',
            color: '#fff', fontSize: 15, fontWeight: 600,
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            transition: 'background 0.3s ease'
          }}
        >
          {saved ? <><CheckCircle size={16} /> Saved!</> : <><SettingsIcon size={16} /> Save Preferences</>}
        </button>
      </div>
    </div>
  )
}
