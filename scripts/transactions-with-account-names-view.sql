-- Optional: join transactions to both account sides without PostgREST FK hints.
-- Run in Supabase SQL Editor if you want a single relation for reporting or API experiments.
-- RLS still applies to the underlying `transactions` table when users query through Supabase.

CREATE OR REPLACE VIEW public.transactions_with_account_names AS
SELECT
  t.id,
  t.transaction_id,
  t.transaction_date,
  t.amount,
  t.transaction_type,
  t.note,
  t.description,
  t.currency,
  t.category,
  t.deleted_at,
  t.amount_in_account_currency,
  t.mm_meta,
  t.account_id,
  t.to_account_id,
  t.port_id,
  fa.name AS from_account_name,
  ta.name AS to_account_name
FROM public.transactions t
LEFT JOIN public.accounts fa ON fa.account_id = t.account_id
LEFT JOIN public.accounts ta ON ta.account_id = t.to_account_id;

COMMENT ON VIEW public.transactions_with_account_names IS
  'Plain joins for from/to account names; app uses scalar transactions + hydrate to avoid brittle embed hints.';

-- Grant if you use the view from the API (adjust role to match your project):
-- GRANT SELECT ON public.transactions_with_account_names TO authenticated;
