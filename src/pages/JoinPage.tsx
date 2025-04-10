import { useState, useEffect, FormEvent } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabaseClient';
import { useLobbies } from '../hooks/useSupabase';

export default function JoinPage() {
  const { lobbyId } = useParams<{ lobbyId: string }>();
  const navigate = useNavigate();
  const { user, signIn, displayName } = useAuth();
  const { joinLobby } = useLobbies();
  
  const [isJoining, setIsJoining] = useState(false);
  const [name, setName] = useState(displayName || '');
  const [error, setError] = useState<string | null>(null);
  
  // Check if the lobby exists
  useEffect(() => {
    if (!lobbyId) {
      setError('Invalid lobby ID');
      return;
    }
    
    // Check in Supabase
    async function checkLobby() {
      try {
        const { data, error } = await supabase
          .from('lobbies')
          .select('*, players(*)')
          .eq('id', lobbyId)
          .eq('active', true)
          .single();
        
        if (error) throw error;
        
        if (!data) {
          setError('Lobby not found');
          return;
        }
        
        const playerCount = data.players?.length || 0;
        if (playerCount >= data.max_players) {
          setError('Lobby is full');
          return;
        }
      } catch (err) {
        console.error('Error checking lobby:', err);
        setError('Error checking lobby status');
      }
    }
    
    checkLobby();
  }, [lobbyId]);
  
  const handleJoinLobby = async (e: FormEvent) => {
    e.preventDefault();
    setIsJoining(true);
    setError('');

    try {
      // Sign in the user if not already signed in
      if (!user) {
        await signIn(name);
      }

      const currentUser = await supabase.auth.getUser();
      if (!currentUser?.data?.user) {
        throw new Error('Failed to authenticate user');
      }

      if (!lobbyId) {
        throw new Error('Invalid lobby ID');
      }

      // First check if the lobby exists and has room
      const { data: lobby, error: lobbyError } = await supabase
        .from('lobbies')
        .select('*, players(*)')
        .eq('id', lobbyId)
        .eq('active', true)
        .single();
        
      if (lobbyError) {
        toast.error('Lobby not found');
        setError('Lobby not found');
        setIsJoining(false);
        return;
      }
        
      const playerCount = lobby.players?.length || 0;
      if (playerCount >= lobby.max_players) {
        toast.error('Lobby is full');
        setError('Lobby is full');
        setIsJoining(false);
        return;
      }

      // Join the lobby
      const player = await joinLobby(
        lobbyId,
        currentUser.data.user.id,
        name
      );

      // Save player info to local storage for quick access
      localStorage.setItem('playerId', player.id);
      localStorage.setItem('playerName', name);
      localStorage.setItem('lobbyId', lobbyId);

      toast.success('Joined lobby successfully!');
      navigate(`/lobby/${lobbyId}`);
    } catch (error: any) {
      console.error('Error joining lobby:', error);
      setError(error.message || 'Failed to join lobby');
      toast.error(error.message || 'Failed to join lobby');
    } finally {
      setIsJoining(false);
    }
  };
  
  // If there's an error, show it
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-12 px-4">
        <div className="w-full max-w-md p-6 bg-card rounded-lg shadow-lg border border-destructive">
          <h2 className="text-2xl font-semibold mb-4 text-destructive">Error</h2>
          <p className="text-muted-foreground mb-4">{error}</p>
          <button
            onClick={() => navigate('/')}
            className="w-full bg-primary text-primary-foreground rounded p-2 hover:bg-primary/90 transition"
          >
            Return to Home
          </button>
        </div>
      </div>
    );
  }
  
  return (
    <div className="flex flex-col items-center justify-center py-12 px-4">
      <h1 className="text-4xl font-bold mb-2 text-primary">Coup Online</h1>
      <h2 className="text-2xl font-semibold mb-8 text-foreground">Join Lobby</h2>
      
      <div className="w-full max-w-md p-6 bg-card rounded-lg shadow-lg border border-border">
        <form onSubmit={handleJoinLobby} className="space-y-4">
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-muted-foreground mb-1">
              Display Name
            </label>
            <input
              id="name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter your display name"
              className="w-full p-2 rounded border border-input bg-background text-foreground"
              disabled={isJoining}
              required
            />
          </div>
          
          <button
            type="submit"
            className="w-full bg-primary text-primary-foreground rounded p-2 hover:bg-primary/90 transition"
            disabled={isJoining}
          >
            {isJoining ? 'Joining...' : 'Join Lobby'}
          </button>
        </form>
        
        <div className="mt-4 text-center">
          <button
            onClick={() => navigate('/')}
            className="text-sm text-muted-foreground hover:text-foreground transition"
          >
            Return to Home
          </button>
        </div>
      </div>
    </div>
  );
} 