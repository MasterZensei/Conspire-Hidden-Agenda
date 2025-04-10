import { createClient, User } from '@supabase/supabase-js';

// Supabase environment variables
export const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
export const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl) {
  throw new Error("VITE_SUPABASE_URL is not defined in .env");
}
if (!supabaseAnonKey) {
  throw new Error("VITE_SUPABASE_ANON_KEY is not defined in .env");
}

// Define database types
export type Database = {
  public: {
    Tables: {
      lobbies: {
        Row: {
          id: string;
          name: string;
          created_at: string;
          host_id: string;
          max_players: number;
          active: boolean;
          game_settings: GameSettings;
          current_game_state: GameState | null;
        };
        Insert: {
          id?: string;
          name: string;
          created_at?: string;
          host_id: string;
          max_players: number;
          active?: boolean;
          game_settings: GameSettings;
          current_game_state?: GameState | null;
        };
        Update: {
          id?: string;
          name?: string;
          created_at?: string;
          host_id?: string;
          max_players?: number;
          active?: boolean;
          game_settings?: GameSettings;
          current_game_state?: GameState | null;
        };
      };
      players: {
        Row: {
          id: string;
          user_id: string;
          lobby_id: string;
          display_name: string;
          created_at: string;
          coins: number;
          cards: Card[];
          allegiance?: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          lobby_id: string;
          display_name: string;
          created_at?: string;
          coins?: number;
          cards?: Card[];
          allegiance?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          lobby_id?: string;
          display_name?: string;
          created_at?: string;
          coins?: number;
          cards?: Card[];
          allegiance?: string;
        };
      };
      game_actions: {
        Row: {
          id: string;
          created_at: string;
          game_id: string;
          player_id: string;
          action_type: string;
          target_player_id?: string;
          resolved: boolean;
          successful?: boolean;
          challenged?: boolean;
          challenger_id?: string;
          blocked?: boolean;
          blocker_id?: string;
        };
        Insert: {
          id?: string;
          created_at?: string;
          game_id: string;
          player_id: string;
          action_type: string;
          target_player_id?: string;
          resolved?: boolean;
          successful?: boolean;
          challenged?: boolean;
          challenger_id?: string;
          blocked?: boolean;
          blocker_id?: string;
        };
        Update: {
          id?: string;
          created_at?: string;
          game_id?: string;
          player_id?: string;
          action_type?: string;
          target_player_id?: string;
          resolved?: boolean;
          successful?: boolean;
          challenged?: boolean;
          challenger_id?: string;
          blocked?: boolean;
          blocker_id?: string;
        };
      };
    };
  };
};

// Type definitions for game entities
export type CardType = 'duke' | 'assassin' | 'captain' | 'ambassador' | 'contessa' | 'inquisitor';

export type Card = {
  type: CardType;
  revealed: boolean;
};

export type Player = {
  id: string;
  user_id: string;
  display_name: string;
  displayName: string;
  coins: number;
  cards: Card[];
  eliminated: boolean;
  allegiance?: 'loyalist' | 'reformist'; // For Reformation expansion
};

export type GameSettings = {
  expansions: {
    reformation: boolean;
    inquisitor: boolean;
    anarchy: boolean;
  };
  startingCoins: number;
  maxPlayers: number;
};

export type GameState = {
  status: 'waiting' | 'in_progress' | 'completed';
  deck: CardType[];
  currentPlayerIndex: number;
  players: Player[];
  currentAction: {
    type: string;
    player: string;
    target?: string;
    blockable: boolean;
    challengeable: boolean;
  } | null;
  lastAction: {
    type: string;
    player: string;
    target?: string;
    result: 'success' | 'failed' | 'challenged' | 'blocked';
  } | null;
  winner: string | null;
};

// Initialize Supabase client
export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey);

// Helper function to sign in with magic link
export const signInWithEmail = async (email: string) => {
  try {
    console.log('Attempting sign-in with email:', email);
    const { data, error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: window.location.origin,
      },
    });
    
    if (error) {
      console.error('Error signing in with email:', error);
      console.error('Error details:', {
        message: error.message,
        status: error.status,
        name: error.name
      });
      throw error;
    }
    
    console.log('Sign-in email sent successfully:', data);
    return data;
  } catch (e) {
    console.error('Unexpected error during sign-in:', e);
    throw e;
  }
};

// Original anonymous sign-in (keep for backwards compatibility)
export const signInAnonymously = async () => {
  try {
    console.log('Setting up anonymous authentication...');
    
    // Generate random ID for demo user
    const randomId = Math.random().toString(36).substring(2, 11);
    const timestamp = Date.now();
    // Use a real test email domain that accepts any incoming email
    const email = `test-${randomId}-${timestamp}@mailinator.com`;
    const password = `Password${randomId}${timestamp}`;
    
    console.log(`Creating anonymous user with email: ${email}`);
    
    // Use Supabase's standard sign-up
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          display_name: 'Demo User'
        }
      }
    });
    
    if (error) {
      console.error('Error with sign-up:', error);
      throw error;
    }
    
    if (!data.user) {
      console.error('No user returned from sign-up');
      throw new Error('Failed to sign up');
    }
    
    console.log('Created user:', data.user);
    
    // Store email and password in localStorage for later use
    try {
      localStorage.setItem('anonymousUserEmail', email);
      localStorage.setItem('anonymousUserPassword', password);
    } catch (e) {
      console.warn('Could not store credentials in localStorage', e);
    }
    
    return { user: data.user, session: data.session };
  } catch (e) {
    console.error('Unexpected error during sign-up:', e);
    throw e;
  }
};

// Get the current user
export const getCurrentUser = async () => {
  const { data } = await supabase.auth.getUser();
  return data?.user;
};

// Check if user is signed in
export const isSignedIn = async () => {
  const user = await getCurrentUser();
  return !!user;
};

// Sign out the current user
export const signOut = async () => {
  const { error } = await supabase.auth.signOut();
  
  if (error) {
    console.error('Error signing out:', error);
    throw error;
  }
};

// Storage for local game data when Supabase isn't available
export const localGameStorage = {
  lobbies: [] as any[],
  
  // Create a lobby locally
  createLobby: (name: string, hostId: string, settings: GameSettings, displayName: string) => {
    try {
      const lobbyId = Math.random().toString(36).substring(2, 12);
      
      const newLobby = {
        id: lobbyId,
        name,
        host_id: hostId,
        max_players: settings.maxPlayers,
        active: true,
        game_settings: settings,
        current_game_state: null,
        created_at: new Date().toISOString(),
        players: [{
          id: Math.random().toString(36).substring(2, 12),
          user_id: hostId,
          lobby_id: lobbyId,
          display_name: displayName,
          created_at: new Date().toISOString(),
          coins: 0,
          cards: []
        }]
      };
      
      // Add to local storage
      const lobbies = JSON.parse(localStorage.getItem('lobbies') || '[]');
      lobbies.push(newLobby);
      localStorage.setItem('lobbies', JSON.stringify(lobbies));
      
      console.log('Created local lobby:', newLobby);
      return newLobby;
    } catch (e) {
      console.error('Error creating local lobby:', e);
      throw e;
    }
  }
};

// Direct database functions with edge functions
export const createLobbyDirectly = async (
  lobbyName: string,
  hostId: string,
  settings: GameSettings,
  displayName: string
) => {
  try {
    // Just use the local storage version since the edge function doesn't exist
    return localGameStorage.createLobby(lobbyName, hostId, settings, displayName);
  } catch (e) {
    console.error('Error creating lobby:', e);
    throw e;
  }
}; 