import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { motion } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import { useLobby, useGameActions } from '../hooks/useSupabase';
import { 
  ActionType, 
  applyAction, 
  canPerformAction, 
  getAvailableActions,
  blockableActions,
  characterActions
} from '../lib/game/gameRules';
import { Card, GameState, Player } from '../lib/supabaseClient';

// Card component to display player's cards
function PlayerCard({ card, flipped, onClick }: { card: Card; flipped: boolean; onClick?: () => void }) {
  return (
    <motion.div
      className={`w-24 h-36 rounded-md shadow-lg cursor-pointer relative ${onClick ? 'cursor-pointer' : ''}`}
      onClick={onClick}
      whileHover={onClick ? { scale: 1.05 } : {}}
      initial={{ rotateY: flipped ? 180 : 0 }}
      animate={{ rotateY: flipped ? 180 : 0 }}
      transition={{ duration: 0.5 }}
    >
      <div 
        className={`absolute w-full h-full backface-hidden rounded-md ${
          flipped ? 'hidden' : 'bg-primary text-primary-foreground'
        } flex items-center justify-center font-bold`}
      >
        COUP
      </div>
      <div 
        className={`absolute w-full h-full backface-hidden rounded-md ${
          !flipped ? 'hidden' : ''
        } bg-card text-card-foreground transform rotate-y-180 flex flex-col items-center justify-center p-2`}
      >
        <h3 className="font-bold text-sm capitalize">{card.type}</h3>
        {card.revealed && (
          <div className="absolute inset-0 bg-destructive/20 rounded-md flex items-center justify-center">
            <span className="text-destructive font-bold transform rotate-[30deg]">REVEALED</span>
          </div>
        )}
      </div>
    </motion.div>
  );
}

// Player component to display player info and cards
function GamePlayer({ 
  player, 
  isCurrentPlayer, 
  isCurrentUser, 
  onSelectTarget,
  selectedAction
}: { 
  player: Player; 
  isCurrentPlayer: boolean; 
  isCurrentUser: boolean;
  onSelectTarget?: (targetId: string) => void;
  selectedAction?: ActionType;
}) {
  const canBeTargeted = selectedAction && onSelectTarget;
  
  const handleClick = () => {
    if (canBeTargeted && onSelectTarget && !isCurrentUser) {
      onSelectTarget(player.id);
    }
  };
  
  return (
    <motion.div 
      className={`p-4 rounded-lg ${
        isCurrentPlayer ? 'bg-primary/10 border-primary' : 'bg-card border-border'
      } ${
        player.eliminated ? 'opacity-50' : ''
      } ${
        canBeTargeted && !isCurrentUser && !player.eliminated ? 'cursor-pointer hover:bg-secondary/10' : ''
      } border shadow-sm flex flex-col items-center`}
      whileHover={canBeTargeted && !isCurrentUser && !player.eliminated ? { scale: 1.02 } : {}}
      onClick={handleClick}
    >
      <div className="flex justify-between w-full items-center mb-2">
        <div>
          <h3 className="font-bold text-foreground">{player.displayName}</h3>
          {player.allegiance && (
            <span className={`text-xs ${
              player.allegiance === 'loyalist' ? 'bg-blue-100 text-blue-800' : 'bg-red-100 text-red-800'
            } px-2 py-0.5 rounded-full`}>
              {player.allegiance === 'loyalist' ? 'Loyalist' : 'Reformist'}
            </span>
          )}
        </div>
        <div className="flex items-center">
          <span className="text-yellow-500 font-bold">{player.coins}</span>
          <span className="ml-1 text-yellow-500">⚪</span>
        </div>
      </div>
      
      <div className="flex space-x-2 mt-2">
        {player.cards.map((card, index) => (
          <PlayerCard 
            key={index}
            card={card}
            flipped={isCurrentUser || card.revealed}
          />
        ))}
      </div>
      
      {isCurrentPlayer && (
        <div className="mt-2 bg-primary text-primary-foreground px-2 py-1 rounded text-sm">
          Current Turn
        </div>
      )}
      
      {isCurrentUser && (
        <div className="mt-2 bg-secondary text-secondary-foreground px-2 py-1 rounded text-sm">
          You
        </div>
      )}
      
      {player.eliminated && (
        <div className="mt-2 bg-destructive text-destructive-foreground px-2 py-1 rounded text-sm">
          Eliminated
        </div>
      )}
    </motion.div>
  );
}

