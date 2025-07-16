import { HandEvaluator } from "./HandEvaluator";
import { Card, Player, GameState, PlayerAction } from "@shared/schema";

export class PokerGame {
  private gameState: GameState;
  private deck: Card[] = [];
  private handEvaluator: HandEvaluator;
  private onStateChange?: (gameState: GameState) => void;
  private confirmationTimer?: NodeJS.Timeout;
  private allInRevealTimer?: NodeJS.Timeout;
  private blindIncreaseTimer?: NodeJS.Timeout;

  constructor(roomCode: string, options: {
    maxPlayers: number;
    smallBlind: number;
    bigBlind: number;
  }) {
    this.handEvaluator = new HandEvaluator();
    this.gameState = {
      id: roomCode,
      roomCode,
      players: [],
      communityCards: [],
      pot: 0,
      sidePots: [],
      currentBet: 0,
      minRaise: options.bigBlind,
      stage: 'settings',
      currentPlayerIndex: 0,
      dealerPosition: 0,
      smallBlindPosition: 0,
      bigBlindPosition: 0,
      smallBlind: options.smallBlind,
      bigBlind: options.bigBlind,
      maxPlayers: options.maxPlayers,
      isActive: true,
      gameSettings: {
        startingChips: 1000,
        initialSmallBlind: options.smallBlind,
        initialBigBlind: options.bigBlind
      }
    };
  }

  addPlayer(playerId: string, playerName: string): { success: boolean; error?: string } {
    if (this.gameState.players.length >= this.gameState.maxPlayers) {
      return { success: false, error: "Game is full" };
    }

    if (this.gameState.players.find(p => p.id === playerId)) {
      return { success: false, error: "Player already in game" };
    }

    // Set first player as host
    if (this.gameState.players.length === 0) {
      this.gameState.hostPlayerId = playerId;
    }

    const newPlayer: Player = {
      id: playerId,
      name: playerName,
      chips: this.gameState.gameSettings?.startingChips || 1000,
      position: this.gameState.players.length,
      cards: [],
      currentBet: 0,
      hasActed: false,
      hasFolded: false,
      isAllIn: false,
      isActive: true
    };

    this.gameState.players.push(newPlayer);
    this.notifyStateChange();

    // Don't auto-start game - wait for manual start
    return { success: true };
  }

  removePlayer(playerId: string): { success: boolean; error?: string } {
    const playerIndex = this.gameState.players.findIndex(p => p.id === playerId);
    if (playerIndex === -1) {
      return { success: false, error: "Player not found" };
    }

    this.gameState.players.splice(playerIndex, 1);

    // Adjust positions
    this.gameState.players.forEach((player, index) => {
      player.position = index;
    });

    // If game is in progress and we have less than 2 players, end the game
    if (this.gameState.players.length < 2 && this.gameState.stage !== 'waiting') {
      this.endGame();
    }

    this.notifyStateChange();
    return { success: true };
  }

  handlePlayerAction(playerId: string, action: PlayerAction): { success: boolean; error?: string } {
    const player = this.gameState.players.find(p => p.id === playerId);
    if (!player) {
      return { success: false, error: "Player not found" };
    }

    const currentPlayer = this.gameState.players[this.gameState.currentPlayerIndex];
    if (!currentPlayer || currentPlayer.id !== playerId) {
      return { success: false, error: "Not your turn" };
    }

    if (this.gameState.stage === 'waiting' || this.gameState.stage === 'ended') {
      return { success: false, error: "Game not in progress" };
    }

    const result = this.processPlayerAction(player, action);
    if (!result.success) {
      return result;
    }

    this.gameState.lastAction = {
      playerId,
      action: action.type,
      amount: action.amount
    };

    // Move to next player or next stage
    this.advanceGame();
    
    // Always notify state change after player action
    this.notifyStateChange();

    return { success: true };
  }

  // Manual game start method
  startGame(): { success: boolean; error?: string } {
    if (this.gameState.players.length < 2) {
      return { success: false, error: "Need at least 2 players to start" };
    }

    if (this.gameState.stage !== 'settings' && this.gameState.stage !== 'waiting' && this.gameState.stage !== 'ended') {
      return { success: false, error: "Game already in progress" };
    }

    // Move from settings to waiting stage first
    if (this.gameState.stage === 'settings') {
      this.gameState.stage = 'waiting';
    }

    this.startNewHand();
    this.notifyStateChange();
    return { success: true };
  }

  private processPlayerAction(player: Player, action: PlayerAction): { success: boolean; error?: string } {
    const totalChipsBefore = this.gameState.players.reduce((sum, p) => sum + p.chips, 0);
    const potBefore = this.gameState.pot;
    
    console.log(`${player.name} 액션 ${action.type} 전 - 총 칩: $${totalChipsBefore}, 팟: $${potBefore}, 총계: $${totalChipsBefore + potBefore}`);
    
    switch (action.type) {
      case 'fold':
        player.hasFolded = true;
        player.hasActed = true;
        player.lastAction = { type: 'fold' };
        break;

      case 'check':
        // Player can check if no one has bet more than their current bet
        if (this.gameState.currentBet > player.currentBet) {
          return { success: false }; // Silently reject invalid check
        }
        player.hasActed = true;
        player.lastAction = { type: 'check' };
        break;

      case 'call':
        const callAmount = this.gameState.currentBet - player.currentBet;
        if (player.chips < callAmount) {
          // All-in
          this.gameState.pot += player.chips;
          player.currentBet += player.chips;
          player.chips = 0;
          player.isAllIn = true;
        } else {
          player.chips -= callAmount;
          player.currentBet += callAmount;
          this.gameState.pot += callAmount;
        }
        player.hasActed = true;
        player.lastAction = { type: 'call', amount: callAmount };
        break;

      case 'bet':
        if (!action.amount || action.amount < this.gameState.minRaise || 
            this.gameState.currentBet > 0 || player.chips < action.amount) {
          return { success: false }; // Silently reject invalid bets
        }
        
        player.chips -= action.amount;
        player.currentBet = action.amount;
        this.gameState.pot += action.amount;
        this.gameState.currentBet = action.amount;
        this.gameState.minRaise = action.amount;
        player.hasActed = true;
        player.lastAction = { type: 'bet', amount: action.amount };
        
        // Reset other players' hasActed status for bet action
        this.gameState.players.forEach(p => {
          if (p.id !== player.id && !p.hasFolded) {
            p.hasActed = false;
          }
        });
        break;

      case 'raise':
        if (!action.amount) {
          return { success: false }; // Silently reject invalid raises
        }
        
        const callAmount2 = this.gameState.currentBet - player.currentBet;
        const totalRaise = callAmount2 + action.amount;
        
        if (action.amount < this.gameState.minRaise || player.chips < totalRaise) {
          return { success: false }; // Silently reject invalid raises
        }
        
        player.chips -= totalRaise;
        player.currentBet = this.gameState.currentBet + action.amount;
        this.gameState.pot += totalRaise;
        this.gameState.currentBet = player.currentBet;
        this.gameState.minRaise = action.amount;
        player.hasActed = true;
        player.lastAction = { type: 'raise', amount: action.amount };
        
        // Reset other players' hasActed status
        this.gameState.players.forEach(p => {
          if (p.id !== player.id && !p.hasFolded) {
            p.hasActed = false;
          }
        });
        break;

      case 'allIn':
        this.gameState.pot += player.chips;
        player.currentBet += player.chips;
        if (player.currentBet > this.gameState.currentBet) {
          this.gameState.currentBet = player.currentBet;
          // Reset other players' hasActed status
          this.gameState.players.forEach(p => {
            if (p.id !== player.id && !p.hasFolded) {
              p.hasActed = false;
            }
          });
        }
        const allInAmount = player.chips;
        player.chips = 0;
        player.isAllIn = true;
        player.hasActed = true;
        player.lastAction = { type: 'allIn', amount: allInAmount };
        break;

      default:
        return { success: false, error: "Invalid action" };
    }

    const totalChipsAfter = this.gameState.players.reduce((sum, p) => sum + p.chips, 0);
    const potAfter = this.gameState.pot;
    
    console.log(`${player.name} 액션 ${action.type} 후 - 총 칩: $${totalChipsAfter}, 팟: $${potAfter}, 총계: $${totalChipsAfter + potAfter}`);
    
    const chipDifference = (totalChipsBefore + potBefore) - (totalChipsAfter + potAfter);
    if (chipDifference !== 0) {
      console.error(`🚨 칩 손실 발생! ${chipDifference > 0 ? '손실' : '증가'}: $${Math.abs(chipDifference)}`);
    }

    return { success: true };
  }

