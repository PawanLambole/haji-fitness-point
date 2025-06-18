import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Database } from '@/types/database';
import { useAuth } from '@/contexts/AuthContext';

type Payment = Database['public']['Tables']['payments']['Row'];
type PaymentInsert = Database['public']['Tables']['payments']['Insert'];

export function usePayments() {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();

  const fetchPayments = async (memberId?: string) => {
    try {
      setIsLoading(true);
      setError(null);
      
      let query = supabase
        .from('payments')
        .select('*')
        .order('payment_date', { ascending: false });

      if (memberId) {
        query = query.eq('member_id', memberId);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Error fetching payments:', error);
        setError(error.message);
        return;
      }

      setPayments(data || []);
    } catch (err) {
      const errorMessage = 'Failed to fetch payments';
      setError(errorMessage);
      console.error('Error fetching payments:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const addPayment = async (paymentData: PaymentInsert): Promise<Payment | null> => {
    try {
      console.log('Adding payment with data:', paymentData);
      
      const { data, error } = await supabase
        .from('payments')
        .insert({
          ...paymentData,
          created_by: user?.id,
        })
        .select()
        .single();

      if (error) {
        console.error('Error adding payment:', error);
        throw error;
      }

      console.log('Payment added successfully:', data);
      setPayments(prev => [data, ...prev]);
      return data;
    } catch (err) {
      console.error('Error adding payment:', err);
      throw err;
    }
  };

  const getPaymentStats = async () => {
    try {
      const { data, error } = await supabase
        .from('payments')
        .select('amount, payment_method, payment_date');

      if (error) {
        console.error('Error getting payment stats:', error);
        throw error;
      }

      const currentMonth = new Date().getMonth();
      const currentYear = new Date().getFullYear();

      const thisMonthPayments = data.filter(payment => {
        const paymentDate = new Date(payment.payment_date);
        return paymentDate.getMonth() === currentMonth && 
               paymentDate.getFullYear() === currentYear;
      });

      const totalRevenue = thisMonthPayments.reduce((sum, payment) => sum + payment.amount, 0);
      const cashPayments = thisMonthPayments.filter(p => p.payment_method === 'cash').length;
      const upiPayments = thisMonthPayments.filter(p => p.payment_method === 'upi').length;

      return {
        totalRevenue,
        totalPayments: thisMonthPayments.length,
        cashPayments,
        upiPayments,
      };
    } catch (err) {
      console.error('Error getting payment stats:', err);
      return {
        totalRevenue: 0,
        totalPayments: 0,
        cashPayments: 0,
        upiPayments: 0,
      };
    }
  };

  useEffect(() => {
    if (user) {
      fetchPayments();
    }
  }, [user]);

  return {
    payments,
    isLoading,
    error,
    fetchPayments,
    addPayment,
    getPaymentStats,
  };
}