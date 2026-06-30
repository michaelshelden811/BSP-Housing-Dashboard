import { createClient } from '@supabase/supabase-js'

function getSupabase() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)
}

export async function GET(request) {
  const { searchParams } = new URL(request.url)
  const month = parseInt(searchParams.get('month') || new Date().getMonth() + 1)
  const year = parseInt(searchParams.get('year') || new Date().getFullYear())
  const supabase = getSupabase()
  const { data, error } = await supabase
    .from('expenses')
    .select('*')
    .eq('month', month)
    .eq('year', year)
    .order('created_at', { ascending: false })
  if (error) return Response.json({ error: error.message }, { status: 500 })
  return Response.json({ expenses: data })
}

export async function POST(request) {
  const body = await request.json()
  const supabase = getSupabase()
  const { data, error } = await supabase.from('expenses').insert([{
    house: body.house,
    category: body.category,
    description: body.description || null,
    amount: body.amount,
    month: body.month,
    year: body.year,
    receipt_url: body.receipt_url || null,
    is_recurring: body.is_recurring || false,
  }]).select()
  if (error) return Response.json({ error: error.message }, { status: 500 })
  return Response.json({ expense: data[0] })
}

export async function DELETE(request) {
  const { searchParams } = new URL(request.url)
  const id = searchParams.get('id')
  if (!id) return Response.json({ error: 'Missing id' }, { status: 400 })
  const supabase = getSupabase()
  const { error } = await supabase.from('expenses').delete().eq('id', id)
  if (error) return Response.json({ error: error.message }, { status: 500 })
  return Response.json({ success: true })
}