// Action button component
function ActionButton({ 
  action, 
  disabled, 
  onClick 
}: { 
  action: ActionType; 
  disabled?: boolean; 
  onClick: () => void;
}) {
  // Get display name and description for action
  const getActionInfo = (action: ActionType) => {
    switch (action) {
      case ActionType.Income:
        return { name: 'Income', description: 'Take 1 coin from the treasury.' };
      case ActionType.ForeignAid:
        return { name: 'Foreign Aid', description: 'Take 2 coins from the treasury. Can be blocked by Duke.' };
      case ActionType.Tax:
        return { name: 'Tax', description: 'Take 3 coins as Duke.' };
      case ActionType.Steal:
        return { name: 'Steal', description: 'As Captain, steal 2 coins from another player.' };
      case ActionType.Assassinate:
        return { name: 'Assassinate', description: 'Pay 3 coins to assassinate another player. Can be blocked by Contessa.' };
      case ActionType.Exchange:
        return { name: 'Exchange', description: 'As Ambassador, exchange cards with the Court deck.' };
      case ActionType.Coup:
        return { name: 'Coup', description: 'Pay 7 coins to force a player to reveal a card.' };
      case ActionType.Question:
        return { name: 'Question', description: 'As Inquisitor, look at another player\'s card.' };
      case ActionType.Convert:
        return { name: 'Convert', description: 'Pay 1 coin to convert a player to your team.' };
      default:
        return { name: action, description: 'Perform an action.' };
    }
  };
  
  const { name, description } = getActionInfo(action);
  
  return (
    <motion.button
      className={`p-3 rounded-lg border ${disabled ? 'bg-muted text-muted-foreground' : 'bg-primary text-primary-foreground hover:bg-primary/90'} w-full transition-all`}
      whileHover={!disabled ? { scale: 1.02 } : {}}
      disabled={disabled}
      onClick={onClick}
    >
      <div className="text-left">
        <h3 className="font-bold">{name}</h3>
        <p className="text-xs opacity-90">{description}</p>
      </div>
    </motion.button>
  );
}

