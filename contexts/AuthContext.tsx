import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { Session, User } from '@supabase/supabase-js';
import { Database } from '@/types/database';

type AdminUser = Database['public']['Tables']['admin_users']['Row'];

interface AuthContextType {
  admin: AdminUser | null;
  user: User | null;
  session: Session | null;
  isLoading: boolean;
  isOwner: boolean;
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => Promise<void>;
  refreshAdmin: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [admin, setAdmin] = useState<AdminUser | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isOwner, setIsOwner] = useState(false);
  const isMountedRef = useRef(true);

  useEffect(() => {
    isMountedRef.current = true;

    // Initialize auth state
    const initializeAuth = async () => {
      if (!isMountedRef.current) return;
      setIsLoading(true);
      try {
        console.log('Initializing auth...');
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error('Auth initialization error:', error);
          throw error;
        }
        
        console.log('Session retrieved:', session ? 'Found' : 'None');
        
        if (!isMountedRef.current) return;
        setSession(session);
        setUser(session?.user ?? null);
        
        if (session?.user) {
          console.log('Fetching admin profile for user:', session.user.id);
          await fetchAdminProfile(session.user.id);
        }
      } catch (error) {
        console.error('Auth initialization error:', error);
      } finally {
        if (isMountedRef.current) {
          setIsLoading(false);
        }
      }
    };

    initializeAuth();

    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('Auth state changed:', event, session ? 'Session exists' : 'No session');
        
        if (!isMountedRef.current) return;
        
        setSession(session);
        setUser(session?.user ?? null);
        
        if (session?.user) {
          await fetchAdminProfile(session.user.id);
        } else {
          if (isMountedRef.current) {
            setAdmin(null);
            setIsOwner(false);
          }
        }
        
        // Set loading to false after auth state change is processed
        if (isMountedRef.current) {
          setIsLoading(false);
        }
      }
    );

    return () => {
      isMountedRef.current = false;
      subscription.unsubscribe();
    };
  }, []);

  const fetchAdminProfile = async (userId: string) => {
    if (!isMountedRef.current) return;
    
    try {
      console.log('Fetching admin profile for user ID:', userId);
      
      const { data, error } = await supabase
        .from('admin_users')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) {
        console.error('Error fetching admin profile:', error);
        throw error;
      }

      console.log('Admin profile fetched:', data);

      if (isMountedRef.current) {
        setAdmin(data);
        setIsOwner(data?.role === 'owner');
      }
    } catch (error) {
      console.error('Error fetching admin profile:', error);
      if (isMountedRef.current) {
        setAdmin(null);
        setIsOwner(false);
      }
    }
  };

  const refreshAdmin = async () => {
    if (user?.id && isMountedRef.current) {
      await fetchAdminProfile(user.id);
    }
  };

  const login = async (email: string, password: string): Promise<boolean> => {
    if (!isMountedRef.current) return false;
    setIsLoading(true);
    try {
      console.log('Attempting login for:', email);
      
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        console.error('Login error:', error);
        throw error;
      }

      console.log('Login successful');
      return true;
    } catch (error) {
      console.error('Login error:', error);
      return false;
    } finally {
      if (isMountedRef.current) {
        setIsLoading(false);
      }
    }
  };

  const logout = async () => {
    if (!isMountedRef.current) return;
    
    try {
      console.log('Starting logout process...');
      
      // Clear local state first
      if (isMountedRef.current) {
        setAdmin(null);
        setUser(null);
        setSession(null);
        setIsOwner(false);
        setIsLoading(false);
      }
      
      // Then sign out from Supabase
      const { error } = await supabase.auth.signOut();
      if (error) {
        console.error('Supabase signOut error:', error);
        // Don't throw here - we've already cleared local state
      }
      
      console.log('Logout completed successfully');
    } catch (error) {
      console.error('Logout error:', error);
      // Ensure local state is cleared even if there's an error
      if (isMountedRef.current) {
        setAdmin(null);
        setUser(null);
        setSession(null);
        setIsOwner(false);
        setIsLoading(false);
      }
    }
  };

  const value = {
    admin,
    user,
    session,
    isLoading,
    isOwner,
    login,
    logout,
    refreshAdmin,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}