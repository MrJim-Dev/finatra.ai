-- Run in Supabase SQL Editor (read-only audit of groups + inclusion flags).
-- Verifies credit-card groups (group_type = 'credit') and accounts excluded from totals (in_total = false).

-- 1) Groups per type for a portfolio (replace :port_id with your uuid)
-- SELECT group_type, COUNT(*) AS n
-- FROM account_groups
-- WHERE port_id = 'YOUR_PORT_ID'
-- GROUP BY group_type
-- ORDER BY group_type;

-- 2) All groups with type (replace port_id)
SELECT
  ag.group_id,
  ag.group_name,
  COALESCE(ag.group_type, 'default') AS group_type,
  (SELECT COUNT(*) FROM accounts a WHERE a.group_id = ag.group_id) AS account_count
FROM account_groups ag
WHERE ag.port_id = 'YOUR_PORT_ID'
ORDER BY ag.group_name;

-- 3) Accounts excluded from portfolio totals
SELECT
  a.account_id,
  a.name,
  a.in_total,
  a.hidden,
  ag.group_name,
  COALESCE(ag.group_type, 'default') AS group_type
FROM accounts a
LEFT JOIN account_groups ag ON ag.group_id = a.group_id
WHERE a.port_id = 'YOUR_PORT_ID'
  AND a.in_total = false
ORDER BY a.name;
