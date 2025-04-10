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
        
        console.log('Initial auth session check:', session ? 'Session found' : 'No session');
        
        if (session?.user) {
          console.log('Setting user from session:', {
            id: session.user.id,
            email: session.user.email
          });
          setUser(session.user);
          
          // Also set display name if available in user metadata
          if (session.user.user_metadata?.display_name) {
            setDisplayName(session.user.user_metadata.display_name);
          }
        } else {
          // Check if we have stored email/password for anonymous user
          const email = localStorage.getItem('anonymousUserEmail');
          const password = localStorage.getItem('anonymousUserPassword');
          
          if (email && password) {
            console.log('Found stored credentials, trying to sign in');
            try {
              const { data, error } = await supabase.auth.signInWithPassword({
                email,
                password
              });
              
              if (error) {
                console.error('Error signing in with stored credentials:', error);
              } else if (data.user) {
                console.log('Signed in with stored credentials:', data.user);
                setUser(data.user);
                
                if (data.user.user_metadata?.display_name) {
                  setDisplayName(data.user.user_metadata.display_name);
                }
              }
            } catch (e) {
              console.error('Unexpected error during stored credential sign-in:', e);
            }
          }
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
        console.log('Auth state changed:', event, session ? 'Session exists' : 'No session');
        
        if (session?.user) {
          console.log('User authenticated:', {
            id: session.user.id,
            email: session.user.email
          });
          setUser(session.user);
          
          // Also set display name if available in user metadata
          if (session.user.user_metadata?.display_name) {
            setDisplayName(session.user.user_metadata.display_name);
          }
        } else {
          console.log('User signed out or session expired');
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
      
      console.log('Calling signInAnonymously...');
      // Sign in anonymously
      const { user, session } = await signInAnonymously();
      
      console.log('Received user from signInAnonymously:', user);
      if (!user) {
        const error = new Error('Failed to sign in anonymously - user is null');
        console.error(error);
        throw error;
      }
      
      console.log('Authenticated user with ID:', user.id);
      
      // Update user metadata with display name
      if (session) {
        try {
          const { error } = await supabase.auth.updateUser({
            data: { display_name: name }
          });
          
          if (error) {
            console.error('Error updating user metadata:', error);
          }
        } catch (e) {
          console.warn('Could not update user metadata:', e);
        }
      }
      
      // Set the user state with the newly authenticated user
      setUser(user);
      
      return user;
    } catch (err) {
      console.error('Error signing in:', err);
      if (err instanceof Error) {
        console.error('Error message:', err.message);
        console.error('Error stack:', err.stack);
      }
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