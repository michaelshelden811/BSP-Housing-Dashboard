import { createClient } from '@supabase/supabase-js'

// Runs automatically every day on Vercel's schedule (see vercel.json "crons").
// Seeds the CURRENT calendar month's recurring expenses across every house,
// using the most recent prior occurrence of each recurring line. This does
// NOT depend on anyone opening the app — it runs whether or not a human
// visits the site that day. Safe to run repeatedly: it only inserts rows
// that aren't already there for the current month.
export async function GET(request) {
  const authHeader = request.headers.get('authorization')
  if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const now = new Date()
  const month = now.getMonth() + 1
  const year = now.getFullYear()

  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)

  const { data: priorRecurring, error: priorError } = await supabase
    .from('expenses')
    .select('*')
    .eq('is_recurring', true)
    .or(`year.lt.${year},and(year.eq.${year},month.lt.${month})`)
    .order('year', { ascending: false })
    .order('month', { ascending: false })

  if (priorError) return Response.json({ error: priorError.message }, { status: 500 })

  const { data: currentExpenses, error: currentError } = await supabase
    .from('expenses')
    .select('*')
    .eq('month', month)
    .eq('year', year)

  if (currentError) return Response.json({ error: currentError.message }, { status: 500 })

  let seededCount = 0

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
      const { error: insertError } = await supabase.from('expenses').insert(toSeed.map(r => ({
        house: r.house,
        category: r.category,
        description: r.description,
        amount: r.amount,
        month,
        year,
        is_recurring: true,
      })))
      if (insertError) return Response.json({ error: insertError.message }, { status: 500 })
      seededCount = toSeed.length
    }
  }

  return Response.json({ ok: true, month, year, seeded: seededCount })
}