  private advanceGame(): void {
    // Check if only one player remains who hasn't folded (include all-in players)
    const remainingPlayers = this.gameState.players.filter(p => !p.hasFolded);
    if (remainingPlayers.length === 1) {
      // Award pot to the remaining player immediately
      const winner = remainingPlayers[0];
      winner.chips += this.gameState.pot;
      
      this.gameState.lastAction = {
        playerId: winner.name,
        action: 'win by fold',
        amount: this.gameState.pot
      };
      
      this.gameState.stage = 'ended';
      this.startConfirmationTimer();
      this.notifyStateChange();
      return;
    }

    // Check if betting round is complete BEFORE moving to next player
    if (this.isBettingRoundComplete()) {
      this.advanceStage();
      return;
    }

    // Find next player who can act (exclude folded and truly eliminated players)
    let nextPlayerIndex = (this.gameState.currentPlayerIndex + 1) % this.gameState.players.length;
    let attempts = 0;
    
    while (attempts < this.gameState.players.length) {
      const player = this.gameState.players[nextPlayerIndex];
      // Only exclude folded players and permanently eliminated players (isActive = false)
      // All-in players and players with 0 chips but still active should be able to act
      if (!player.hasFolded && player.isActive && player.chips > 0 && !player.isAllIn) {
        this.gameState.currentPlayerIndex = nextPlayerIndex;
        return;
      }
      nextPlayerIndex = (nextPlayerIndex + 1) % this.gameState.players.length;
      attempts++;
    }

    // If no active players found, advance to next stage
    console.log("No active players found, advancing to showdown");
    this.advanceStage();
  }

  private isBettingRoundComplete(): boolean {
    // Players who can still act (not folded, not all-in, have chips, and are active)
    const playersWhoCanAct = this.gameState.players.filter(p => !p.hasFolded && !p.isAllIn && p.chips > 0 && p.isActive);
    // All players still in the hand (not folded, includes all-in players)
    const remainingPlayers = this.gameState.players.filter(p => !p.hasFolded && p.isActive);
    
    console.log(`베팅 라운드 체크: 활성 플레이어 ${playersWhoCanAct.length}명, 남은 플레이어 ${remainingPlayers.length}명`);
    
    // If no players who can act left (all folded or all-in), end round immediately
    if (playersWhoCanAct.length === 0) {
      console.log("모든 플레이어가 폴드하거나 올인 - 베팅 라운드 완료");
      
      // Save betting information NOW before it gets reset - but only if not already saved for this hand
      if (!(this.gameState as any).allInBettingInfo) {
        // Calculate total contribution for each player (including all betting rounds)
        const allInBettingInfo = this.gameState.players.map(p => {
          let totalContribution = 0;
          
          // Add contribution from all previous betting rounds
          if ((this.gameState as any).savedBettingInfo) {
            const allSavedInfo = (this.gameState as any).savedBettingInfo.filter((info: any) => info.id === p.id);
            totalContribution = allSavedInfo.reduce((sum: number, info: any) => sum + (info.currentBet || 0), 0);
          }
          
          // Add current betting round contribution
          totalContribution += p.currentBet;
          
          return {
            id: p.id,
            name: p.name,
            currentBet: p.currentBet,
            hasFolded: p.hasFolded,
            totalChipsInPot: totalContribution // Accurate total amount contributed to pot
          };
        });
        (this.gameState as any).allInBettingInfo = allInBettingInfo;
        console.log("올인 상황에서 실제 베팅 정보 저장:", allInBettingInfo);
      }
      
      return true;
    }

    // If only one player remains in the hand (everyone else folded), end immediately
    if (remainingPlayers.length === 1) {
      console.log("한 명만 남음 - 베팅 라운드 완료");
      return true;
    }

    // If only one player who can act left (others are all-in), and they have matched the current bet, end round
    if (playersWhoCanAct.length === 1) {
      const lastPlayer = playersWhoCanAct[0];
      console.log(`마지막 활성 플레이어: ${lastPlayer.name}, 행동함: ${lastPlayer.hasActed}, 베팅: ${lastPlayer.currentBet}, 현재베팅: ${this.gameState.currentBet}`);
      
      // Special case: if everyone else is all-in and this player has acted, round is complete
      if (lastPlayer.hasActed) {
        console.log("마지막 플레이어가 행동 완료 - 베팅 라운드 완료");
        return true;
      }
      
      // They still need to act
      console.log("마지막 플레이어가 아직 행동해야 함");
      return false;
    }



    // Check if all players who can act have acted and bets are equal
    const allActed = playersWhoCanAct.every(p => p.hasActed);
    const allBetsEqual = playersWhoCanAct.every(p => p.currentBet === this.gameState.currentBet);
    
    console.log(`모든 플레이어 행동: ${allActed}, 모든 베팅 동일: ${allBetsEqual}`);
    
    return allActed && allBetsEqual;
  }

  private getFirstToAct(): number {
    let startPosition: number;
    
    if (this.gameState.stage === 'preflop') {
      // Preflop: action starts left of big blind (UTG)
      startPosition = (this.gameState.bigBlindPosition + 1) % this.gameState.players.length;
    } else {
      // Post-flop: action starts left of dealer (small blind position)
      startPosition = (this.gameState.dealerPosition + 1) % this.gameState.players.length;
    }
    
    // Find first player who can act (exclude folded and eliminated, but not all-in)
    let attempts = 0;
    let currentPosition = startPosition;
    
    while (attempts < this.gameState.players.length) {
      const player = this.gameState.players[currentPosition];
      if (player.chips > 0 && !player.hasFolded && !player.isAllIn) {
        return currentPosition;
      }
      currentPosition = (currentPosition + 1) % this.gameState.players.length;
      attempts++;
    }
    
    // If no active players found, return the original start position as fallback
    return startPosition;
  }

  private advanceStage(): void {
    const totalChipsBefore = this.gameState.players.reduce((sum, p) => sum + p.chips, 0);
    const potBefore = this.gameState.pot;
    console.log(`스테이지 전환 전 - 총 칩: $${totalChipsBefore}, 팟: $${potBefore}, 총계: $${totalChipsBefore + potBefore}`);
    
    // Save betting information before resetting (accumulate across all rounds)
    if (!(this.gameState as any).savedBettingInfo) {
      (this.gameState as any).savedBettingInfo = [];
    }
    
    // Add current round betting info to the accumulated list
    const currentRoundBetting = this.gameState.players.map(p => ({
      id: p.id,
      name: p.name,
      currentBet: p.currentBet, // What they bet this specific round
      hasFolded: p.hasFolded,
      round: this.gameState.stage // Track which round this was
    }));
    
    (this.gameState as any).savedBettingInfo.push(...currentRoundBetting);
    console.log("베팅 정보 저장:", currentRoundBetting);
    
    // Reset player states for next betting round (but DON'T add to pot again)
    this.gameState.players.forEach(player => {
      player.hasActed = false;
      player.currentBet = 0; // Reset without adding to pot (already added during actions)
      player.lastAction = undefined;
    });
    
    // Reset current bet for new betting round
    this.gameState.currentBet = 0;
    this.gameState.minRaise = this.gameState.bigBlind;
    
    const totalChipsAfter = this.gameState.players.reduce((sum, p) => sum + p.chips, 0);
    const potAfter = this.gameState.pot;
    console.log(`스테이지 전환 후 - 총 칩: $${totalChipsAfter}, 팟: $${potAfter}, 총계: $${totalChipsAfter + potAfter}`);
    
    const chipDifference = (totalChipsBefore + potBefore) - (totalChipsAfter + potAfter);
    if (chipDifference !== 0) {
      console.error(`🚨 스테이지 전환에서 칩 손실! ${chipDifference > 0 ? '손실' : '증가'}: $${Math.abs(chipDifference)}`);
    }

    // Check if only one player remains (everyone else folded)
    const remainingPlayers = this.gameState.players.filter(p => !p.hasFolded);
    if (remainingPlayers.length === 1) {
      // Award pot to the remaining player
      const winner = remainingPlayers[0];
      winner.chips += this.gameState.pot;
      
      this.gameState.lastAction = {
        playerId: winner.name,
        action: 'win by fold',
        amount: this.gameState.pot
      };
      
      this.gameState.stage = 'ended';
      this.startConfirmationTimer();
      this.notifyStateChange();
      return;
    }

    switch (this.gameState.stage) {
      case 'preflop':
        this.gameState.stage = 'flop';
        this.dealFlop();
        break;
      case 'flop':
        this.gameState.stage = 'turn';
        this.dealTurn();
        break;
      case 'turn':
        this.gameState.stage = 'river';
        this.dealRiver();
        break;
      case 'river':
        this.gameState.stage = 'showdown';
        this.handleShowdown();
        return; // Don't set current player for showdown
      default:
        this.endHand();
        return;
    }

    // Set first active player for new betting round
    this.gameState.currentPlayerIndex = this.getFirstToAct();
    
    // Check if there are any players who can still act (not folded, not all-in, have chips)
    const playersWhoCanAct = this.gameState.players.filter(p => !p.hasFolded && !p.isAllIn && p.chips > 0);
    
    if (playersWhoCanAct.length === 0) {
      console.log('모든 활성 플레이어가 올인 - 박진감을 위해 패와 카드 공개');
      const remainingPlayers = this.gameState.players.filter(p => !p.hasFolded);
      
      // If multiple players are still in, start dramatic reveal sequence
      if (remainingPlayers.length > 1) {
        this.startDramaticAllInReveal();
      } else {
        // Only one player left, go straight to showdown
        this.gameState.stage = 'showdown';
        this.handleShowdown();
      }
    }
  }

