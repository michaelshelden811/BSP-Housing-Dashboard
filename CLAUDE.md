## BSP Housing Dashboard

Admin-only financial dashboard for Barbell Saves Project.

## Stack
Next.js (App Router, JS not TS in API routes), Supabase, Vercel

## Rules — same as PeerBill
- API routes .js not .ts
- Supabase client initialized INSIDE handler functions only
- Inline styles only, no Tailwind
- Full rewrites over patches
- One change at a time

## Business Rules
- Billing rate: $60/hr
- Peer pay: adjustable per person ($20 or $25)
- 4 houses: acoma, mayberry, bell, noah — 8 beds each
- Supply runs: total ÷ 4, split equally across all houses
- Labor cost follows the client's assigned house
- Rent category is $0 for bell and noah (no lease cost on these houses) — acoma and mayberry carry real rent expense. All "rent" category line items for bell/noah, including any insurance sub-items filed under that category, should stay at $0.

## Known Behavior
- Recurring expenses (`is_recurring = true` on the `expenses` table) auto-copy forward into the current month when the Expenses page or a house P&L page loads. It carries forward the most recent prior occurrence of each recurring line (matched on house + category + description + amount), so a skipped month doesn't break the chain.
- The `is_recurring` column exists in the live Supabase `expenses` table but is missing from `database/schema.sql` — that file is documentation only and is out of date; don't re-run it expecting to add the column.

## Pages
/ — Org dashboard
/houses/[house] — Per-house P&L
/expenses — Expense management
/receipts — Weekly supply run logging
/peers — Peer tracker + pay rates
/settings — Config

## Setup
1. Create Supabase project for BSP Housing
2. Run database/schema.sql once
3. Fill in .env.local with your keys
4. Deploy to Vercel
