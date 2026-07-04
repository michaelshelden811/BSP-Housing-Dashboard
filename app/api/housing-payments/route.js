import { createClient } from '@supabase/supabase-js'

export async function GET(request) {
  const { searchParams } = new URL(request.url)
  const month = parseInt(searchParams.get('month') || new Date().getMonth() + 1)
  const year = parseInt(searchParams.get('year') || new Date().getFullYear())
  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)
  const { data, error } = await supabase.from('housing_payments').select('*').eq('month', month).eq('year', year)
  if (error) return Response.json({ error: error.message }, { status: 500 })
  return Response.json({ payments: data })
}

export async function POST(request) {
  const body = await request.json()
  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)
  const { data, error } = await supabase.from('housing_payments').insert([body]).select()
  if (error) return Response.json({ error: error.message }, { status: 500 })
  return Response.json({ payment: data[0] })
}
