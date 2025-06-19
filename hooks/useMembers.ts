import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { Database } from '@/types/database';
import { useAuth } from '@/contexts/AuthContext';

type Member = Database['public']['Tables']['members']['Row'];
type MemberInsert = Database['public']['Tables']['members']['Insert'];
type MemberUpdate = Database['public']['Tables']['members']['Update'];

interface MemberFilters {
  search?: string;
  isActive?: boolean;
  limit?: number;
  offset?: number;
}

export function useMembers(filters: MemberFilters = {}) {
  const [members, setMembers] = useState<Member[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const { user, session } = useAuth();

  const generateAssignmentNumber = async (): Promise<string> => {
    try {
      // Get the current year
      const currentYear = new Date().getFullYear();
      
      // Get the last member's assignment number for the current year
      const { data: latestMembers, error: countError } = await supabase
        .from('members')
        .select('assignment_number')
        .ilike('assignment_number', `${currentYear}%`)
        .order('assignment_number', { ascending: false })
        .limit(1);

      if (countError) throw countError;

      let sequence = 1;
      if (latestMembers && latestMembers.length > 0) {
        // Extract the sequence number from the last assignment number
        const lastNumber = latestMembers[0].assignment_number;
        const lastSequence = parseInt(lastNumber.substring(4));
        sequence = lastSequence + 1;
      }

      // Format: YYYY001, YYYY002, etc.
      return `${currentYear}${sequence.toString().padStart(3, '0')}`;
    } catch (error) {
      console.error('Error generating assignment number:', error);
      throw error;
    }
  };

  const addMember = async (memberData: Omit<MemberInsert, 'id' | 'assignment_number' | 'created_by'>) => {
    try {
      if (!user) throw new Error('No user available');

      const assignmentNumber = await generateAssignmentNumber();
      
      const { data, error } = await supabase
        .from('members')
        .insert({
          ...memberData,
          assignment_number: assignmentNumber,
          created_by: user.id,
          is_active: true
        })
        .select()
        .single();

      if (error) throw error;

      setMembers(prev => [data, ...prev]);
      return data;
    } catch (error) {
      console.error('Error adding member:', error);
      throw error;
    }
  };

  const fetchMembers = useCallback(async (reset: boolean = false) => {
    try {
      if (!user || !session) {
        console.log('No user or session available');
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      setError(null);
      
      console.log('Fetching members with filters:', filters);
      
      const currentOffset = reset ? 0 : (filters.offset || 0);
      const limit = filters.limit || 20;
      
      // Build the query with optimizations
      let query = supabase
        .from('members')
        .select('*')
        .order('created_at', { ascending: false });

      // Search by assignment_number or name
      if (filters.search) {
        const searchTerm = `%${filters.search}%`;
        query = query.or(`assignment_number.ilike.${searchTerm},full_name.ilike.${searchTerm}`);
      }

      // Apply active filter
      if (typeof filters.isActive === 'boolean') {
        query = query.eq('is_active', filters.isActive);
      }

      // Apply pagination
      query = query
        .range(currentOffset, currentOffset + limit - 1)
        .limit(limit);

      const { data, error: apiError } = await query;

      if (apiError) throw apiError;

      setMembers(prevMembers => reset ? (data || []) : [...prevMembers, ...(data || [])]);
      setHasMore((data || []).length === limit);
      setError(null);
    } catch (err: any) {
      console.error('Error fetching members:', err);
      setError(err.message || 'Failed to fetch members');
    } finally {
      setIsLoading(false);
    }
  }, [filters, user, session]);

  const loadMore = useCallback(() => {
    if (!isLoading && hasMore) {
      const currentOffset = members.length;
      const newFilters = { ...filters, offset: currentOffset };
      fetchMembers();
    }
  }, [isLoading, hasMore, members.length, filters, fetchMembers]);

  useEffect(() => {
    fetchMembers(true);
  }, [filters.search, filters.isActive]);

  const deleteMember = async (memberId: string) => {
    try {
      const { error } = await supabase
        .from('members')
        .delete()
        .eq('id', memberId);

      if (error) throw error;
      
      setMembers(prevMembers => prevMembers.filter(m => m.id !== memberId));
      return true;
    } catch (error) {
      console.error('Error deleting member:', error);
      return false;
    }
  };

  return {
    members,
    isLoading,
    error,
    hasMore,
    loadMore,
    refresh: () => fetchMembers(true),
    deleteMember,
    addMember,
    generateAssignmentNumber
  };
}