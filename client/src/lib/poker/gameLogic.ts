import type { Card, Player, GameState } from "@shared/schema";

export class GameLogic {
  static createDeck(): Card[] {
    const suits: Card['suit'][] = ['hearts', 'diamonds', 'clubs', 'spades'];
    const ranks: Card['rank'][] = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];
    
    const deck: Card[] = [];
    suits.forEach(suit => {
      ranks.forEach(rank => {
        deck.push({ suit, rank });
      });
    });
    
    return this.shuffleDeck(deck);
  }

  static shuffleDeck(deck: Card[]): Card[] {
    const shuffled = [...deck];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  }

  static dealCards(deck: Card[], players: Player[], cardsPerPlayer: number): Card[] {
    const remainingDeck = [...deck];
    players.forEach(player => {
      player.cards = [];
      for (let i = 0; i < cardsPerPlayer; i++) {
        if (remainingDeck.length > 0) {
          player.cards.push(remainingDeck.pop()!);
        }
      }
    });
    return remainingDeck;
  }

  static getNextActivePlayerIndex(players: Player[], currentIndex: number): number {
    let nextIndex = (currentIndex + 1) % players.length;
    let attempts = 0;
    
    while (attempts < players.length) {
      const player = players[nextIndex];
      if (!player.hasFolded && !player.isAllIn && player.isActive) {
        return nextIndex;
      }
      nextIndex = (nextIndex + 1) % players.length;
      attempts++;
    }
    
    return currentIndex; // Return current if no active player found
  }

  static isBettingRoundComplete(players: Player[], currentBet: number): boolean {
    const activePlayers = players.filter(p => !p.hasFolded && !p.isAllIn && p.isActive);
    
    if (activePlayers.length <= 1) {
      return true;
    }
    
    // Check if all active players have acted and have matching bets
    return activePlayers.every(player => 
      player.hasActed && player.currentBet === currentBet
    );
  }

  static calculatePot(players: Player[]): number {
    return players.reduce((total, player) => total + player.currentBet, 0);
  }

  static resetBettingRound(players: Player[]): void {
    players.forEach(player => {
      player.hasActed = false;
      player.currentBet = 0;
    });
  }

  static getWinners(players: Player[]): Player[] {
    const activePlayers = players.filter(p => !p.hasFolded);
    
    if (activePlayers.length === 1) {
      return activePlayers;
    }
    
    // This would need to be implemented with hand evaluation
    // For now, return the first active player
    return activePlayers.slice(0, 1);
  }
}
