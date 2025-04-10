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
  [ActionType.Steal]: ['ambassador', 'captain'],
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
    'ambassador', 'ambassador', 'ambassador',
    'contessa', 'contessa', 'contessa'
  ];
  
  // Handle expansions
  if (settings.expansions.inquisitor) {
    // Replace ambassador with inquisitor
    return deck.map(card => card === 'ambassador' ? 'inquisitor' : card);
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
      coins: 2, // Always start with 2 coins
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
    winner: null,
    treasury: 50 // Add a treasury for tracking bank coins
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
      newState.treasury = Math.max(0, (newState.treasury || 50) - 1);
      newState.lastAction = {
        type: action,
        player: playerId,
        result: 'success'
      };
      break;
      
    case ActionType.ForeignAid:
      newState.players[playerIndex].coins += 2;
      newState.treasury = Math.max(0, (newState.treasury || 50) - 2);
      newState.lastAction = {
        type: action,
        player: playerId,
        result: 'success'
      };
      break;
      
    case ActionType.Tax:
      newState.players[playerIndex].coins += 3;
      newState.treasury = Math.max(0, (newState.treasury || 50) - 3);
      newState.lastAction = {
        type: action,
        player: playerId,
        result: 'success'
      };
      break;
      
    case ActionType.Exchange:
      // Draw two cards from the deck
      const drawnCards = newState.deck.splice(0, 2);
      
      // Create a card selection state to handle the exchange
      newState.cardSelection = {
        playerId: playerId,
        reason: 'exchange',
        validCards: [...drawnCards, ...newState.players[playerIndex].cards.filter(c => !c.revealed).map(c => c.type)],
        action: action
      };
      
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
  let loopCount = 0;
  
  // Skip eliminated players, but prevent infinite loop
  while (newState.players[nextPlayerIndex].eliminated && loopCount < newState.players.length) {
    nextPlayerIndex = (nextPlayerIndex + 1) % newState.players.length;
    loopCount++;
  }
  
  // Only update current player if we found a valid next player
  if (loopCount < newState.players.length) {
    newState.currentPlayerIndex = nextPlayerIndex;
  }
  
  // Check if game is over
  const activePlayers = newState.players.filter(p => !p.eliminated);
  if (activePlayers.length === 1) {
    newState.status = 'completed';
    newState.winner = activePlayers[0].id;
  }
  
  return newState;
}

// Handle a challenge
export function handleChallenge(
  gameState: GameState,
  challengerId: string,
  actionPlayerId: string,
  actionType: ActionType
): GameState {
  const newState: GameState = JSON.parse(JSON.stringify(gameState));
  
  const challengerIndex = newState.players.findIndex(p => p.id === challengerId);
  const actionPlayerIndex = newState.players.findIndex(p => p.id === actionPlayerId);
  
  if (challengerIndex === -1 || actionPlayerIndex === -1) return newState;
  
  // Get the card that should be shown for this action
  const requiredCards = actionType in characterActions ? characterActions[actionType as keyof typeof characterActions] : [];
  
  // Check if the player has the claimed card
  const hasClaimedCard = newState.players[actionPlayerIndex].cards.some(
    card => !card.revealed && requiredCards.includes(card.type)
  );
  
  if (hasClaimedCard) {
    // Challenge fails - challenger loses influence
    const challengerCardIndex = newState.players[challengerIndex].cards.findIndex(
      card => !card.revealed
    );
    
    if (challengerCardIndex !== -1) {
      newState.players[challengerIndex].cards[challengerCardIndex].revealed = true;
      
      // Check if player is eliminated
      if (newState.players[challengerIndex].cards.every(card => card.revealed)) {
        newState.players[challengerIndex].eliminated = true;
      }
    }
    
    // Player who was challenged gets a new card
    const actionPlayerCardIndex = newState.players[actionPlayerIndex].cards.findIndex(
      card => !card.revealed && requiredCards.includes(card.type)
    );
    
    if (actionPlayerCardIndex !== -1) {
      // Return the card to the deck
      newState.deck.push(newState.players[actionPlayerIndex].cards[actionPlayerCardIndex].type);
      
      // Shuffle the deck
      newState.deck = shuffleDeck(newState.deck);
      
      // Draw a new card
      const newCard = newState.deck.pop() as CardType;
      newState.players[actionPlayerIndex].cards[actionPlayerCardIndex].type = newCard;
    }
    
    // Action proceeds
    newState.lastAction = {
      ...newState.lastAction as any,
      result: 'challenged',
      challengeResult: 'failed'
    };
  } else {
    // Challenge succeeds - action player loses influence
    const actionPlayerCardIndex = newState.players[actionPlayerIndex].cards.findIndex(
      card => !card.revealed
    );
    
    if (actionPlayerCardIndex !== -1) {
      newState.players[actionPlayerIndex].cards[actionPlayerCardIndex].revealed = true;
      
      // Check if player is eliminated
      if (newState.players[actionPlayerIndex].cards.every(card => card.revealed)) {
        newState.players[actionPlayerIndex].eliminated = true;
      }
    }
    
    // Action is blocked
    newState.lastAction = {
      ...newState.lastAction as any,
      result: 'challenged',
      challengeResult: 'succeeded'
    };
    
    // Refund any costs if the action was paid for
    const actionCost = actionCosts[actionType] || 0;
    if (actionCost > 0) {
      newState.players[actionPlayerIndex].coins += actionCost;
    }
  }
  
  return newState;
}

