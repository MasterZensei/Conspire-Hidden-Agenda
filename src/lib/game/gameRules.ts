import { CardType, GameSettings, GameState, Player } from '../supabaseClient';

// Define the basic actions
export enum ActionType {
  // Common actions
  Income = 'income',
  ForeignAid = 'foreign_aid', 
  Coup = 'coup',
  Tax = 'tax', // Duke
  Assassinate = 'assassinate', // Assassin
  Steal = 'steal', // Captain
  Exchange = 'exchange', // Ambassador
  
  // Expansion actions
  Question = 'question', // Inquisitor
  Convert = 'convert', // Reformation
  Embezzle = 'embezzle', // Anarchy - replaces Tax
  Interrogate = 'interrogate', // From Inquisitor replaces Ambassador
}

// Define which actions are blockable and by which cards
export const blockableActions = {
  [ActionType.ForeignAid]: ['duke'],
  [ActionType.Assassinate]: ['contessa'],
  [ActionType.Steal]: ['ambassador', 'captain', 'inquisitor'],
};

// Define which actions are character-specific and can be challenged
export const characterActions = {
  [ActionType.Tax]: ['duke'],
  [ActionType.Assassinate]: ['assassin'],
  [ActionType.Steal]: ['captain'],
  [ActionType.Exchange]: ['ambassador'],
  [ActionType.Question]: ['inquisitor'],
  [ActionType.Interrogate]: ['inquisitor'],
  [ActionType.Embezzle]: ['duke'],
};

// Define action costs
export const actionCosts: Record<ActionType, number> = {
  [ActionType.Income]: 0,
  [ActionType.ForeignAid]: 0,
  [ActionType.Tax]: 0,
  [ActionType.Steal]: 0,
  [ActionType.Exchange]: 0,
  [ActionType.Question]: 0,
  [ActionType.Convert]: 1,
  [ActionType.Embezzle]: 0,
  [ActionType.Interrogate]: 0,
  [ActionType.Assassinate]: 3,
  [ActionType.Coup]: 7,
};

// Define if actions require targets
export const actionRequiresTarget: Record<ActionType, boolean> = {
  [ActionType.Income]: false,
  [ActionType.ForeignAid]: false,
  [ActionType.Tax]: false,
  [ActionType.Exchange]: false,
  [ActionType.Embezzle]: false,
  [ActionType.Coup]: true,
  [ActionType.Assassinate]: true,
  [ActionType.Steal]: true,
  [ActionType.Question]: true,
  [ActionType.Interrogate]: true,
  [ActionType.Convert]: true,
};

// Deck creation utility
export function createDeck(settings: GameSettings): CardType[] {
  // Base game has 3 of each card
  const deck: CardType[] = [
    'duke', 'duke', 'duke',
    'assassin', 'assassin', 'assassin',
    'captain', 'captain', 'captain',
    'contessa', 'contessa', 'contessa'
  ];
  
  // Handle expansions
  if (settings.expansions.inquisitor) {
    // Replace ambassador with inquisitor
    return deck.map(card => card === 'ambassador' ? 'inquisitor' : card);
  } else {
    // Add ambassador if not using inquisitor
    deck.push('ambassador', 'ambassador', 'ambassador');
  }
  
  return shuffleDeck(deck);
}

// Utility to shuffle the deck
function shuffleDeck<T>(deck: T[]): T[] {
  const newDeck = [...deck];
  for (let i = newDeck.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [newDeck[i], newDeck[j]] = [newDeck[j], newDeck[i]]; 
  }
  return newDeck;
}

// Check if a player can perform a specific action
export function canPerformAction(
  player: Player, 
  action: ActionType, 
  target?: Player
): { allowed: boolean; reason?: string } {
  // Check if player has enough coins
  const cost = actionCosts[action] || 0;
  if (player.coins < cost) {
    return { allowed: false, reason: `Not enough coins. Needed: ${cost}, Have: ${player.coins}` };
  }

  // If player has 10+ coins, they must coup
  if (player.coins >= 10 && action !== ActionType.Coup) {
    return { allowed: false, reason: 'With 10 or more coins, you must perform a coup' };
  }

  // Check if the action requires a target and one is provided
  if (actionRequiresTarget[action] && !target) {
    return { allowed: false, reason: 'This action requires a target' };
  }

  // Don't allow targeting eliminated players
  if (target?.eliminated) {
    return { allowed: false, reason: 'Cannot target an eliminated player' };
  }
  
  // Don't allow targeting yourself (except for exchange)
  if (target && target.id === player.id && action !== ActionType.Exchange) {
    return { allowed: false, reason: 'Cannot target yourself with this action' };
  }

  return { allowed: true };
}

// Initialize a new game state
export function initializeGameState(
  players: Player[],
  settings: GameSettings
): GameState {
  const deck = createDeck(settings);
  
  // Deal cards to players
  const playersWithCards = players.map(player => {
    const cards = [
      { type: deck.pop() as CardType, revealed: false },
      { type: deck.pop() as CardType, revealed: false }
    ];
    
    // Determine allegiance - only "loyalist", "reformist" or undefined
    let allegiance: "loyalist" | "reformist" | undefined = undefined;
    if (settings.expansions.reformation) {
      allegiance = Math.random() > 0.5 ? "loyalist" : "reformist";
    }
    
    return {
      ...player,
      cards,
      coins: settings.startingCoins || 2,
      eliminated: false,
      allegiance
    };
  });

  return {
    status: 'in_progress',
    deck: deck,
    currentPlayerIndex: 0,
    players: playersWithCards,
    currentAction: null,
    lastAction: null,
    winner: null
  };
}

