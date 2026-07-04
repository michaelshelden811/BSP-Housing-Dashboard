import { createClient } from '@supabase/supabase-js'

export async function POST(request) {
  const body = await request.json()
  const month = parseInt(body.month)
  const year = parseInt(body.year)

  const peerbill = createClient(
    process.env.PEERBILL_SUPABASE_URL,
    process.env.PEERBILL_SERVICE_ROLE_KEY
  )

  const bsp = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  )

  const startDate = `${year}-${String(month).padStart(2,'0')}-01`
  const endDate = new Date(year, month, 0).toISOString().split('T')[0]

  const { data: ledgerEntries, error: ledgerError } = await peerbill
    .from('ledger')
    .select('id, client_id, specialist_id, service_date, duration_minutes')
    .gte('service_date', startDate)
    .lte('service_date', endDate)

  if (ledgerError) return Response.json({ error: ledgerError.message }, { status: 500 })
  if (!ledgerEntries || ledgerEntries.length === 0) {
    return Response.json({ synced: 0, message: 'No ledger entries found for this period.' })
  }

  const clientIds = [...new Set(ledgerEntries.map(e => e.client_id).filter(Boolean))]
  const specialistIds = [...new Set(ledgerEntries.map(e => e.specialist_id).filter(Boolean))]

  const { data: clients } = await peerbill
    .from('clients')
    .select('id, display_name, assigned_house')
    .in('id', clientIds)

  const { data: specialists } = await peerbill
    .from('users')
    .select('id, full_name, email')
    .in('id', specialistIds)

  const clientMap = {}
  for (const c of (clients || [])) clientMap[c.id] = c

  const specialistMap = {}
  for (const s of (specialists || [])) specialistMap[s.id] = s

  const { data: bspPeers } = await bsp.from('peers').select('id, name, email, primary_house').eq('active', true)
  const peerEmailMap = {}
  const peerNameMap = {}
  const peerPrimaryHouseByEmail = {}
  const peerPrimaryHouseByName = {}
  for (const p of (bspPeers || [])) {
    if (p.email) {
      peerEmailMap[p.email.toLowerCase().trim()] = p.id
      if (p.primary_house) peerPrimaryHouseByEmail[p.email.toLowerCase().trim()] = p.primary_house
    }
    peerNameMap[p.name.toLowerCase().trim()] = p.id
    if (p.primary_house) peerPrimaryHouseByName[p.name.toLowerCase().trim()] = p.primary_house
  }

  const validHouses = ['acoma','mayberry','bell','noah']
  const entries = []
  const dropped = []

  for (const entry of ledgerEntries) {
    const client = clientMap[entry.client_id]
    const specialist = specialistMap[entry.specialist_id]
    const specialistName = specialist?.full_name || 'Unknown'
    const specialistEmail = specialist?.email || null

    if (!client) {
      dropped.push({ session_date: entry.service_date, specialist: specialistName, reason: 'Client not found in PeerBill', duration_minutes: entry.duration_minutes })
      continue
    }
    if (!entry.duration_minutes || entry.duration_minutes <= 0) {
      dropped.push({ session_date: entry.service_date, specialist: specialistName, client: client.display_name, reason: 'Zero duration', duration_minutes: entry.duration_minutes })
      continue
    }

    // Resolve house: use client's assigned house, fall back to specialist's primary house
    let house = null
    let houseFallback = false
    if (client.assigned_house && validHouses.includes(client.assigned_house.toLowerCase().trim())) {
      house = client.assigned_house.toLowerCase().trim()
    } else {
      const fallback = (specialistEmail && peerPrimaryHouseByEmail[specialistEmail.toLowerCase().trim()])
        || peerPrimaryHouseByName[specialistName.toLowerCase().trim()]
        || null
      if (fallback && validHouses.includes(fallback)) {
        house = fallback
        houseFallback = true
      }
    }

    if (!house) {
      dropped.push({ session_date: entry.service_date, specialist: specialistName, client: client.display_name, assigned_house: client.assigned_house || 'none', reason: 'No house assignment — assign a house to this client in PeerBill or set a primary house for the specialist', duration_minutes: entry.duration_minutes })
      continue
    }

    const entryMonth = parseInt(entry.service_date.split('-')[1])
    const entryYear = parseInt(entry.service_date.split('-')[0])

    const peerId = (specialistEmail && peerEmailMap[specialistEmail.toLowerCase().trim()])
      || peerNameMap[specialistName.toLowerCase().trim()]
      || null

    entries.push({
      id: entry.id,
      peer_id: peerId,
      peer_name: specialistName,
      peer_email: specialistEmail,
      client_name: client.display_name || 'Unknown',
      house,
      house_fallback: houseFallback,
      session_date: entry.service_date,
      duration_minutes: entry.duration_minutes,
      billing_rate: 60.00,
      month: entryMonth,
      year: entryYear,
      source: 'peerbill',
    })
  }

  if (entries.length === 0) {
    return Response.json({ synced: 0, dropped, message: 'No sessions could be synced. Check house assignments in PeerBill.' })
  }

  const { error: upsertError } = await bsp
    .from('billing_entries')
    .upsert(entries, { onConflict: 'id' })

  if (upsertError) return Response.json({ error: upsertError.message }, { status: 500 })

  const droppedMinutes = dropped.reduce((s, d) => s + (d.duration_minutes || 0), 0)
  const fallbackCount = entries.filter(e => e.house_fallback).length
  return Response.json({
    synced: entries.length,
    fallback: fallbackCount,
    dropped,
    message: `Synced ${entries.length} sessions.${fallbackCount > 0 ? ` ${fallbackCount} used specialist's primary house (client had no house set).` : ''}${dropped.length > 0 ? ` ${dropped.length} sessions dropped (${Math.round(droppedMinutes/60*10)/10} hrs) — see below.` : ''}`,
  })
}
