'use client'
import { useState, useEffect } from 'react'
import Sidebar from '../components/Sidebar'

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
const HOUSES = ['acoma','mayberry','bell','noah']
const card = { background: '#0f0f0f', border: '1px solid #1a1a1a', borderRadius: 10, padding: 16 }
const lbl = { fontSize: 11, color: '#555', textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: 6 }
const fmt = (n) => '$' + Math.round(n || 0).toLocaleString()
const inputStyle = { background: '#1a1a1a', border: '1px solid #2a2a2a', color: '#e8e8e8', padding: '8px 12px', borderRadius: 6, fontSize: 13, width: '100%' }
const btnPrimary = { background: '#5b9cf6', border: 'none', color: '#fff', padding: '8px 16px', borderRadius: 6, cursor: 'pointer', fontSize: 13, fontWeight: 500 }
const btnSecondary = { background: 'transparent', border: '1px solid #2a2a2a', color: '#888', padding: '8px 16px', borderRadius: 6, cursor: 'pointer', fontSize: 13 }

export default function PeersPage() {
  const now = new Date()
  const [month, setMonth] = useState(now.getMonth())
  const [year, setYear] = useState(now.getFullYear())
  const [peers, setPeers] = useState([])
  const [billingData, setBillingData] = useState({})
  const [unhoused, setUnhoused] = useState({})
  const [loading, setLoading] = useState(true)
  const [showAdd, setShowAdd] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [form, setForm] = useState({ name: '', email: '', role: 'peer', hourly_rate: '', primary_house: '' })
  const [saving, setSaving] = useState(false)

  function prevMonth() { if (month === 0) { setMonth(11); setYear(y => y-1) } else setMonth(m => m-1) }
  function nextMonth() { if (month === 11) { setMonth(0); setYear(y => y+1) } else setMonth(m => m+1) }

  async function load() {
    setLoading(true)
    const [pr, bd, uh] = await Promise.all([
      fetch('/api/peers').then(r => r.json()),
      fetch(`/api/peers/billing?month=${month+1}&year=${year}`).then(r => r.json()),
      fetch(`/api/peers/unhoused?month=${month+1}&year=${year}`).then(r => r.json()),
    ])
    setPeers(pr.peers || [])
    setBillingData(bd.peerBilling || {})

    // Re-key unhoused by specialist email+name so we can match to BSP peers
    setUnhoused(uh.bySpecialist || {})
    setLoading(false)
  }
  useEffect(() => { load() }, [month, year])

  // Match a BSP peer to their unhoused data by email or name
  function getUnhoused(peer) {
    const email = (peer.email || '').toLowerCase().trim()
    const name = (peer.name || '').toLowerCase().trim()
    for (const entry of Object.values(unhoused)) {
      const eEmail = (entry.specialist_email || '').toLowerCase().trim()
      const eName = (entry.specialist_name || '').toLowerCase().trim()
      if ((email && eEmail && email === eEmail) || name === eName) return entry
    }
    return null
  }

  async function savePeer() {
    if (!form.name || !form.hourly_rate) return
    setSaving(true)
    if (editingId) {
      await fetch('/api/peers', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: editingId, ...form, hourly_rate: parseFloat(form.hourly_rate) }) })
    } else {
      await fetch('/api/peers', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...form, hourly_rate: parseFloat(form.hourly_rate) }) })
    }
    setSaving(false); setShowAdd(false); setEditingId(null); setForm({ name: '', email: '', role: 'peer', hourly_rate: '', primary_house: '' }); load()
  }

  async function deactivate(id) {
    await fetch('/api/peers', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id, active: false }) }); load()
  }

  function startEdit(p) {
    setForm({ name: p.name, email: p.email || '', role: p.role, hourly_rate: String(p.hourly_rate), primary_house: p.primary_house || '' })
    setEditingId(p.id); setShowAdd(true)
  }

  const totalLabor = peers.reduce((s, p) => s + ((billingData[p.id]?.totalHours || 0) * parseFloat(p.hourly_rate)), 0)
  const totalHours = Object.values(billingData).reduce((s, b) => s + (b.totalHours || 0), 0)
  const totalDroppedMinutes = Object.values(unhoused).reduce((s, u) => s + (u.dropped_minutes || 0), 0)

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#0a0a0a' }}>
      <Sidebar />
      <div style={{ flex: 1, overflowY: 'auto', padding: 24, paddingBottom: 80 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
          <div style={{ fontSize: 18, fontWeight: 500 }}>Peer Tracker</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <button onClick={prevMonth} style={{ background: '#1a1a1a', border: '1px solid #2a2a2a', color: '#888', padding: '5px 10px', borderRadius: 6, cursor: 'pointer', fontSize: 12 }}>←</button>
            <span style={{ color: '#e8e8e8', fontWeight: 500, minWidth: 110, textAlign: 'center' }}>{MONTHS[month]} {year}</span>
            <button onClick={nextMonth} style={{ background: '#1a1a1a', border: '1px solid #2a2a2a', color: '#888', padding: '5px 10px', borderRadius: 6, cursor: 'pointer', fontSize: 12 }}>→</button>
            <button onClick={() => { setShowAdd(true); setEditingId(null); setForm({ name: '', role: 'peer', hourly_rate: '', primary_house: '' }) }} style={btnPrimary}>+ Add Peer</button>
          </div>
        </div>

        {/* Summary stats */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12, marginBottom: 20 }}>
          {[
            { label: 'Total Peers', value: peers.length, sub: 'Active specialists' },
            { label: `Total Hours — ${MONTHS[month]}`, value: Math.round(totalHours*10)/10, sub: 'Synced to housing' },
            { label: 'Total Labor Cost', value: fmt(totalLabor), sub: 'All peers this month', color: '#f87171' },
            { label: 'Truly Unsynced', value: `${Math.round(totalDroppedMinutes/60*10)/10}h`, sub: totalDroppedMinutes > 0 ? 'Missing from ledger' : 'All hours accounted for', color: totalDroppedMinutes > 0 ? '#fbbf24' : '#555' },
          ].map(s => (
            <div key={s.label} style={card}>
              <div style={lbl}>{s.label}</div>
              <div style={{ fontSize: 22, fontWeight: 500, color: s.color || '#e8e8e8' }}>{s.value}</div>
              <div style={{ fontSize: 11, color: '#555', marginTop: 4 }}>{s.sub}</div>
            </div>
          ))}
        </div>

        {/* Add/Edit form */}
        {showAdd && (
          <div style={{ ...card, marginBottom: 20, borderColor: '#2a2a2a' }}>
            <div style={{ fontSize: 13, fontWeight: 500, color: '#e8e8e8', marginBottom: 14 }}>{editingId ? 'Edit Peer' : 'Add New Peer'}</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr 1fr', gap: 10, marginBottom: 10 }}>
              <input placeholder="Full name" value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} style={inputStyle} />
              <input placeholder="PeerBill email" type="email" value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))} style={inputStyle} />
              <input placeholder="Hourly rate (e.g. 25)" type="number" value={form.hourly_rate} onChange={e => setForm(p => ({ ...p, hourly_rate: e.target.value }))} style={inputStyle} />
              <select value={form.role} onChange={e => setForm(p => ({ ...p, role: e.target.value }))} style={inputStyle}>
                <option value="peer">Peer Specialist</option>
                <option value="house_manager">House Manager</option>
              </select>
              <select value={form.primary_house} onChange={e => setForm(p => ({ ...p, primary_house: e.target.value }))} style={inputStyle}>
                <option value="">Primary house (optional)</option>
                {HOUSES.map(h => <option key={h} value={h}>{h.charAt(0).toUpperCase()+h.slice(1)}</option>)}
              </select>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={savePeer} disabled={saving} style={btnPrimary}>{saving ? 'Saving...' : editingId ? 'Update' : 'Add Peer'}</button>
              <button onClick={() => { setShowAdd(false); setEditingId(null) }} style={btnSecondary}>Cancel</button>
            </div>
          </div>
        )}

        {/* Peer cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: 12 }}>
          {loading ? <div style={{ color: '#555', fontSize: 13, gridColumn: '1/-1' }}>Loading...</div>
          : peers.length === 0 ? <div style={{ color: '#555', fontSize: 13, gridColumn: '1/-1' }}>No peers added yet.</div>
          : peers.map(p => {
            const bd = billingData[p.id] || {}
            const earned = (bd.totalHours || 0) * parseFloat(p.hourly_rate)
            const initials = p.name.split(' ').map(w => w[0]).join('').slice(0,2).toUpperCase()
            const unhousedData = getUnhoused(p)

            return (
              <div key={p.id} style={card}>
                {/* Peer header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{ width: 36, height: 36, borderRadius: '50%', background: '#161f2e', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 500, color: '#5b9cf6' }}>{initials}</div>
                    <div>
                      <div style={{ fontSize: 14, color: '#e8e8e8', fontWeight: 500 }}>{p.name}</div>
                      <div style={{ fontSize: 11, color: '#555' }}>{p.role === 'house_manager' ? 'House Manager' : 'Peer Specialist'} · ${p.hourly_rate}/hr</div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <button onClick={() => startEdit(p)} style={{ background: 'transparent', border: '1px solid #2a2a2a', color: '#888', padding: '4px 10px', borderRadius: 5, cursor: 'pointer', fontSize: 11 }}>Edit</button>
                    <button onClick={() => deactivate(p.id)} style={{ background: 'transparent', border: '1px solid #3a1a1a', color: '#f87171', padding: '4px 10px', borderRadius: 5, cursor: 'pointer', fontSize: 11 }}>Remove</button>
                  </div>
                </div>

                {p.primary_house && <div style={{ fontSize: 11, color: '#5b9cf6', marginBottom: 10, textTransform: 'capitalize' }}>Primary: {p.primary_house}</div>}

                {/* Billing stats */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 8, marginBottom: 10 }}>
                  {[['Hours This Month', Math.round((bd.totalHours||0)*10)/10, '#e8e8e8'], ['Earned', fmt(earned), '#4ade80'], ['Billed', fmt((bd.totalHours||0)*60), '#5b9cf6']].map(([k,v,c]) => (
                    <div key={k} style={{ background: '#151515', borderRadius: 6, padding: '8px 10px' }}>
                      <div style={{ fontSize: 10, color: '#555', marginBottom: 3, textTransform: 'uppercase' }}>{k}</div>
                      <div style={{ fontSize: 16, fontWeight: 500, color: c }}>{v}</div>
                    </div>
                  ))}
                </div>

                {/* House breakdown */}
                {bd.byHouse && Object.keys(bd.byHouse).length > 0 && (
                  <div style={{ marginBottom: 10 }}>
                    <div style={{ fontSize: 10, color: '#555', marginBottom: 6, textTransform: 'uppercase' }}>House Breakdown</div>
                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                      {Object.entries(bd.byHouse).map(([h, hrs]) => (
                        <span key={h} style={{ background: '#0d1f3c', color: '#5b9cf6', fontSize: 10, padding: '3px 8px', borderRadius: 4, textTransform: 'capitalize' }}>{h}: {Math.round(hrs*10)/10}h</span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Unhoused clients tracker */}
                {unhousedData && unhousedData.clients.length > 0 && (() => {
                  const syncedMins = unhousedData.synced_minutes || 0
                  const droppedMins = unhousedData.dropped_minutes || 0
                  return (
                    <>
                      {/* Synced via fallback — informational */}
                      {syncedMins > 0 && (
                        <div style={{ marginTop: 10, background: '#0d1f3c', border: '1px solid #1a3a6e', borderRadius: 8, padding: '10px 12px' }}>
                          <div style={{ fontSize: 10, color: '#5b9cf6', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.6px', marginBottom: 8 }}>
                            ✓ {Math.round(syncedMins/60*10)/10}h synced via primary house — assign house in PeerBill to be precise
                          </div>
                          {unhousedData.clients.filter(c => c.synced_minutes > 0).map(c => (
                            <div key={c.client_id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '5px 0', borderBottom: '1px solid #1a3a6e' }}>
                              <div>
                                <div style={{ fontSize: 12, color: '#e8e8e8' }}>{c.client_name}</div>
                                <div style={{ fontSize: 10, color: '#555', marginTop: 1 }}>
                                  {c.sessions} session{c.sessions !== 1 ? 's' : ''} · no house assigned in PeerBill
                                </div>
                              </div>
                              <div style={{ fontSize: 12, color: '#5b9cf6', fontWeight: 500 }}>
                                {Math.round(c.synced_minutes/60*10)/10}h
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                      {/* Truly dropped — needs action */}
                      {droppedMins > 0 && (
                        <div style={{ marginTop: 10, background: '#1a1200', border: '1px solid #3a2e00', borderRadius: 8, padding: '10px 12px' }}>
                          <div style={{ fontSize: 10, color: '#fbbf24', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.6px', marginBottom: 8 }}>
                            ⚠ {Math.round(droppedMins/60*10)/10}h missing from ledger — run sync after assigning house in PeerBill
                          </div>
                          {unhousedData.clients.filter(c => c.dropped_minutes > 0).map(c => (
                            <div key={c.client_id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '5px 0', borderBottom: '1px solid #2a2200' }}>
                              <div>
                                <div style={{ fontSize: 12, color: '#e8e8e8' }}>{c.client_name}</div>
                                <div style={{ fontSize: 10, color: '#555', marginTop: 1 }}>
                                  {c.sessions} session{c.sessions !== 1 ? 's' : ''} · no house assigned
                                </div>
                              </div>
                              <div style={{ fontSize: 12, color: '#fbbf24', fontWeight: 500 }}>
                                {Math.round(c.dropped_minutes/60*10)/10}h
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </>
                  )
                })()}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
