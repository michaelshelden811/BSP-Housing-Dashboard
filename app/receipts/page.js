'use client'
import { useState, useEffect } from 'react'
import Sidebar from '../components/Sidebar'

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
const card = { background: '#0f0f0f', border: '1px solid #1a1a1a', borderRadius: 10, padding: 16 }
const lbl = { fontSize: 11, color: '#555', textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: 6 }
const fmt = (n) => '$' + (n || 0).toFixed(2)
const inputStyle = { background: '#1a1a1a', border: '1px solid #2a2a2a', color: '#e8e8e8', padding: '8px 12px', borderRadius: 6, fontSize: 13, width: '100%' }
const btnPrimary = { background: '#5b9cf6', border: 'none', color: '#fff', padding: '8px 16px', borderRadius: 6, cursor: 'pointer', fontSize: 13, fontWeight: 500 }
const btnSecondary = { background: 'transparent', border: '1px solid #2a2a2a', color: '#888', padding: '8px 16px', borderRadius: 6, cursor: 'pointer', fontSize: 13 }

export default function ReceiptsPage() {
  const now = new Date()
  const [month, setMonth] = useState(now.getMonth())
  const [year, setYear] = useState(now.getFullYear())
  const [runs, setRuns] = useState([])
  const [loading, setLoading] = useState(true)
  const [showAdd, setShowAdd] = useState(false)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({ run_date: '', notes: '', totals: ['', ''] })

  function prevMonth() { if (month === 0) { setMonth(11); setYear(y => y-1) } else setMonth(m => m-1) }
  function nextMonth() { if (month === 11) { setMonth(0); setYear(y => y+1) } else setMonth(m => m+1) }

  async function load() {
    setLoading(true)
    const r = await fetch(`/api/supply-runs?month=${month+1}&year=${year}`)
    const d = await r.json()
    setRuns(d.runs || [])
    setLoading(false)
  }
  useEffect(() => { load() }, [month, year])

  function updateTotal(i, val) { setForm(f => { const t = [...f.totals]; t[i] = val; return { ...f, totals: t } }) }

  async function saveRun() {
    const valid = form.totals.filter(t => t && parseFloat(t) > 0)
    if (!form.run_date || valid.length === 0) return
    setSaving(true)
    const total_amount = valid.reduce((s, t) => s + parseFloat(t), 0)
    const d = new Date(form.run_date + 'T12:00:00')
    await fetch('/api/supply-runs', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ run_date: form.run_date, total_amount, receipt_count: valid.length, notes: form.notes, month: d.getMonth()+1, year: d.getFullYear() }) })
    setSaving(false); setShowAdd(false); setForm({ run_date: '', notes: '', totals: ['', ''] }); load()
  }

  async function deleteRun(id) { await fetch(`/api/supply-runs?id=${id}`, { method: 'DELETE' }); load() }

  const monthTotal = runs.reduce((s, r) => s + parseFloat(r.total_amount), 0)
  const combinedPreview = form.totals.reduce((s, t) => s + (parseFloat(t) || 0), 0)

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#0a0a0a' }}>
      <Sidebar />
      <div style={{ flex: 1, overflowY: 'auto', padding: 24 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
          <div style={{ fontSize: 18, fontWeight: 500 }}>Weekly Supply Runs</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <button onClick={prevMonth} style={{ background: '#1a1a1a', border: '1px solid #2a2a2a', color: '#888', padding: '5px 10px', borderRadius: 6, cursor: 'pointer', fontSize: 12 }}>←</button>
            <span style={{ color: '#e8e8e8', fontWeight: 500, minWidth: 110, textAlign: 'center' }}>{MONTHS[month]} {year}</span>
            <button onClick={nextMonth} style={{ background: '#1a1a1a', border: '1px solid #2a2a2a', color: '#888', padding: '5px 10px', borderRadius: 6, cursor: 'pointer', fontSize: 12 }}>→</button>
            <button onClick={() => setShowAdd(true)} style={btnPrimary}>+ Log Run</button>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 12, marginBottom: 20 }}>
          {[
            { label: `Total Spent — ${MONTHS[month]}`, value: fmt(monthTotal), sub: `${runs.length} run${runs.length !== 1 ? 's' : ''} this month` },
            { label: 'Per House Share', value: fmt(monthTotal/4), sub: 'Split equally ÷ 4', color: '#f87171' },
            { label: 'Avg Per Run', value: runs.length > 0 ? fmt(monthTotal/runs.length) : '$0.00', sub: 'This month' },
          ].map(s => (
            <div key={s.label} style={card}>
              <div style={lbl}>{s.label}</div>
              <div style={{ fontSize: 22, fontWeight: 500, color: s.color || '#e8e8e8' }}>{s.value}</div>
              <div style={{ fontSize: 11, color: '#555', marginTop: 4 }}>{s.sub}</div>
            </div>
          ))}
        </div>

        {showAdd && (
          <div style={{ ...card, marginBottom: 20, borderColor: '#2a2a2a' }}>
            <div style={{ fontSize: 13, fontWeight: 500, color: '#e8e8e8', marginBottom: 14 }}>Log Weekly Supply Run</div>
            <div style={{ marginBottom: 10 }}>
              <div style={{ fontSize: 11, color: '#555', marginBottom: 5 }}>Run Date</div>
              <input type="date" value={form.run_date} onChange={e => setForm(f => ({ ...f, run_date: e.target.value }))} style={{ ...inputStyle, maxWidth: 200 }} />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 10 }}>
              {[0,1].map(i => (
                <div key={i}>
                  <div style={{ fontSize: 11, color: '#555', marginBottom: 5 }}>Receipt {i+1} Total{i === 1 ? ' (optional)' : ''}</div>
                  <input type="number" placeholder={i === 0 ? 'e.g. 650' : 'e.g. 380'} value={form.totals[i]} onChange={e => updateTotal(i, e.target.value)} style={inputStyle} />
                </div>
              ))}
            </div>
            {combinedPreview > 0 && (
              <div style={{ background: '#0d1f3c', border: '1px solid #1a3a6a', borderRadius: 6, padding: '8px 12px', marginBottom: 10, fontSize: 12 }}>
                <span style={{ color: '#888' }}>Combined total: </span>
                <span style={{ color: '#5b9cf6', fontWeight: 500 }}>{fmt(combinedPreview)}</span>
                <span style={{ color: '#555' }}> → Per house: </span>
                <span style={{ color: '#4ade80', fontWeight: 500 }}>{fmt(combinedPreview/4)}</span>
              </div>
            )}
            <input placeholder="Notes (optional)" value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} style={{ ...inputStyle, marginBottom: 10 }} />
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={saveRun} disabled={saving} style={btnPrimary}>{saving ? 'Saving...' : 'Save Run'}</button>
              <button onClick={() => setShowAdd(false)} style={btnSecondary}>Cancel</button>
            </div>
          </div>
        )}

        <div style={card}>
          <div style={{ ...lbl, marginBottom: 14 }}>Run History — {MONTHS[month]} {year}</div>
          {loading ? <div style={{ color: '#555', fontSize: 13 }}>Loading...</div>
          : runs.length === 0 ? <div style={{ color: '#555', fontSize: 13 }}>No supply runs logged this month.</div>
          : runs.map(r => (
            <div key={r.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid #1a1a1a' }}>
              <div>
                <div style={{ fontSize: 13, color: '#e8e8e8', fontWeight: 500 }}>
                  {new Date(r.run_date+'T12:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                </div>
                <div style={{ fontSize: 11, color: '#555', marginTop: 2 }}>
                  {r.receipt_count || 1} receipt{(r.receipt_count||1) > 1 ? 's' : ''} · Per house: {fmt(parseFloat(r.total_amount)/4)}
                  {r.notes ? ` · ${r.notes}` : ''}
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ fontSize: 14, color: '#f87171', fontWeight: 500 }}>-{fmt(parseFloat(r.total_amount))}</div>
                <button onClick={() => deleteRun(r.id)} style={{ background: 'transparent', border: 'none', color: '#555', cursor: 'pointer', fontSize: 13 }}>✕</button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
