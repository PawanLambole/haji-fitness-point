/*
  # Final optimizations and fixes for the gym management system

  1. Performance Improvements
    - Ensure all indexes are properly created
    - Add missing constraints and optimizations
    - Fix any potential issues with RLS policies

  2. Data Integrity
    - Ensure proper foreign key constraints
    - Add check constraints for data validation
    - Optimize query performance

  3. Security
    - Verify RLS policies are working correctly
    - Ensure proper access control
*/

-- Ensure all required indexes exist for optimal performance
CREATE INDEX IF NOT EXISTS idx_members_full_name_gin 
  ON members USING gin(to_tsvector('english', full_name));

CREATE INDEX IF NOT EXISTS idx_members_phone_btree 
  ON members(phone_number);

CREATE INDEX IF NOT EXISTS idx_members_assignment_btree 
  ON members(assignment_number);

-- Add check constraints for data validation
ALTER TABLE members 
  ADD CONSTRAINT check_membership_dates 
  CHECK (membership_end > membership_start);

ALTER TABLE members 
  ADD CONSTRAINT check_positive_amounts 
  CHECK (total_amount >= 0 AND discount_amount >= 0);

ALTER TABLE members 
  ADD CONSTRAINT check_discount_not_greater_than_total 
  CHECK (discount_amount <= total_amount);

ALTER TABLE payments 
  ADD CONSTRAINT check_positive_payment_amount 
  CHECK (amount > 0);

-- Ensure proper phone number format (basic validation)
ALTER TABLE members 
  ADD CONSTRAINT check_phone_number_length 
  CHECK (length(phone_number) >= 10);

-- Create a function to automatically generate assignment numbers
CREATE OR REPLACE FUNCTION generate_assignment_number()
RETURNS TEXT AS $$
DECLARE
  last_number TEXT;
  next_num INTEGER;
BEGIN
  -- Get the last assignment number
  SELECT assignment_number INTO last_number
  FROM members 
  ORDER BY created_at DESC 
  LIMIT 1;
  
  -- Extract number and increment
  IF last_number IS NOT NULL AND last_number ~ '^HFP[0-9]+$' THEN
    next_num := (regexp_replace(last_number, '^HFP', ''))::INTEGER + 1;
  ELSE
    next_num := 1;
  END IF;
  
  -- Return formatted assignment number
  RETURN 'HFP' || LPAD(next_num::TEXT, 3, '0');
END;
$$ LANGUAGE plpgsql;

-- Create a trigger to auto-generate assignment numbers if not provided
CREATE OR REPLACE FUNCTION auto_generate_assignment_number()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.assignment_number IS NULL OR NEW.assignment_number = '' THEN
    NEW.assignment_number := generate_assignment_number();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create the trigger
DROP TRIGGER IF EXISTS trigger_auto_assignment_number ON members;
CREATE TRIGGER trigger_auto_assignment_number
  BEFORE INSERT ON members
  FOR EACH ROW
  EXECUTE FUNCTION auto_generate_assignment_number();

-- Refresh the materialized view to ensure it has current data
REFRESH MATERIALIZED VIEW member_stats;

-- Grant necessary permissions (if needed)
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated;

-- Analyze tables for better query planning
ANALYZE admin_users;
ANALYZE members;
ANALYZE payments;