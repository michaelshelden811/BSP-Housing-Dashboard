import { createClient } from '@supabase/supabase-js'

export async function GET() {
  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)
  const { data, error } = await supabase.from('peers').select('*').eq('active', true).order('name')
  if (error) return Response.json({ error: error.message }, { status: 500 })
  return Response.json({ peers: data })
}

export async function POST(request) {
  const body = await request.json()
  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)
  const { data, error } = await supabase.from('peers').insert([{ ...body, active: true }]).select()
  if (error) return Response.json({ error: error.message }, { status: 500 })
  return Response.json({ peer: data[0] })
}

export async function PATCH(request) {
  const { id, ...updates } = await request.json()
  updates.updated_at = new Date().toISOString()
  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)
  const { data, error } = await supabase.from('peers').update(updates).eq('id', id).select()
  if (error) return Response.json({ error: error.message }, { status: 500 })
  return Response.json({ peer: data[0] })
}
