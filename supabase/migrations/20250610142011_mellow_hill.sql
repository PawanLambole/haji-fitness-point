/*
  # Create members table

  1. New Tables
    - `members`
      - `id` (uuid, primary key)
      - `assignment_number` (text, unique)
      - `full_name` (text)
      - `phone_number` (text)
      - `joining_date` (date)
      - `membership_start` (date)
      - `membership_end` (date)
      - `total_amount` (decimal)
      - `discount_amount` (decimal, default 0)
      - `photo_url` (text, optional)
      - `is_active` (boolean, default true)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)
      - `created_by` (uuid, foreign key to admin_users)

  2. Security
    - Enable RLS on `members` table
    - Add policy for authenticated admin users to manage members
*/

-- Create members table
CREATE TABLE IF NOT EXISTS members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  assignment_number text UNIQUE NOT NULL,
  full_name text NOT NULL,
  phone_number text NOT NULL,
  joining_date date NOT NULL DEFAULT CURRENT_DATE,
  membership_start date NOT NULL DEFAULT CURRENT_DATE,
  membership_end date NOT NULL,
  total_amount decimal(10,2) NOT NULL DEFAULT 0,
  discount_amount decimal(10,2) NOT NULL DEFAULT 0,
  photo_url text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  created_by uuid REFERENCES admin_users(id)
);

-- Enable RLS
ALTER TABLE members ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Admin users can manage members"
  ON members
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admin_users
      WHERE id = auth.uid()
    )
  );

-- Create trigger for updated_at
CREATE TRIGGER members_updated_at
  BEFORE UPDATE ON members
  FOR EACH ROW
  EXECUTE FUNCTION handle_updated_at();

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_members_assignment_number ON members(assignment_number);
CREATE INDEX IF NOT EXISTS idx_members_phone_number ON members(phone_number);
CREATE INDEX IF NOT EXISTS idx_members_is_active ON members(is_active);
CREATE INDEX IF NOT EXISTS idx_members_membership_end ON members(membership_end);