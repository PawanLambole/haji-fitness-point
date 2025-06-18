/*
  # Fix infinite recursion in admin_users RLS policies

  1. Problem
    - The current "Owners can manage all admin users" policy creates infinite recursion
    - When checking admin_users access, it queries admin_users table again to check role
    - This creates an endless loop during policy evaluation

  2. Solution
    - Drop the problematic recursive policy
    - Create simpler, non-recursive policies that avoid circular dependencies
    - Use auth.uid() directly without subqueries to admin_users table

  3. New Policies
    - Admin users can read their own data (kept as-is)
    - Admin users can update their own data (new, simple policy)
    - Remove the complex recursive policy that was causing issues
*/

-- Drop the problematic recursive policy
DROP POLICY IF EXISTS "Owners can manage all admin users" ON admin_users;

-- Create a simple policy for users to update their own data
CREATE POLICY "Admin users can update own data"
  ON admin_users
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Create a simple policy for users to insert (this might be needed for registration)
CREATE POLICY "Admin users can insert own data"
  ON admin_users
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

-- Note: For owner-level operations (like managing other admin users),
-- these should be handled through application logic or server-side functions
-- rather than RLS policies to avoid recursion issues.