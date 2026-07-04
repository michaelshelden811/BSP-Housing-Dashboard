import { createClient } from '@supabase/supabase-js'

function getSupabase() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)
}

export async function GET(request) {
  const { searchParams } = new URL(request.url)
  const month = parseInt(searchParams.get('month') || new Date().getMonth() + 1)
  const year = parseInt(searchParams.get('year') || new Date().getFullYear())
  const supabase = getSupabase()

  // Carry recurring expenses forward into this month before returning.
  // Looks at the MOST RECENT prior occurrence of each recurring expense
  // (not just last month), so a gap of unvisited months doesn't break the chain.
  const { data: priorRecurring } = await supabase
    .from('expenses')
    .select('*')
    .eq('is_recurring', true)
    .or(`year.lt.${year},and(year.eq.${year},month.lt.${month})`)
    .order('year', { ascending: false })
    .order('month', { ascending: false })

  const { data: currentExpenses } = await supabase
    .from('expenses')
    .select('*')
    .eq('month', month)
    .eq('year', year)

  if (priorRecurring && priorRecurring.length > 0) {
    // Keep only the single most recent prior row per recurring series
    // (a series = same house + category + description + amount).
    const seen = new Set()
    const latestPerSeries = []
    for (const r of priorRecurring) {
      const key = `${r.house}|${r.category}|${r.description}|${r.amount}`
      if (!seen.has(key)) {
        seen.add(key)
        latestPerSeries.push(r)
      }
    }

    const toSeed = latestPerSeries.filter(r =>
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
