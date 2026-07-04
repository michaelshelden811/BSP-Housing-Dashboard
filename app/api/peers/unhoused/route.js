import { createClient } from '@supabase/supabase-js'

const VALID_HOUSES = ['acoma', 'mayberry', 'bell', 'noah']

export async function GET(request) {
  const { searchParams } = new URL(request.url)
  const month = parseInt(searchParams.get('month') || new Date().getMonth() + 1)
  const year = parseInt(searchParams.get('year') || new Date().getFullYear())

  const peerbill = createClient(process.env.PEERBILL_SUPABASE_URL, process.env.PEERBILL_SERVICE_ROLE_KEY)
  const bsp = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)

  const startDate = `${year}-${String(month).padStart(2, '0')}-01`
  const endDate = new Date(year, month, 0).toISOString().split('T')[0]

  const { data: ledger, error } = await peerbill
    .from('ledger')
    .select('id, client_id, specialist_id, service_date, duration_minutes')
    .gte('service_date', startDate)
    .lte('service_date', endDate)

  if (error) return Response.json({ error: error.message }, { status: 500 })
  if (!ledger || ledger.length === 0) return Response.json({ bySpecialist: {} })

  const clientIds = [...new Set(ledger.map(e => e.client_id).filter(Boolean))]
  const specialistIds = [...new Set(ledger.map(e => e.specialist_id).filter(Boolean))]

  const [{ data: clients }, { data: specialists }] = await Promise.all([
    peerbill.from('clients').select('id, display_name, assigned_house').in('id', clientIds),
    peerbill.from('users').select('id, full_name, email').in('id', specialistIds),
  ])

  const clientMap = {}
  for (const c of (clients || [])) clientMap[c.id] = c

  const specialistMap = {}
  for (const s of (specialists || [])) specialistMap[s.id] = s

  // Find all unhoused client sessions first
  const unhousedEntryIds = []
  const unhousedLedger = []
  for (const entry of ledger) {
    const client = clientMap[entry.client_id]
    if (!client) continue
    const house = (client.assigned_house || '').toLowerCase().trim()
    if (VALID_HOUSES.includes(house)) continue // housed — skip
    unhousedEntryIds.push(entry.id)
    unhousedLedger.push(entry)
  }

  // Cross-check which unhoused entries are already in billing_entries (synced via fallback)
  const syncedIds = new Set()
  if (unhousedEntryIds.length > 0) {
    const { data: synced } = await bsp
      .from('billing_entries')
      .select('id')
      .in('id', unhousedEntryIds)
      .eq('house_fallback', true)
    for (const s of (synced || [])) syncedIds.add(s.id)
  }

  // Group by specialist, separating fallback-synced from truly dropped
  const bySpecialist = {}

  for (const entry of unhousedLedger) {
    const client = clientMap[entry.client_id]
    const specialist = specialistMap[entry.specialist_id]
    const specialistId = entry.specialist_id || 'unknown'
    const specialistName = specialist?.full_name || 'Unknown'
    const specialistEmail = specialist?.email || null
    const isSynced = syncedIds.has(entry.id)

    if (!bySpecialist[specialistId]) {
      bySpecialist[specialistId] = {
        specialist_id: specialistId,
        specialist_name: specialistName,
        specialist_email: specialistEmail,
        clients: {},
        total_minutes: 0,
        synced_minutes: 0,
        dropped_minutes: 0,
      }
    }

    const clientId = entry.client_id
    if (!bySpecialist[specialistId].clients[clientId]) {
      bySpecialist[specialistId].clients[clientId] = {
        client_id: clientId,
        client_name: client.display_name || 'Unknown',
        assigned_house: client.assigned_house || null,
        sessions: 0,
        total_minutes: 0,
        synced_minutes: 0,
        dropped_minutes: 0,
      }
    }

    const mins = entry.duration_minutes || 0
    bySpecialist[specialistId].clients[clientId].sessions++
    bySpecialist[specialistId].clients[clientId].total_minutes += mins
    bySpecialist[specialistId].total_minutes += mins

    if (isSynced) {
      bySpecialist[specialistId].clients[clientId].synced_minutes += mins
      bySpecialist[specialistId].synced_minutes += mins
    } else {
      bySpecialist[specialistId].clients[clientId].dropped_minutes += mins
      bySpecialist[specialistId].dropped_minutes += mins
    }
  }

  // Convert clients object to sorted array
  for (const sid of Object.keys(bySpecialist)) {
    bySpecialist[sid].clients = Object.values(bySpecialist[sid].clients)
      .sort((a, b) => b.total_minutes - a.total_minutes)
  }

  return Response.json({ bySpecialist })
}
