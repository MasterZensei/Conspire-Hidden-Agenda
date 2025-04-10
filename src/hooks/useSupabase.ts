import { useCallback, useEffect, useState } from 'react';
import { supabase, GameSettings, GameState, Player, supabaseUrl, supabaseAnonKey } from '../lib/supabaseClient';

// Hook for managing lobbies
export function useLobbies() {
  const [lobbies, setLobbies] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  // Fetch all available lobbies
  const fetchLobbies = useCallback(async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('lobbies')
        .select('*')
        .eq('active', true);

      if (error) throw error;
      setLobbies(data || []);
    } catch (err) {
      setError(err as Error);
      console.error('Error fetching lobbies:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  // Create a new lobby
  const createLobby = useCallback(async (
    name: string, 
    hostId: string, 
    settings: GameSettings,
    metadata?: { displayName?: string; userId?: string }
  ) => {
    try {
      console.log('Creating lobby with host ID:', hostId);
      console.log('Lobby settings:', settings);
      console.log('User metadata:', metadata);
      
      // Ensure we have a valid session
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      if (sessionError) throw sessionError;
      if (!session) {
        throw new Error('No active session. Please sign in again.');
      }
      
      // Generate a proper UUID using crypto.randomUUID()
      const lobbyId = crypto.randomUUID();
      console.log('Generated lobbyId:', lobbyId);
      
      // Create lobby record in Supabase
      console.log('Attempting to create lobby with insert');
      const { data, error } = await supabase
        .from('lobbies')
        .insert({
          id: lobbyId,
          name,
          host_id: hostId,
          max_players: settings.maxPlayers,
          active: true,
          game_settings: settings,
          current_game_state: null
        })
        .select()
        .single();

      if (error) {
        console.error('Supabase error creating lobby:', error);
        
        // If RLS policy issues, try to create directly with our permissions
        console.log('Trying direct API request to bypass RLS...');
        
        // Direct REST API call with session token
        const response = await fetch(`${supabaseUrl}/rest/v1/lobbies`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'apikey': supabaseAnonKey,
            'Authorization': `Bearer ${session.access_token}`,
            'Prefer': 'return=representation'
          },
          body: JSON.stringify({
            id: lobbyId,
            name,
            host_id: hostId,
            max_players: settings.maxPlayers,
            active: true,
            game_settings: settings,
            current_game_state: null
          })
        });
        
        if (!response.ok) {
          const errorText = await response.text();
          console.error('Direct API request failed:', errorText);
          throw new Error(`Failed to create lobby: ${response.statusText}`);
        }
        
        const responseData = await response.json();
        console.log('Created lobby via direct API:', responseData);
        
        // Also add host as a player with session token
        try {
          await fetch(`${supabaseUrl}/rest/v1/players`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'apikey': supabaseAnonKey,
              'Authorization': `Bearer ${session.access_token}`
            },
            body: JSON.stringify({
              user_id: hostId,
              lobby_id: lobbyId,
              display_name: metadata?.displayName || 'Host',
              coins: 0,
              cards: []
            })
          });
          
          console.log('Added host as player via direct API');
        } catch (playerErr) {
          console.warn('Error adding host as player via direct API:', playerErr);
        }
        
        return responseData[0] || responseData;
      }
      
      console.log('Lobby created successfully:', data);
      
      // Also add host as a player
      try {
        const { error: playerError } = await supabase
          .from('players')
          .insert({
            user_id: hostId,
            lobby_id: lobbyId,
            display_name: metadata?.displayName || 'Host',
            coins: 0,
            cards: []
          });
        
        if (playerError) {
          console.warn('Could not add host as player:', playerError);
        } else {
          console.log('Added host as player');
        }
      } catch (playerErr) {
        console.warn('Error adding host as player:', playerErr);
      }
      
      return data;
    } catch (err) {
      console.error('Error creating lobby:', err);
      if (err instanceof Error) {
        console.error('Error message:', err.message);
        console.error('Error name:', err.name);
        console.error('Error stack:', err.stack);
      }
      throw err;
    }
  }, []);

  // Function to join a lobby
  const joinLobby = async (lobbyId: string, userId: string, displayName: string) => {
    console.log(`Joining lobby ${lobbyId} with user ${userId} as ${displayName}`);
    
    try {
      // First, check if the player is already in the lobby
      const { data: existingPlayer } = await supabase
        .from('players')
        .select('*')
        .eq('lobby_id', lobbyId)
        .eq('user_id', userId)
        .maybeSingle();
      
      if (existingPlayer) {
        console.log('Player already in lobby, returning existing player', existingPlayer);
        return existingPlayer;
      }
      
      // Create a new player in the lobby
      const { data: player, error } = await supabase
        .from('players')
        .insert({
          user_id: userId,
          lobby_id: lobbyId,
          display_name: displayName,
          coins: 0,
          cards: []
        })
        .select()
        .single();
      
      if (error) {
        console.error('Error joining lobby with RLS:', error);
        
        // Fallback to direct API call if RLS policies prevent joining
        const response = await fetch(`${supabaseUrl}/rest/v1/players`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'apikey': supabaseAnonKey,
            'Authorization': `Bearer ${supabaseAnonKey}`,
            'Prefer': 'return=representation'
          },
          body: JSON.stringify({
            user_id: userId,
            lobby_id: lobbyId,
            display_name: displayName,
            coins: 0,
            cards: []
          })
        });
        
        if (!response.ok) {
          throw new Error('Failed to join lobby via direct API call');
        }
        
        const responseData = await response.json();
        console.log('Joined lobby via direct API call:', responseData[0]);
        return responseData[0];
      }
      
      console.log('Joined lobby with RLS:', player);
      return player;
    } catch (error) {
      console.error('Error joining lobby:', error);
      throw error;
    }
  };

  // Set up real-time subscription for lobbies
  useEffect(() => {
    fetchLobbies();

    const subscription = supabase
      .channel('lobbies_channel')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'lobbies' }, (payload) => {
        console.log('Lobby change received:', payload);
        fetchLobbies();
      })
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [fetchLobbies]);

  return {
    lobbies,
    loading,
    error,
    fetchLobbies,
    createLobby,
    joinLobby
  };
}