// Check if the game is over
export function checkGameOver(gameState: GameState): { isOver: boolean; winner?: Player } {
  const activePlayers = gameState.players.filter(player => !player.eliminated);
  
  if (activePlayers.length === 1) {
    return { isOver: true, winner: activePlayers[0] };
  }
  
  // If reformation expansion is active, check for team victory
  if (activePlayers.length > 1 && activePlayers.every(p => p.allegiance === activePlayers[0].allegiance)) {
    return { isOver: true, winner: activePlayers[0] }; // Team victory
  }
  
  return { isOver: false };
}

// Get the available actions for a player
export function getAvailableActions(player: Player, gameState: GameState): ActionType[] {
  const availableActions = [ActionType.Income, ActionType.ForeignAid];
  
  // Always add Coup if they have enough coins
  if (player.coins >= actionCosts[ActionType.Coup]) {
    availableActions.push(ActionType.Coup);
  }
  
  // Add character actions based on what cards the player has
  const playerCards = player.cards.filter(card => !card.revealed).map(card => card.type);
  
  if (playerCards.includes('duke')) {
    availableActions.push(ActionType.Tax);
  }
  
  if (playerCards.includes('assassin') && player.coins >= actionCosts[ActionType.Assassinate]) {
    availableActions.push(ActionType.Assassinate);
  }
  
  if (playerCards.includes('captain')) {
    availableActions.push(ActionType.Steal);
  }
  
  if (playerCards.includes('ambassador')) {
    availableActions.push(ActionType.Exchange);
  }
  
  if (playerCards.includes('inquisitor')) {
    availableActions.push(ActionType.Question);
    availableActions.push(ActionType.Interrogate);
  }
  
  // Add reformation-specific actions only if the expansion is active
  if (gameState.players.some(p => p.allegiance) && player.coins >= actionCosts[ActionType.Convert]) {
    availableActions.push(ActionType.Convert);
  }
  
  return availableActions;
}

// Apply action effects to the game state
export function applyAction(
  gameState: GameState,
  playerId: string,
  action: ActionType,
  targetId?: string
): GameState {
  const playerIndex = gameState.players.findIndex(p => p.id === playerId);
  if (playerIndex === -1) return gameState;
  
  const targetIndex = targetId ? gameState.players.findIndex(p => p.id === targetId) : -1;
  const target = targetIndex !== -1 ? gameState.players[targetIndex] : undefined;
  
  // Create a deep copy of the game state to modify
  const newState: GameState = JSON.parse(JSON.stringify(gameState));
  
  // Apply the action effects
  switch (action) {
    case ActionType.Income:
      newState.players[playerIndex].coins += 1;
      newState.lastAction = {
        type: action,
        player: playerId,
        result: 'success'
      };
      break;
      
    case ActionType.ForeignAid:
      newState.players[playerIndex].coins += 2;
      newState.lastAction = {
        type: action,
        player: playerId,
        result: 'success'
      };
      break;
      
    case ActionType.Tax:
      newState.players[playerIndex].coins += 3;
      newState.lastAction = {
        type: action,
        player: playerId,
        result: 'success'
      };
      break;
      
    case ActionType.Steal:
      if (target) {
        const stealAmount = Math.min(2, target.coins);
        newState.players[targetIndex].coins -= stealAmount;
        newState.players[playerIndex].coins += stealAmount;
        newState.lastAction = {
          type: action,
          player: playerId,
          target: targetId,
          result: 'success'
        };
      }
      break;
      
    case ActionType.Assassinate:
      if (target) {
        newState.players[playerIndex].coins -= actionCosts[ActionType.Assassinate];
        // Reveal one of the target's cards
        const cardIndex = target.cards.findIndex(card => !card.revealed);
        if (cardIndex !== -1) {
          newState.players[targetIndex].cards[cardIndex].revealed = true;
          
          // Check if player is eliminated
          if (newState.players[targetIndex].cards.every(card => card.revealed)) {
            newState.players[targetIndex].eliminated = true;
          }
        }
        newState.lastAction = {
          type: action,
          player: playerId,
          target: targetId,
          result: 'success'
        };
      }
      break;
      
    case ActionType.Coup:
      if (target) {
        newState.players[playerIndex].coins -= actionCosts[ActionType.Coup];
        // Reveal one of the target's cards
        const cardIndex = target.cards.findIndex(card => !card.revealed);
        if (cardIndex !== -1) {
          newState.players[targetIndex].cards[cardIndex].revealed = true;
          
          // Check if player is eliminated
          if (newState.players[targetIndex].cards.every(card => card.revealed)) {
            newState.players[targetIndex].eliminated = true;
          }
        }
        newState.lastAction = {
          type: action,
          player: playerId,
          target: targetId,
          result: 'success'
        };
      }
      break;
      
    case ActionType.Convert:
      if (target && newState.players[playerIndex].allegiance) {
        newState.players[playerIndex].coins -= actionCosts[ActionType.Convert];
        newState.players[targetIndex].allegiance = newState.players[playerIndex].allegiance;
        newState.lastAction = {
          type: action,
          player: playerId,
          target: targetId,
          result: 'success'
        };
      }
      break;
  }
  
  // Move to next player
  let nextPlayerIndex = (playerIndex + 1) % newState.players.length;
  
  // Skip eliminated players
  while (newState.players[nextPlayerIndex].eliminated) {
    nextPlayerIndex = (nextPlayerIndex + 1) % newState.players.length;
  }
  
  newState.currentPlayerIndex = nextPlayerIndex;
  
  // Check if game is over
  const gameOver = checkGameOver(newState);
  if (gameOver.isOver && gameOver.winner) {
    newState.status = 'completed';
    newState.winner = gameOver.winner.id;
  }
  
  return newState;
} 