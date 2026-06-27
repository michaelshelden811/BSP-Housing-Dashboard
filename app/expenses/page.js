'use client'
import { useState, useEffect } from 'react'
import Sidebar from '../components/Sidebar'

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
const CATEGORIES = ['rent','utilities','food_supplies','internet','vehicle_gas','subscription','other']
const card = { background: '#0f0f0f', border: '1px solid #1a1a1a', borderRadius: 10, padding: 16 }
const lbl = { fontSize: 11, color: '#555', textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: 6 }
const fmt = (n) => '$' + Math.round(n || 0).toLocaleString()
const inputStyle = { background: '#1a1a1a', border: '1px solid #2a2a2a', color: '#e8e8e8', padding: '8px 12px', borderRadius: 6, fontSize: 13, width: '100%' }
const btnPrimary = { background: '#5b9cf6', border: 'none', color: '#fff', padding: '8px 16px', borderRadius: 6, cursor: 'pointer', fontSize: 13, fontWeight: 500 }
const btnSecondary = { background: 'transparent', border: '1px solid #2a2a2a', color: '#888', padding: '8px 16px', borderRadius: 6, cursor: 'pointer', fontSize: 13 }
const catLabel = c => c.replace(/_/g,' ').replace(/\b\w/g, l => l.toUpperCase())

