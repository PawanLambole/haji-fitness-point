/*
  # Create payments table

  1. New Tables
    - `payments`
      - `id` (uuid, primary key)
      - `member_id` (uuid, foreign key to members)
      - `amount` (decimal)
      - `payment_method` (enum: cash, upi)
      - `payment_date` (date)
      - `notes` (text, optional)
      - `created_at` (timestamp)
      - `created_by` (uuid, foreign key to admin_users)

  2. Security
    - Enable RLS on `payments` table
    - Add policy for authenticated admin users to manage payments
*/

-- Create enum for payment methods
CREATE TYPE payment_method AS ENUM ('cash', 'upi');

-- Create payments table
CREATE TABLE IF NOT EXISTS payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id uuid NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  amount decimal(10,2) NOT NULL,
  payment_method payment_method NOT NULL,
  payment_date date NOT NULL DEFAULT CURRENT_DATE,
  notes text,
  created_at timestamptz DEFAULT now(),
  created_by uuid REFERENCES admin_users(id)
);

-- Enable RLS
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Admin users can manage payments"
  ON payments
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admin_users
      WHERE id = auth.uid()
    )
  );

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_payments_member_id ON payments(member_id);
CREATE INDEX IF NOT EXISTS idx_payments_payment_date ON payments(payment_date);
CREATE INDEX IF NOT EXISTS idx_payments_payment_method ON payments(payment_method);