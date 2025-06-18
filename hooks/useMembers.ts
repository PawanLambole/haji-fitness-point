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
      const limit = filters.limit || 50;
      
      // Build the query with optimizations
      let query = supabase
        .from('members')
        .select(`
          id,
          assignment_number,
          full_name,
          phone_number,
          joining_date,
          membership_start,
          membership_end,
          total_amount,
          discount_amount,
          photo_url,
          is_active,
          created_at,
          updated_at,
          created_by
        `)
        .order('created_at', { ascending: false })
        .range(currentOffset, currentOffset + limit - 1);

      // Apply filters
      if (filters.search) {
        query = query.or(`
          full_name.ilike.%${filters.search}%,
          assignment_number.ilike.%${filters.search}%,
          phone_number.ilike.%${filters.search}%
        `);
      }

      if (filters.isActive !== undefined) {
        query = query.eq('is_active', filters.isActive);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Error fetching members:', error);
        setError(error.message);
        return;
      }

      console.log(`Members fetched successfully: ${data?.length || 0} records`);
      
      if (reset) {
        setMembers(data || []);
      } else {
        setMembers(prev => [...prev, ...(data || [])]);
      }
      
      setHasMore((data?.length || 0) === limit);
      
    } catch (err) {
      const errorMessage = 'Failed to fetch members';
      setError(errorMessage);
      console.error('Error fetching members:', err);
    } finally {
      setIsLoading(false);
    }
  }, [user, session, filters.search, filters.isActive, filters.limit, filters.offset]);

  const addMember = async (memberData: MemberInsert): Promise<Member | null> => {
    try {
      console.log('Adding member with data:', memberData);
      console.log('Current user ID:', user?.id);
      
      if (!user?.id) {
        throw new Error('User not authenticated');
      }
      
      const insertData = {
        ...memberData,
        created_by: user.id,
      };
      
      console.log('Final insert data:', insertData);
      
      const { data, error } = await supabase
        .from('members')
        .insert(insertData)
        .select()
        .single();

      if (error) {
        console.error('Error adding member:', error);
        throw error;
      }

      console.log('Member added successfully:', data);
      
      setMembers(prev => [data, ...prev]);
      
      // Refresh member stats
      try {
        await supabase.rpc('refresh_member_stats');
      } catch (statsError) {
        console.warn('Failed to refresh member stats:', statsError);
      }
      
      return data;
    } catch (err) {
      console.error('Error adding member:', err);
      throw err;
    }
  };

  const updateMember = async (id: string, updates: MemberUpdate): Promise<Member | null> => {
    try {
      console.log('Updating member:', id, updates);
      
      const { data, error } = await supabase
        .from('members')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) {
        console.error('Error updating member:', error);
        throw error;
      }

      console.log('Member updated successfully:', data);
      setMembers(prev => prev.map(member => 
        member.id === id ? data : member
      ));
      return data;
    } catch (err) {
      console.error('Error updating member:', err);
      throw err;
    }
  };

  const deleteMember = async (id: string): Promise<void> => {
    try {
      console.log('Deleting member:', id);
      
      const { error } = await supabase
        .from('members')
        .delete()
        .eq('id', id);

      if (error) {
        console.error('Error deleting member:', error);
        throw error;
      }

      console.log('Member deleted successfully');
      setMembers(prev => prev.filter(member => member.id !== id));
      
      try {
        await supabase.rpc('refresh_member_stats');
      } catch (statsError) {
        console.warn('Failed to refresh member stats:', statsError);
      }
    } catch (err) {
      console.error('Error deleting member:', err);
      throw err;
    }
  };

  const generateAssignmentNumber = async (): Promise<string> => {
    try {
      console.log('Generating assignment number...');
      
      // Use the database function for consistent assignment number generation
      const { data, error } = await supabase.rpc('generate_assignment_number');

      if (error) {
        console.error('Error generating assignment number:', error);
        throw error;
      }

      console.log('Generated assignment number:', data);
      return data;
    } catch (err) {
      console.error('Error generating assignment number:', err);
      // Fallback to client-side generation
      try {
        const { data, error } = await supabase
          .from('members')
          .select('assignment_number')
          .order('created_at', { ascending: false })
          .limit(1)
          .single();

        if (error && error.code !== 'PGRST116') {
          throw error;
        }

        if (data?.assignment_number) {
          const match = data.assignment_number.match(/HFP(\d+)/);
          if (match) {
            const nextNumber = parseInt(match[1]) + 1;
            return `HFP${nextNumber.toString().padStart(3, '0')}`;
          }
        }

        return 'HFP001';
      } catch (fallbackError) {
        console.error('Fallback assignment number generation failed:', fallbackError);
        const timestamp = Date.now().toString().slice(-6);
        return `HFP${timestamp}`;
      }
    }
  };

  const loadMore = useCallback(() => {
    if (!isLoading && hasMore) {
      fetchMembers(false);
    }
  }, [isLoading, hasMore, fetchMembers]);

  const refresh = useCallback(() => {
    fetchMembers(true);
  }, [fetchMembers]);

  useEffect(() => {
    if (user && session) {
      console.log('User and session available, fetching members...');
      fetchMembers(true);
    } else {
      console.log('No user or session, skipping member fetch');
      setIsLoading(false);
    }
  }, [user, session, fetchMembers]);

  return {
    members,
    isLoading,
    error,
    hasMore,
    fetchMembers: refresh,
    addMember,
    updateMember,
    deleteMember,
    generateAssignmentNumber,
    loadMore,
    refresh,
  };
}