export default function ExpensesPage() {
  const now = new Date()
  const [month, setMonth] = useState(now.getMonth())
  const [year, setYear] = useState(now.getFullYear())
  const [expenses, setExpenses] = useState([])
  const [loading, setLoading] = useState(true)
  const [showAdd, setShowAdd] = useState(false)
  const [form, setForm] = useState({ house: 'acoma', category: 'rent', description: '', amount: '', is_recurring: false })
  const [saving, setSaving] = useState(false)
  const [filterHouse, setFilterHouse] = useState('all')

  function prevMonth() { if (month === 0) { setMonth(11); setYear(y => y-1) } else setMonth(m => m-1) }
  function nextMonth() { if (month === 11) { setMonth(0); setYear(y => y+1) } else setMonth(m => m+1) }

  async function load() {
    setLoading(true)
    const r = await fetch(`/api/expenses?month=${month+1}&year=${year}`)
    const d = await r.json()
    setExpenses(d.expenses || [])
    setLoading(false)
  }
  useEffect(() => { load() }, [month, year])

  async function saveExpense() {
    if (!form.amount) return
    setSaving(true)
    await fetch('/api/expenses', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...form, month: month+1, year, amount: parseFloat(form.amount) })
    })
    setSaving(false)
    setShowAdd(false)
    setForm({ house: 'acoma', category: 'rent', description: '', amount: '', is_recurring: false })
    load()
  }

  async function deleteExpense(id) {
    if (!confirm('Delete this expense?')) return
    await fetch(`/api/expenses?id=${id}`, { method: 'DELETE' })
    load()
  }

  const filtered = filterHouse === 'all' ? expenses : expenses.filter(e => e.house === filterHouse)
  const total = filtered.reduce((s, e) => s + parseFloat(e.amount), 0)

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#0a0a0a' }}>
      <Sidebar />
      <div style={{ flex: 1, overflowY: 'auto', padding: 24 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
          <div style={{ fontSize: 18, fontWeight: 500 }}>Expenses</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <button onClick={prevMonth} style={{ background: '#1a1a1a', border: '1px solid #2a2a2a', color: '#888', padding: '5px 10px', borderRadius: 6, cursor: 'pointer', fontSize: 12 }}>←</button>
            <span style={{ color: '#e8e8e8', fontWeight: 500, minWidth: 110, textAlign: 'center' }}>{MONTHS[month]} {year}</span>
            <button onClick={nextMonth} style={{ background: '#1a1a1a', border: '1px solid #2a2a2a', color: '#888', padding: '5px 10px', borderRadius: 6, cursor: 'pointer', fontSize: 12 }}>→</button>
            <button onClick={() => setShowAdd(true)} style={btnPrimary}>+ Add Expense</button>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5,1fr)', gap: 10, marginBottom: 20 }}>
          {['acoma','mayberry','bell','noah','org'].map(h => {
            const amt = expenses.filter(e => e.house === h).reduce((s, e) => s + parseFloat(e.amount), 0)
            return (
              <div key={h} onClick={() => setFilterHouse(filterHouse === h ? 'all' : h)} style={{ ...card, cursor: 'pointer', borderColor: filterHouse === h ? '#5b9cf6' : '#1a1a1a' }}>
                <div style={lbl}>{h === 'org' ? 'Org-Level' : h.charAt(0).toUpperCase()+h.slice(1)}</div>
                <div style={{ fontSize: 18, fontWeight: 500, color: '#f87171' }}>{fmt(amt)}</div>
              </div>
            )
          })}
        </div>

        {showAdd && (
          <div style={{ ...card, marginBottom: 20, borderColor: '#2a2a2a' }}>
            <div style={{ fontSize: 13, fontWeight: 500, color: '#e8e8e8', marginBottom: 14 }}>Add Expense</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 10, marginBottom: 10 }}>
              <select value={form.house} onChange={e => setForm(p => ({ ...p, house: e.target.value }))} style={inputStyle}>
                {['acoma','mayberry','bell','noah'].map(h => <option key={h} value={h}>{h.charAt(0).toUpperCase()+h.slice(1)}</option>)}
                <option value="org">Org-Level</option>
              </select>
              <select value={form.category} onChange={e => setForm(p => ({ ...p, category: e.target.value }))} style={inputStyle}>
                {CATEGORIES.map(c => <option key={c} value={c}>{catLabel(c)}</option>)}
              </select>
              <input placeholder="Description (optional)" value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} style={inputStyle} />
              <input placeholder="Amount" type="number" value={form.amount} onChange={e => setForm(p => ({ ...p, amount: e.target.value }))} style={inputStyle} />
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 12 }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 13, color: '#888' }}>
                <input
                  type="checkbox"
                  checked={form.is_recurring}
                  onChange={e => setForm(p => ({ ...p, is_recurring: e.target.checked }))}
                  style={{ width: 15, height: 15, accentColor: '#5b9cf6', cursor: 'pointer' }}
                />
                Recurring monthly
              </label>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={saveExpense} disabled={saving} style={btnPrimary}>{saving ? 'Saving...' : 'Save Expense'}</button>
              <button onClick={() => setShowAdd(false)} style={btnSecondary}>Cancel</button>
            </div>
          </div>
        )}

        <div style={card}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
            <div style={lbl}>{filterHouse === 'all' ? 'All Expenses' : filterHouse.charAt(0).toUpperCase()+filterHouse.slice(1)} — {MONTHS[month]} {year}</div>
            {filterHouse !== 'all' && <button onClick={() => setFilterHouse('all')} style={{ ...btnSecondary, padding: '3px 8px', fontSize: 11 }}>Clear filter</button>}
          </div>
          {loading ? <div style={{ color: '#555', fontSize: 13 }}>Loading...</div>
          : filtered.length === 0 ? <div style={{ color: '#555', fontSize: 13 }}>No expenses logged for this period.</div>
          : <>
            <div style={{ display: 'grid', gridTemplateColumns: '120px 160px 1fr 90px 100px 40px', gap: 8, padding: '6px 0', borderBottom: '1px solid #1a1a1a', fontSize: 10, color: '#555', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              <span>House</span><span>Category</span><span>Description</span><span></span><span style={{ textAlign: 'right' }}>Amount</span><span></span>
            </div>
            {filtered.map(e => (
              <div key={e.id} style={{ display: 'grid', gridTemplateColumns: '120px 160px 1fr 90px 100px 40px', gap: 8, padding: '9px 0', borderBottom: '1px solid #1a1a1a', alignItems: 'center' }}>
                <span style={{ fontSize: 12, color: '#888', textTransform: 'capitalize' }}>{e.house === 'org' ? 'Org-Level' : e.house}</span>
                <span style={{ fontSize: 13, color: '#e8e8e8' }}>{catLabel(e.category)}</span>
                <span style={{ fontSize: 12, color: '#888' }}>{e.description || '—'}</span>
                <span>
                  {e.is_recurring && (
                    <span style={{ fontSize: 10, color: '#5b9cf6', background: 'rgba(91,156,246,0.1)', border: '1px solid rgba(91,156,246,0.2)', borderRadius: 4, padding: '2px 6px', whiteSpace: 'nowrap' }}>↻ recurring</span>
                  )}
                </span>
                <span style={{ fontSize: 13, color: '#f87171', fontWeight: 500, textAlign: 'right' }}>-{fmt(e.amount)}</span>
                <button onClick={() => deleteExpense(e.id)} style={{ background: 'transparent', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: 14, fontWeight: 700, lineHeight: 1 }} title="Delete expense">✕</button>
              </div>
            ))}
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 0 0' }}>
              <span style={{ fontSize: 13, color: '#888', fontWeight: 500 }}>Total</span>
              <span style={{ fontSize: 14, color: '#f87171', fontWeight: 500 }}>-{fmt(total)}</span>
            </div>
          </>}
        </div>
      </div>
    </div>
  )
}
