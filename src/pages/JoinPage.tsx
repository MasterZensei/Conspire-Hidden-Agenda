import { useState, useEffect, FormEvent } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { useAuth } from '../context/AuthContext';
import { supabase, localGameStorage } from '../lib/supabaseClient';
import { useLobbies } from '../hooks/useSupabase';

export default function JoinPage() {
  const { lobbyId } = useParams<{ lobbyId: string }>();
  const navigate = useNavigate();
  const { user, signIn, displayName } = useAuth();
  const { joinLobby } = useLobbies();
  
  const [isJoining, setIsJoining] = useState(false);
  const [name, setName] = useState(displayName || '');
  const [error, setError] = useState<string | null>(null);
  const [localLobby, setLocalLobby] = useState<any | null>(null);
  
  const isUsingLocalLobby = user?.id?.startsWith('demo_');
  
  // Check if the lobby exists
  useEffect(() => {
    if (!lobbyId) {
      setError('Invalid lobby ID');
      return;
    }
    
    // Check if the lobby exists in local storage for demo mode
    if (isUsingLocalLobby) {
      const storedLobbies = JSON.parse(localStorage.getItem('lobbies') || '[]');
      const matchingLobby = storedLobbies.find((l: any) => l.id === lobbyId);
      
      if (matchingLobby) {
        setLocalLobby(matchingLobby);
      } else {
        setError('Lobby not found in demo mode');
      }
      return;
    }
    
    // Otherwise check in Supabase
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
    
    if (!isUsingLocalLobby) {
      checkLobby();
    }
  }, [lobbyId, isUsingLocalLobby]);
  
  const handleJoinLobby = async (e: FormEvent) => {
    e.preventDefault();
    
    if (!lobbyId) {
      toast.error('Invalid lobby ID');
      return;
    }
    
    if (!name.trim()) {
      toast.error('Please enter a display name');
      return;
    }
    
    try {
      setIsJoining(true);
      
      // Sign in if not already signed in
      if (!user) {
        await signIn(name);
      }
      
      // If demo mode, join the local lobby
      if (isUsingLocalLobby) {
        // Join the local lobby
        const storedLobbies = JSON.parse(localStorage.getItem('lobbies') || '[]');
        const updatedLobbies = storedLobbies.map((l: any) => {
          if (l.id === lobbyId) {
            // Add the player to the lobby
            const newPlayer = {
              id: Math.random().toString(36).substring(2, 12),
              user_id: user?.id || `demo_${Math.random().toString(36).substring(2, 11)}`,
              lobby_id: lobbyId,
              display_name: name,
              created_at: new Date().toISOString(),
              coins: 0,
              cards: []
            };
            
            return {
              ...l,
              players: [...(l.players || []), newPlayer]
            };
          }
          return l;
        });
        
        localStorage.setItem('lobbies', JSON.stringify(updatedLobbies));
        toast.success('Joined lobby successfully!');
        navigate(`/lobby/${lobbyId}`);
        return;
      }
      
      // Join the remote lobby
      const { data } = await supabase.auth.getUser();
      
      if (!data.user) {
        throw new Error('Failed to authenticate');
      }
      
      // Join the lobby
      await joinLobby(lobbyId, data.user.id, name);
      
      toast.success('Joined lobby successfully!');
      navigate(`/lobby/${lobbyId}`);
    } catch (error: any) {
      console.error('Join lobby error:', error);
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
      
      {isUsingLocalLobby && (
        <div className="mt-4 p-3 bg-yellow-50 text-yellow-800 rounded text-sm">
          Playing in demo mode. Game data will be stored locally.
        </div>
      )}
    </div>
  );
} 