'use client'
import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import Sidebar from '../../components/Sidebar'

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
const HOUSES = ['acoma','mayberry','bell','noah']
const card = { background: '#0f0f0f', border: '1px solid #1a1a1a', borderRadius: 10, padding: 16 }
const lbl = { fontSize: 11, color: '#555', textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: 6 }
const fmt = (n) => '$' + Math.round(n || 0).toLocaleString()
const inputStyle = { background: '#1a1a1a', border: '1px solid #2a2a2a', color: '#e8e8e8', padding: '8px 12px', borderRadius: 6, fontSize: 13, width: '100%' }
const btnPrimary = { background: '#5b9cf6', border: 'none', color: '#fff', padding: '8px 16px', borderRadius: 6, cursor: 'pointer', fontSize: 13, fontWeight: 500 }
const btnSecondary = { background: 'transparent', border: '1px solid #2a2a2a', color: '#888', padding: '8px 16px', borderRadius: 6, cursor: 'pointer', fontSize: 13 }

export default function HousePage() {
  const { house } = useParams()
  const now = new Date()
  const [month, setMonth] = useState(now.getMonth())
  const [year, setYear] = useState(now.getFullYear())
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [showAddExpense, setShowAddExpense] = useState(false)
  const [showAddPayment, setShowAddPayment] = useState(false)
  const [expenseForm, setExpenseForm] = useState({ category: 'rent', description: '', amount: '' })
  const [paymentForm, setPaymentForm] = useState({ amount: '', notes: '' })
  const [saving, setSaving] = useState(false)

  if (!HOUSES.includes(house)) return <div style={{ color: '#f87171', padding: 24 }}>Invalid house.</div>
  const houseName = house.charAt(0).toUpperCase() + house.slice(1)

  async function load() {
    setLoading(true)
    fetch(`/api/house?house=${house}&month=${month+1}&year=${year}`)
      .then(r => r.json()).then(d => { setData(d); setLoading(false) })
      .catch(() => setLoading(false))
  }

  useEffect(() => { load() }, [house, month, year])

  function prevMonth() { if (month === 0) { setMonth(11); setYear(y => y-1) } else setMonth(m => m-1) }
  function nextMonth() { if (month === 11) { setMonth(0); setYear(y => y+1) } else setMonth(m => m+1) }

  async function saveExpense() {
    if (!expenseForm.amount) return
    setSaving(true)
    await fetch('/api/expenses', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...expenseForm, house, month: month+1, year, amount: parseFloat(expenseForm.amount) }) })
    setSaving(false); setShowAddExpense(false); setExpenseForm({ category: 'rent', description: '', amount: '' }); load()
  }

  async function savePayment() {
    if (!paymentForm.amount) return
    setSaving(true)
    await fetch('/api/housing-payments', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ house, month: month+1, year, amount: parseFloat(paymentForm.amount), notes: paymentForm.notes }) })
    setSaving(false); setShowAddPayment(false); setPaymentForm({ amount: '', notes: '' }); load()
  }

  const d = data || {}
  const housingRev = d.housingRevenue || 0
  const billingRev = d.billingRevenue || 0
  const totalRev = housingRev + billingRev
  const totalExp = (d.expenses || 0) + (d.supplyShare || 0)
  const totalLabor = d.labor || 0
  const netProfit = totalRev - totalExp - totalLabor

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#0a0a0a' }}>
      <Sidebar />
      <div style={{ flex: 1, overflowY: 'auto', padding: 24 }}>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
          <div style={{ fontSize: 18, fontWeight: 500 }}>{houseName} House</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <button onClick={prevMonth} style={{ background: '#1a1a1a', border: '1px solid #2a2a2a', color: '#888', padding: '5px 10px', borderRadius: 6, cursor: 'pointer', fontSize: 12 }}>←</button>
            <span style={{ color: '#e8e8e8', fontWeight: 500, minWidth: 110, textAlign: 'center' }}>{MONTHS[month]} {year}</span>
            <button onClick={nextMonth} style={{ background: '#1a1a1a', border: '1px solid #2a2a2a', color: '#888', padding: '5px 10px', borderRadius: 6, cursor: 'pointer', fontSize: 12 }}>→</button>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12, marginBottom: 20 }}>
          {[
            { label: 'Housing Revenue', value: fmt(housingRev), sub: 'Program payments' },
            { label: 'Billing Revenue', value: fmt(billingRev), sub: `${d.billingHours || 0} hrs × $60` },
            { label: 'Total Expenses', value: fmt(totalExp), sub: 'House + supply share' },
            { label: 'Net Profit', value: fmt(netProfit), sub: 'After labor + expenses', color: netProfit >= 0 ? '#4ade80' : '#f87171' },
          ].map(s => (
            <div key={s.label} style={card}>
              <div style={lbl}>{s.label}</div>
              <div style={{ fontSize: 22, fontWeight: 500, color: s.color || '#e8e8e8' }}>{loading ? '—' : s.value}</div>
              <div style={{ fontSize: 11, color: '#555', marginTop: 4 }}>{s.sub}</div>
            </div>
          ))}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 20 }}>
          <div style={card}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
              <div style={lbl}>Revenue</div>
              <button onClick={() => setShowAddPayment(true)} style={{ ...btnPrimary, padding: '4px 10px', fontSize: 11 }}>+ Add Payment</button>
            </div>
            {[
              { label: 'Housing Payments', sub: 'Program revenue', value: housingRev, color: '#4ade80' },
              { label: 'Peer Support Billing', sub: 'From PeerBill — $60/hr', value: billingRev, color: '#4ade80' },
            ].map(r => (
              <div key={r.label} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #1a1a1a' }}>
                <div>
                  <div style={{ fontSize: 13, color: '#e8e8e8' }}>{r.label}</div>
                  <div style={{ fontSize: 11, color: '#555' }}>{r.sub}</div>
                </div>
                <div style={{ fontSize: 13, color: r.color, fontWeight: 500 }}>{fmt(r.value)}</div>
              </div>
            ))}
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0 0', marginTop: 4 }}>
              <span style={{ fontSize: 12, color: '#888', fontWeight: 500 }}>Total Revenue</span>
              <span style={{ fontSize: 14, color: '#4ade80', fontWeight: 500 }}>{fmt(totalRev)}</span>
            </div>
            {showAddPayment && (
              <div style={{ marginTop: 16, padding: 12, background: '#151515', borderRadius: 8, border: '1px solid #2a2a2a' }}>
                <div style={{ fontSize: 12, color: '#888', marginBottom: 10 }}>Add Housing Payment</div>
                <input placeholder="Amount" type="number" value={paymentForm.amount} onChange={e => setPaymentForm(p => ({ ...p, amount: e.target.value }))} style={{ ...inputStyle, marginBottom: 8 }} />
                <input placeholder="Notes (optional)" value={paymentForm.notes} onChange={e => setPaymentForm(p => ({ ...p, notes: e.target.value }))} style={{ ...inputStyle, marginBottom: 10 }} />
                <div style={{ display: 'flex', gap: 8 }}>
                  <button onClick={savePayment} disabled={saving} style={btnPrimary}>{saving ? 'Saving...' : 'Save'}</button>
                  <button onClick={() => setShowAddPayment(false)} style={btnSecondary}>Cancel</button>
                </div>
              </div>
            )}
          </div>

          <div style={card}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
              <div style={lbl}>Expenses</div>
              <button onClick={() => setShowAddExpense(true)} style={{ ...btnPrimary, padding: '4px 10px', fontSize: 11 }}>+ Add Expense</button>
            </div>
            {loading ? <div style={{ color: '#555', fontSize: 13 }}>Loading...</div>
            : (d.expenseList || []).length === 0 && !d.supplyShare
              ? <div style={{ color: '#555', fontSize: 13 }}>No expenses logged this month.</div>
              : (d.expenseList || []).map((e, i) => (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '7px 0', borderBottom: '1px solid #1a1a1a' }}>
                  <div>
                    <div style={{ fontSize: 13, color: '#e8e8e8', textTransform: 'capitalize' }}>{e.category.replace(/_/g,' ')}</div>
                    <div style={{ fontSize: 11, color: '#555' }}>{e.description || ''}</div>
                  </div>
                  <div style={{ fontSize: 13, color: '#f87171', fontWeight: 500 }}>-{fmt(e.amount)}</div>
                </div>
              ))
            }
            {d.supplyShare > 0 && (
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '7px 0', borderBottom: '1px solid #1a1a1a' }}>
                <div>
                  <div style={{ fontSize: 13, color: '#e8e8e8' }}>Supply Run Share</div>
                  <div style={{ fontSize: 11, color: '#555' }}>1/4 of weekly runs</div>
                </div>
                <div style={{ fontSize: 13, color: '#f87171', fontWeight: 500 }}>-{fmt(d.supplyShare)}</div>
              </div>
            )}
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0 0', marginTop: 4 }}>
              <span style={{ fontSize: 12, color: '#888', fontWeight: 500 }}>Total Expenses</span>
              <span style={{ fontSize: 14, color: '#f87171', fontWeight: 500 }}>-{fmt(totalExp)}</span>
            </div>
            {showAddExpense && (
              <div style={{ marginTop: 16, padding: 12, background: '#151515', borderRadius: 8, border: '1px solid #2a2a2a' }}>
                <div style={{ fontSize: 12, color: '#888', marginBottom: 10 }}>Add Expense</div>
                <select value={expenseForm.category} onChange={e => setExpenseForm(p => ({ ...p, category: e.target.value }))} style={{ ...inputStyle, marginBottom: 8 }}>
                  <option value="rent">Rent / Mortgage</option>
                  <option value="utilities">Utilities</option>
                  <option value="food_supplies">Food & Supplies</option>
                  <option value="internet">Internet</option>
                  <option value="vehicle_gas">Vehicle & Gas</option>
                  <option value="subscription">Subscription</option>
                  <option value="other">Other</option>
                </select>
                <input placeholder="Description (optional)" value={expenseForm.description} onChange={e => setExpenseForm(p => ({ ...p, description: e.target.value }))} style={{ ...inputStyle, marginBottom: 8 }} />
                <input placeholder="Amount" type="number" value={expenseForm.amount} onChange={e => setExpenseForm(p => ({ ...p, amount: e.target.value }))} style={{ ...inputStyle, marginBottom: 10 }} />
                <div style={{ display: 'flex', gap: 8 }}>
                  <button onClick={saveExpense} disabled={saving} style={btnPrimary}>{saving ? 'Saving...' : 'Save'}</button>
                  <button onClick={() => setShowAddExpense(false)} style={btnSecondary}>Cancel</button>
                </div>
              </div>
            )}
          </div>
        </div>

        <div style={card}>
          <div style={{ ...lbl, marginBottom: 14 }}>Peer Billing Activity — {houseName}</div>
          {loading ? <div style={{ color: '#555', fontSize: 13 }}>Loading...</div>
          : (d.peerActivity || []).length === 0 ? <div style={{ color: '#555', fontSize: 13 }}>No billing activity this month.</div>
          : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 12 }}>
              {(d.peerActivity || []).map((p, i) => (
                <div key={i} style={{ background: '#151515', borderRadius: 8, padding: 12, border: '1px solid #1e1e1e' }}>
                  <div style={{ fontSize: 13, color: '#e8e8e8', fontWeight: 500 }}>{p.name}{p.role === 'house_manager' ? ' (Mgr)' : ''}</div>
                  <div style={{ fontSize: 11, color: '#555', marginBottom: 8 }}>${p.hourlyRate}/hr</div>
                  {[
                    ['Hours', `${Math.round(p.totalHours*10)/10}`, '#e8e8e8'],
                    ['Billed', fmt(p.totalHours * 60), '#4ade80'],
                    ['Labor cost', `-${fmt(p.totalHours * p.hourlyRate)}`, '#f87171'],
                  ].map(([k, v, c]) => (
                    <div key={k} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginTop: 4 }}>
                      <span style={{ color: '#888' }}>{k}</span>
                      <span style={{ color: c }}>{v}</span>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          )}
        </div>

      </div>
    </div>
  )
}
