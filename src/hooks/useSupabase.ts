import { useCallback, useEffect, useState } from 'react';
import { nanoid } from 'nanoid';
import { supabase, GameSettings, GameState, Player, createLobbyDirectly, localGameStorage } from '../lib/supabaseClient';

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
      
      // If the user ID starts with "demo_", use local storage instead of Supabase
      if (hostId.startsWith('demo_')) {
        console.log('Demo user detected, using local storage for lobby');
        return localGameStorage.createLobby(
          name, 
          hostId, 
          settings, 
          metadata?.displayName || 'Host'
        );
      }
      
      const lobbyId = nanoid(10);
      console.log('Generated lobbyId:', lobbyId);
      
      try {
        // Try standard Supabase insert
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
          throw error;
        }
        
        console.log('Lobby created successfully:', data);
        
        // Also add host as a player
        try {
          await supabase
            .from('players')
            .insert({
              user_id: hostId,
              lobby_id: lobbyId,
              display_name: metadata?.displayName || 'Host',
              coins: 0,
              cards: []
            });
          
          console.log('Added host as player');
        } catch (playerErr) {
          console.warn('Error adding host as player:', playerErr);
        }
        
        return data;
      } catch (supabaseError) {
        console.log('Supabase failed, falling back to local storage');
        return localGameStorage.createLobby(
          name, 
          hostId, 
          settings, 
          metadata?.displayName || 'Host'
        );
      }
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

  // Join an existing lobby
  const joinLobby = useCallback(async (lobbyId: string, userId: string, displayName: string) => {
    try {
      // First check if the lobby exists and has room
      const { data: lobby, error: lobbyError } = await supabase
        .from('lobbies')
        .select('*, players(*)')
        .eq('id', lobbyId)
        .eq('active', true)
        .single();

      if (lobbyError) throw lobbyError;
      
      if (!lobby) {
        throw new Error('Lobby not found');
      }

      const playerCount = lobby.players?.length || 0;
      if (playerCount >= lobby.max_players) {
        throw new Error('Lobby is full');
      }

      // Add player to the lobby
      const { data, error } = await supabase
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

      if (error) throw error;
      return { lobby, player: data };
    } catch (err) {
      console.error('Error joining lobby:', err);
      throw err;
    }
  }, []);

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