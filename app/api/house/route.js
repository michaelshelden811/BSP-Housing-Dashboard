import { createClient } from '@supabase/supabase-js'

export async function GET(request) {
  const { searchParams } = new URL(request.url)
  const house = searchParams.get('house')
  const month = parseInt(searchParams.get('month') || new Date().getMonth() + 1)
  const year = parseInt(searchParams.get('year') || new Date().getFullYear())
  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)

  // Seed recurring expenses from prior month before loading data
  const prevMonth = month === 1 ? 12 : month - 1
  const prevYear = month === 1 ? year - 1 : year

  const { data: currentExpenses } = await supabase
    .from('expenses')
    .select('*')
    .eq('house', house)
    .eq('month', month)
    .eq('year', year)

  const { data: recurringExpenses } = await supabase
    .from('expenses')
    .select('*')
    .eq('house', house)
    .eq('month', prevMonth)
    .eq('year', prevYear)
    .eq('is_recurring', true)

  if (recurringExpenses && recurringExpenses.length > 0) {
    const toSeed = recurringExpenses.filter(r =>
      !(currentExpenses || []).some(c =>
        c.house === r.house &&
        c.category === r.category &&
        c.description === r.description &&
        parseFloat(c.amount) === parseFloat(r.amount) &&
        c.is_recurring === true
      )
    )
    if (toSeed.length > 0) {
      await supabase.from('expenses').insert(toSeed.map(r => ({
        house: r.house,
        category: r.category,
        description: r.description,
        amount: r.amount,
        month,
        year,
        is_recurring: true,
      })))
    }
  }

  const [pRes, eRes, sRes, bRes, prRes] = await Promise.all([
    supabase.from('housing_payments').select('*').eq('house', house).eq('month', month).eq('year', year),
    supabase.from('expenses').select('*').eq('house', house).eq('month', month).eq('year', year),
    supabase.from('supply_runs').select('*').eq('month', month).eq('year', year),
    supabase.from('billing_entries').select('*').eq('house', house).eq('month', month).eq('year', year),
    supabase.from('peers').select('*').eq('active', true),
  ])

  const housingRevenue = (pRes.data||[]).reduce((s,p) => s+parseFloat(p.amount), 0)
  const billingRevenue = (bRes.data||[]).reduce((s,b) => s+(b.duration_minutes/60)*parseFloat(b.billing_rate), 0)
  const billingHours = Math.round((bRes.data||[]).reduce((s,b) => s+b.duration_minutes/60, 0)*10)/10
  const expenses = (eRes.data||[]).reduce((s,e) => s+parseFloat(e.amount), 0)
  const supplyShare = (sRes.data||[]).reduce((s,r) => s+parseFloat(r.total_amount)/4, 0)

  const peerMap = {}
  for (const p of (prRes.data||[])) peerMap[p.id] = { ...p, totalHours: 0 }
  for (const b of (bRes.data||[])) {
    if (b.peer_id && peerMap[b.peer_id]) peerMap[b.peer_id].totalHours += b.duration_minutes/60
  }
  const peerActivity = Object.values(peerMap).filter(p => p.totalHours > 0).map(p => ({
    id: p.id, name: p.name, role: p.role, hourlyRate: parseFloat(p.hourly_rate),
    totalHours: Math.round(p.totalHours*100)/100,
  }))
  const labor = peerActivity.reduce((s,p) => s+p.totalHours*p.hourlyRate, 0)

  return Response.json({ house, month, year, housingRevenue, billingRevenue, billingHours, expenses, supplyShare, labor, expenseList: eRes.data||[], peerActivity })
}
