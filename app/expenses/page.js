'use client'
import { useState, useEffect } from 'react'
import Sidebar from '../components/Sidebar'

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
const CATEGORIES = ['rent','utilities','food_supplies','internet','vehicle_gas','subscription','other']
const catLabel = c => c.replace(/_/g,' ').replace(/\b\w/g, l => l.toUpperCase())
const fmt = (n) => '$' + Math.round(n || 0).toLocaleString()

const s = {
  page: { display: 'flex', minHeight: '100vh', background: '#0a0a0a', color: '#e8e8e8' },
  main: { flex: 1, overflowY: 'auto', padding: 24 },
  card: { background: '#0f0f0f', border: '1px solid #1a1a1a', borderRadius: 10, padding: 16 },
  input: { background: '#1a1a1a', border: '1px solid #2a2a2a', color: '#e8e8e8', padding: '8px 12px', borderRadius: 6, fontSize: 13, width: '100%', boxSizing: 'border-box' },
  btnBlue: { background: '#5b9cf6', border: 'none', color: '#fff', padding: '8px 16px', borderRadius: 6, cursor: 'pointer', fontSize: 13, fontWeight: 500 },
  btnGhost: { background: 'transparent', border: '1px solid #2a2a2a', color: '#888', padding: '8px 16px', borderRadius: 6, cursor: 'pointer', fontSize: 13 },
  btnRed: { background: '#2a0a0a', border: '1px solid #5a1a1a', color: '#ef4444', padding: '4px 10px', borderRadius: 6, cursor: 'pointer', fontSize: 12, fontWeight: 700 },
  btnSave: { background: '#052a05', border: '1px solid #1a5a1a', color: '#4ade80', padding: '4px 10px', borderRadius: 6, cursor: 'pointer', fontSize: 12, fontWeight: 600 },
}