  private startNewHand(): void {
    // Need at least 2 players to start
    if (this.gameState.players.length < 2) {
      return;
    }

    // Track players' chip count at start of hand for elimination tracking
    (this.gameState as any).playersAtHandStart = this.gameState.players.map(p => ({
      id: p.id,
      name: p.name,
      chips: p.chips,
      position: p.position
    }));

    // Host rights are no longer transferred automatically

    // Step 2: Create new deck and shuffle
    this.initializeDeck();
    this.shuffleDeck();
    
    // Step 2: COMPLETE reset of all game state including dramatic reveal flags
    this.gameState.communityCards = [];
    this.gameState.pot = 0;
    this.gameState.sidePots = [];
    this.gameState.currentBet = 0;
    this.gameState.minRaise = this.gameState.bigBlind;
    this.gameState.stage = 'preflop';
    this.gameState.lastAction = undefined;
    this.gameState.showdownHands = undefined;
    
    // Clear all dramatic reveal and betting info flags
    (this.gameState as any).savedBettingInfo = undefined;
    (this.gameState as any).allInBettingInfo = undefined;
    (this.gameState as any).dramaticReveal = false;
    (this.gameState as any).showAllHoleCards = false;

    // Step 3: Reset all player states and identify eliminated players
    this.gameState.players.forEach(player => {
      // Check bankruptcy BEFORE resetting states
      const isBankrupt = player.chips <= 0;
      
      player.cards = [];
      player.currentBet = 0;
      player.hasActed = false;
      player.hasFolded = false;
      player.isAllIn = false;
      
      // Mark bankrupt players as inactive
      if (isBankrupt) {
        player.hasFolded = true;
        player.isActive = false;
        console.log(`Player ${player.name} is bankrupt and excluded from new hand`);
      } else {
        // Player has chips, keep them active
        player.isActive = true;
      }
      player.lastAction = undefined;
    });

    // Step 4: Set blind positions
    this.setBlindPositions();

    // Step 5: Post blinds
    this.postBlinds();

    // Step 6: Deal hole cards to players first
    this.dealHoleCards();

    // Step 7: Pre-deal community cards (5 cards from remaining deck, but keep them hidden)
    this.preDealCommunityCards();

    // Step 8: Set current player for preflop using updated logic
    this.gameState.currentPlayerIndex = this.getFirstToAct();

    // Step 9: Reset hasActed for proper preflop action
    this.gameState.players.forEach(player => {
      player.hasActed = false;
    });
  }

  private preDealCommunityCards(): void {
    // Pre-deal 5 community cards from the remaining deck
    // These will be stored but not revealed until appropriate stages
    const communityCards: Card[] = [];
    for (let i = 0; i < 5; i++) {
      if (this.deck.length > 0) {
        communityCards.push(this.deck.pop()!);
      }
    }
    // Store all 5 cards immediately - they exist but are hidden in preflop
    this.gameState.communityCards = communityCards;
  }

  private setBlindPositions(): void {
    const activePlayers = this.gameState.players.filter(p => p.chips > 0);
    const activePlayerCount = activePlayers.length;
    
    if (activePlayerCount < 2) {
      console.error('Not enough active players for blinds');
      return;
    }
    
    // Find active player positions
    const activePositions = activePlayers.map(p => p.position);
    
    // If there's a last game winner, start dealer position from them
    if (this.gameState.lastGameWinner) {
      const winner = this.gameState.players.find(p => p.id === this.gameState.lastGameWinner!.playerId);
      if (winner && winner.chips > 0) {
        this.gameState.dealerPosition = winner.position;
        console.log(`딜러 포지션을 이전 게임 승자 ${winner.name}부터 시작`);
        // Clear the winner record after using it
        this.gameState.lastGameWinner = undefined;
      }
    }
    
    // Find dealer position among active players
    let dealerIndex = activePositions.indexOf(this.gameState.dealerPosition);
    if (dealerIndex === -1) {
      // Current dealer is eliminated, find next active dealer
      let nextDealer = this.gameState.dealerPosition;
      while (!this.gameState.players[nextDealer] || this.gameState.players[nextDealer].chips <= 0) {
        nextDealer = (nextDealer + 1) % this.gameState.players.length;
      }
      this.gameState.dealerPosition = nextDealer;
      dealerIndex = activePositions.indexOf(nextDealer);
    }
    
    if (activePlayerCount === 2) {
      // Heads-up: dealer is small blind, other player is big blind
      this.gameState.smallBlindPosition = activePositions[dealerIndex];
      this.gameState.bigBlindPosition = activePositions[(dealerIndex + 1) % activePlayerCount];
    } else {
      // 3+ players: small blind is next to dealer, big blind is after small blind
      this.gameState.smallBlindPosition = activePositions[(dealerIndex + 1) % activePlayerCount];
      this.gameState.bigBlindPosition = activePositions[(dealerIndex + 2) % activePlayerCount];
    }
  }

  private postBlinds(): void {
    const totalChipsBefore = this.gameState.players.reduce((sum, p) => sum + p.chips, 0);
    console.log(`블라인드 전 총 칩: $${totalChipsBefore}`);
    
    const smallBlindPlayer = this.gameState.players[this.gameState.smallBlindPosition];
    const bigBlindPlayer = this.gameState.players[this.gameState.bigBlindPosition];

    // Safety check
    if (!smallBlindPlayer || !bigBlindPlayer) {
      console.error('Invalid blind positions:', {
        playerCount: this.gameState.players.length,
        smallBlindPos: this.gameState.smallBlindPosition,
        bigBlindPos: this.gameState.bigBlindPosition
      });
      return;
    }

    // Small blind
    const smallBlindAmount = Math.min(smallBlindPlayer.chips, this.gameState.smallBlind);
    smallBlindPlayer.chips -= smallBlindAmount;
    smallBlindPlayer.currentBet = smallBlindAmount;
    this.gameState.pot += smallBlindAmount;

    // Big blind
    const bigBlindAmount = Math.min(bigBlindPlayer.chips, this.gameState.bigBlind);
    bigBlindPlayer.chips -= bigBlindAmount;
    bigBlindPlayer.currentBet = bigBlindAmount;
    this.gameState.pot += bigBlindAmount;

    // Set current bet to big blind
    this.gameState.currentBet = bigBlindAmount;

    // Mark if all-in
    if (smallBlindPlayer.chips === 0) smallBlindPlayer.isAllIn = true;
    if (bigBlindPlayer.chips === 0) bigBlindPlayer.isAllIn = true;
    
    const totalChipsAfter = this.gameState.players.reduce((sum, p) => sum + p.chips, 0);
    console.log(`블라인드 후 총 칩: $${totalChipsAfter}, 팟: $${this.gameState.pot}, 총계: $${totalChipsAfter + this.gameState.pot}`);
  }

  private dealHoleCards(): void {
    // Deal 2 cards to active players who:
    // 1. Have chips at start of hand OR are all-in (participated in blinds)
    // 2. Are not folded
    // 3. Are not bankrupt from previous hands
    for (let i = 0; i < 2; i++) {
      this.gameState.players.forEach(player => {
        // Player gets cards if:
        // - Has chips OR is all-in (participated this hand)
        // - Is active and not folded
        const hasChipsOrAllIn = player.chips > 0 || (player.isAllIn && player.currentBet > 0);
        if (player.isActive && !player.hasFolded && hasChipsOrAllIn && this.deck.length > 0) {
          player.cards.push(this.deck.pop()!);
        }
      });
    }
  }

  private dealFlop(): void {
    // Cards are already pre-dealt in preDealCommunityCards()
    // Flop stage just allows revealing the first 3 cards
    // No action needed - cards are already in gameState.communityCards
  }

  private dealTurn(): void {
    // Cards are already pre-dealt in preDealCommunityCards()
    // Turn stage just allows revealing the 4th card
    // No action needed - cards are already in gameState.communityCards
  }

  private dealRiver(): void {
    // Cards are already pre-dealt in preDealCommunityCards()
    // River stage just allows revealing the 5th card
    // No action needed - cards are already in gameState.communityCards
  }

