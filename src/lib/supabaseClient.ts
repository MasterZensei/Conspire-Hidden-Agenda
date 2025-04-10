import { createClient } from '@supabase/supabase-js';

// Supabase environment variables
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

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

// Helper function to anonymously sign in
export const signInAnonymously = async () => {
  try {
    console.log('Attempting anonymous sign-in with Supabase...');
    const { data, error } = await supabase.auth.signInAnonymously();
    
    if (error) {
      console.error('Error signing in anonymously:', error);
      console.error('Error details:', {
        message: error.message,
        status: error.status,
        name: error.name
      });
      throw error;
    }
    
    console.log('Sign-in successful:', data);
    return { user: data.user, session: data.session };
  } catch (e) {
    console.error('Unexpected error during sign-in:', e);
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