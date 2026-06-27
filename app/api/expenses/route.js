import { createClient } from '@supabase/supabase-js'

export async function GET(request) {
  const { searchParams } = new URL(request.url)
  const month = parseInt(searchParams.get('month') || new Date().getMonth() + 1)
  const year = parseInt(searchParams.get('year') || new Date().getFullYear())
  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)

  // Calculate prior month for recurring seed check
  const prevMonth = month === 1 ? 12 : month - 1
  const prevYear = month === 1 ? year - 1 : year

  // Load current month expenses
  const { data: current, error } = await supabase
    .from('expenses')
    .select('*')
    .eq('month', month)
    .eq('year', year)
    .order('created_at', { ascending: false })
  if (error) return Response.json({ error: error.message }, { status: 500 })

  // Only seed recurring expenses if the month has no expenses yet (first time viewing)
  if (current.length === 0) {
    const { data: recurring } = await supabase
      .from('expenses')
      .select('*')
      .eq('month', prevMonth)
      .eq('year', prevYear)
      .eq('is_recurring', true)

    if (recurring && recurring.length > 0) {
      const inserts = recurring.map(r => ({
        house: r.house,
        category: r.category,
        description: r.description,
        amount: r.amount,
        month,
        year,
        is_recurring: true,
      }))
      await supabase.from('expenses').insert(inserts)

      const { data: refreshed, error: refreshErr } = await supabase
        .from('expenses')
        .select('*')
        .eq('month', month)
        .eq('year', year)
        .order('created_at', { ascending: false })
      if (refreshErr) return Response.json({ error: refreshErr.message }, { status: 500 })
      return Response.json({ expenses: refreshed })
    }
  }

  return Response.json({ expenses: current })
}

export async function POST(request) {
  const body = await request.json()
  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)
  const { data, error } = await supabase.from('expenses').insert([{
    house: body.house,
    category: body.category,
    description: body.description,
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
  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)
  const { error } = await supabase.from('expenses').delete().eq('id', id)
  if (error) return Response.json({ error: error.message }, { status: 500 })
  return Response.json({ success: true })
}
