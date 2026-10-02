// ============================================================
// Settings Page
// ============================================================

// import React from 'react'
import { Settings as SettingsIcon } from 'lucide-react'
import { useApp } from '@/hooks/useApp'

export function Settings() {
  const { settings, updateSettings } = useApp()

  return (
    <div className="page-section" style={{ paddingBottom: 80 }}>
      <header style={{ marginBottom: 28 }}>
        <h1 style={{ fontSize: 30, fontWeight: 700, color: '#1C1033', letterSpacing: '-0.03em', marginBottom: 6 }}>
          Settings
        </h1>
        <p style={{ fontSize: 15, color: '#4B4466' }}>
          Manage your application preferences and performance tiers.
        </p>
      </header>
      
      <div className="glass-card" style={{ padding: 40, maxWidth: 600 }}>
         <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24, borderBottom: '1px solid rgba(0,0,0,0.05)', paddingBottom: 16 }}>
            <div style={{ width: 40, height: 40, borderRadius: 12, background: 'rgba(124,58,237,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
               <SettingsIcon size={20} style={{ color: '#A855F7' }} />
            </div>
            <div>
               <h2 style={{ fontSize: 18, fontWeight: 600, color: '#1C1033' }}>Appearance</h2>
               <p style={{ fontSize: 13, color: '#8B83A3' }}>Customize your visual experience.</p>
            </div>
         </div>
         
         <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            <div>
               <label style={{ display: 'block', fontSize: 14, fontWeight: 600, color: '#1C1033', marginBottom: 8 }}>Performance Tier</label>
               <select 
                  value={settings.performanceTier}
                  onChange={e => updateSettings({ performanceTier: e.target.value as any })}
                  style={{
                     width: '100%',
                     padding: '10px 14px',
                     borderRadius: 8,
                     border: '1px solid rgba(0,0,0,0.1)',
                     background: 'rgba(255,255,255,0.5)',
                     fontSize: 14,
                     color: '#1C1033',
                     outline: 'none',
                     fontFamily: 'inherit'
                  }}
               >
                  <option value="auto">Auto-detect (Recommended)</option>
                  <option value="full">Full 3D Experience</option>
                  <option value="lite">Lite (Reduced effects)</option>
                  <option value="static">Static (No 3D/WebGL)</option>
               </select>
               <p style={{ fontSize: 12, color: '#8B83A3', marginTop: 6 }}>Changes apply immediately to the 3D environment.</p>
            </div>
            
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
               <input 
                  type="checkbox" 
                  id="reducedMotion" 
                  checked={settings.reducedMotion}
                  onChange={e => updateSettings({ reducedMotion: e.target.checked })}
                  style={{ width: 16, height: 16, accentColor: '#7C3AED' }}
               />
               <label htmlFor="reducedMotion" style={{ fontSize: 14, fontWeight: 500, color: '#1C1033', cursor: 'pointer' }}>
                  Reduce Motion (Disables animations and cursor physics)
               </label>
            </div>
         </div>
      </div>
    </div>
  )
}