  private handleShowdown(): void {
    console.log("=== 새로운 쇼다운 시스템 ===");
    const activePlayers = this.gameState.players.filter(p => !p.hasFolded);
    
    // Use all-in betting information if available, otherwise use current pot
    const allInBettingInfo = (this.gameState as any).allInBettingInfo || [];
    console.log("올인 베팅 정보:", allInBettingInfo);
    
    if (activePlayers.length === 1) {
      // Only one player left, they win everything
      const winner = activePlayers[0];
      const totalPot = this.gameState.pot + this.gameState.sidePots.reduce((sum, sp) => sum + sp.amount, 0);
      winner.chips += totalPot;
      this.gameState.lastAction = {
        playerId: winner.name,
        action: 'wins by fold',
        amount: totalPot
      };
      console.log(`${winner.name}이 폴드로 승리하여 $${totalPot} 획득`);
    } else {
      // Evaluate hands and determine winners FIRST
      const handRankings = activePlayers.map(player => ({
        player,
        hand: this.handEvaluator.evaluateHand([...player.cards, ...this.gameState.communityCards])
      }));

      // Store showdown hands for display BEFORE distribution
      this.gameState.showdownHands = handRankings.map(ranking => ({
        playerId: ranking.player.id,
        playerName: ranking.player.name,
        holeCards: [...ranking.player.cards], // Store player's 2 hole cards
        hand: ranking.hand,
        isWinner: false, // Will be updated below
        totalWinnings: 0 // Will be updated during pot distribution
      }));

      // Use all-in betting info for proper side pot distribution
      this.distributePotsCorrectly(activePlayers, allInBettingInfo);

      // Distribute side pots and main pot
      if (this.gameState.sidePots.length > 0) {
        this.distributeSidePots(handRankings);
      } else {
        // No side pots, simple distribution
        handRankings.sort((a, b) => this.handEvaluator.compareHands(b.hand, a.hand));
        
        const bestHand = handRankings[0].hand;
        const winners = handRankings.filter(h => 
          this.handEvaluator.compareHands(h.hand, bestHand) === 0
        );

        const winAmount = Math.floor(this.gameState.pot / winners.length);
        const remainder = this.gameState.pot % winners.length;
        
        winners.forEach((winner, index) => {
          const award = winAmount + (index === 0 ? remainder : 0);
          winner.player.chips += award;
          
          // Update showdown hands with winnings
          if (this.gameState.showdownHands) {
            const showdownHand = this.gameState.showdownHands.find(sh => sh.playerId === winner.player.id);
            if (showdownHand) {
              showdownHand.totalWinnings = (showdownHand.totalWinnings || 0) + award;
            }
          }
        });

        // Mark winners in showdown hands
        if (this.gameState.showdownHands) {
          this.gameState.showdownHands.forEach(showdownHand => {
            showdownHand.isWinner = winners.some(w => w.player.id === showdownHand.playerId);
          });
        }

        // Set winner information for display
        if (winners.length === 1) {
          this.gameState.lastAction = {
            playerId: winners[0].player.name,
            action: `wins with ${bestHand.description}`,
            amount: this.gameState.pot,
            winningHand: bestHand
          };
        } else {
          this.gameState.lastAction = {
            playerId: winners.map(w => w.player.name).join(', '),
            action: `split pot with ${bestHand.description}`,
            amount: this.gameState.pot,
            winningHand: bestHand
          };
        }
      }
    }

    // Check if host was eliminated and transfer host rights immediately (but preserve winner display)
    const currentHost = this.gameState.players.find(p => p.id === this.gameState.hostPlayerId);
    if (currentHost && currentHost.chips === 0) {
      console.log(`Host ${currentHost.name} was eliminated in showdown, transferring host rights immediately`);
      this.transferHostRightsQuietly();
    }

    // Reset pot and side pots
    this.gameState.pot = 0;
    this.gameState.sidePots = [];

    // Start confirmation timer for winner display
    this.startConfirmationTimer();
    this.notifyStateChange();
  }

  private endHand(): void {
    // Check for eliminated players and auto-increase blinds if someone was eliminated
    const eliminatedCount = this.checkForEliminatedPlayers();

    // Check if host was eliminated and transfer host rights before starting next hand
    const currentHost = this.gameState.players.find(p => p.id === this.gameState.hostPlayerId);
    if (currentHost && currentHost.chips === 0) {
      console.log(`Host ${currentHost.name} was eliminated, transferring host rights`);
      this.transferHostRights();
    }

    // Check if game should continue
    const activePlayers = this.gameState.players.filter(p => p.chips > 0);
    if (activePlayers.length < 2) {
      this.endGame();
      this.notifyStateChange();
      return;
    }

    // Auto-increase blinds if players were eliminated (exponential increase)
    if (eliminatedCount > 0) {
      const multiplier = Math.pow(2, eliminatedCount); // 2^eliminatedCount
      this.gameState.bigBlind *= multiplier;
      this.gameState.smallBlind = Math.floor(this.gameState.bigBlind / 2);
      this.gameState.minRaise = this.gameState.bigBlind;
      console.log(`플레이어 ${eliminatedCount}명 제거로 인한 블라인드 ${multiplier}배 증가: ${this.gameState.smallBlind}/${this.gameState.bigBlind}`);
    }

    // Move dealer button to next active player (텍사스 홀덤 룰)
    this.gameState.dealerPosition = (this.gameState.dealerPosition + 1) % this.gameState.players.length;

    // Start next hand immediately
    this.resetGameState();
    this.startNewHand();
    
    // Always notify state change after any game transition
    this.notifyStateChange();
  }

  private resetGameState(): void {
    // Clear timers
    if (this.confirmationTimer) {
      clearTimeout(this.confirmationTimer);
      this.confirmationTimer = undefined;
    }
    if (this.allInRevealTimer) {
      clearTimeout(this.allInRevealTimer);
      this.allInRevealTimer = undefined;
    }
    if (this.blindIncreaseTimer) {
      clearTimeout(this.blindIncreaseTimer);
      this.blindIncreaseTimer = undefined;
    }

    // Clear all game state immediately
    this.gameState.lastAction = undefined;
    this.gameState.winnerConfirmations = undefined;
    this.gameState.stage = 'waiting';
    this.gameState.communityCards = [];
    this.gameState.pot = 0;
    this.gameState.sidePots = [];
    this.gameState.currentBet = 0;
    this.gameState.minRaise = this.gameState.bigBlind;
    this.gameState.currentPlayerIndex = 0;
    
    // Clear all player cards and betting state immediately
    this.gameState.players.forEach(player => {
      player.cards = [];
      player.currentBet = 0;
      player.hasActed = false;
      player.hasFolded = false;
      player.isAllIn = false;
      player.isActive = true;
    });
  }

  private endGame(): void {
    this.gameState.stage = 'ended';
    this.gameState.isActive = false;
    
    // Transfer host rights to next available player when game ends
    this.transferHostRights();
  }

  private initializeDeck(): void {
    const suits: Card['suit'][] = ['hearts', 'diamonds', 'clubs', 'spades'];
    const ranks: Card['rank'][] = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];
    
