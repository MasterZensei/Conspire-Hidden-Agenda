import { useState, FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { useAuth } from '../context/AuthContext';
import { useLobbies } from '../hooks/useSupabase';
import { GameSettings } from '../lib/supabaseClient';

export default function HomePage() {
  const { user, signIn, displayName, setDisplayName } = useAuth();
  const { createLobby } = useLobbies();
  const navigate = useNavigate();
  
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [isCreatingLobby, setIsCreatingLobby] = useState(false);
  const [name, setName] = useState(displayName || '');
  const [lobbyName, setLobbyName] = useState('');
  const [maxPlayers, setMaxPlayers] = useState(6);
  const [joinLobbyId, setJoinLobbyId] = useState('');
  
  // State for expansion toggles
  const [useReformation, setUseReformation] = useState(false);
  const [useInquisitor, setUseInquisitor] = useState(false);
  const [useAnarchy, setUseAnarchy] = useState(false);

  const handleSignIn = async (e: FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error('Please enter a display name');
      return;
    }
    
    try {
      setIsSigningIn(true);
      await signIn(name);
      toast.success('Signed in successfully!');
    } catch (error) {
      console.error('Sign in error:', error);
      toast.error('Failed to sign in. Please try again.');
    } finally {
      setIsSigningIn(false);
    }
  };

  const handleCreateLobby = async (e: FormEvent) => {
    e.preventDefault();
    if (!user) {
      toast.error('You must be logged in to create a lobby');
      return;
    }
    
    if (!lobbyName.trim()) {
      toast.error('Please enter a lobby name');
      return;
    }
    
    try {
      setIsCreatingLobby(true);
      
      // Define game settings
      const gameSettings: GameSettings = {
        expansions: {
          reformation: useReformation,
          inquisitor: useInquisitor,
          anarchy: useAnarchy
        },
        startingCoins: 2, // Default
        maxPlayers
      };
      
      const lobby = await createLobby(lobbyName, user.id, gameSettings);
      toast.success('Lobby created successfully!');
      
      // Navigate to the lobby
      navigate(`/lobby/${lobby.id}`);
    } catch (error) {
      console.error('Create lobby error:', error);
      toast.error('Failed to create lobby. Please try again.');
    } finally {
      setIsCreatingLobby(false);
    }
  };

  const handleJoinLobby = (e: FormEvent) => {
    e.preventDefault();
    if (!joinLobbyId.trim()) {
      toast.error('Please enter a lobby ID');
      return;
    }
    
    navigate(`/join/${joinLobbyId.trim()}`);
  };

  return (
    <div className="px-4">
      <h1 className="text-4xl font-bold mb-8 text-primary">Coup Online</h1>
      
      {!user ? (
        // Sign In Form
        <div className="w-full max-w-md p-6 bg-card rounded-lg shadow-lg border border-border">
          <h2 className="text-2xl font-semibold mb-4 text-card-foreground">Sign In</h2>
          <form onSubmit={handleSignIn} className="space-y-4">
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
                disabled={isSigningIn}
                required
              />
            </div>
            <button
              type="submit"
              className="w-full bg-primary text-primary-foreground rounded p-2 hover:bg-primary/90 transition"
              disabled={isSigningIn}
            >
              {isSigningIn ? 'Signing In...' : 'Sign In'}
            </button>
          </form>
        </div>
      ) : (
        // Create Lobby Form
        <div className="w-full max-w-md p-6 bg-card rounded-lg shadow-lg border border-border">
          <h2 className="text-2xl font-semibold mb-4 text-card-foreground">Create a Lobby</h2>
          <form onSubmit={handleCreateLobby} className="space-y-4">
            <div>
              <label htmlFor="lobbyName" className="block text-sm font-medium text-muted-foreground mb-1">
                Lobby Name
              </label>
              <input
                id="lobbyName"
                type="text"
                value={lobbyName}
                onChange={(e) => setLobbyName(e.target.value)}
                placeholder="Enter lobby name"
                className="w-full p-2 rounded border border-input bg-background text-foreground"
                disabled={isCreatingLobby}
                required
              />
            </div>
            
            <div>
              <label htmlFor="maxPlayers" className="block text-sm font-medium text-muted-foreground mb-1">
                Maximum Players (2-10)
              </label>
              <input
                id="maxPlayers"
                type="number"
                min="2"
                max="10"
                value={maxPlayers}
                onChange={(e) => setMaxPlayers(Number(e.target.value))}
                className="w-full p-2 rounded border border-input bg-background text-foreground"
                disabled={isCreatingLobby}
              />
            </div>
            
            <div className="space-y-2">
              <p className="text-sm font-medium text-muted-foreground mb-1">Expansions</p>
              
              <div className="flex items-center">
                <input
                  id="reformation"
                  type="checkbox"
                  checked={useReformation}
                  onChange={(e) => setUseReformation(e.target.checked)}
                  className="mr-2"
                  disabled={isCreatingLobby}
                />
                <label htmlFor="reformation" className="text-sm text-foreground">
                  Reformation
                </label>
              </div>
              
              <div className="flex items-center">
                <input
                  id="inquisitor"
                  type="checkbox"
                  checked={useInquisitor}
                  onChange={(e) => setUseInquisitor(e.target.checked)}
                  className="mr-2"
                  disabled={isCreatingLobby}
                />
                <label htmlFor="inquisitor" className="text-sm text-foreground">
                  Inquisitor
                </label>
              </div>
              
              <div className="flex items-center">
                <input
                  id="anarchy"
                  type="checkbox"
                  checked={useAnarchy}
                  onChange={(e) => setUseAnarchy(e.target.checked)}
                  className="mr-2"
                  disabled={isCreatingLobby}
                />
                <label htmlFor="anarchy" className="text-sm text-foreground">
                  Anarchy
                </label>
              </div>
            </div>
            
            <button
              type="submit"
              className="w-full bg-primary text-primary-foreground rounded p-2 hover:bg-primary/90 transition"
              disabled={isCreatingLobby}
            >
              {isCreatingLobby ? 'Creating Lobby...' : 'Create Lobby'}
            </button>
          </form>
        </div>
      )}
      
      {user && (
        <div className="mt-4 w-full max-w-md space-y-4">
          <div className="p-4 bg-card rounded-lg shadow-md border border-border">
            <h3 className="text-xl font-semibold mb-2 text-card-foreground">Join Existing Lobby</h3>
            <form onSubmit={handleJoinLobby} className="space-y-2">
              <div>
                <input
                  type="text"
                  value={joinLobbyId}
                  onChange={(e) => setJoinLobbyId(e.target.value)}
                  placeholder="Enter lobby ID"
                  className="w-full p-2 rounded border border-input bg-background text-foreground"
                  required
                />
              </div>
              <button
                type="submit"
                className="w-full bg-secondary text-secondary-foreground rounded p-2 hover:bg-secondary/90 transition"
              >
                Join Lobby
              </button>
            </form>
          </div>
          
          <p className="text-sm text-muted-foreground text-center">
            Signed in as <span className="font-semibold">{displayName}</span>
          </p>
        </div>
      )}
    </div>
  );
} 