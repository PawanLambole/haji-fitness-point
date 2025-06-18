/*
  # Complete Fix for Add Member Functionality

  1. Database Schema Fixes
    - Ensure all tables have proper structure
    - Fix any missing constraints or indexes
    - Simplify RLS policies to avoid any recursion

  2. Security
    - Simple, non-recursive RLS policies
    - Proper authentication checks
    - Allow authenticated users to manage all data
*/

-- First, let's ensure the admin_users table has the correct structure
ALTER TABLE admin_users 
  ALTER COLUMN created_at SET DEFAULT now(),
  ALTER COLUMN updated_at SET DEFAULT now();

-- Ensure members table has correct structure
ALTER TABLE members 
  ALTER COLUMN created_at SET DEFAULT now(),
  ALTER COLUMN updated_at SET DEFAULT now(),
  ALTER COLUMN joining_date SET DEFAULT CURRENT_DATE,
  ALTER COLUMN membership_start SET DEFAULT CURRENT_DATE;

-- Ensure payments table has correct structure
ALTER TABLE payments 
  ALTER COLUMN created_at SET DEFAULT now(),
  ALTER COLUMN payment_date SET DEFAULT CURRENT_DATE;

-- Drop all existing policies to start fresh
DROP POLICY IF EXISTS "Admin users can read own data" ON admin_users;
DROP POLICY IF EXISTS "Admin users can update own data" ON admin_users;
DROP POLICY IF EXISTS "Admin users can insert own data" ON admin_users;
DROP POLICY IF EXISTS "Authenticated users can manage members" ON members;
DROP POLICY IF EXISTS "Authenticated users can manage payments" ON payments;

-- Create simple, working policies for admin_users
CREATE POLICY "admin_users_select_policy"
  ON admin_users
  FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "admin_users_insert_policy"
  ON admin_users
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

CREATE POLICY "admin_users_update_policy"
  ON admin_users
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Create simple policies for members (allow all authenticated users)
CREATE POLICY "members_all_policy"
  ON members
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Create simple policies for payments (allow all authenticated users)
CREATE POLICY "payments_all_policy"
  ON payments
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Ensure all necessary indexes exist
CREATE INDEX IF NOT EXISTS idx_admin_users_email ON admin_users(email);
CREATE INDEX IF NOT EXISTS idx_members_assignment_number ON members(assignment_number);
CREATE INDEX IF NOT EXISTS idx_members_phone_number ON members(phone_number);
CREATE INDEX IF NOT EXISTS idx_members_is_active ON members(is_active);
CREATE INDEX IF NOT EXISTS idx_members_membership_end ON members(membership_end);
CREATE INDEX IF NOT EXISTS idx_members_created_by ON members(created_by);
CREATE INDEX IF NOT EXISTS idx_payments_member_id ON payments(member_id);
CREATE INDEX IF NOT EXISTS idx_payments_payment_date ON payments(payment_date);
CREATE INDEX IF NOT EXISTS idx_payments_payment_method ON payments(payment_method);
CREATE INDEX IF NOT EXISTS idx_payments_created_by ON payments(created_by);

-- Ensure foreign key constraints are properly set
ALTER TABLE members 
  DROP CONSTRAINT IF EXISTS members_created_by_fkey,
  ADD CONSTRAINT members_created_by_fkey 
    FOREIGN KEY (created_by) REFERENCES admin_users(id);

ALTER TABLE payments 
  DROP CONSTRAINT IF EXISTS payments_member_id_fkey,
  ADD CONSTRAINT payments_member_id_fkey 
    FOREIGN KEY (member_id) REFERENCES members(id) ON DELETE CASCADE;

ALTER TABLE payments 
  DROP CONSTRAINT IF EXISTS payments_created_by_fkey,
  ADD CONSTRAINT payments_created_by_fkey 
    FOREIGN KEY (created_by) REFERENCES admin_users(id);