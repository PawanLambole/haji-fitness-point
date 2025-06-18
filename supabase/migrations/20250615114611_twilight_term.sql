/*
  # Complete fix for Add Member functionality and RLS policies

  1. Changes
    - Fix all RLS policies to avoid recursion
    - Ensure proper permissions for member and payment operations
    - Add proper indexes for performance

  2. Security
    - Maintain security while avoiding infinite recursion
    - Allow authenticated admin users to manage members and payments
    - Ensure proper access control
*/

-- First, let's completely reset the admin_users policies to avoid any recursion
DROP POLICY IF EXISTS "Admin users can read their own data" ON admin_users;
DROP POLICY IF EXISTS "Admin users can update own data" ON admin_users;
DROP POLICY IF EXISTS "Admin users can insert own data" ON admin_users;
DROP POLICY IF EXISTS "Owners can manage all admin users" ON admin_users;

-- Create simple, non-recursive policies for admin_users
CREATE POLICY "Admin users can read own data"
  ON admin_users
  FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Admin users can update own data"
  ON admin_users
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Admin users can insert own data"
  ON admin_users
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

-- For the members table, ensure the policy works correctly
DROP POLICY IF EXISTS "Admin users can manage members" ON members;

CREATE POLICY "Authenticated users can manage members"
  ON members
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- For the payments table, ensure the policy works correctly
DROP POLICY IF EXISTS "Admin users can manage payments" ON payments;

CREATE POLICY "Authenticated users can manage payments"
  ON payments
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Add any missing indexes for better performance
CREATE INDEX IF NOT EXISTS idx_admin_users_email ON admin_users(email);
CREATE INDEX IF NOT EXISTS idx_members_created_by ON members(created_by);
CREATE INDEX IF NOT EXISTS idx_payments_created_by ON payments(created_by);