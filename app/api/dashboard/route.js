import { createClient } from '@supabase/supabase-js'

export async function GET(request) {
  const { searchParams } = new URL(request.url)
  const month = parseInt(searchParams.get('month') || new Date().getMonth() + 1)
  const year = parseInt(searchParams.get('year') || new Date().getFullYear())

  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)
  const peerbill = createClient(process.env.PEERBILL_SUPABASE_URL, process.env.PEERBILL_SERVICE_ROLE_KEY)

  const [paymentsRes, expensesRes, supplyRes, billingRes, peersRes, pbClientsRes] = await Promise.all([
    supabase.from('housing_payments').select('*').eq('month', month).eq('year', year),
    supabase.from('expenses').select('*').eq('month', month).eq('year', year),
    supabase.from('supply_runs').select('*').eq('month', month).eq('year', year),
    supabase.from('billing_entries').select('*').eq('month', month).eq('year', year),
    supabase.from('peers').select('*').eq('active', true),
    peerbill.from('clients').select('id, display_name, assigned_house, billing_status, active').eq('active', true),
  ])

  const payments = paymentsRes.data || []
  const expenses = expensesRes.data || []
  const supplyRuns = supplyRes.data || []
  const billing = billingRes.data || []
  const peers = peersRes.data || []
  const pbClients = pbClientsRes.data || []

  const totalHousingRevenue = payments.reduce((s, p) => s + parseFloat(p.amount), 0)
  const totalBillingRevenue = billing.reduce((s, b) => s + (b.duration_minutes / 60) * parseFloat(b.billing_rate), 0)
  const totalHours = Math.round(billing.reduce((s, b) => s + b.duration_minutes / 60, 0) * 10) / 10
  const totalExpenses = expenses.reduce((s, e) => s + parseFloat(e.amount), 0)
  const totalSupplyRuns = supplyRuns.reduce((s, r) => s + parseFloat(r.total_amount), 0)

  const peerMap = {}
  for (const p of peers) peerMap[p.id] = { ...p, totalHours: 0 }
  for (const b of billing) {
    if (b.peer_id && peerMap[b.peer_id]) peerMap[b.peer_id].totalHours += b.duration_minutes / 60
  }
  const peerList = Object.values(peerMap)
  const totalLabor = peerList.reduce((s, p) => s + p.totalHours * parseFloat(p.hourly_rate), 0)

  // Build occupancy from PeerBill clients
  const validHouses = ['acoma','mayberry','bell','noah']
  const houseClients = { acoma: [], mayberry: [], bell: [], noah: [] }
  let totalBillable = 0
  let totalLimited = 0

  for (const c of pbClients) {
    const house = (c.assigned_house || '').toLowerCase().trim()
    if (!validHouses.includes(house)) continue
    const status = (c.billing_status || '').toLowerCase()
    let bedStatus = 'filled'
    if (status === 'billable') { bedStatus = 'billable'; totalBillable++ }
    else if (status.includes('limited') || status.includes('problematic') || status.includes('verification')) { bedStatus = 'limited'; totalLimited++ }
    houseClients[house].push(bedStatus)
  }

  const occupancy = {}
  for (const h of validHouses) {
    const beds = Array(8).fill('empty')
    houseClients[h].forEach((status, i) => { if (i < 8) beds[i] = status })
    occupancy[h] = { beds }
  }

  const totalOccupied = Object.values(houseClients).reduce((s, arr) => s + arr.length, 0)

  const houses = validHouses.map(h => {
    const hRev = payments.filter(p => p.house === h).reduce((s, p) => s + parseFloat(p.amount), 0)
    const hBill = billing.filter(b => b.house === h).reduce((s, b) => s + (b.duration_minutes/60)*parseFloat(b.billing_rate), 0)
    const hExp = expenses.filter(e => e.house === h).reduce((s, e) => s + parseFloat(e.amount), 0)
    const hSupply = supplyRuns.reduce((s, r) => s + parseFloat(r.total_amount)/4, 0)
    const hLabor = peerList.reduce((s, p) => {
      const hrs = billing.filter(b => b.house === h && b.peer_id === p.id).reduce((a, b) => a + b.duration_minutes/60, 0)
      return s + hrs * parseFloat(p.hourly_rate)
    }, 0)
    return {
      name: h,
      housingRevenue: hRev,
      billingRevenue: hBill,
      expenses: hExp + hSupply,
      labor: hLabor,
      occupied: houseClients[h].length,
      billable: houseClients[h].filter(s => s === 'billable').length,
    }
  })

  const expenseByCategory = {}
  for (const e of expenses) expenseByCategory[e.category] = (expenseByCategory[e.category] || 0) + parseFloat(e.amount)
  if (totalSupplyRuns > 0) expenseByCategory['food_supplies'] = (expenseByCategory['food_supplies'] || 0) + totalSupplyRuns

  return Response.json({
    month, year,
    totalHousingRevenue, totalBillingRevenue, totalHours,
    totalExpenses, totalSupplyRuns, totalLabor,
    totalOccupied, totalBillable, totalLimited,
    houses,
    peers: peerList.filter(p => p.totalHours > 0).map(p => ({ id: p.id, name: p.name, role: p.role, hourlyRate: parseFloat(p.hourly_rate), totalHours: Math.round(p.totalHours*10)/10 })),
    expenseByCategory, occupancy,
  })
}
