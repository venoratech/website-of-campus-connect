'use client';
import { createContext, useContext, useEffect, useState } from 'react';
import { Session, User } from '@supabase/supabase-js';
import { useRouter } from 'next/navigation';
import { supabase, Profile } from '@/lib/supabase';

type AuthContextType = {
  user: User | null;
  profile: Profile | null;
  session: Session | null;
  isLoading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  signUp: (email: string, password: string, role: 'student' | 'vendor' | 'admin') => Promise<{ error: any }>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  // Check if user has pending role update from localStorage
  useEffect(() => {
    const checkPendingRoleUpdate = async () => {
      // Only run this if we have a logged-in user and profile
      if (user && profile) {
        const pendingRole = localStorage.getItem('intended_role');
        
        // If there's a pending role and it doesn't match current role
        if (pendingRole && profile.role !== pendingRole) {
          try {
            // Try to update the profile with the intended role
            await supabase
              .from('profiles')
              .update({ role: pendingRole })
              .eq('id', user.id);
              
            // Refresh profile data
            const { data } = await supabase
              .from('profiles')
              .select('*')
              .eq('id', user.id)
              .single();
              
            setProfile(data);
            
            // Clear the pending role if successful
            localStorage.removeItem('intended_role');
          } catch (error) {
            console.error('Failed to apply pending role update:', error);
          }
        }
      }
    };
    
    checkPendingRoleUpdate();
  }, [user, profile]);

  useEffect(() => {
    const setData = async () => {
      const { data: { session }, error } = await supabase.auth.getSession();
      if (error) {
        console.error(error);
        setIsLoading(false);
        return;
      }
      
      setSession(session);
      setUser(session?.user || null);
      
      if (session?.user) {
        const { data: profileData } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', session.user.id)
          .single();
          
        setProfile(profileData);
      }
      
      setIsLoading(false);
    };
    
    setData();
    
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setUser(session?.user || null);
      
      if (session?.user) {
        supabase
          .from('profiles')
          .select('*')
          .eq('id', session.user.id)
          .single()
          .then(({ data }) => {
            setProfile(data);
          });
      } else {
        setProfile(null);
      }
    });
    
    return () => subscription.unsubscribe();
  }, []);

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (!error) {
      router.push('/dashboard');
    }
    return { error };
  };

  const signUp = async (email: string, password: string, role: 'student' | 'vendor' | 'admin') => {
    try {
      // Store intended role in localStorage before signup
      localStorage.setItem('intended_role', role);
      
      // Sign up the user
      const { data, error } = await supabase.auth.signUp({ 
        email, 
        password,
        options: {
          data: { role }
        }
      });
      
      if (error) {
        localStorage.removeItem('intended_role');
        return { error };
      }
      
      // Try multiple approaches to update the role
      if (data?.user) {
        try {
          // Attempt #1: Direct update (might fail due to RLS)
          const { error: updateError } = await supabase
            .from('profiles')
            .update({ role })
            .eq('id', data.user.id);
            
          if (updateError) {
            console.log('Direct update failed, will try after signin:', updateError);
          }
          
          // Attempt #2: Upsert approach (might work better)
          const { error: upsertError } = await supabase
            .from('profiles')
            .upsert({
              id: data.user.id,
              email,
              role
            }, {
              onConflict: 'id',
              ignoreDuplicates: false
            });
            
          if (upsertError) {
            console.log('Upsert approach failed, will try after signin:', upsertError);
          }
        } catch (err) {
          console.error('Failed to update role:', err);
          // We'll rely on localStorage approach on signin
        }
      }
      
      return { error: null };
    } catch (err) {
      console.error('Error during signup:', err);
      localStorage.removeItem('intended_role');
      return { error: err };
    }
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    router.push('/login');
  };

  return (
    <AuthContext.Provider value={{ user, profile, session, isLoading, signIn, signUp, signOut }}>
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