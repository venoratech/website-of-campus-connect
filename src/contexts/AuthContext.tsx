// contexts/AuthContext.tsx
'use client';
import { createContext, useContext, useEffect, useState } from 'react';
import { Session, User, AuthError } from '@supabase/supabase-js';
import { useRouter } from 'next/navigation';
import { supabase, Profile } from '@/lib/supabase';

// Define a type for user data
interface UserData {
  first_name?: string;
  last_name?: string;
  phone_number?: string;
  [key: string]: string | undefined;
}

type AuthContextType = {
  user: User | null;
  profile: Profile | null;
  session: Session | null;
  isLoading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: AuthError | null }>;
  signUp: (
    email: string, 
    password: string, 
    role: 'student' | 'vendor' | 'cashier' | 'admin',
    userData?: UserData
  ) => Promise<{ error: AuthError | Error | null }>;
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
          console.log('Found pending role update:', pendingRole, 'current role:', profile.role);
          try {
            // Try to update the profile with the intended role
            const { error: updateError } = await supabase
              .from('profiles')
              .update({ role: pendingRole })
              .eq('id', user.id);
              
            if (updateError) {
              console.error('Failed to update role directly:', updateError);
              
              // Try using RPC if direct update fails (assuming you've created this function)
              try {
                const { error: rpcError } = await supabase.rpc('update_user_role', {
                  user_id: user.id,
                  new_role: pendingRole
                });
                
                if (rpcError) {
                  console.error('Failed to update role via RPC:', rpcError);
                  throw rpcError;
                }
              } catch (rpcErr) {
                console.error('RPC call failed:', rpcErr);
              }
            }
              
            // Refresh profile data regardless of previous step results
            const { data } = await supabase
              .from('profiles')
              .select('*')
              .eq('id', user.id)
              .single();
              
            console.log('Updated profile:', data);
            setProfile(data);
            
            // Clear the pending role if successful
            if (data && data.role === pendingRole) {
              localStorage.removeItem('intended_role');
              console.log('Role updated successfully and pending role cleared');
            } else {
              console.log('Role still not updated correctly.');
            }
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

  const signUp = async (
    email: string, 
    password: string, 
    role: 'student' | 'vendor' | 'cashier' | 'admin',
    userData?: UserData
  ) => {
    try {
      console.log('Signing up with role:', role);
      
      // Store intended role in localStorage before signup
      localStorage.setItem('intended_role', role);
      
      // Prepare user metadata
      const metadata = {
        role: role,
        intended_role: role,
        // Default empty values if not provided
        first_name: '',
        last_name: '',
        phone_number: '',
        ...userData // Override with any provided userData
      };
      
      console.log('Signup metadata:', metadata);
      
      // Sign up the user
      const { data, error } = await supabase.auth.signUp({ 
        email, 
        password,
        options: {
          data: metadata
        }
      });
      
      if (error) {
        console.error('Signup error:', error);
        localStorage.removeItem('intended_role');
        return { error };
      }
      
      // Try multiple approaches to update the role and additional data
      if (data?.user) {
        console.log('User created:', data.user.id);
        
        try {
          // Wait briefly for the trigger to create the profile
          await new Promise(resolve => setTimeout(resolve, 1000));
          
          // Attempt #1: Upsert approach with all user data
          const profileData = {
            id: data.user.id,
            email,
            role,
            ...userData // Include additional fields like name and phone for cashiers
          };
          
          console.log('Upserting profile with data:', profileData);
          
          const { error: upsertError } = await supabase
            .from('profiles')
            .upsert(profileData, {
              onConflict: 'id',
              ignoreDuplicates: false
            });
            
          if (upsertError) {
            console.log('Upsert approach failed:', upsertError);
            
            // Attempt #2: Direct update as fallback
            const { error: updateError } = await supabase
              .from('profiles')
              .update(profileData)
              .eq('id', data.user.id);
              
            if (updateError) {
              console.log('Direct update failed:', updateError);
            } else {
              console.log('Direct update succeeded');
            }
          } else {
            console.log('Upsert succeeded');
          }
          
          // Attempt #3: Try RPC function if available
          if (role === 'cashier' || role === 'vendor') {
            try {
              const { error: rpcError } = await supabase.rpc('update_user_role', {
                user_id: data.user.id,
                new_role: role
              });
              
              if (rpcError) {
                console.log('RPC approach failed:', rpcError);
              } else {
                console.log('RPC update succeeded');
              }
            } catch (rpcErr) {
              console.log('RPC call error:', rpcErr);
            }
          }
          
        } catch (err) {
          console.error('Failed to update role during signup:', err);
          // We'll rely on localStorage approach on signin
        }
      }
      
      return { error: null };
    } catch (err) {
      console.error('Error during signup:', err);
      localStorage.removeItem('intended_role');
      return { error: err instanceof Error ? err : new Error('Unknown error during signup') };
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