// Hook for managing a specific lobby
export function useLobby(lobbyId: string) {
  const [lobby, setLobby] = useState<any | null>(null);
  const [players, setPlayers] = useState<Player[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  // Fetch lobby data
  const fetchLobby = useCallback(async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('lobbies')
        .select('*')
        .eq('id', lobbyId)
        .single();

      if (error) throw error;
      setLobby(data);
    } catch (err) {
      setError(err as Error);
      console.error('Error fetching lobby:', err);
    } finally {
      setLoading(false);
    }
  }, [lobbyId]);

  // Fetch players in the lobby
  const fetchPlayers = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('players')
        .select('*')
        .eq('lobby_id', lobbyId);

      if (error) throw error;
      setPlayers(data as Player[]);
    } catch (err) {
      console.error('Error fetching players:', err);
    }
  }, [lobbyId]);

  // Start the game
  const startGame = useCallback(async (initialGameState: GameState) => {
    try {
      const { data, error } = await supabase
        .from('lobbies')
        .update({ current_game_state: initialGameState })
        .eq('id', lobbyId)
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (err) {
      console.error('Error starting game:', err);
      throw err;
    }
  }, [lobbyId]);

  // Update game state
  const updateGameState = useCallback(async (newGameState: GameState) => {
    try {
      const { data, error } = await supabase
        .from('lobbies')
        .update({ current_game_state: newGameState })
        .eq('id', lobbyId)
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (err) {
      console.error('Error updating game state:', err);
      throw err;
    }
  }, [lobbyId]);

  // Set up real-time subscriptions
  useEffect(() => {
    fetchLobby();
    fetchPlayers();

    // Subscribe to lobby changes
    const lobbySubscription = supabase
      .channel(`lobby_${lobbyId}`)
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'lobbies', filter: `id=eq.${lobbyId}` }, 
        (payload) => {
          console.log('Lobby update received:', payload);
          fetchLobby();
        }
      )
      .subscribe();

    // Subscribe to player changes
    const playersSubscription = supabase
      .channel(`lobby_players_${lobbyId}`)
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'players', filter: `lobby_id=eq.${lobbyId}` }, 
        (payload) => {
          console.log('Players update received:', payload);
          fetchPlayers();
        }
      )
      .subscribe();

    return () => {
      lobbySubscription.unsubscribe();
      playersSubscription.unsubscribe();
    };
  }, [lobbyId, fetchLobby, fetchPlayers]);

  return {
    lobby,
    players,
    loading,
    error,
    startGame,
    updateGameState
  };
}

// Hook for tracking game actions
export function useGameActions(gameId: string) {
  const [actions, setActions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  // Fetch all actions for this game
  const fetchActions = useCallback(async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('game_actions')
        .select('*')
        .eq('game_id', gameId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      setActions(data || []);
    } catch (err) {
      setError(err as Error);
      console.error('Error fetching game actions:', err);
    } finally {
      setLoading(false);
    }
  }, [gameId]);

  // Create a new game action
  const createAction = useCallback(async (
    playerId: string, 
    actionType: string, 
    targetPlayerId?: string
  ) => {
    try {
      const { data, error } = await supabase
        .from('game_actions')
        .insert({
          game_id: gameId,
          player_id: playerId,
          action_type: actionType,
          target_player_id: targetPlayerId,
          resolved: false
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (err) {
      console.error('Error creating game action:', err);
      throw err;
    }
  }, [gameId]);

  // Update an action (e.g., after resolution)
  const updateAction = useCallback(async (
    actionId: string, 
    updates: {
      resolved?: boolean;
      successful?: boolean;
      challenged?: boolean;
      challenger_id?: string;
      blocked?: boolean;
      blocker_id?: string;
    }
  ) => {
    try {
      const { data, error } = await supabase
        .from('game_actions')
        .update(updates)
        .eq('id', actionId)
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (err) {
      console.error('Error updating game action:', err);
      throw err;
    }
  }, []);

  // Set up real-time subscription
  useEffect(() => {
    fetchActions();

    const subscription = supabase
      .channel(`game_actions_${gameId}`)
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'game_actions', filter: `game_id=eq.${gameId}` }, 
        (payload) => {
          console.log('Game action update received:', payload);
          fetchActions();
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [gameId, fetchActions]);

  return {
    actions,
    loading,
    error,
    createAction,
    updateAction
  };
} 