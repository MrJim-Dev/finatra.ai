-- Fix RLS policies for all tables
-- Run these commands in Supabase SQL Editor with appropriate permissions

-- 1. CUSTOMERS table - add missing policies (CRITICAL - this table has RLS enabled but NO policies)
DROP POLICY IF EXISTS "Enable users to manage their own customer data" ON customers;
CREATE POLICY "Enable users to manage their own customer data" 
ON customers FOR ALL 
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

-- 2. PORTFOLIO table - add missing UPDATE and DELETE policies
DROP POLICY IF EXISTS "Enable update for portfolio owners" ON portfolio;
CREATE POLICY "Enable update for portfolio owners" 
ON portfolio FOR UPDATE 
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Enable delete for portfolio owners" ON portfolio;
CREATE POLICY "Enable delete for portfolio owners" 
ON portfolio FOR DELETE 
USING (auth.uid() = user_id);

-- 3. ACCOUNT_GROUPS table - add missing UPDATE and DELETE policies
DROP POLICY IF EXISTS "Enable update for account group owners" ON account_groups;
CREATE POLICY "Enable update for account group owners" 
ON account_groups FOR UPDATE 
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Enable delete for account group owners" ON account_groups;
CREATE POLICY "Enable delete for account group owners" 
ON account_groups FOR DELETE 
USING (auth.uid() = user_id);

-- 4. ACCOUNTS table - add missing UPDATE and DELETE policies
DROP POLICY IF EXISTS "Enable update for account owners" ON accounts;
CREATE POLICY "Enable update for account owners" 
ON accounts FOR UPDATE 
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Enable delete for account owners" ON accounts;
CREATE POLICY "Enable delete for account owners" 
ON accounts FOR DELETE 
USING (auth.uid() = user_id);

-- 5. SUBSCRIPTIONS table - add missing INSERT, UPDATE, DELETE policies
DROP POLICY IF EXISTS "Enable insert for subscription owners" ON subscriptions;
CREATE POLICY "Enable insert for subscription owners" 
ON subscriptions FOR INSERT 
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Enable update for subscription owners" ON subscriptions;
CREATE POLICY "Enable update for subscription owners" 
ON subscriptions FOR UPDATE 
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Enable delete for subscription owners" ON subscriptions;
CREATE POLICY "Enable delete for subscription owners" 
ON subscriptions FOR DELETE 
USING (auth.uid() = user_id);

-- 6. TRANSACTIONS table - Enable RLS and add policies (currently has RLS disabled)
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Enable full access for transaction owners" ON transactions;
CREATE POLICY "Enable full access for transaction owners" 
ON transactions FOR ALL 
USING (auth.uid() = uid)
WITH CHECK (auth.uid() = uid);

-- 7. TRANSACTION_ALT table - Enable RLS and add policies (currently has RLS disabled)
ALTER TABLE transaction_alt ENABLE ROW LEVEL SECURITY;

-- Add user_id column to transaction_alt if it doesn't exist
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'transaction_alt' AND column_name = 'user_id') THEN
        ALTER TABLE transaction_alt ADD COLUMN user_id UUID DEFAULT auth.uid();
    END IF;
END $$;

DROP POLICY IF EXISTS "Enable full access for transaction_alt owners" ON transaction_alt;
CREATE POLICY "Enable full access for transaction_alt owners" 
ON transaction_alt FOR ALL 
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- 8. PRICES table - add owner-based policies for INSERT, UPDATE, DELETE
DROP POLICY IF EXISTS "Enable insert for authenticated users on prices" ON prices;
CREATE POLICY "Enable insert for authenticated users on prices" 
ON prices FOR INSERT 
WITH CHECK (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Enable update for authenticated users on prices" ON prices;
CREATE POLICY "Enable update for authenticated users on prices" 
ON prices FOR UPDATE 
USING (auth.role() = 'authenticated')
WITH CHECK (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Enable delete for authenticated users on prices" ON prices;
CREATE POLICY "Enable delete for authenticated users on prices" 
ON prices FOR DELETE 
USING (auth.role() = 'authenticated');

-- 9. PRODUCTS table - add owner-based policies for INSERT, UPDATE, DELETE
DROP POLICY IF EXISTS "Enable insert for authenticated users on products" ON products;
CREATE POLICY "Enable insert for authenticated users on products" 
ON products FOR INSERT 
WITH CHECK (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Enable update for authenticated users on products" ON products;
CREATE POLICY "Enable update for authenticated users on products" 
ON products FOR UPDATE 
USING (auth.role() = 'authenticated')
WITH CHECK (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Enable delete for authenticated users on products" ON products;
CREATE POLICY "Enable delete for authenticated users on products" 
ON products FOR DELETE 
USING (auth.role() = 'authenticated'); 