export default function GamePage() {
  const { lobbyId } = useParams<{ lobbyId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { lobby, players, loading, error, updateGameState } = useLobby(lobbyId || '');
  const { createAction } = useGameActions(lobbyId || '');
  
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [selectedAction, setSelectedAction] = useState<ActionType | null>(null);
  const [isPerformingAction, setIsPerformingAction] = useState(false);
  const [availableActions, setAvailableActions] = useState<ActionType[]>([]);
  const [currentPlayer, setCurrentPlayer] = useState<Player | null>(null);
  const [currentUserPlayer, setCurrentUserPlayer] = useState<Player | null>(null);
  
  // Initialize game state from lobby data
  useEffect(() => {
    if (lobby?.current_game_state) {
      setGameState(lobby.current_game_state);
    }
  }, [lobby]);
  
  // Update current player when game state changes
  useEffect(() => {
    if (gameState && players.length) {
      const currentPlayerIndex = gameState.currentPlayerIndex;
      const currentPlayer = players[currentPlayerIndex];
      setCurrentPlayer(currentPlayer);
      
      // Find the current user's player
      const userPlayer = players.find(p => p.user_id === user?.id);
      setCurrentUserPlayer(userPlayer || null);
      
      // Check if current user is the current player
      if (userPlayer && currentPlayer && userPlayer.id === currentPlayer.id) {
        setAvailableActions(getAvailableActions(userPlayer as Player, gameState));
      } else {
        setAvailableActions([]);
      }
    }
  }, [gameState, players, user]);
  
  // Handle action selection
  const handleSelectAction = (action: ActionType) => {
    setSelectedAction(action);
  };
  
  // Handle target selection
  const handleSelectTarget = async (targetId: string) => {
    if (!selectedAction || !currentUserPlayer || !gameState) return;
    
    try {
      setIsPerformingAction(true);
      
      // Create action record in database
      await createAction(
        currentUserPlayer.id,
        selectedAction,
        targetId
      );
      
      // Apply the action to the game state
      const updatedGameState = applyAction(
        gameState,
        currentUserPlayer.id,
        selectedAction,
        targetId
      );
      
      // Update game state in database
      await updateGameState(updatedGameState);
      
      // Reset selection
      setSelectedAction(null);
    } catch (err) {
      console.error('Error performing action:', err);
      toast.error('Failed to perform action');
    } finally {
      setIsPerformingAction(false);
    }
  };
  
  // Handle action that doesn't require a target
  const handlePerformAction = async (action: ActionType) => {
    if (!currentUserPlayer || !gameState) return;
    
    try {
      setIsPerformingAction(true);
      
      // Create action record in database
      await createAction(
        currentUserPlayer.id,
        action
      );
      
      // Apply the action to the game state
      const updatedGameState = applyAction(
        gameState,
        currentUserPlayer.id,
        action
      );
      
      // Update game state in database
      await updateGameState(updatedGameState);
    } catch (err) {
      console.error('Error performing action:', err);
      toast.error('Failed to perform action');
    } finally {
      setIsPerformingAction(false);
    }
  };
  
  // Loading state
  if (loading || !gameState) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-pulse text-xl text-muted-foreground">Loading...</div>
      </div>
    );
  }
  
  // Error state
  if (error || !lobby) {
    return (
      <div className="flex flex-col items-center justify-center py-12 px-4">
        <div className="w-full max-w-md p-6 bg-card rounded-lg shadow-lg border border-destructive">
          <h2 className="text-2xl font-semibold mb-4 text-destructive">Error</h2>
          <p className="text-muted-foreground mb-4">
            {error?.message || 'This game does not exist or has ended.'}
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
  
  // Game over state
  if (gameState.status === 'completed' && gameState.winner) {
    const winner = players.find(p => p.id === gameState.winner);
    
    return (
      <div className="flex flex-col items-center justify-center py-12 px-4">
        <h1 className="text-4xl font-bold mb-8 text-primary">Game Over</h1>
        
        <div className="w-full max-w-md p-6 bg-card rounded-lg shadow-lg border border-primary mb-6">
          <h2 className="text-2xl font-semibold mb-4 text-card-foreground text-center">
            {winner ? `${winner.displayName} Wins!` : 'Game Ended'}
          </h2>
          
          <div className="space-y-4">
            <h3 className="text-xl font-semibold text-center mb-4">Final Standings</h3>
            {players
              .sort((a, b) => (a.eliminated === b.eliminated) ? 0 : a.eliminated ? 1 : -1)
              .map((player) => (
                <div 
                  key={player.id} 
                  className={`flex justify-between items-center p-3 rounded border ${
                    player.id === gameState.winner ? 'bg-primary/10 border-primary' : 'bg-background border-border'
                  }`}
                >
                  <span className="font-medium">{player.displayName}</span>
                  {player.id === gameState.winner && (
                    <span className="bg-primary text-primary-foreground px-2 py-1 rounded text-sm">Winner</span>
                  )}
                </div>
              ))}
          </div>
          
          <button
            onClick={() => navigate('/')}
            className="w-full bg-primary text-primary-foreground rounded p-2 mt-6 hover:bg-primary/90 transition"
          >
            Return to Home
          </button>
        </div>
      </div>
    );
  }
  
  // Determine if it's the current user's turn
  const isUserTurn = currentUserPlayer && currentPlayer && currentUserPlayer.id === currentPlayer.id;
  
  return (
    <div className="py-8 px-4">
      <div className="max-w-6xl mx-auto">
        <div className="flex justify-between items-center mb-4">
          <h1 className="text-2xl font-bold text-primary">Coup - {lobby.name}</h1>
          <div className="bg-card p-2 rounded border border-border">
            <span className="text-sm text-muted-foreground">
              {isUserTurn 
                ? "It's Your Turn" 
                : currentPlayer 
                  ? `Waiting for ${currentPlayer.displayName}'s Turn` 
                  : "Waiting..."}
            </span>
          </div>
        </div>
        
        {/* Game board */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
          {players.map((player) => (
            <GamePlayer
              key={player.id}
              player={player as Player}
              isCurrentPlayer={currentPlayer?.id === player.id}
              isCurrentUser={player.user_id === user?.id}
              selectedAction={selectedAction}
              onSelectTarget={
                selectedAction && isUserTurn && selectedAction && !isPerformingAction && player.id !== currentUserPlayer?.id
                  ? handleSelectTarget
                  : undefined
              }
            />
          ))}
        </div>
        
        {/* Action panel */}
        {isUserTurn && !selectedAction && (
          <div className="bg-card p-4 rounded-lg border border-border">
            <h2 className="text-xl font-semibold mb-4">Your Turn - Choose an Action</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {availableActions.map((action) => (
                <ActionButton
                  key={action}
                  action={action}
                  disabled={isPerformingAction}
                  onClick={() => {
                    if (action in blockableActions || action in characterActions) {
                      handleSelectAction(action);
                    } else {
                      handlePerformAction(action);
                    }
                  }}
                />
              ))}
            </div>
          </div>
        )}
        
        {/* Target selection UI */}
        {isUserTurn && selectedAction && (
          <div className="bg-card p-4 rounded-lg border border-border">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold">Select a Target for {selectedAction}</h2>
              <button
                onClick={() => setSelectedAction(null)}
                className="text-sm text-muted-foreground hover:text-foreground"
              >
                Cancel
              </button>
            </div>
            <p className="text-muted-foreground mb-4">
              Click on a player to target them with this action.
            </p>
          </div>
        )}
        
        {/* Game log */}
        <div className="mt-6 bg-card p-4 rounded-lg border border-border">
          <h2 className="text-xl font-semibold mb-2">Game Log</h2>
          {gameState.lastAction ? (
            <div className="p-2 bg-background rounded border border-border mb-2">
              <p className="text-sm">
                <span className="font-medium">
                  {players.find(p => p.id === gameState.lastAction?.player)?.displayName || 'Player'}
                </span> used{' '}
                <span className="font-medium">{gameState.lastAction.type}</span>
                {gameState.lastAction.target && (
                  <> on <span className="font-medium">
                    {players.find(p => p.id === gameState.lastAction?.target)?.displayName || 'Player'}
                  </span></>
                )}.
                {gameState.lastAction.result !== 'success' && (
                  <> Action was <span className="font-medium text-destructive">{gameState.lastAction.result}</span>.</>
                )}
              </p>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No actions yet.</p>
          )}
        </div>
      </div>
    </div>
  );
} 