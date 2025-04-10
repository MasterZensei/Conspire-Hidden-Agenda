import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { useAuth } from '../context/AuthContext';
import { useLobby } from '../hooks/useSupabase';
import { initializeGameState } from '../lib/game/gameRules';
import { Player } from '../lib/supabaseClient';

export default function LobbyPage() {
  const { lobbyId } = useParams<{ lobbyId: string }>();
  const navigate = useNavigate();
  const { user, displayName } = useAuth();
  const { lobby, players, loading, error, startGame } = useLobby(lobbyId || '');
  
  const [isStarting, setIsStarting] = useState(false);
  const [isCopied, setIsCopied] = useState(false);
  
  const isHost = lobby?.host_id === user?.id;
  const shareableLink = `${window.location.origin}/join/${lobbyId}`;
  
  // If the game has started, redirect to game page
  useEffect(() => {
    if (lobby?.current_game_state && lobby.current_game_state.status !== 'waiting') {
      navigate(`/game/${lobbyId}`);
    }
  }, [lobby, lobbyId, navigate]);
  
  // Copy link to clipboard
  const copyLink = () => {
    navigator.clipboard.writeText(shareableLink);
    setIsCopied(true);
    
    setTimeout(() => {
      setIsCopied(false);
    }, 2000);
  };
  
  // Start the game
  const handleStartGame = async () => {
    if (!lobby || players.length < 2) {
      toast.error('Need at least 2 players to start');
      return;
    }
    
    try {
      setIsStarting(true);
      
      // Initialize the game state
      const initialGameState = initializeGameState(
        players as Player[],
        lobby.game_settings
      );
      
      // Update the lobby with the new game state
      await startGame(initialGameState);
      
      toast.success('Game started!');
      navigate(`/game/${lobbyId}`);
    } catch (error) {
      console.error('Error starting game:', error);
      toast.error('Failed to start the game. Please try again.');
    } finally {
      setIsStarting(false);
    }
  };
  
  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-pulse text-xl text-muted-foreground">Loading...</div>
      </div>
    );
  }
  
  if (error || !lobby) {
    return (
      <div className="flex flex-col items-center justify-center py-12 px-4">
        <div className="w-full max-w-md p-6 bg-card rounded-lg shadow-lg border border-destructive">
          <h2 className="text-2xl font-semibold mb-4 text-destructive">Error</h2>
          <p className="text-muted-foreground mb-4">
            {error?.message || 'This lobby does not exist or has been closed.'}
          </p>
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
      <h2 className="text-2xl font-semibold mb-8 text-foreground">Lobby: {lobby.name}</h2>
      
      <div className="w-full max-w-xl p-6 bg-card rounded-lg shadow-lg border border-border mb-6">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-xl font-semibold text-card-foreground">Players</h3>
          <span className="text-sm text-muted-foreground">
            {players.length} / {lobby.max_players}
          </span>
        </div>
        
        <div className="space-y-2 mb-6">
          {players.map((player) => (
            <div 
              key={player.id} 
              className="flex items-center py-2 px-3 bg-background rounded border border-border"
            >
              <span className="font-medium">{player.display_name}</span>
              {player.user_id === lobby.host_id && (
                <span className="ml-2 text-xs bg-primary/10 text-primary px-2 py-1 rounded">Host</span>
              )}
              {player.user_id === user?.id && (
                <span className="ml-2 text-xs bg-secondary/10 text-secondary px-2 py-1 rounded">You</span>
              )}
            </div>
          ))}
        </div>
        
        <div className="space-y-4">
          <div>
            <h3 className="text-sm font-medium text-muted-foreground mb-2">Invite Players</h3>
            <div className="flex">
              <input
                type="text"
                value={shareableLink}
                readOnly
                className="flex-grow p-2 rounded-l border border-input bg-background text-foreground text-sm"
              />
              <button
                onClick={copyLink}
                className="bg-secondary text-secondary-foreground rounded-r px-3 hover:bg-secondary/90 transition"
              >
                {isCopied ? 'Copied!' : 'Copy'}
              </button>
            </div>
          </div>
          
          <div className="space-y-2">
            <h3 className="text-sm font-medium text-muted-foreground mb-1">Game Settings</h3>
            <div className="text-sm text-foreground bg-background p-3 rounded border border-border">
              <p>Max Players: {lobby.max_players}</p>
              <p>Expansions:</p>
              <ul className="list-disc list-inside pl-2 text-muted-foreground">
                {lobby.game_settings.expansions.reformation && <li>Reformation</li>}
                {lobby.game_settings.expansions.inquisitor && <li>Inquisitor</li>}
                {lobby.game_settings.expansions.anarchy && <li>Anarchy</li>}
                {!lobby.game_settings.expansions.reformation && 
                 !lobby.game_settings.expansions.inquisitor && 
                 !lobby.game_settings.expansions.anarchy && <li>None (Base Game)</li>}
              </ul>
            </div>
          </div>
        </div>
      </div>
      
      {isHost && (
        <div className="w-full max-w-xl">
          <button
            onClick={handleStartGame}
            disabled={isStarting || players.length < 2}
            className={`w-full bg-primary text-primary-foreground rounded p-3 hover:bg-primary/90 transition ${
              (isStarting || players.length < 2) ? 'opacity-50 cursor-not-allowed' : ''
            }`}
          >
            {isStarting 
              ? 'Starting Game...' 
              : players.length < 2 
                ? 'Need at Least 2 Players to Start' 
                : 'Start Game'}
          </button>
          {players.length < 2 && (
            <p className="text-sm text-muted-foreground text-center mt-2">
              Waiting for more players to join...
            </p>
          )}
        </div>
      )}
      
      {!isHost && (
        <div className="w-full max-w-xl text-center">
          <p className="text-muted-foreground">
            Waiting for the host to start the game...
          </p>
        </div>
      )}
      
      <button
        onClick={() => navigate('/')}
        className="mt-6 text-sm text-muted-foreground hover:text-foreground transition"
      >
        Return to Home
      </button>
    </div>
  );
} 