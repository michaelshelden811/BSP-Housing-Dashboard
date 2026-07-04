import { createClient } from '@supabase/supabase-js'

export async function GET() {
  const pbUrl = process.env.PEERBILL_SUPABASE_URL
  const pbKey = process.env.PEERBILL_SERVICE_ROLE_KEY
  const bspUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const bspKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  const envCheck = {
    PEERBILL_SUPABASE_URL: pbUrl ? pbUrl.slice(0, 40) : 'MISSING',
    PEERBILL_SERVICE_ROLE_KEY: pbKey ? pbKey.slice(0, 20) + '...' : 'MISSING',
    NEXT_PUBLIC_SUPABASE_URL: bspUrl ? bspUrl.slice(0, 40) : 'MISSING',
    SUPABASE_SERVICE_ROLE_KEY: bspKey ? bspKey.slice(0, 20) + '...' : 'MISSING',
  }

  const peerbill = createClient(pbUrl, pbKey)

  const { data: clients, error: ce } = await peerbill.from('clients').select('id').limit(1)
  const { data: users, error: ue } = await peerbill.from('users').select('id').limit(1)

  // Raw fetch — bypasses Supabase client library
  const rawRes = await fetch(`${bspUrl}/rest/v1/peers?select=id&limit=1`, {
    headers: {
      apikey: bspKey,
      Authorization: `Bearer ${bspKey}`,
    }
  })
  const rawBody = await rawRes.text()

  return Response.json({
    envCheck,
    peerbillClientOk: !ce,
    clientError: ce?.message || null,
    peerbillUsersOk: !ue,
    userError: ue?.message || null,
    bspRawStatus: rawRes.status,
    bspRawBody: rawBody,
  })
}