export default function ExpensesPage() {
  const now = new Date()
  const [month, setMonth] = useState(now.getMonth())
  const [year, setYear] = useState(now.getFullYear())
  const [expenses, setExpenses] = useState([])
  const [loading, setLoading] = useState(true)
  const [showAdd, setShowAdd] = useState(false)
  const [saving, setSaving] = useState(false)
  const [filterHouse, setFilterHouse] = useState('all')
  const [editingId, setEditingId] = useState(null)
  const [editForm, setEditForm] = useState({})
  const [form, setForm] = useState({ house: 'acoma', category: 'rent', description: '', amount: '', is_recurring: false })

  function prevMonth() { if (month === 0) { setMonth(11); setYear(y => y - 1) } else setMonth(m => m - 1) }
  function nextMonth() { if (month === 11) { setMonth(0); setYear(y => y + 1) } else setMonth(m => m + 1) }

  async function load() {
    setLoading(true)
    const r = await fetch(`/api/expenses?month=${month + 1}&year=${year}`)
    const d = await r.json()
    setExpenses(d.expenses || [])
    setLoading(false)
  }

  useEffect(() => { load() }, [month, year])

  async function addExpense() {
    if (!form.amount) return
    setSaving(true)
    const r = await fetch('/api/expenses', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...form, month: month + 1, year, amount: parseFloat(form.amount) })
    })
    const d = await r.json()
    if (d.expense) {
      setExpenses(prev => [d.expense, ...prev])
      setShowAdd(false)
      setForm({ house: 'acoma', category: 'rent', description: '', amount: '', is_recurring: false })
    }
    setSaving(false)
  }

  async function deleteExpense(id) {
    const r = await fetch(`/api/expenses?id=${id}`, { method: 'DELETE' })
    if (r.ok) {
      setExpenses(prev => prev.filter(e => e.id !== id))
      if (editingId === id) setEditingId(null)
    }
  }

  function startEdit(e) {
    setEditingId(e.id)
    setEditForm({ house: e.house, category: e.category, description: e.description || '', amount: e.amount, is_recurring: e.is_recurring })
  }

  async function saveEdit(id) {
    const r = await fetch('/api/expenses', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...editForm, month: month + 1, year, amount: parseFloat(editForm.amount) })
    })
    const d = await r.json()
    if (d.expense) {
      // Delete old, add new
      await fetch(`/api/expenses?id=${id}`, { method: 'DELETE' })
      setExpenses(prev => [d.expense, ...prev.filter(e => e.id !== id)])
      setEditingId(null)
    }
  }

  const filtered = filterHouse === 'all' ? expenses : expenses.filter(e => e.house === filterHouse)
  const total = filtered.reduce((s, e) => s + parseFloat(e.amount), 0)

  return (
    <div style={s.page}>
      <Sidebar />
      <div style={s.main}>

        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
          <div style={{ fontSize: 18, fontWeight: 500 }}>Expenses</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <button onClick={prevMonth} style={{ ...s.btnGhost, padding: '5px 10px', fontSize: 12 }}>←</button>
            <span style={{ fontWeight: 500, minWidth: 110, textAlign: 'center' }}>{MONTHS[month]} {year}</span>
            <button onClick={nextMonth} style={{ ...s.btnGhost, padding: '5px 10px', fontSize: 12 }}>→</button>
            <button onClick={() => setShowAdd(v => !v)} style={s.btnBlue}>+ Add Expense</button>
          </div>
        </div>

        {/* House totals */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5,1fr)', gap: 10, marginBottom: 20 }}>
          {['acoma','mayberry','bell','noah','org'].map(h => {
            const amt = expenses.filter(e => e.house === h).reduce((sum, e) => sum + parseFloat(e.amount), 0)
            return (
              <div key={h} onClick={() => setFilterHouse(filterHouse === h ? 'all' : h)}
                style={{ ...s.card, cursor: 'pointer', borderColor: filterHouse === h ? '#5b9cf6' : '#1a1a1a' }}>
                <div style={{ fontSize: 11, color: '#555', textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: 6 }}>
                  {h === 'org' ? 'Org-Level' : h.charAt(0).toUpperCase() + h.slice(1)}
                </div>
                <div style={{ fontSize: 18, fontWeight: 500, color: '#f87171' }}>{fmt(amt)}</div>
              </div>
            )
          })}
        </div>

        {/* Add form */}
        {showAdd && (
          <div style={{ ...s.card, marginBottom: 20, borderColor: '#2a2a2a' }}>
            <div style={{ fontSize: 13, fontWeight: 500, marginBottom: 14 }}>Add Expense</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 10, marginBottom: 10 }}>
              <select value={form.house} onChange={e => setForm(p => ({ ...p, house: e.target.value }))} style={s.input}>
                {['acoma','mayberry','bell','noah'].map(h => <option key={h} value={h}>{h.charAt(0).toUpperCase() + h.slice(1)}</option>)}
                <option value="org">Org-Level</option>
              </select>
              <select value={form.category} onChange={e => setForm(p => ({ ...p, category: e.target.value }))} style={s.input}>
                {CATEGORIES.map(c => <option key={c} value={c}>{catLabel(c)}</option>)}
              </select>
              <input placeholder="Description (optional)" value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} style={s.input} />
              <input placeholder="Amount" type="number" value={form.amount} onChange={e => setForm(p => ({ ...p, amount: e.target.value }))} style={s.input} />
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 12 }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 13, color: '#888' }}>
                <input type="checkbox" checked={form.is_recurring} onChange={e => setForm(p => ({ ...p, is_recurring: e.target.checked }))}
                  style={{ width: 15, height: 15, accentColor: '#5b9cf6', cursor: 'pointer' }} />
                Recurring monthly
              </label>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={addExpense} disabled={saving} style={s.btnBlue}>{saving ? 'Saving...' : 'Save'}</button>
              <button onClick={() => setShowAdd(false)} style={s.btnGhost}>Cancel</button>
            </div>
          </div>
        )}

        {/* Expense list */}
        <div style={s.card}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
            <div style={{ fontSize: 11, color: '#555', textTransform: 'uppercase', letterSpacing: '0.8px' }}>
              {filterHouse === 'all' ? 'All Expenses' : filterHouse.charAt(0).toUpperCase() + filterHouse.slice(1)} — {MONTHS[month]} {year}
            </div>
            {filterHouse !== 'all' && (
              <button onClick={() => setFilterHouse('all')} style={{ ...s.btnGhost, padding: '3px 8px', fontSize: 11 }}>Clear filter</button>
            )}
          </div>

          {loading
            ? <div style={{ color: '#555', fontSize: 13 }}>Loading...</div>
            : filtered.length === 0
            ? <div style={{ color: '#555', fontSize: 13 }}>No expenses for this period.</div>
            : filtered.map(e => (
              <div key={e.id} style={{ borderBottom: '1px solid #1a1a1a', padding: '10px 0' }}>
                {editingId === e.id ? (
                  /* Edit row */
                  <div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 8, marginBottom: 8 }}>
                      <select value={editForm.house} onChange={ev => setEditForm(p => ({ ...p, house: ev.target.value }))} style={s.input}>
                        {['acoma','mayberry','bell','noah'].map(h => <option key={h} value={h}>{h.charAt(0).toUpperCase() + h.slice(1)}</option>)}
                        <option value="org">Org-Level</option>
                      </select>
                      <select value={editForm.category} onChange={ev => setEditForm(p => ({ ...p, category: ev.target.value }))} style={s.input}>
                        {CATEGORIES.map(c => <option key={c} value={c}>{catLabel(c)}</option>)}
                      </select>
                      <input value={editForm.description} onChange={ev => setEditForm(p => ({ ...p, description: ev.target.value }))} placeholder="Description" style={s.input} />
                      <input value={editForm.amount} onChange={ev => setEditForm(p => ({ ...p, amount: ev.target.value }))} type="number" placeholder="Amount" style={s.input} />
                    </div>
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                      <button onClick={() => saveEdit(e.id)} style={s.btnSave}>Save</button>
                      <button onClick={() => setEditingId(null)} style={s.btnGhost}>Cancel</button>
                      <button onClick={() => deleteExpense(e.id)} style={{ ...s.btnRed, marginLeft: 'auto' }}>Delete</button>
                    </div>
                  </div>
                ) : (
                  /* Display row */
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span style={{ fontSize: 12, color: '#888', textTransform: 'capitalize', minWidth: 80 }}>
                      {e.house === 'org' ? 'Org-Level' : e.house}
                    </span>
                    <span style={{ fontSize: 13, minWidth: 130 }}>{catLabel(e.category)}</span>
                    <span style={{ fontSize: 12, color: '#888', flex: 1 }}>{e.description || '—'}</span>
                    {e.is_recurring && (
                      <span style={{ fontSize: 10, color: '#5b9cf6', background: 'rgba(91,156,246,0.1)', border: '1px solid rgba(91,156,246,0.2)', borderRadius: 4, padding: '2px 6px', whiteSpace: 'nowrap' }}>↻ recurring</span>
                    )}
                    <span style={{ fontSize: 13, color: '#f87171', fontWeight: 500, minWidth: 70, textAlign: 'right' }}>-{fmt(e.amount)}</span>
                    <button onClick={() => startEdit(e)} style={{ ...s.btnGhost, padding: '3px 10px', fontSize: 12, marginLeft: 8 }}>Edit</button>
                    <button onClick={() => deleteExpense(e.id)} style={s.btnRed}>✕</button>
                  </div>
                )}
              </div>
            ))
          }

          {filtered.length > 0 && (
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 0 0' }}>
              <span style={{ fontSize: 13, color: '#888', fontWeight: 500 }}>Total</span>
              <span style={{ fontSize: 14, color: '#f87171', fontWeight: 500 }}>-{fmt(total)}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
