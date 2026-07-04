'use client'
import { useState } from 'react'
import Sidebar from '../components/Sidebar'

const card = { background: '#0f0f0f', border: '1px solid #1a1a1a', borderRadius: 10, padding: 16 }
const lbl = { fontSize: 11, color: '#555', textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: 6 }
const inputStyle = { background: '#1a1a1a', border: '1px solid #2a2a2a', color: '#e8e8e8', padding: '8px 12px', borderRadius: 6, fontSize: 13 }

export default function SettingsPage() {
  const [billingRate, setBillingRate] = useState('60')
  const [saved, setSaved] = useState(false)
  function save() { setSaved(true); setTimeout(() => setSaved(false), 2000) }

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#0a0a0a' }}>
      <Sidebar />
      <div style={{ flex: 1, overflowY: 'auto', padding: 24 }}>
        <div style={{ fontSize: 18, fontWeight: 500, marginBottom: 24 }}>Settings</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, maxWidth: 700 }}>
          <div style={card}>
            <div style={lbl}>Billing Rate</div>
            <div style={{ fontSize: 12, color: '#555', marginBottom: 10 }}>Revenue per billable hour of peer support service.</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ color: '#888' }}>$</span>
              <input type="number" value={billingRate} onChange={e => setBillingRate(e.target.value)} style={{ ...inputStyle, width: 100 }} />
              <span style={{ color: '#555', fontSize: 12 }}>/hr</span>
            </div>
          </div>
          <div style={card}>
            <div style={lbl}>Houses</div>
            <div style={{ fontSize: 12, color: '#555', marginBottom: 10 }}>Active houses. 8 beds each, 32 total.</div>
            {['Acoma','Mayberry','Bell','Noah'].map(h => (
              <div key={h} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 0', borderBottom: '1px solid #1a1a1a', fontSize: 13, color: '#e8e8e8' }}>
                <span>{h}</span>
                <span style={{ background: '#0d2218', color: '#4ade80', fontSize: 10, padding: '2px 8px', borderRadius: 4 }}>Active · 8 beds</span>
              </div>
            ))}
          </div>
          <div style={{ ...card, gridColumn: '1/-1' }}>
            <div style={lbl}>About</div>
            <div style={{ fontSize: 13, color: '#888', lineHeight: 1.7 }}>
              BSP Housing Dashboard — Barbell Saves Project<br />
              Tracks housing revenue, peer billing, expenses, and labor across all 4 houses.<br />
              Admin access only.
            </div>
          </div>
        </div>
        <div style={{ marginTop: 20 }}>
          <button onClick={save} style={{ background: '#5b9cf6', border: 'none', color: '#fff', padding: '8px 16px', borderRadius: 6, cursor: 'pointer', fontSize: 13, fontWeight: 500 }}>
            {saved ? 'Saved ✓' : 'Save Settings'}
          </button>
        </div>
      </div>
    </div>
  )
}
