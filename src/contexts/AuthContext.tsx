import React, { createContext, useContext, useEffect, useState } from 'react';
import { Session, User } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';

interface AuthContextValue {
  user: User | null;
  session: Session | null;
  isLoading: boolean;
  signInAnonymously: () => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    console.log('AuthContext: Initializing...');
    supabase.auth.getSession().then(async ({ data: { session }, error }) => {
      console.log('AuthContext: getSession result:', { session, error });
      if (error) {
        console.error('AuthContext: getSession error:', error);
      }

      // Auto sign in anonymously if no session exists
      if (!session) {
        console.log('AuthContext: No session found, signing in anonymously...');
        try {
          const { data, error: signInError } = await supabase.auth.signInAnonymously();
          console.log('AuthContext: Anonymous sign in result:', { data, error: signInError });
          if (signInError) throw signInError;
          setSession(data.session);
          setUser(data.session?.user ?? null);
        } catch (err) {
          console.error('AuthContext: Anonymous sign in failed:', err);
        }
      } else {
        setSession(session);
        setUser(session?.user ?? null);
      }
      setIsLoading(false);
    }).catch(err => {
      console.error('AuthContext: getSession exception:', err);
      setIsLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      console.log('AuthContext: Auth state changed:', _event, session);
      setSession(session);
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signInAnonymously = async () => {
    const { error } = await supabase.auth.signInAnonymously();
    if (error) throw error;
  };

  const signOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  };

  return (
    <AuthContext.Provider value={{ user, session, isLoading, signInAnonymously, signOut }}>
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
