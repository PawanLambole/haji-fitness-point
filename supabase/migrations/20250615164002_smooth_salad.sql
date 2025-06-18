/*
  # Optimize Member Loading Performance (Fixed)

  1. Performance Improvements
    - Add composite indexes for common query patterns
    - Optimize RLS policies for better performance
    - Add indexes for sorting and filtering operations
    - Create efficient search capabilities

  2. Database Optimizations
    - Create targeted indexes for member list queries
    - Add partial indexes for active members
    - Optimize foreign key relationships
    - Avoid oversized covering indexes
*/

-- Add composite indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_members_active_created_at 
  ON members(is_active, created_at DESC) 
  WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_members_membership_status 
  ON members(membership_end, is_active) 
  WHERE is_active = true;

-- Create separate indexes for commonly queried columns instead of one large covering index
CREATE INDEX IF NOT EXISTS idx_members_created_at_desc 
  ON members(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_members_assignment_full_name 
  ON members(assignment_number, full_name);

-- Add index for search operations using simpler approach
CREATE INDEX IF NOT EXISTS idx_members_full_name_search 
  ON members USING gin(to_tsvector('english', full_name));

CREATE INDEX IF NOT EXISTS idx_members_assignment_search 
  ON members(assignment_number text_pattern_ops);

CREATE INDEX IF NOT EXISTS idx_members_phone_search 
  ON members(phone_number text_pattern_ops);

-- Optimize the members RLS policy for better performance
DROP POLICY IF EXISTS "members_all_policy" ON members;

-- Create a more efficient RLS policy that can use indexes better
CREATE POLICY "members_authenticated_access"
  ON members
  FOR ALL
  TO authenticated
  USING (
    -- Check if user exists in admin_users table (this will be cached)
    EXISTS (
      SELECT 1 FROM admin_users 
      WHERE id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM admin_users 
      WHERE id = auth.uid()
    )
  );

-- Add similar optimization for payments
DROP POLICY IF EXISTS "payments_all_policy" ON payments;

CREATE POLICY "payments_authenticated_access"
  ON payments
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admin_users 
      WHERE id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM admin_users 
      WHERE id = auth.uid()
    )
  );

-- Create a materialized view for dashboard statistics (optional, for very large datasets)
CREATE MATERIALIZED VIEW IF NOT EXISTS member_stats AS
SELECT 
  COUNT(*) as total_members,
  COUNT(*) FILTER (WHERE is_active = true AND membership_end >= CURRENT_DATE) as active_members,
  COUNT(*) FILTER (WHERE created_at >= date_trunc('month', CURRENT_DATE)) as new_this_month,
  SUM(total_amount) FILTER (WHERE created_at >= date_trunc('month', CURRENT_DATE)) as monthly_revenue
FROM members;

-- Create index on the materialized view
CREATE UNIQUE INDEX IF NOT EXISTS idx_member_stats ON member_stats ((1));

-- Function to refresh stats (call this periodically or after member changes)
CREATE OR REPLACE FUNCTION refresh_member_stats()
RETURNS void AS $$
BEGIN
  REFRESH MATERIALIZED VIEW member_stats;
END;
$$ LANGUAGE plpgsql;

-- Add additional performance indexes for common queries
CREATE INDEX IF NOT EXISTS idx_members_active_membership_end 
  ON members(is_active, membership_end) 
  WHERE is_active = true;

-- Index for pagination queries
CREATE INDEX IF NOT EXISTS idx_members_id_created_at 
  ON members(id, created_at DESC);

-- Analyze tables to update statistics for query planner
ANALYZE members;
ANALYZE payments;
ANALYZE admin_users;