    this.deck = [];
    suits.forEach(suit => {
      ranks.forEach(rank => {
        this.deck.push({ suit, rank });
      });
    });
  }

  private shuffleDeck(): void {
    for (let i = this.deck.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [this.deck[i], this.deck[j]] = [this.deck[j], this.deck[i]];
    }
  }

  setOnStateChange(callback: (gameState: GameState) => void): void {
    this.onStateChange = callback;
  }

  restoreGameState(gameState: GameState): void {
    this.gameState = gameState;
  }

  private notifyStateChange(): void {
    if (this.onStateChange) {
      this.onStateChange(this.getGameState());
    }
  }



  private startConfirmationTimer(): void {
    // Clear any existing timer
    if (this.confirmationTimer) {
      clearTimeout(this.confirmationTimer);
    }

    // Initialize winnerConfirmations array
    this.gameState.winnerConfirmations = [];

    // Start 15-second timer - auto-proceed to next hand if not all confirmed
    this.confirmationTimer = setTimeout(() => {
      console.log("승자 확인 타이머 종료 - 자동으로 다음 핸드 시작");
      
      // Check if only one player remains
      const activePlayers = this.gameState.players.filter(p => p.chips > 0);
      if (activePlayers.length === 1) {
        console.log("마지막 생존자 - 게임 초기화");
        const winner = activePlayers[0];
        this.gameState.lastGameWinner = {
          playerId: winner.id,
          playerName: winner.name
        };
        this.resetGameForNewStart();
      } else {
        // Automatically start next hand when timer expires
        this.endHand();
      }
    }, 15000);
  }

  confirmWinner(playerId: string): { success: boolean; error?: string } {
    // Initialize winnerConfirmations array if it doesn't exist
    if (!this.gameState.winnerConfirmations) {
      this.gameState.winnerConfirmations = [];
    }

    // Check if player already confirmed
    if (this.gameState.winnerConfirmations.includes(playerId)) {
      return { success: true }; // Already confirmed, no error
    }

    // Add player to confirmations
    this.gameState.winnerConfirmations.push(playerId);

    // Check if all ACTIVE players (with chips > 0) have confirmed
    const activePlayers = this.gameState.players.filter(p => p.chips > 0);
    const allActivePlayersConfirmed = activePlayers.every(p => 
      this.gameState.winnerConfirmations!.includes(p.id)
    );

    console.log(`승자 확인: ${this.gameState.winnerConfirmations.length}/${activePlayers.length} 활성 플레이어가 확인함`);

    if (allActivePlayersConfirmed) {
      // All active players confirmed, clear timer and stay in ended state
      if (this.confirmationTimer) {
        clearTimeout(this.confirmationTimer);
        this.confirmationTimer = undefined;
      }
      
      // Check if only one player remains
      if (activePlayers.length === 1) {
        console.log("마지막 생존자 - 게임 초기화");
        // Record the winner before resetting
        const winner = activePlayers[0];
        this.gameState.lastGameWinner = {
          playerId: winner.id,
          playerName: winner.name
        };
        console.log(`게임 승자 기록: ${winner.name}`);
        this.resetGameForNewStart();
      } else {
        // Automatically start next hand when all players confirmed
        console.log("모든 플레이어가 승자 확인 완료 - 다음 핸드 자동 시작");
        this.endHand();
      }
    }

    this.notifyStateChange();
    return { success: true };
  }

  private startDramaticAllInReveal(): void {
    console.log("=== 올인 드라마틱 패 공개 시작 ===");
    
    // First, reveal only active (non-folded) players' hole cards for maximum drama
    const remainingPlayers = this.gameState.players.filter(p => !p.hasFolded);
    console.log("활성 플레이어 패 공개:", remainingPlayers.map(p => ({ name: p.name, cards: p.cards })));
    
    // Mark that we're in dramatic reveal mode and reveal hole cards
    (this.gameState as any).dramaticReveal = true;
    (this.gameState as any).showAllHoleCards = true;
    
    // Notify clients to show all hole cards
    this.notifyStateChange();
    
    // Wait 3 seconds for players to see hole cards, then continue with community cards
    this.allInRevealTimer = setTimeout(() => {
      this.continueAllInReveal();
    }, 3000);
  }

  private continueAllInReveal(): void {
    // Continue revealing community cards with dramatic timing
    const currentStage = this.gameState.stage;
    
    switch (currentStage) {
      case 'preflop':
        // Reveal flop
        this.dealFlop();
        this.gameState.stage = 'flop';
        this.notifyStateChange();
        
        this.allInRevealTimer = setTimeout(() => {
          // Reveal turn
          this.dealTurn();
          this.gameState.stage = 'turn';
          this.notifyStateChange();
          
          this.allInRevealTimer = setTimeout(() => {
            // Reveal river
            this.dealRiver();
            this.gameState.stage = 'river';
            this.notifyStateChange();
            
            this.allInRevealTimer = setTimeout(() => {
              // Go to showdown
              this.gameState.stage = 'showdown';
              this.handleShowdown();
            }, 2500);
          }, 2500);
        }, 2500);
        break;
        
      case 'flop':
        // Reveal turn
        this.dealTurn();
        this.gameState.stage = 'turn';
        this.notifyStateChange();
        
        this.allInRevealTimer = setTimeout(() => {
          // Reveal river
          this.dealRiver();
          this.gameState.stage = 'river';
          this.notifyStateChange();
          
          this.allInRevealTimer = setTimeout(() => {
            // Go to showdown
            this.gameState.stage = 'showdown';
            this.handleShowdown();
          }, 2500);
        }, 2500);
        break;
        
      case 'turn':
        // Reveal river
        this.dealRiver();
        this.gameState.stage = 'river';
        this.notifyStateChange();
        
        this.allInRevealTimer = setTimeout(() => {
          // Go to showdown
          this.gameState.stage = 'showdown';
          this.handleShowdown();
        }, 2500);
        break;
        
      default:
        // Already at river or later, go straight to showdown
        this.gameState.stage = 'showdown';
        this.handleShowdown();
        break;
    }
  }

  private startAllInReveal(): void {
    // Legacy function - redirect to dramatic reveal
    this.startDramaticAllInReveal();
  }

  private distributePotsCorrectly(activePlayers: Player[], allInBettingInfo: any[]): void {
    console.log("=== 새로운 사이드팟 시스템 ===");
    console.log("활성 플레이어 현재 상태:", activePlayers.map(p => ({ name: p.name, currentBet: p.currentBet, chips: p.chips })));
    
    // If we have all-in betting info, use it; otherwise use saved betting info or simple pot distribution
    let bettingData = allInBettingInfo;
    if (!allInBettingInfo || allInBettingInfo.length === 0) {
      console.log("올인 정보 없음 - 단순 팟 분배");
      // No complex side pots needed, just distribute the main pot
      this.distributeMainPot(activePlayers);
      return;
    }
    
    // Filter for active players only (not folded, include all-in players)
    const activeBettingInfo = bettingData.filter(info => {
      const player = this.gameState.players.find(p => p.id === info.id);
      return !info.hasFolded && player;
    });
    console.log("활성 플레이어 베팅 데이터:", activeBettingInfo);
    
    // Create proper side pots based on betting amounts
    const sidePots = this.createSidePotsFromBettingInfo(activeBettingInfo);
    console.log("생성된 사이드팟:", sidePots);
    
    // Evaluate hands for all active players
    const handRankings = activePlayers.map(player => ({
      player,
      hand: this.handEvaluator.evaluateHand([...player.cards, ...this.gameState.communityCards])
    }));
    
    // Sort by hand strength (best first)
    handRankings.sort((a, b) => this.handEvaluator.compareHands(b.hand, a.hand));
    
    console.log("핸드 순위:", handRankings.map(hr => ({ 
      name: hr.player.name, 
      hand: hr.hand.description 
    })));
    
    // Distribute each side pot
    let totalAwarded = 0;
    const winnerNames: string[] = [];
    
    for (let i = 0; i < sidePots.length; i++) {
      const pot = sidePots[i];
      console.log(`\n팟 ${i + 1} 분배 (금액: $${pot.amount}, 참여자: ${pot.eligiblePlayers.join(', ')})`);
      
      // Find best hand among eligible players for this pot
      const eligibleHandRankings = handRankings.filter(hr => 
        pot.eligiblePlayers.includes(hr.player.id)
      );
      
      if (eligibleHandRankings.length === 0) continue;
      
      const bestHandForPot = eligibleHandRankings[0].hand;
      const potWinners = eligibleHandRankings.filter(hr => 
        this.handEvaluator.compareHands(hr.hand, bestHandForPot) === 0
      );
      
      // Distribute this pot among winners
      const winAmount = Math.floor(pot.amount / potWinners.length);
      const remainder = pot.amount % potWinners.length;
      
      potWinners.forEach((winner, index) => {
        const award = winAmount + (index === 0 ? remainder : 0);
        winner.player.chips += award;
        totalAwarded += award;
        
        console.log(`${winner.player.name}이 팟 ${i + 1}에서 $${award} 획득 (${winner.hand.description})`);
        
        if (!winnerNames.includes(winner.player.name)) {
          winnerNames.push(winner.player.name);
        }
        
        // Mark as winner in showdown hands and track winnings
        if (this.gameState.showdownHands) {
          this.gameState.showdownHands.forEach(showdownHand => {
            if (showdownHand.playerId === winner.player.id) {
              showdownHand.isWinner = true;
              showdownHand.totalWinnings = (showdownHand.totalWinnings || 0) + award;
            }
          });
        }
      });
    }
    
    // Set winner action
    const bestOverallHand = handRankings[0].hand;
    this.gameState.lastAction = {
      playerId: winnerNames.join(', '),
      action: `wins with ${bestOverallHand.description}`,
      amount: totalAwarded,
      winningHand: bestOverallHand
    };
    
    // Reset pots
    this.gameState.pot = 0;
    this.gameState.sidePots = [];
    
    console.log("\n최종 칩 상태:", handRankings.map(hr => ({ 
      name: hr.player.name, 
      chips: hr.player.chips,
      isWinner: winnerNames.includes(hr.player.name)
    })));
  }

  private distributeMainPot(activePlayers: Player[]): void {
    console.log("=== 단순 메인 팟 분배 ===");
    
    const totalPot = this.gameState.pot + this.gameState.sidePots.reduce((sum, sp) => sum + sp.amount, 0);
    console.log(`분배할 총 팟: $${totalPot}`);
    
    // Evaluate hands
    const handRankings = activePlayers.map(player => ({
      player,
      hand: this.handEvaluator.evaluateHand([...player.cards, ...this.gameState.communityCards])
    }));
    
    // Sort by hand strength (best first)
    handRankings.sort((a, b) => this.handEvaluator.compareHands(b.hand, a.hand));
    
    // Store showdown hands for display
    this.gameState.showdownHands = handRankings.map(ranking => ({
      playerId: ranking.player.id,
      playerName: ranking.player.name,
      holeCards: [...ranking.player.cards] as any[], // Store player's 2 hole cards
      hand: ranking.hand as any,
      isWinner: false,
      totalWinnings: 0 // Will be updated during pot distribution
    })) as any;
    
    // Find winners (players with the best hand)
    const bestHand = handRankings[0].hand;
    const winners = handRankings.filter(hr => 
      this.handEvaluator.compareHands(hr.hand, bestHand) === 0
    );
    
    console.log(`승자: ${winners.map(w => w.player.name).join(', ')}`);
    console.log(`최고 패: ${bestHand.description}`);
    
    // Distribute pot among winners
    const winAmount = Math.floor(totalPot / winners.length);
    const remainder = totalPot % winners.length;
    
    let totalAwarded = 0;
    winners.forEach((winner, index) => {
      const award = winAmount + (index === 0 ? remainder : 0);
      winner.player.chips += award;
      totalAwarded += award;
      
      console.log(`${winner.player.name}에게 $${award} 지급 (총 칩: $${winner.player.chips})`);
      
      // Mark as winner in showdown hands and track winnings
      if (this.gameState.showdownHands) {
        this.gameState.showdownHands.forEach(showdownHand => {
          if (showdownHand.playerId === winner.player.id) {
            showdownHand.isWinner = true;
            showdownHand.totalWinnings = (showdownHand.totalWinnings || 0) + award;
          }
        });
      }
    });
    
    // Set winner action
    if (winners.length === 1) {
      this.gameState.lastAction = {
        playerId: winners[0].player.name,
        action: `wins with ${bestHand.description}`,
        amount: totalAwarded,
        winningHand: bestHand
      };
    } else {
      this.gameState.lastAction = {
        playerId: winners.map(w => w.player.name).join(', '),
        action: `split pot with ${bestHand.description}`,
        amount: totalAwarded,
        winningHand: bestHand
      };
    }
    
    // Reset pots
    this.gameState.pot = 0;
    this.gameState.sidePots = [];
    
    console.log("메인 팟 분배 완료:", handRankings.map(hr => ({ 
      name: hr.player.name, 
      chips: hr.player.chips,
      isWinner: winners.some(w => w.player.id === hr.player.id)
    })));
  }

  private createSidePotsFromBettingInfo(bettingInfo: any[]): Array<{ amount: number; eligiblePlayers: string[] }> {
    console.log("저장된 베팅 정보로 사이드팟 생성 시작");
    console.log("베팅 정보:", bettingInfo);
    
    // Calculate total actual pot from all bets (including previous betting rounds)
    const totalActualPot = this.gameState.pot + this.gameState.sidePots.reduce((sum, sp) => sum + sp.amount, 0);
    console.log(`실제 총 팟: $${totalActualPot}`);
    
    // Include ALL players who contributed to the pot (folded or not) for accurate side pot calculation
    const allBets = bettingInfo.filter(info => info.totalChipsInPot > 0);
    console.log("모든 기여 베팅:", allBets);
    
    // For side pot eligibility, only non-folded players can win
    const activeBets = bettingInfo.filter(info => !info.hasFolded && info.totalChipsInPot > 0);
    console.log("활성 베팅:", activeBets);
    
    if (activeBets.length <= 1) {
      // Only one player, they get everything
      return [{
        amount: totalActualPot,
        eligiblePlayers: activeBets.map(info => info.id)
      }];
    }
    
    // Get unique bet amounts from ALL players (including folded), sorted ascending
    const uniqueBets = new Set<number>();
    allBets.forEach(info => uniqueBets.add(info.totalChipsInPot || info.currentBet));
    const betAmounts = Array.from(uniqueBets).sort((a, b) => a - b);
    console.log("베팅 금액들:", betAmounts);
    
    const sidePots: Array<{ amount: number; eligiblePlayers: string[] }> = [];
    let previousAmount = 0;
    let totalAllocated = 0;
    
    for (const betAmount of betAmounts) {
      const contribution = betAmount - previousAmount;
      if (contribution <= 0) continue;
      
      // Count ALL players (including folded) who contributed at this level for pot size
      const contributingPlayers = allBets.filter(info => (info.totalChipsInPot || info.currentBet) >= betAmount);
      
      // But only non-folded players can be eligible to win
      const eligiblePlayers = activeBets
        .filter(info => (info.totalChipsInPot || info.currentBet) >= betAmount)
        .map(info => info.id);
      
      // Pot size is based on ALL contributors (including folded players)
      const potAmount = contribution * contributingPlayers.length;
      totalAllocated += potAmount;
      
      if (potAmount > 0) {
        sidePots.push({
          amount: potAmount,
          eligiblePlayers
        });
        
        console.log(`팟 생성: $${potAmount} (베팅레벨: $${betAmount}, 기여자: ${contributingPlayers.length}명, 수혜자: ${eligiblePlayers.length}명)`);
      }
      
      previousAmount = betAmount;
    }
    
    // If there's remaining pot money, add it to the main pot
    const remainingPot = totalActualPot - totalAllocated;
    if (remainingPot > 0) {
      console.log(`잔여 팟 $${remainingPot}을 메인 팟에 추가`);
      if (sidePots.length > 0) {
        sidePots[0].amount += remainingPot;
      } else {
        sidePots.push({
          amount: remainingPot,
          eligiblePlayers: activeBets.map(info => info.id)
        });
      }
    }
    
    console.log(`총 할당된 팟: $${sidePots.reduce((sum, sp) => sum + sp.amount, 0)}`);
    return sidePots;
  }

  private createSidePots(activePlayers: Player[]): Array<{ amount: number; eligiblePlayers: string[] }> {
    console.log("사이드팟 생성 시작");
    
    // Get all unique bet amounts, sorted ascending
    const uniqueBets = new Set<number>();
    activePlayers.forEach(p => uniqueBets.add(p.currentBet));
    const betAmounts = Array.from(uniqueBets).sort((a, b) => a - b);
    console.log("베팅 금액들:", betAmounts);
    
    const sidePots: Array<{ amount: number; eligiblePlayers: string[] }> = [];
    let previousAmount = 0;
    
    for (const betAmount of betAmounts) {
      const contribution = betAmount - previousAmount;
      if (contribution <= 0) continue;
      
      // Players who bet this amount or more are eligible for this pot
      const eligiblePlayers = activePlayers
        .filter(p => p.currentBet >= betAmount)
        .map(p => p.id);
      
      const potAmount = contribution * eligiblePlayers.length;
      
      if (potAmount > 0) {
        sidePots.push({
          amount: potAmount,
          eligiblePlayers
        });
        
        console.log(`팟 생성: $${potAmount} (베팅레벨: $${betAmount}, 참여자: ${eligiblePlayers.length}명)`);
      }
      
      previousAmount = betAmount;
    }
    
    return sidePots;
  }

  private calculateSidePots(): void {
    const activePlayers = this.gameState.players.filter(p => !p.hasFolded);
    if (activePlayers.length <= 1) return;

    console.log("=== 텍사스 홀덤 사이드 팟 계산 ===");
    console.log("활성 플레이어:", activePlayers.map(p => ({ name: p.name, bet: p.currentBet, chips: p.chips })));

    // Clear existing side pots
    this.gameState.sidePots = [];

    // Sort players by their bet amount (ascending)
    const sortedPlayers = [...activePlayers].sort((a, b) => a.currentBet - b.currentBet);
    
    let previousBetLevel = 0;
    
    for (let i = 0; i < sortedPlayers.length; i++) {
      const currentPlayer = sortedPlayers[i];
      const currentBetLevel = currentPlayer.currentBet;
      
      // Skip if this bet level is the same as previous
      if (currentBetLevel === previousBetLevel) continue;
      
      const levelContribution = currentBetLevel - previousBetLevel;
      
      // Find all players who can compete for this side pot level
      // (players who bet at least this amount)
      const eligiblePlayerIds = activePlayers
        .filter(p => p.currentBet >= currentBetLevel)
        .map(p => p.id);
      
      // Calculate side pot amount: contribution per player × number of contributing players
      const contributingPlayers = activePlayers.filter(p => p.currentBet >= previousBetLevel);
      const sidePotAmount = levelContribution * contributingPlayers.length;
      
      if (sidePotAmount > 0 && eligiblePlayerIds.length > 0) {
        this.gameState.sidePots.push({
          amount: sidePotAmount,
          eligiblePlayers: eligiblePlayerIds
        });
        
        console.log(`사이드 팟 ${this.gameState.sidePots.length}: $${sidePotAmount}, 자격자: ${eligiblePlayerIds.length}명 (${eligiblePlayerIds.map(id => activePlayers.find(p => p.id === id)?.name).join(', ')})`);
      }
      
      previousBetLevel = currentBetLevel;
    }
    
    console.log("최종 사이드 팟들:", this.gameState.sidePots);
    
    // Update main pot to exclude side pot amounts
    const totalSidePotAmount = this.gameState.sidePots.reduce((sum, sp) => sum + sp.amount, 0);
    this.gameState.pot = Math.max(0, this.gameState.pot - totalSidePotAmount);
    
    console.log(`메인 팟: $${this.gameState.pot}, 총 사이드 팟: $${totalSidePotAmount}`);
  }

  private calculateSidePotsFromBets(playerBets: Array<{ id: string; name: string; currentBet: number }>): void {
    if (playerBets.length <= 1) return;

    console.log("=== 올바른 텍사스 홀덤 사이드 팟 계산 ===");
    console.log("플레이어 베팅:", playerBets);

    // Clear existing side pots
    this.gameState.sidePots = [];

    // If all players bet the same amount, create a single main pot
    const allBetsEqual = playerBets.every(p => p.currentBet === playerBets[0].currentBet);
    if (allBetsEqual) {
      console.log("모든 플레이어가 동일한 금액 베팅 - 메인 팟만 생성");
      // No side pots needed, main pot handles everything
      const totalBets = playerBets.reduce((sum, p) => sum + p.currentBet, 0);
      this.gameState.pot = totalBets;
      console.log(`메인 팟: $${this.gameState.pot}`);
      return;
    }

    // Get unique bet amounts, sorted ascending
    const uniqueBets: number[] = [];
    playerBets.forEach(p => {
      if (!uniqueBets.includes(p.currentBet)) {
        uniqueBets.push(p.currentBet);
      }
    });
    uniqueBets.sort((a, b) => a - b);
    
    let previousLevel = 0;
    
    for (const currentLevel of uniqueBets) {
      const levelContribution = currentLevel - previousLevel;
      
      // Find players eligible for this side pot (bet >= currentLevel)
      const eligiblePlayerIds = playerBets
        .filter(p => p.currentBet >= currentLevel)
        .map(p => p.id);
      
      // Calculate how many players contributed to this level
      const contributingPlayersCount = playerBets.filter(p => p.currentBet >= previousLevel).length;
      
      // Side pot amount = contribution per player × number of contributing players
      const sidePotAmount = levelContribution * contributingPlayersCount;
      
      if (sidePotAmount > 0 && eligiblePlayerIds.length > 0) {
        this.gameState.sidePots.push({
          amount: sidePotAmount,
          eligiblePlayers: eligiblePlayerIds
        });
        
        console.log(`사이드 팟 생성: 레벨 ${previousLevel}→${currentLevel}, 기여자 ${contributingPlayersCount}명, 금액 $${sidePotAmount}, 자격자: ${eligiblePlayerIds.map(id => playerBets.find(p => p.id === id)?.name).join(', ')}`);
      }
      
      previousLevel = currentLevel;
    }
    
    console.log("최종 사이드 팟들:", this.gameState.sidePots);
    
    // Verify total matches total bets
    const totalBets = playerBets.reduce((sum, p) => sum + p.currentBet, 0);
    const totalSidePots = this.gameState.sidePots.reduce((sum, sp) => sum + sp.amount, 0);
    console.log(`검증: 총 베팅 $${totalBets}, 총 사이드 팟 $${totalSidePots}`);
    
    // Reset main pot since everything is distributed via side pots
    this.gameState.pot = Math.max(0, this.gameState.pot - totalSidePots);
  }

  private distributeSidePots(handRankings: Array<{ player: Player; hand: any }>): void {
    // Sort players by hand strength (best first)
    handRankings.sort((a, b) => this.handEvaluator.compareHands(b.hand, a.hand));
    
    console.log("Distributing side pots:", this.gameState.sidePots);
    console.log("Player rankings:", handRankings.map(hr => ({ name: hr.player.name, chips: hr.player.chips, bet: hr.player.currentBet })));
    
    let totalWinnings = 0;
    const winnerInfo: string[] = [];
    
    // Distribute each side pot starting from the first (smallest) pot
    for (let i = 0; i < this.gameState.sidePots.length; i++) {
      const sidePot = this.gameState.sidePots[i];
      console.log(`Processing side pot ${i}:`, sidePot);
      
      // Find eligible winners for this side pot
      const eligibleHandRankings = handRankings.filter(hr => 
        sidePot.eligiblePlayers.includes(hr.player.id)
      );
      
      if (eligibleHandRankings.length === 0) {
        console.log("No eligible players for this side pot");
        continue;
      }
      
      // Sort eligible players by hand strength
      eligibleHandRankings.sort((a, b) => this.handEvaluator.compareHands(b.hand, a.hand));
      
      // Find best hand among eligible players
      const bestEligibleHand = eligibleHandRankings[0].hand;
      const winners = eligibleHandRankings.filter(hr => 
        this.handEvaluator.compareHands(hr.hand, bestEligibleHand) === 0
      );
      
      console.log(`Winners for side pot ${i}:`, winners.map(w => w.player.name));
      
      // Distribute this side pot among winners
      const winAmount = Math.floor(sidePot.amount / winners.length);
      const remainder = sidePot.amount % winners.length;
      
      winners.forEach((winner, index) => {
        const award = winAmount + (index === 0 ? remainder : 0);
        console.log(`Awarding ${award} to ${winner.player.name}`);
        winner.player.chips += award;
        totalWinnings += award;
        
        // Mark as winner in showdown hands and track winnings
        if (this.gameState.showdownHands) {
          this.gameState.showdownHands.forEach(showdownHand => {
            if (showdownHand.playerId === winner.player.id) {
              showdownHand.isWinner = true;
              showdownHand.totalWinnings = (showdownHand.totalWinnings || 0) + award;
            }
          });
        }
      });
      
      if (winners.length === 1) {
        winnerInfo.push(`${winners[0].player.name} wins $${sidePot.amount}`);
      } else {
        winnerInfo.push(`${winners.map(w => w.player.name).join(', ')} split $${sidePot.amount}`);
      }
    }
    
    console.log("Final player chips:", handRankings.map(hr => ({ name: hr.player.name, chips: hr.player.chips })));
    
    // Set winner action
    if (winnerInfo.length > 0) {
      this.gameState.lastAction = {
        playerId: handRankings[0].player.name,
        action: winnerInfo.join(', '),
        amount: totalWinnings,
        winningHand: handRankings[0].hand
      };
    }
  }

  updateGameSettings(playerId: string, settings: { startingChips: number; smallBlind: number; bigBlind: number }): { success: boolean; error?: string } {
    // Only host can update settings
    if (this.gameState.hostPlayerId !== playerId) {
      return { success: false, error: "Only host can update settings" };
    }

    // Only allow updates before game starts
    if (this.gameState.stage !== 'settings') {
      return { success: false, error: "Cannot update settings after game has started" };
    }

    this.gameState.gameSettings = {
      startingChips: settings.startingChips,
      initialSmallBlind: settings.smallBlind,
      initialBigBlind: settings.bigBlind
    };

    this.gameState.smallBlind = settings.smallBlind;
    this.gameState.bigBlind = settings.bigBlind;
    this.gameState.minRaise = settings.bigBlind;

    // Update existing players' chips
    this.gameState.players.forEach(player => {
      player.chips = settings.startingChips;
    });

    this.notifyStateChange();
    return { success: true };
  }

  increaseBlind(playerId: string, newBigBlind?: number): { success: boolean; error?: string } {
    // Only host can increase blinds
    if (this.gameState.hostPlayerId !== playerId) {
      return { success: false, error: "Only host can increase blinds" };
    }

    // If no newBigBlind specified, show the blind increase prompt
    if (newBigBlind === undefined) {
      this.gameState.blindIncrease = {
        pending: true
      };
      
      console.log("블라인드 증가 옵션 표시");
      this.notifyStateChange();
      return { success: true };
    }

    // Clear timer
    if (this.blindIncreaseTimer) {
      clearTimeout(this.blindIncreaseTimer);
      this.blindIncreaseTimer = undefined;
    }

    if (newBigBlind > this.gameState.bigBlind) {
      // Set specific blind amount (only if it's an increase)
      this.gameState.bigBlind = newBigBlind;
      this.gameState.smallBlind = Math.floor(newBigBlind / 2);
      this.gameState.minRaise = newBigBlind;
      
      console.log(`블라인드 증가 완료: ${this.gameState.smallBlind}/${this.gameState.bigBlind}`);
      // 블라인드 인상 시 딜러 포지션을 다음 활성 플레이어로 이동
      let nextDealer = (this.gameState.dealerPosition + 1) % this.gameState.players.length;
      let attempts = 0;
      while (attempts < this.gameState.players.length) {
        if (this.gameState.players[nextDealer].chips > 0) {
          this.gameState.dealerPosition = nextDealer;
          break;
        }
        nextDealer = (nextDealer + 1) % this.gameState.players.length;
        attempts++;
      }
    } else {
      // Keep current blinds (when newBigBlind is not an increase)
      console.log(`현재 블라인드 유지: ${this.gameState.smallBlind}/${this.gameState.bigBlind}`);
    }
    
    // Clear blind increase pending state
    this.gameState.blindIncrease = undefined;
    
    // Clear any existing lastAction to avoid showing system messages
    this.gameState.lastAction = undefined;
    
    // Start next hand immediately after blind decision
    this.resetGameState();
    this.startNewHand();
    this.notifyStateChange();
    
    return { success: true };
  }

  private checkForEliminatedPlayers(): number {
    // Only count players as eliminated if they have 0 chips AND the hand has ended
    // Do NOT mark all-in players as inactive during the hand - they are still in the game
    if (!(this.gameState as any).playersAtHandStart) {
      return 0; // No baseline to compare against
    }
    
    // During showdown stage, we can properly eliminate players
    // But during active betting, all-in players should remain active
    if (this.gameState.stage !== 'ended' && this.gameState.stage !== 'showdown') {
      return 0; // Don't eliminate anyone during active betting
    }
    
    const playersAtHandStart = (this.gameState as any).playersAtHandStart as Player[];
    const currentPlayersWithChips = this.gameState.players.filter(p => p.chips > 0);
    
    // Find players who had chips at start of hand but have 0 chips now
    const newlyEliminatedPlayers = playersAtHandStart
      .filter(startPlayer => startPlayer.chips > 0) // Had chips at start
      .filter(startPlayer => {
        const currentPlayer = this.gameState.players.find(p => p.id === startPlayer.id);
        return currentPlayer && currentPlayer.chips === 0; // Has 0 chips now
      });
    
    if (newlyEliminatedPlayers.length > 0) {
      console.log(`Newly eliminated players this hand: ${newlyEliminatedPlayers.map(p => p.name).join(', ')}`);
      
      // Mark eliminated players as inactive only after hand is completely finished
      newlyEliminatedPlayers.forEach(eliminatedPlayer => {
        const currentPlayer = this.gameState.players.find(p => p.id === eliminatedPlayer.id);
        if (currentPlayer) {
          currentPlayer.isActive = false;
        }
      });
      
      // Find next active dealer position if current dealer is eliminated
      if (currentPlayersWithChips.length > 0 && this.gameState.players[this.gameState.dealerPosition].chips <= 0) {
        let nextDealer = (this.gameState.dealerPosition + 1) % this.gameState.players.length;
        while (this.gameState.players[nextDealer].chips <= 0) {
          nextDealer = (nextDealer + 1) % this.gameState.players.length;
        }
        this.gameState.dealerPosition = nextDealer;
      }
    }
    
    return newlyEliminatedPlayers.length;
  }

  private transferHostRights(): void {
    // Sort players by join order (position)
    const sortedPlayers = [...this.gameState.players].sort((a, b) => a.position - b.position);
    
    // Find current host index
    const currentHostIndex = sortedPlayers.findIndex(p => p.id === this.gameState.hostPlayerId);
    
    if (currentHostIndex === -1) {
      // No current host found, assign to first player with chips
      const firstPlayerWithChips = sortedPlayers.find(p => p.chips > 0);
      if (firstPlayerWithChips) {
        this.gameState.hostPlayerId = firstPlayerWithChips.id;
        console.log(`No host found, assigning to first player with chips: ${firstPlayerWithChips.name}`);
      }
      return;
    }
    
    // Find next player in join order who still has chips (not eliminated)
    let nextHostIndex = (currentHostIndex + 1) % sortedPlayers.length;
    let attempts = 0;
    
    while (attempts < sortedPlayers.length) {
      const candidatePlayer = sortedPlayers[nextHostIndex];
      
      // Found a player with chips who can be the new host
      if (candidatePlayer.chips > 0) {
        const oldHost = sortedPlayers[currentHostIndex];
        
        this.gameState.hostPlayerId = candidatePlayer.id;
        console.log(`Host transferred from ${oldHost.name} (position ${oldHost.position}) to: ${candidatePlayer.name} (position ${candidatePlayer.position})`);
        
        this.gameState.lastAction = {
          playerId: 'System',
          action: `${candidatePlayer.name}이(가) 새로운 방장이 되었습니다`
        };
        
        this.notifyStateChange();
        return;
      }
      
      nextHostIndex = (nextHostIndex + 1) % sortedPlayers.length;
      attempts++;
    }
    
    // If no suitable host found (shouldn't happen in normal game flow)
    console.log("No suitable host found - all players eliminated");
  }

  private transferHostRightsQuietly(): void {
    // Sort players by join order (position)
    const sortedPlayers = [...this.gameState.players].sort((a, b) => a.position - b.position);
    
    // Find current host index
    const currentHostIndex = sortedPlayers.findIndex(p => p.id === this.gameState.hostPlayerId);
    
    if (currentHostIndex === -1) {
      // No current host found, assign to first player with chips
      const firstPlayerWithChips = sortedPlayers.find(p => p.chips > 0);
      if (firstPlayerWithChips) {
        this.gameState.hostPlayerId = firstPlayerWithChips.id;
        console.log(`No host found, assigning to first player with chips: ${firstPlayerWithChips.name}`);
      }
      return;
    }
    
    // Find next player in join order who still has chips (not eliminated)
    let nextHostIndex = (currentHostIndex + 1) % sortedPlayers.length;
    let attempts = 0;
    
    while (attempts < sortedPlayers.length) {
      const candidatePlayer = sortedPlayers[nextHostIndex];
      
      // Found a player with chips who can be the new host
      if (candidatePlayer.chips > 0) {
        const oldHost = sortedPlayers[currentHostIndex];
        
        this.gameState.hostPlayerId = candidatePlayer.id;
        console.log(`Host transferred quietly from ${oldHost.name} (position ${oldHost.position}) to: ${candidatePlayer.name} (position ${candidatePlayer.position})`);
        
        // DO NOT override lastAction or call notifyStateChange - preserve winner display
        return;
      }
      
      nextHostIndex = (nextHostIndex + 1) % sortedPlayers.length;
      attempts++;
    }
    
    // If no suitable host found (shouldn't happen in normal game flow)
    console.log("No suitable host found - all players eliminated");
  }

  private resetGameForNewStart(): void {
    console.log("=== 게임 초기화 - 마지막 생존자 ===");
    
    // Reset game to initial settings state
    this.gameState.stage = 'settings';
    this.gameState.isActive = false;
    
    // Transfer host rights to the last game winner if exists
    if (this.gameState.lastGameWinner) {
      const winner = this.gameState.players.find(p => p.id === this.gameState.lastGameWinner!.playerId);
      if (winner) {
        this.gameState.hostPlayerId = winner.id;
        console.log(`방장 권한을 이전 게임 승자 ${winner.name}에게 이전`);
      } else {
        // Fallback to normal host transfer if winner not found
        this.transferHostRights();
      }
    } else {
      // Transfer host rights to next player in line when game resets
      this.transferHostRights();
    }
    
    // Clear all game-specific data
    this.gameState.communityCards = [];
    this.gameState.pot = 0;
    this.gameState.sidePots = [];
    this.gameState.currentBet = 0;
    this.gameState.currentPlayerIndex = 0;
    this.gameState.dealerPosition = 0;
    this.gameState.smallBlindPosition = 0;
    this.gameState.bigBlindPosition = 0;
    this.gameState.lastAction = undefined;
    this.gameState.showdownHands = undefined;
    this.gameState.winnerConfirmations = undefined;
    
    // Reset ALL players (including eliminated ones) and restore them for new game
    // Note: We keep all players in the game state to allow them to rejoin
    this.gameState.players.forEach(player => {
      player.cards = [];
      player.currentBet = 0;
      player.hasActed = false;
      player.hasFolded = false;
      player.isAllIn = false;
      player.isActive = true;
      player.lastAction = undefined;
      // Reset chips to starting amount for new game (will be set when game starts)
      if (this.gameState.gameSettings) {
        player.chips = this.gameState.gameSettings.startingChips;
      }
    });
    
    // Clear any stored betting info
    delete (this.gameState as any).allInBettingInfo;
    delete (this.gameState as any).savedBettingInfo;
    
    console.log(`게임이 초기 설정 화면으로 리셋됨 - ${this.gameState.players.length}명 포함`);
  }



  startNextHand(playerId: string): { success: boolean; error?: string } {
    // Only host can start next hand
    if (this.gameState.hostPlayerId !== playerId) {
      return { success: false, error: "Only host can start next hand" };
    }

    // Can only start next hand when game is in 'ended' or 'showdown' state
    if (this.gameState.stage !== 'ended' && this.gameState.stage !== 'showdown') {
      return { success: false, error: "Cannot start next hand - game is not in ended state" };
    }

    // Check if there are enough active players
    const activePlayers = this.gameState.players.filter(p => p.chips > 0);
    if (activePlayers.length < 2) {
      return { success: false, error: "Need at least 2 players with chips to start next hand" };
    }

    console.log("호스트가 다음 핸드 시작 요청");
    this.startNewHand();
    return { success: true };
  }

  resetToSettings(playerId: string): { success: boolean; error?: string } {
    if (playerId !== this.gameState.hostPlayerId) {
      return { success: false, error: "방장만 게임을 초기화할 수 있습니다" };
    }
    
    // Clear any running timers
    if (this.confirmationTimer) {
      clearTimeout(this.confirmationTimer);
      this.confirmationTimer = undefined;
    }
    if (this.allInRevealTimer) {
      clearTimeout(this.allInRevealTimer);
      this.allInRevealTimer = undefined;
    }
    if (this.blindIncreaseTimer) {
      clearTimeout(this.blindIncreaseTimer);
      this.blindIncreaseTimer = undefined;
    }
    
    // Reset game to settings stage
    this.gameState.stage = 'settings';
    this.gameState.isActive = false;
    
    // Clear all game-specific data
    this.gameState.communityCards = [];
    this.gameState.pot = 0;
    this.gameState.sidePots = [];
    this.gameState.currentBet = 0;
    this.gameState.minRaise = this.gameState.bigBlind;
    this.gameState.currentPlayerIndex = 0;
    this.gameState.dealerPosition = 0;
    this.gameState.smallBlindPosition = 0;
    this.gameState.bigBlindPosition = 0;
    this.gameState.lastAction = undefined;
    this.gameState.showdownHands = undefined;
    this.gameState.winnerConfirmations = undefined;
    this.gameState.lastGameWinner = undefined;
    this.gameState.blindIncrease = undefined;
    
    // Reset all players to initial state
    this.gameState.players.forEach(player => {
      player.cards = [];
      player.currentBet = 0;
      player.hasActed = false;
      player.hasFolded = false;
      player.isAllIn = false;
      player.isActive = true;
      player.lastAction = undefined;
      // Reset chips to starting amount if they have game settings
      if (this.gameState.gameSettings) {
        player.chips = this.gameState.gameSettings.startingChips;
      }
    });
    
    // Reset blinds to initial values if game settings exist
    if (this.gameState.gameSettings) {
      this.gameState.smallBlind = this.gameState.gameSettings.initialSmallBlind;
      this.gameState.bigBlind = this.gameState.gameSettings.initialBigBlind;
      this.gameState.minRaise = this.gameState.bigBlind;
    }
    
    this.notifyStateChange();
    return { success: true };
  }

  getGameState(): GameState {
    return { ...this.gameState };
  }
}
