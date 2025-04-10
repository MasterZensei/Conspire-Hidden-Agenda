import { useState, FormEvent, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { useAuth } from '../context/AuthContext';
import { useLobbies } from '../hooks/useSupabase';
import { supabase } from '../lib/supabaseClient';

export default function JoinPage() {
  const { lobbyId } = useParams<{ lobbyId: string }>();
  const navigate = useNavigate();
  const { user, signIn, displayName } = useAuth();
  const { joinLobby } = useLobbies();
  
  const [isJoining, setIsJoining] = useState(false);
  const [name, setName] = useState(displayName || '');
  const [lobbyName, setLobbyName] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  // Check if the lobby exists
  useEffect(() => {
    if (!lobbyId) {
      setError('Invalid lobby ID');
      return;
    }
    
    async function checkLobby() {
      try {
        const { data, error } = await supabase
          .from('lobbies')
          .select('name')
          .eq('id', lobbyId)
          .single();
        
        if (error) throw error;
        
        if (data) {
          setLobbyName(data.name);
        } else {
          setError('Lobby not found');
        }
      } catch (err) {
        console.error('Error checking lobby:', err);
        setError('Failed to find lobby');
      }
    }
    
    checkLobby();
  }, [lobbyId]);
  
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
      
      const { user: currentUser } = await supabase.auth.getUser();
      
      if (!currentUser) {
        throw new Error('Failed to authenticate');
      }
      
      // Join the lobby
      await joinLobby(lobbyId, currentUser.id, name);
      
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
      
      {lobbyName && (
        <h2 className="text-2xl font-semibold mb-8 text-foreground">
          Join "{lobbyName}"
        </h2>
      )}
      
      <div className="w-full max-w-md p-6 bg-card rounded-lg shadow-lg border border-border">
        <h2 className="text-2xl font-semibold mb-4 text-card-foreground">
          Join Lobby
        </h2>
        <form onSubmit={handleJoinLobby} className="space-y-4">
          <div>
            <label
              htmlFor="name"
              className="block text-sm font-medium text-muted-foreground mb-1"
            >
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
      </div>
      
      <button
        onClick={() => navigate('/')}
        className="mt-4 text-sm text-muted-foreground hover:text-foreground transition"
      >
        Return to Home
      </button>
    </div>
  );
} 