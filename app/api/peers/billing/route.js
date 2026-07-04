import { createClient } from '@supabase/supabase-js'

export async function GET(request) {
  const { searchParams } = new URL(request.url)
  const month = parseInt(searchParams.get('month') || new Date().getMonth() + 1)
  const year = parseInt(searchParams.get('year') || new Date().getFullYear())
  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)

  const [{ data: billing }, { data: peers }] = await Promise.all([
    supabase.from('billing_entries').select('*').eq('month', month).eq('year', year),
    supabase.from('peers').select('id, name, email').eq('active', true),
  ])

  // Build email → peer_id and name → peer_id lookup maps
  const peerEmailMap = {}
  const peerNameMap = {}
  for (const p of (peers || [])) {
    if (p.email) peerEmailMap[p.email.toLowerCase().trim()] = p.id
    peerNameMap[p.name.toLowerCase().trim()] = p.id
  }

  const peerBilling = {}
  for (const b of (billing || [])) {
    // Match by peer_id, then email, then name
    let pid = b.peer_id
    if (!pid && b.peer_email) pid = peerEmailMap[b.peer_email.toLowerCase().trim()] || null
    if (!pid && b.peer_name) pid = peerNameMap[b.peer_name.toLowerCase().trim()] || null
    if (!pid) continue

    if (!peerBilling[pid]) peerBilling[pid] = { totalHours: 0, byHouse: {} }
    const hrs = b.duration_minutes / 60
    peerBilling[pid].totalHours += hrs
    peerBilling[pid].byHouse[b.house] = (peerBilling[pid].byHouse[b.house] || 0) + hrs
  }

  return Response.json({ peerBilling })
}
