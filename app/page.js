'use client'
import { useState, useEffect } from 'react'
import Sidebar from './components/Sidebar'
import Link from 'next/link'

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
const HOUSES = ['acoma','mayberry','bell','noah']
const card = { background: '#0f0f0f', border: '1px solid #1a1a1a', borderRadius: 10, padding: 16 }
const lbl = { fontSize: 11, color: '#555', textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: 6 }
const fmt = (n) => '$' + Math.round(n || 0).toLocaleString()

export default function Dashboard() {
  const now = new Date()
  const [month, setMonth] = useState(now.getMonth())
  const [year, setYear] = useState(now.getFullYear())
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [syncing, setSyncing] = useState(false)
  const [syncMsg, setSyncMsg] = useState(null)
  const [syncDropped, setSyncDropped] = useState([])
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768)
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])

  useEffect(() => {
    setLoading(true)
    fetch(`/api/dashboard?month=${month+1}&year=${year}`)
      .then(r => r.json()).then(d => { setData(d); setLoading(false) })
      .catch(() => setLoading(false))
  }, [month, year])

  async function syncPeerBill() {
    setSyncing(true)
    setSyncMsg(null)
    setSyncDropped([])
    try {
      const r = await fetch("/api/sync-peerbill", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ month: month+1, year }) })
      const d = await r.json()
      setSyncMsg(d.error ? `Error: ${d.error}` : (d.message || `Synced ${d.synced ?? 0} entries`))
      if (d.dropped && d.dropped.length > 0) setSyncDropped(d.dropped)
      if (!d.error) {
        setLoading(true)
        fetch(`/api/dashboard?month=${month+1}&year=${year}`).then(r => r.json()).then(d => { setData(d); setLoading(false) })
      }
    } catch (err) {
      setSyncMsg(`Error: ${err.message}`)
    } finally {
      setSyncing(false)
    }
  }

  function prevMonth() { if (month === 0) { setMonth(11); setYear(y => y-1) } else setMonth(m => m-1) }
  function nextMonth() { if (month === 11) { setMonth(0); setYear(y => y+1) } else setMonth(m => m+1) }

  const d = data || {}
  const totalRevenue = (d.totalHousingRevenue || 0) + (d.totalBillingRevenue || 0)
  const totalExpenses = (d.totalExpenses || 0) + (d.totalSupplyRuns || 0)
  const totalLabor = d.totalLabor || 0
  const netProfit = totalRevenue - totalExpenses - totalLabor
  const houses = d.houses || HOUSES.map(h => ({ name: h, housingRevenue: 0, billingRevenue: 0, expenses: 0, labor: 0 }))
  const peers = d.peers || []
  const occupancy = d.occupancy || {}

  const p = isMobile ? 12 : 24
  const gap = isMobile ? 8 : 12

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#0a0a0a' }}>
      <Sidebar />
      <div style={{ flex: 1, overflowY: 'auto', padding: p, paddingBottom: isMobile ? 80 : p }}>

        {/* Header */}
        <div style={{ marginBottom: isMobile ? 16 : 24 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <div style={{ fontSize: isMobile ? 15 : 18, fontWeight: 500 }}>BSP Dashboard</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <button onClick={prevMonth} style={{ background: '#1a1a1a', border: '1px solid #2a2a2a', color: '#888', padding: '5px 10px', borderRadius: 6, cursor: 'pointer', fontSize: 12 }}>←</button>
              <span style={{ color: '#e8e8e8', fontWeight: 500, fontSize: isMobile ? 12 : 14, minWidth: isMobile ? 80 : 110, textAlign: 'center' }}>{MONTHS[month]} {year}</span>
              <button onClick={nextMonth} style={{ background: '#1a1a1a', border: '1px solid #2a2a2a', color: '#888', padding: '5px 10px', borderRadius: 6, cursor: 'pointer', fontSize: 12 }}>→</button>
            </div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <button onClick={syncPeerBill} disabled={syncing} style={{ background: syncing ? "#1a2a1a" : "#0d2218", border: "1px solid #1a4a2a", color: syncing ? "#555" : "#4ade80", padding: "8px 14px", borderRadius: 6, cursor: syncing ? "not-allowed" : "pointer", fontSize: 12, fontWeight: 500, width: '100%' }}>
              {syncing ? "Syncing..." : "⟳ Sync from PeerBill"}
            </button>
            {syncMsg && <div style={{ fontSize: 11, color: syncMsg.startsWith("Error") ? "#f87171" : "#4ade80" }}>{syncMsg}</div>}
            {syncDropped.length > 0 && (
              <div style={{ background: '#1a1000', border: '1px solid #3a2a00', borderRadius: 6, padding: '8px 10px', maxHeight: 160, overflowY: 'auto' }}>
                <div style={{ fontSize: 10, color: '#fbbf24', fontWeight: 600, marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.6px' }}>⚠ {syncDropped.length} sessions dropped</div>
                {syncDropped.map((d, i) => (
                  <div key={i} style={{ fontSize: 10, color: '#888', marginBottom: 3, borderBottom: '1px solid #2a2000', paddingBottom: 3 }}>
                    <span style={{ color: '#fbbf24' }}>{d.client || 'Unknown client'}</span> · {d.specialist} · {d.session_date} · {Math.round((d.duration_minutes||0)/60*10)/10}h
                    <div style={{ color: '#555', marginTop: 1 }}>{d.reason}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* P&L Stats — 2 col on mobile, 4 on desktop */}
        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? 'repeat(2,1fr)' : 'repeat(4,1fr)', gap, marginBottom: gap }}>
          {[
            { label: 'Total Revenue', value: fmt(totalRevenue), sub: 'Housing + billing' },
            { label: 'Total Expenses', value: fmt(totalExpenses), sub: 'Housing + org' },
            { label: 'Labor Costs', value: fmt(totalLabor), sub: 'All peers' },
            { label: 'Net Profit', value: fmt(netProfit), sub: 'After all deductions', color: netProfit >= 0 ? '#4ade80' : '#f87171' },
          ].map(s => (
            <div key={s.label} style={card}>
              <div style={lbl}>{s.label}</div>
              <div style={{ fontSize: isMobile ? 18 : 22, fontWeight: 500, color: s.color || '#e8e8e8' }}>{loading ? '—' : s.value}</div>
              <div style={{ fontSize: 10, color: '#555', marginTop: 4 }}>{s.sub}</div>
            </div>
          ))}
        </div>

        {/* Occupancy Stats — 2 col on mobile, 4 on desktop */}
        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? 'repeat(2,1fr)' : 'repeat(4,1fr)', gap, marginBottom: gap }}>
          {[
            { label: 'Occupancy', value: `${d.totalOccupied || 0} / 32`, sub: 'Beds filled' },
            { label: 'Billable Clients', value: `${d.totalBillable || 0}`, sub: d.totalLimited ? `${d.totalLimited} limited` : 'All billable', subColor: d.totalLimited ? '#fbbf24' : '#555' },
            { label: 'Peer Billing Rev', value: fmt(d.totalBillingRevenue || 0), sub: `${d.totalHours || 0} hrs × $60` },
            { label: 'Housing Rev', value: fmt(d.totalHousingRevenue || 0), sub: '4 houses' },
          ].map(s => (
            <div key={s.label} style={card}>
              <div style={lbl}>{s.label}</div>
              <div style={{ fontSize: isMobile ? 18 : 22, fontWeight: 500, color: '#e8e8e8' }}>{loading ? '—' : s.value}</div>
              <div style={{ fontSize: 10, color: s.subColor || '#555', marginTop: 4 }}>{s.sub}</div>
            </div>
          ))}
        </div>

        {/* House Breakdown + Occupancy — stack on mobile */}
        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1.4fr 1fr', gap, marginBottom: gap }}>
          <div style={card}>
            <div style={{ ...lbl, marginBottom: 14 }}>House Breakdown</div>
            {houses.map(h => {
              const rev = (h.housingRevenue || 0) + (h.billingRevenue || 0)
              const exp = (h.expenses || 0) + (h.labor || 0)
              const profit = rev - exp
              const barPct = totalRevenue ? Math.round((rev / totalRevenue) * 100) : 0
              return (
                <Link key={h.name} href={`/houses/${h.name}`} style={{ textDecoration: 'none' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid #1a1a1a', cursor: 'pointer' }}>
                    <div>
                      <div style={{ fontSize: 13, color: '#e8e8e8', fontWeight: 500, textTransform: 'capitalize' }}>{h.name}</div>
                      <div style={{ fontSize: 11, color: '#555', marginTop: 2 }}>{h.occupied || 0}/8 beds · {h.billable || 0} billable</div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, justifyContent: 'flex-end' }}>
                        {!isMobile && (
                          <div style={{ width: 60, height: 5, background: '#1a1a1a', borderRadius: 3 }}>
                            <div style={{ width: `${barPct}%`, height: '100%', background: '#5b9cf6', borderRadius: 3 }} />
                          </div>
                        )}
                        <div style={{ fontSize: 13, fontWeight: 500, color: profit >= 0 ? '#4ade80' : '#f87171' }}>{profit >= 0 ? '+' : ''}{fmt(profit)}</div>
                      </div>
                      <div style={{ fontSize: 11, color: '#555', marginTop: 3 }}>{fmt(rev)} rev</div>
                    </div>
                  </div>
                </Link>
              )
            })}
          </div>

          <div style={card}>
            <div style={{ ...lbl, marginBottom: 14 }}>Occupancy</div>
            {HOUSES.map(h => {
              const occ = occupancy[h] || { beds: Array(8).fill('empty') }
              const filled = occ.beds.filter(b => b !== 'empty').length
              return (
                <div key={h} style={{ marginBottom: 12 }}>
                  <div style={{ fontSize: 11, color: '#555', marginBottom: 4, textTransform: 'capitalize' }}>{h.charAt(0).toUpperCase()+h.slice(1)} — {filled}/8</div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(8,1fr)', gap: 4 }}>
                    {occ.beds.map((status, i) => (
                      <div key={i} style={{
                        aspectRatio: '1', borderRadius: 3,
                        background: status === 'billable' ? '#4ade80' : status === 'empty' ? '#111' : '#f87171',
                        border: status === 'empty' ? '1px solid #222' : 'none'
                      }} />
                    ))}
                  </div>
                </div>
              )
            })}
            <div style={{ display: 'flex', gap: 12, marginTop: 10 }}>
              {[['#4ade80','Billable',false],['#f87171','Unbillable',false],['#111','Empty',true]].map(([bg, l, border]) => (
                <div key={l} style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 10, color: '#555' }}>
                  <div style={{ width: 8, height: 8, borderRadius: 2, background: bg, border: border ? '1px solid #222' : 'none' }} />{l}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Peer Tracker + Expenses — stack on mobile */}
        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap }}>
          <div style={card}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
              <div style={lbl}>Peer Tracker — {MONTHS[month]}</div>
              <Link href="/peers" style={{ fontSize: 11, color: '#5b9cf6', textDecoration: 'none' }}>View all →</Link>
            </div>
            {loading ? <div style={{ color: '#555', fontSize: 13 }}>Loading...</div>
            : peers.length === 0 ? <div style={{ color: '#555', fontSize: 13 }}>No billing data this month.</div>
            : peers.slice(0,5).map(p => {
              const initials = p.name.split(' ').map(w => w[0]).join('').slice(0,2).toUpperCase()
              const earned = (p.totalHours || 0) * (p.hourlyRate || 0)
              return (
                <div key={p.id || p.name} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #1a1a1a' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{ width: 28, height: 28, borderRadius: '50%', background: '#161f2e', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 500, color: '#5b9cf6', flexShrink: 0 }}>{initials}</div>
                    <div>
                      <div style={{ fontSize: 13, color: '#e8e8e8' }}>{p.name}{p.role === 'house_manager' ? ' (Mgr)' : ''}</div>
                      <div style={{ fontSize: 11, color: '#555' }}>${p.hourlyRate}/hr · {Math.round((p.totalHours||0)*10)/10} hrs</div>
                    </div>
                  </div>
                  <div style={{ fontSize: 13, fontWeight: 500, color: '#4ade80', flexShrink: 0 }}>{fmt(earned)}</div>
                </div>
              )
            })}
          </div>

          <div style={card}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
              <div style={lbl}>Expense Breakdown</div>
              <Link href="/expenses" style={{ fontSize: 11, color: '#5b9cf6', textDecoration: 'none' }}>Manage →</Link>
            </div>
            {[
              { cat: 'Rent / Mortgage', type: 'All 4 houses', color: '#5b9cf6', key: 'rent' },
              { cat: 'Groceries & Supplies', type: 'Split equally', color: '#fbbf24', key: 'food_supplies' },
              { cat: 'Utilities', type: 'Per house', color: '#a78bfa', key: 'utilities' },
              { cat: 'Vehicles & Gas', type: '4 vans', color: '#34d399', key: 'vehicle_gas' },
              { cat: 'Internet & Subscriptions', type: 'Org-level', color: '#f87171', key: 'subscription' },
            ].map(e => {
              const amt = (d.expenseByCategory || {})[e.key] || 0
              return (
                <div key={e.key} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #1a1a1a' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{ width: 8, height: 8, borderRadius: '50%', background: e.color, flexShrink: 0 }} />
                    <div>
                      <div style={{ fontSize: isMobile ? 12 : 13, color: '#e8e8e8' }}>{e.cat}</div>
                      <div style={{ fontSize: 10, color: '#555' }}>{e.type}</div>
                    </div>
                  </div>
                  <div style={{ fontSize: 13, color: '#f87171', fontWeight: 500, flexShrink: 0 }}>{loading ? '—' : `-${fmt(amt)}`}</div>
                </div>
              )
            })}
            <div style={{ borderTop: '1px solid #2a2a2a', marginTop: 10, paddingTop: 10, display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: '#555', fontSize: 12 }}>Total Expenses</span>
              <span style={{ color: '#f87171', fontWeight: 500 }}>{loading ? '—' : `-${fmt(totalExpenses)}`}</span>
            </div>
          </div>
        </div>

      </div>
    </div>
  )
}
