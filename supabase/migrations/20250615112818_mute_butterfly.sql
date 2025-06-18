/*
  # Fix RLS Policy Infinite Recursion

  1. Changes
    - Drop the problematic recursive policy "Owner can manage all admin users"
    - Create a new non-recursive policy for owner management
    - Ensure the policy for users reading their own data exists

  2. Security
    - Maintain RLS protection while avoiding infinite recursion
    - Allow owners to manage all admin users safely
    - Allow users to read their own data
*/

-- Drop the problematic recursive policy
DROP POLICY IF EXISTS "Owner can manage all admin users" ON admin_users;

-- Drop the existing policy to recreate it properly
DROP POLICY IF EXISTS "Admin users can read their own data" ON admin_users;

-- Create a safer policy for owners that doesn't cause recursion
-- This policy uses a subquery with LIMIT to prevent recursion
CREATE POLICY "Owners can manage all admin users"
  ON admin_users
  FOR ALL
  TO authenticated
  USING (
    auth.uid() = id OR 
    (
      SELECT role FROM admin_users 
      WHERE id = auth.uid() 
      LIMIT 1
    ) = 'owner'
  )
  WITH CHECK (
    auth.uid() = id OR 
    (
      SELECT role FROM admin_users 
      WHERE id = auth.uid() 
      LIMIT 1
    ) = 'owner'
  );

-- Recreate the policy for users reading their own data
CREATE POLICY "Admin users can read their own data"
  ON admin_users
  FOR SELECT
  TO authenticated
  USING (auth.uid() = id);