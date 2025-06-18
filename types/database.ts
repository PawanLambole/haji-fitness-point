export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      admin_users: {
        Row: {
          id: string
          email: string
          name: string
          role: 'owner' | 'manager'
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          email: string
          name: string
          role?: 'owner' | 'manager'
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          email?: string
          name?: string
          role?: 'owner' | 'manager'
          created_at?: string
          updated_at?: string
        }
      }
      members: {
        Row: {
          payment_method: string
          id: string
          assignment_number: string
          full_name: string
          phone_number: string
          joining_date: string
          membership_start: string
          membership_end: string
          total_amount: number
          discount_amount: number
          photo_url: string | null
          is_active: boolean
          created_at: string
          updated_at: string
          created_by: string | null
        }
        Insert: {
          id?: string
          assignment_number: string
          full_name: string
          phone_number: string
          joining_date?: string
          membership_start?: string
          membership_end: string
          total_amount?: number
          discount_amount?: number
          photo_url?: string | null
          is_active?: boolean
          created_at?: string
          updated_at?: string
          created_by?: string | null
        }
        Update: {
          id?: string
          assignment_number?: string
          full_name?: string
          phone_number?: string
          joining_date?: string
          membership_start?: string
          membership_end?: string
          total_amount?: number
          discount_amount?: number
          photo_url?: string | null
          is_active?: boolean
          created_at?: string
          updated_at?: string
          created_by?: string | null
        }
      }
      payments: {
        Row: {
          id: string
          member_id: string
          amount: number
          payment_method: 'cash' | 'upi'
          payment_date: string
          notes: string | null
          created_at: string
          created_by: string | null
        }
        Insert: {
          id?: string
          member_id: string
          amount: number
          payment_method: 'cash' | 'upi'
          payment_date?: string
          notes?: string | null
          created_at?: string
          created_by?: string | null
        }
        Update: {
          id?: string
          member_id?: string
          amount?: number
          payment_method?: 'cash' | 'upi'
          payment_date?: string
          notes?: string | null
          created_at?: string
          created_by?: string | null
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      admin_role: 'owner' | 'manager'
      payment_method: 'cash' | 'upi'
    }
  }
}