// Handle a counteraction (block)
export function handleCounterAction(
  gameState: GameState,
  blockerId: string, 
  actionType: ActionType,
  blockingCard: CardType
): GameState {
  const newState: GameState = JSON.parse(JSON.stringify(gameState));
  
  // Check if the action is blockable
  const validBlockingCards = actionType in blockableActions ? blockableActions[actionType as keyof typeof blockableActions] : [];
  if (!validBlockingCards.includes(blockingCard)) {
    return newState;
  }
  
  // Set up challenge state for the block claim
  newState.currentAction = {
    type: 'block',
    player: blockerId,
    blockingCard,
    targetAction: actionType,
    challengeable: true,
    blockable: false
  } as any;
  
  // Action is temporarily blocked pending challenge
  newState.lastAction = {
    ...newState.lastAction as any,
    result: 'blocked',
    blocker: blockerId,
    blockingCard
  };
  
  return newState;
}

// Resolve a block that was not challenged
export function resolveBlock(
  gameState: GameState,
  blockerId: string,
  actionType: ActionType
): GameState {
  const newState: GameState = JSON.parse(JSON.stringify(gameState));
  
  // Action is blocked - set appropriate state
  newState.lastAction = {
    ...newState.lastAction as any,
    result: 'blocked',
    finalResult: 'blocked'
  };
  
  // Clear the current action
  newState.currentAction = null;
  
  return newState;
}

// Complete an exchange action by selecting which cards to keep
export function completeExchange(
  gameState: GameState,
  playerId: string,
  selectedCards: CardType[]
): GameState {
  const newState: GameState = JSON.parse(JSON.stringify(gameState));
  
  const playerIndex = newState.players.findIndex(p => p.id === playerId);
  if (playerIndex === -1) return newState;
  
  // Ensure player keeps the right number of cards
  const player = newState.players[playerIndex];
  const nonRevealedCount = player.cards.filter(card => !card.revealed).length;
  
  if (selectedCards.length !== nonRevealedCount) {
    // Invalid selection - must keep same number of cards
    return newState;
  }
  
  // Determine all cards that were available for selection
  const currentCardSelection = newState.cardSelection;
  if (!currentCardSelection || currentCardSelection.playerId !== playerId || currentCardSelection.reason !== 'exchange') {
    // Invalid state
    return newState;
  }
  
  // Replace player's non-revealed cards with selected cards
  let selectedIdx = 0;
  for (let i = 0; i < player.cards.length; i++) {
    if (!player.cards[i].revealed) {
      // Replace this card with the selected one
      player.cards[i].type = selectedCards[selectedIdx];
      selectedIdx++;
    }
  }
  
  // Return remaining cards to the deck and shuffle
  const remainingCards = currentCardSelection.validCards.filter(
    card => !selectedCards.includes(card)
  );
  
  newState.deck = [...newState.deck, ...remainingCards];
  newState.deck = shuffleDeck(newState.deck);
  
  // Clear card selection state
  newState.cardSelection = undefined;
  
  return newState;
} 