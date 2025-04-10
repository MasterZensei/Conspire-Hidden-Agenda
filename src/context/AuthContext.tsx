import React, { createContext, useContext, useEffect, useState } from 'react';
import { User } from '@supabase/supabase-js';
import { supabase, signInAnonymously, signOut } from '../lib/supabaseClient';

interface AuthContextProps {
  user: User | null;
  loading: boolean;
  error: Error | null;
  signIn: (displayName: string) => Promise<User>;
  logout: () => Promise<void>;
  displayName: string | null;
  setDisplayName: (name: string) => void;
}

const AuthContext = createContext<AuthContextProps | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [displayName, setDisplayName] = useState<string | null>(
    localStorage.getItem('displayName')
  );

  // Initial session check
  useEffect(() => {
    async function initializeAuth() {
      try {
        setLoading(true);
        
        // Check if we have a session
        const { data: { session } } = await supabase.auth.getSession();
        
        if (session?.user) {
          setUser(session.user);
        }
      } catch (err) {
        console.error('Error checking auth session:', err);
        setError(err as Error);
      } finally {
        setLoading(false);
      }
    }
    
    initializeAuth();
    
    // Subscribe to auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (session?.user) {
          setUser(session.user);
        } else {
          setUser(null);
        }
        setLoading(false);
      }
    );
    
    return () => {
      subscription.unsubscribe();
    };
  }, []);

  // Save display name to localStorage when it changes
  useEffect(() => {
    if (displayName) {
      localStorage.setItem('displayName', displayName);
    }
  }, [displayName]);

  // Sign in function (anonymous)
  const signIn = async (name: string) => {
    try {
      setLoading(true);
      
      // Store display name
      setDisplayName(name);
      
      // Sign in anonymously
      const { data: { user } } = await signInAnonymously();
      
      if (!user) {
        throw new Error('Failed to sign in anonymously');
      }
      
      return user;
    } catch (err) {
      console.error('Error signing in:', err);
      setError(err as Error);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // Log out function
  const logout = async () => {
    try {
      setLoading(true);
      await signOut();
      setUser(null);
    } catch (err) {
      console.error('Error signing out:', err);
      setError(err as Error);
      throw err;
    } finally {
      setLoading(false);
    }
  };
  
  const value = {
    user,
    loading,
    error,
    signIn,
    logout,
    displayName,
    setDisplayName
  };
  
  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

// Custom hook to use the auth context
export function useAuth() {
  const context = useContext(AuthContext);
  
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  
  return context;
} 